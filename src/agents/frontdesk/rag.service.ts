import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { RAGSearchResult } from './types.js';

export class RAGService {
  private app: FastifyInstance;
  private prisma: PrismaClient;
  private isInitialized: boolean = false;

  constructor(app: FastifyInstance) {
    this.app = app;
    this.prisma = new PrismaClient();
  }

  async initialize(): Promise<void> {
    try {
      // Check if pgvector extension is available
      await this.checkPgVectorExtension();
      
      // Initialize vector tables if they don't exist
      await this.initializeVectorTables();
      
      this.isInitialized = true;
      this.app.log.info('RAG Service initialized successfully');
    } catch (error: any) {
      this.app.log.error('Failed to initialize RAG Service:', error);
      throw error as any;
    }
  }

  private async checkPgVectorExtension(): Promise<void> {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT * FROM pg_extension WHERE extname = 'vector';
      `;
      
      if (!result || (Array.isArray(result) && result.length === 0)) {
        this.app.log.warn('pgvector extension not found. Some RAG features may not work.');
      }
    } catch (error: any) {
      this.app.log.warn('Could not check pgvector extension:', error);
    }
  }

  private async initializeVectorTables(): Promise<void> {
    try {
      // School information vector table
      await this.prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS school_vectors (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          school_id UUID NOT NULL,
          content TEXT NOT NULL,
          content_type VARCHAR(50) NOT NULL,
          embedding VECTOR(1536),
          metadata JSONB,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `;

      // Student information vector table
      await this.prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS student_vectors (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          student_id VARCHAR(100) NOT NULL,
          content TEXT NOT NULL,
          content_type VARCHAR(50) NOT NULL,
          embedding VECTOR(1536),
          metadata JSONB,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `;

      // General knowledge vector table
      await this.prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS knowledge_vectors (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          content TEXT NOT NULL,
          content_type VARCHAR(50) NOT NULL,
          category VARCHAR(100),
          embedding VECTOR(1536),
          metadata JSONB,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `;

      // Create indexes for better performance
      await this.prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS idx_school_vectors_school_id ON school_vectors(school_id);
        CREATE INDEX IF NOT EXISTS idx_student_vectors_student_id ON student_vectors(student_id);
        CREATE INDEX IF NOT EXISTS idx_knowledge_vectors_category ON knowledge_vectors(category);
      `;

    } catch (error: any) {
      this.app.log.warn('Could not create vector tables:', error);
    }
  }

  async getSchoolInformation(schoolId: string): Promise<any> {
    try {
      if (!this.isInitialized) {
        throw new Error('RAG Service not initialized');
      }

      // Get basic school information
      const school = await this.prisma.school.findUnique({
        where: { id: schoolId },
        include: {
          classes: {
            include: {
              classArms: true,
              subjects: true
            }
          },
          staff: {
            include: {
              profile: true,
              role: true
            }
          },
          terms: true
        }
      });

      if (!school) {
        throw new Error('School not found');
      }

      // Get vector embeddings for enhanced information
      const schoolVectors = await this.prisma.$queryRaw`
        SELECT content, content_type, metadata
        FROM school_vectors 
        WHERE school_id = ${schoolId}
        ORDER BY created_at DESC
        LIMIT 10;
      `;

      // Combine basic info with vector data
      return {
        ...school,
        enhancedInfo: schoolVectors,
        lastUpdated: new Date()
      };
    } catch (error: any) {
      this.app.log.error('Error getting school information:', error);
      throw error as any;
    }
  }

  async searchGeneralInformation(query: string): Promise<RAGSearchResult[]> {
    try {
      if (!this.isInitialized) {
        throw new Error('RAG Service not initialized');
      }

      // Use simple text search for now since vector search is not fully implemented
      const results = await this.prisma.$queryRaw`
        SELECT 
          content,
          content_type as source,
          category,
          metadata,
          created_at
        FROM knowledge_vectors 
        WHERE 
          content ILIKE ${`%${query}%`} OR
          category ILIKE ${`%${query}%`}
        ORDER BY created_at DESC
        LIMIT 5;
      `;

      return (results as any[]).map(result => ({
        content: result.content,
        source: result.source,
        relevance: this.calculateRelevance(query, result.content),
        metadata: result.metadata || {}
      }));
    } catch (error: any) {
      this.app.log.error('Error searching general information:', error);
      return [];
    }
  }

  async searchStudentInformation(query: string, filters?: any): Promise<RAGSearchResult[]> {
    try {
      if (!this.isInitialized) {
        throw new Error('RAG Service not initialized');
      }

      let whereClause = `content ILIKE ${`%${query}%`}`;
      let params: any[] = [];

      if (filters?.schoolId) {
        whereClause += ` AND metadata->>'schoolId' = $1`;
        params.push(filters.schoolId);
      }

      if (filters?.className) {
        whereClause += ` AND metadata->>'className' = $2`;
        params.push(filters.className);
      }

      const results = await this.prisma.$queryRaw`
        SELECT 
          content,
          content_type as source,
          metadata,
          created_at
        FROM student_vectors 
        WHERE ${whereClause}
        ORDER BY created_at DESC
        LIMIT 5;
      `;

      return (results as any[]).map(result => ({
        content: result.content,
        source: result.source,
        relevance: this.calculateRelevance(query, result.content),
        metadata: result.metadata || {}
      }));
    } catch (error: any) {
      this.app.log.error('Error searching student information:', error);
      return [];
    }
  }

  async addSchoolVector(schoolId: string, content: string, contentType: string, metadata?: any): Promise<void> {
    try {
      if (!this.isInitialized) {
        throw new Error('RAG Service not initialized');
      }

      // Simple text chunking for now
      const chunks = this.simpleTextChunking(content, 1000, 200);

      // Store in database
      for (const chunk of chunks) {
        await this.prisma.$executeRaw`
          INSERT INTO school_vectors (school_id, content, content_type, metadata)
          VALUES (${schoolId}, ${chunk}, ${contentType}, ${JSON.stringify(metadata)});
        `;
      }
    } catch (error: any) {
      this.app.log.error('Error adding school vector:', error);
      throw error as any;
    }
  }

  async addStudentVector(studentId: string, content: string, contentType: string, metadata?: any): Promise<void> {
    try {
      if (!this.isInitialized) {
        throw new Error('RAG Service not initialized');
      }

      // Simple text chunking for now
      const chunks = this.simpleTextChunking(content, 1000, 200);

      // Store in database
      for (const chunk of chunks) {
        await this.prisma.$executeRaw`
          INSERT INTO student_vectors (student_id, content, content_type, metadata)
          VALUES (${studentId}, ${chunk}, ${contentType}, ${JSON.stringify(metadata)});
        `;
      }
    } catch (error: any) {
      this.app.log.error('Error adding student vector:', error);
      throw error as any;
    }
  }

  async addKnowledgeVector(content: string, contentType: string, category?: string, metadata?: any): Promise<void> {
    try {
      if (!this.isInitialized) {
        throw new Error('RAG Service not initialized');
      }

      // Simple text chunking for now
      const chunks = this.simpleTextChunking(content, 1000, 200);

      // Store in database
      for (const chunk of chunks) {
        await this.prisma.$executeRaw`
          INSERT INTO knowledge_vectors (content, content_type, category, metadata)
          VALUES (${chunk}, ${contentType}, ${category || null}, ${JSON.stringify(metadata)});
        `;
      }
    } catch (error: any) {
      this.app.log.error('Error adding knowledge vector:', error);
      throw error as any;
    }
  }

  private simpleTextChunking(text: string, chunkSize: number, overlap: number): string[] {
    const chunks: string[] = [];
    let start = 0;
    
    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      let chunk = text.slice(start, end);
      
      // Try to break at word boundaries
      if (end < text.length) {
        const lastSpace = chunk.lastIndexOf(' ');
        if (lastSpace > chunkSize * 0.8) {
          chunk = chunk.slice(0, lastSpace);
          start = start + lastSpace + 1;
        } else {
          start = end;
        }
      } else {
        start = end;
      }
      
      chunks.push(chunk);
      
      // Apply overlap
      if (start < text.length) {
        start = Math.max(0, start - overlap);
      }
    }
    
    return chunks;
  }

  private calculateRelevance(query: string, content: string): number {
    // Simple relevance calculation based on word overlap
    const queryWords = query.toLowerCase().split(/\s+/);
    const contentWords = content.toLowerCase().split(/\s+/);
    
    const commonWords = queryWords.filter(word => 
      contentWords.includes(word)
    );
    
    return commonWords.length / queryWords.length;
  }

  async updateVectorEmbeddings(): Promise<void> {
    try {
      this.app.log.info('Vector embeddings update not implemented yet - using text-based search');
    } catch (error: any) {
      this.app.log.error('Error updating vector embeddings:', error);
      throw error as any;
    }
  }

  async cleanup(): Promise<void> {
    try {
      await this.prisma.$disconnect();
      this.isInitialized = false;
    } catch (error: any) {
      this.app.log.error('Error during RAG service cleanup:', error);
    }
  }
} 