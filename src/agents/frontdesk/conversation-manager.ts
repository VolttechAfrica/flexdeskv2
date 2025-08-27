import { FastifyInstance } from 'fastify';
import { ConversationContext, ConversationTurn, ConversationState } from './types.js';
import { PrismaClient } from '@prisma/client';

export class ConversationManager {
  private app: FastifyInstance;
  private prisma: PrismaClient;
  private isInitialized: boolean = false;
  private activeConversations: Map<string, ConversationContext>;

  constructor(app: FastifyInstance) {
    this.app = app;
    this.prisma = new PrismaClient();
    this.activeConversations = new Map();
  }

  async initialize(): Promise<void> {
    try {
      await this.createConversationTables();
      this.isInitialized = true;
      this.app.log.info('Conversation Manager initialized successfully');
    } catch (error) {
      this.app.log.error('Failed to initialize Conversation Manager:', error);
      throw error;
    }
  }

  private async createConversationTables(): Promise<void> {
    try {
      // Create conversations table
      await this.prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS conversations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          call_id VARCHAR(100) NOT NULL,
          caller_info JSONB NOT NULL,
          conversation_history JSONB DEFAULT '[]',
          current_state JSONB NOT NULL,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `;

      // Create conversation turns table
      await this.prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS conversation_turns (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          conversation_id UUID NOT NULL,
          speaker VARCHAR(20) NOT NULL,
          message TEXT NOT NULL,
          timestamp TIMESTAMP DEFAULT NOW(),
          intent VARCHAR(100),
          entities JSONB,
          confidence DECIMAL(3,2),
          metadata JSONB DEFAULT '{}'
        );
      `;

      // Create indexes
      await this.prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS idx_conversations_call_id ON conversations(call_id);
        CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at);
        CREATE INDEX IF NOT EXISTS idx_conversation_turns_conversation_id ON conversation_turns(conversation_id);
        CREATE INDEX IF NOT EXISTS idx_conversation_turns_timestamp ON conversation_turns(timestamp);
      `;

    } catch (error) {
      this.app.log.warn('Could not create conversation tables:', error);
    }
  }

  async startConversation(callId: string, callerInfo: any): Promise<ConversationContext> {
    try {
      if (!this.isInitialized) {
        throw new Error('Conversation Manager not initialized');
      }

      const conversationId = crypto.randomUUID();
      
      const initialState: ConversationState = {
        currentStep: 'greeting',
        completedSteps: [],
        pendingActions: [],
        data: {}
      };

      const conversation: ConversationContext = {
        id: conversationId,
        callId,
        callerInfo,
        conversationHistory: [],
        currentState: initialState,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Store in memory for active conversations
      this.activeConversations.set(callId, conversation);

      // Store in database
      await this.saveConversationToDatabase(conversation);

      this.app.log.info(`Conversation started for call: ${callId}`);
      return conversation;
    } catch (error) {
      this.app.log.error('Error starting conversation:', error);
      throw error;
    }
  }

  async addTurn(conversationId: string, turn: Omit<ConversationTurn, 'id'>): Promise<ConversationTurn> {
    try {
      if (!this.isInitialized) {
        throw new Error('Conversation Manager not initialized');
      }

      const conversation = this.activeConversations.get(conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      const newTurn: ConversationTurn = {
        ...turn,
        id: crypto.randomUUID()
      };

      // Add to conversation history
      conversation.conversationHistory.push(newTurn);
      conversation.updatedAt = new Date();

      // Update conversation state based on the turn
      await this.updateConversationState(conversation, newTurn);

      // Save to database
      await this.saveTurnToDatabase(conversationId, newTurn);
      await this.updateConversationInDatabase(conversation);

      return newTurn;
    } catch (error) {
      this.app.log.error('Error adding turn to conversation:', error);
      throw error;
    }
  }

  async getConversation(callId: string): Promise<ConversationContext | null> {
    try {
      if (!this.isInitialized) {
        throw new Error('Conversation Manager not initialized');
      }

      // Check memory first
      let conversation: ConversationContext | null = this.activeConversations.get(callId) || null;
      
      if (!conversation) {
        // Load from database
        conversation = await this.loadConversationFromDatabase(callId);
        if (conversation) {
          this.activeConversations.set(callId, conversation);
        }
      }

      return conversation;
    } catch (error) {
      this.app.log.error('Error getting conversation:', error);
      return null;
    }
  }

  async updateConversationState(conversation: ConversationContext, turn: ConversationTurn): Promise<void> {
    try {
      const currentState = conversation.currentState;
      
      // Analyze the turn to determine next state
      const nextState = await this.analyzeTurnForStateChange(currentState, turn);
      
      if (nextState) {
        conversation.currentState = nextState;
        conversation.updatedAt = new Date();
      }
    } catch (error) {
      this.app.log.error('Error updating conversation state:', error);
    }
  }

  private async analyzeTurnForStateChange(currentState: ConversationState, turn: ConversationTurn): Promise<ConversationState | null> {
    try {
      const message = turn.message.toLowerCase();
      const speaker = turn.speaker;
      
      let newState = { ...currentState };
      let hasChanges = false;

      // State machine logic based on conversation flow
      if (currentState.currentStep === 'greeting') {
        if (speaker === 'USER' && message.includes('school')) {
          newState.currentStep = 'school_inquiry';
          newState.completedSteps.push('greeting');
          hasChanges = true;
        } else if (speaker === 'USER' && (message.includes('pay') || message.includes('fee'))) {
          newState.currentStep = 'payment_inquiry';
          newState.completedSteps.push('greeting');
          hasChanges = true;
        }
      } else if (currentState.currentStep === 'school_inquiry') {
        if (speaker === 'AGENT' && message.includes('school found')) {
          newState.currentStep = 'providing_school_info';
          newState.completedSteps.push('school_inquiry');
          hasChanges = true;
        } else if (speaker === 'AGENT' && message.includes('school not found')) {
          newState.currentStep = 'school_not_found';
          newState.completedSteps.push('school_inquiry');
          hasChanges = true;
        }
      } else if (currentState.currentStep === 'payment_inquiry') {
        if (speaker === 'AGENT' && message.includes('student details')) {
          newState.currentStep = 'collecting_student_info';
          newState.completedSteps.push('payment_inquiry');
          hasChanges = true;
        }
      } else if (currentState.currentStep === 'collecting_student_info') {
        if (speaker === 'USER' && (message.includes('class') || message.includes('grade'))) {
          newState.currentStep = 'verifying_student';
          newState.completedSteps.push('collecting_student_info');
          hasChanges = true;
        }
      } else if (currentState.currentStep === 'verifying_student') {
        if (speaker === 'AGENT' && message.includes('student found')) {
          newState.currentStep = 'processing_payment';
          newState.completedSteps.push('verifying_student');
          hasChanges = true;
        } else if (speaker === 'AGENT' && message.includes('student not found')) {
          newState.currentStep = 'student_not_found';
          newState.completedSteps.push('verifying_student');
          hasChanges = true;
        }
      } else if (currentState.currentStep === 'processing_payment') {
        if (speaker === 'AGENT' && message.includes('payment link')) {
          newState.currentStep = 'payment_complete';
          newState.completedSteps.push('processing_payment');
          hasChanges = true;
        }
      }

      // Add any pending actions based on the turn
      if (turn.intent === 'schedule_callback') {
        newState.pendingActions.push('schedule_callback');
        hasChanges = true;
      }

      // Store relevant data from the turn
      if (turn.entities) {
        newState.data = { ...newState.data, ...turn.entities };
        hasChanges = true;
      }

      return hasChanges ? newState : null;
    } catch (error) {
      this.app.log.error('Error analyzing turn for state change:', error);
      return null;
    }
  }

  async endConversation(callId: string): Promise<void> {
    try {
      if (!this.isInitialized) {
        throw new Error('Conversation Manager not initialized');
      }

      const conversation = this.activeConversations.get(callId);
      if (conversation) {
        // Mark conversation as completed
        conversation.currentState.currentStep = 'completed';
        conversation.updatedAt = new Date();
        
        // Save final state to database
        await this.updateConversationInDatabase(conversation);
        
        // Remove from active conversations
        this.activeConversations.delete(callId);
        
        this.app.log.info(`Conversation ended for call: ${callId}`);
      }
    } catch (error) {
      this.app.log.error('Error ending conversation:', error);
    }
  }

  async getActiveConversationsCount(): Promise<number> {
    return this.activeConversations.size;
  }

  async getActiveConversations(): Promise<ConversationContext[]> {
    return Array.from(this.activeConversations.values());
  }

  private async saveConversationToDatabase(conversation: ConversationContext): Promise<void> {
    try {
      await this.prisma.$executeRaw`
        INSERT INTO conversations (id, call_id, caller_info, conversation_history, current_state, metadata, created_at, updated_at)
        VALUES (
          ${conversation.id},
          ${conversation.callId},
          ${JSON.stringify(conversation.callerInfo)},
          ${JSON.stringify(conversation.conversationHistory)},
          ${JSON.stringify(conversation.currentState)},
          ${JSON.stringify(conversation.metadata)},
          ${conversation.createdAt},
          ${conversation.updatedAt}
        );
      `;
    } catch (error) {
      this.app.log.error('Error saving conversation to database:', error);
      throw error;
    }
  }

  private async saveTurnToDatabase(conversationId: string, turn: ConversationTurn): Promise<void> {
    try {
      await this.prisma.$executeRaw`
        INSERT INTO conversation_turns (id, conversation_id, speaker, message, timestamp, intent, entities, confidence, metadata)
        VALUES (
          ${turn.id},
          ${conversationId},
          ${turn.speaker},
          ${turn.message},
          ${turn.timestamp},
          ${turn.intent || null},
          ${JSON.stringify(turn.entities || {})},
          ${turn.confidence || null},
          ${JSON.stringify({})}
        );
      `;
    } catch (error) {
      this.app.log.error('Error saving turn to database:', error);
      throw error;
    }
  }

  private async updateConversationInDatabase(conversation: ConversationContext): Promise<void> {
    try {
      await this.prisma.$executeRaw`
        UPDATE conversations
        SET conversation_history = ${JSON.stringify(conversation.conversationHistory)},
            current_state = ${JSON.stringify(conversation.currentState)},
            metadata = ${JSON.stringify(conversation.metadata)},
            updated_at = ${conversation.updatedAt}
        WHERE id = ${conversation.id};
      `;
    } catch (error) {
      this.app.log.error('Error updating conversation in database:', error);
      throw error;
    }
  }

  private async loadConversationFromDatabase(callId: string): Promise<ConversationContext | null> {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT * FROM conversations WHERE call_id = ${callId} ORDER BY created_at DESC LIMIT 1;
      `;

      if (result && (result as any[]).length > 0) {
        const dbConversation = (result as any[])[0];
        
        // Load conversation turns
        const turns = await this.prisma.$queryRaw`
          SELECT * FROM conversation_turns 
          WHERE conversation_id = ${dbConversation.id}
          ORDER BY timestamp ASC;
        `;

        return {
          id: dbConversation.id,
          callId: dbConversation.call_id,
          callerInfo: dbConversation.caller_info,
          conversationHistory: (turns as any[]).map((turn: any) => ({
            id: turn.id,
            speaker: turn.speaker,
            message: turn.message,
            timestamp: new Date(turn.timestamp),
            intent: turn.intent,
            entities: turn.entities,
            confidence: turn.confidence
          })),
          currentState: dbConversation.current_state,
          metadata: dbConversation.metadata,
          createdAt: new Date(dbConversation.created_at),
          updatedAt: new Date(dbConversation.updated_at)
        };
      }

      return null;
    } catch (error) {
      this.app.log.error('Error loading conversation from database:', error);
      return null;
    }
  }

  async cleanup(): Promise<void> {
    try {
      await this.prisma.$disconnect();
      this.activeConversations.clear();
      this.isInitialized = false;
    } catch (error) {
      this.app.log.error('Error during conversation manager cleanup:', error);
    }
  }
} 