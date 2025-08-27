#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

// Load environment variables
config();

const prisma = new PrismaClient();

async function initializeFrontDeskAgent() {
  try {
    console.log('🚀 Initializing Front Desk AI Agent System...\n');

    // Check database connection
    console.log('📊 Checking database connection...');
    await prisma.$connect();
    console.log('✅ Database connection successful\n');

    // Check pgvector extension
    console.log('🔍 Checking pgvector extension...');
    try {
      const vectorCheck = await prisma.$queryRaw`
        SELECT * FROM pg_extension WHERE extname = 'vector';
      `;
      
      if (vectorCheck && (vectorCheck as any[]).length > 0) {
        console.log('✅ pgvector extension is available');
      } else {
        console.log('⚠️  pgvector extension not found. Some RAG features may not work.');
        console.log('   To install: CREATE EXTENSION IF NOT EXISTS vector;');
      }
    } catch (error) {
      console.log('⚠️  Could not check pgvector extension:', error);
    }
    console.log('');

    // Create vector tables
    console.log('🏗️  Creating vector tables...');
    try {
      await createVectorTables();
      console.log('✅ Vector tables created successfully\n');
    } catch (error) {
      console.log('⚠️  Could not create vector tables:', error);
    }

    // Create payment tables
    console.log('💰 Creating payment tables...');
    try {
      await createPaymentTables();
      console.log('✅ Payment tables created successfully\n');
    } catch (error) {
      console.log('⚠️  Could not create payment tables:', error);
    }

    // Create security tables
    console.log('🔒 Creating security tables...');
    try {
      await createSecurityTables();
      console.log('✅ Security tables created successfully\n');
    } catch (error) {
      console.log('⚠️  Could not create security tables:', error);
    }

    // Create conversation tables
    console.log('💬 Creating conversation tables...');
    try {
      await createConversationTables();
      console.log('✅ Conversation tables created successfully\n');
    } catch (error) {
      console.log('⚠️  Could not create conversation tables:', error);
    }

    // Create call tables
    console.log('📞 Creating call tables...');
    try {
      await createCallTables();
      console.log('✅ Call tables created successfully\n');
    } catch (error) {
      console.log('⚠️  Could not create call tables:', error);
    }

    // Insert sample data
    console.log('📝 Inserting sample data...');
    try {
      await insertSampleData();
      console.log('✅ Sample data inserted successfully\n');
    } catch (error) {
      console.log('⚠️  Could not insert sample data:', error);
    }

    console.log('🎉 Front Desk AI Agent System initialization completed!');
    console.log('\n📋 Next steps:');
    console.log('   1. Configure your environment variables');
    console.log('   2. Set up your LLM API keys');
    console.log('   3. Start the application with: npm run dev');
    console.log('   4. Test the agent endpoints');

  } catch (error) {
    console.error('❌ Initialization failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function createVectorTables() {
  // School information vector table
  await prisma.$executeRaw`
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
  await prisma.$executeRaw`
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
  await prisma.$executeRaw`
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

  // Create indexes
  await prisma.$executeRaw`
    CREATE INDEX IF NOT EXISTS idx_school_vectors_school_id ON school_vectors(school_id);
    CREATE INDEX IF NOT EXISTS idx_student_vectors_student_id ON student_vectors(student_id);
    CREATE INDEX IF NOT EXISTS idx_knowledge_vectors_category ON knowledge_vectors(category);
  `;
}

async function createPaymentTables() {
  // Payment requests table
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS payment_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id VARCHAR(100) NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      description TEXT NOT NULL,
      parent_email VARCHAR(100) NOT NULL,
      currency VARCHAR(3) DEFAULT 'NGN',
      due_date TIMESTAMP,
      status VARCHAR(50) DEFAULT 'PENDING',
      payment_link VARCHAR(500),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `;

  // Scheduled callbacks table
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS scheduled_callbacks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      ticket_id UUID NOT NULL,
      phone_number VARCHAR(20) NOT NULL,
      preferred_time TIMESTAMP NOT NULL,
      description TEXT,
      priority VARCHAR(20) DEFAULT 'MEDIUM',
      status VARCHAR(50) DEFAULT 'SCHEDULED',
      executed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `;

  // Create indexes
  await prisma.$executeRaw`
    CREATE INDEX IF NOT EXISTS idx_payment_requests_student_id ON payment_requests(student_id);
    CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON payment_requests(status);
    CREATE INDEX IF NOT EXISTS idx_scheduled_callbacks_ticket_id ON scheduled_callbacks(ticket_id);
    CREATE INDEX IF NOT EXISTS idx_scheduled_callbacks_status ON scheduled_callbacks(status);
  `;
}

async function createSecurityTables() {
  // Security alerts table
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS security_alerts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      type VARCHAR(100) NOT NULL,
      level VARCHAR(50) NOT NULL,
      description TEXT NOT NULL,
      call_data JSONB,
      timestamp TIMESTAMP DEFAULT NOW(),
      status VARCHAR(50) DEFAULT 'OPEN',
      assigned_to VARCHAR(100),
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `;

  // Fraud detection logs table
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS fraud_detection_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      call_id VARCHAR(100),
      caller_phone VARCHAR(20),
      risk_score DECIMAL(3,2),
      detected_patterns TEXT[],
      action_taken VARCHAR(100),
      timestamp TIMESTAMP DEFAULT NOW(),
      metadata JSONB
    );
  `;

  // Create indexes
  await prisma.$executeRaw`
    CREATE INDEX IF NOT EXISTS idx_security_alerts_type ON security_alerts(type);
    CREATE INDEX IF NOT EXISTS idx_security_alerts_level ON security_alerts(level);
    CREATE INDEX IF NOT EXISTS idx_security_alerts_status ON security_alerts(status);
    CREATE INDEX IF NOT EXISTS idx_fraud_logs_call_id ON fraud_detection_logs(call_id);
    CREATE INDEX IF NOT EXISTS idx_fraud_logs_risk_score ON fraud_detection_logs(risk_score);
  `;
}

async function createConversationTables() {
  // Conversations table
  await prisma.$executeRaw`
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

  // Conversation turns table
  await prisma.$executeRaw`
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
  await prisma.$executeRaw`
    CREATE INDEX IF NOT EXISTS idx_conversations_call_id ON conversations(call_id);
    CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at);
    CREATE INDEX IF NOT EXISTS idx_conversation_turns_conversation_id ON conversation_turns(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_conversation_turns_timestamp ON conversation_turns(timestamp);
  `;
}

async function createCallTables() {
  // Calls table
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS calls (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      call_id VARCHAR(100) UNIQUE NOT NULL,
      status VARCHAR(50) NOT NULL,
      caller_info JSONB NOT NULL,
      user_query TEXT NOT NULL,
      timestamp TIMESTAMP DEFAULT NOW(),
      duration INTEGER,
      recording_url VARCHAR(500),
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `;

  // Call logs table
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS call_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      call_id VARCHAR(100) NOT NULL,
      action VARCHAR(100) NOT NULL,
      details JSONB,
      timestamp TIMESTAMP DEFAULT NOW(),
      metadata JSONB DEFAULT '{}'
    );
  `;

  // Outgoing call logs table
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS outgoing_call_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      call_id VARCHAR(100) NOT NULL,
      target_phone VARCHAR(20) NOT NULL,
      purpose TEXT,
      result JSONB,
      timestamp TIMESTAMP DEFAULT NOW(),
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `;

  // Create indexes
  await prisma.$executeRaw`
    CREATE INDEX IF NOT EXISTS idx_calls_call_id ON calls(call_id);
    CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);
    CREATE INDEX IF NOT EXISTS idx_calls_timestamp ON calls(timestamp);
    CREATE INDEX IF NOT EXISTS idx_call_logs_call_id ON call_logs(call_id);
    CREATE INDEX IF NOT EXISTS idx_call_logs_timestamp ON call_logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_outgoing_call_logs_call_id ON outgoing_call_logs(call_id);
  `;
}

async function insertSampleData() {
  // Insert sample knowledge vectors
  await prisma.$executeRaw`
    INSERT INTO knowledge_vectors (content, content_type, category, metadata) VALUES
    ('School fees can be paid online through our secure payment portal. We accept credit cards, debit cards, and bank transfers.', 'payment_info', 'fees', '{"source": "system", "priority": "high"}'),
    ('Parents can access their child''s academic records, attendance, and progress reports through the parent portal.', 'academic_info', 'records', '{"source": "system", "priority": "medium"}'),
    ('For technical support or general inquiries, please contact our support team or create a support ticket through the system.', 'support_info', 'general', '{"source": "system", "priority": "medium"}'),
    ('School hours are from 8:00 AM to 3:00 PM Monday through Friday. Early drop-off and late pick-up services are available.', 'operational_info', 'hours', '{"source": "system", "priority": "low"}'),
    ('Emergency contacts should be updated annually. Please ensure all contact information is current and accurate.', 'operational_info', 'emergency', '{"source": "system", "priority": "high"}')
    ON CONFLICT DO NOTHING;
  `;

  console.log('   - Sample knowledge vectors inserted');
}

// Run initialization if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeFrontDeskAgent();
}

export { initializeFrontDeskAgent }; 