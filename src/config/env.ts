import dotenv from 'dotenv';

dotenv.config();

const env = {
  port: parseInt(process.env.PORT || '8000', 10),
  env: process.env.NODE_ENV || 'development',
  db: {
    connectionString: process.env.DB_CONNECTION_STRING
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expire: process.env.JWT_EXPIRATION

  },

  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD,
    username: process.env.REDIS_USER,
    tlsEnabled: true
  },
  email: {
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
  },
  
  datadog: {
    apiKey: process.env.DD_API_KEY,
    appKey: process.env.DD_APP_KEY,
    host: process.env.DD_AGENT_HOST || 'localhost',
    port: parseInt(process.env.DD_AGENT_PORT || '8125'),
  },
  
  // AI Agent Configuration
  ai: {
    // LLM Provider Configuration
    provider: process.env.LLM_PROVIDER || 'openai',
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-4',
      baseUrl: process.env.OPENAI_BASE_URL
    },
    gemini: {
      apiKey: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL || 'gemini-pro'
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: process.env.ANTHROPIC_MODEL || 'claude-3-sonnet-20240229'
    },
    
    // Vector Database Configuration
    vectorDb: {
      host: process.env.VECTOR_DB_HOST || process.env.DB_HOST,
      port: parseInt(process.env.VECTOR_DB_PORT || '5432'),
      database: process.env.VECTOR_DB_NAME || process.env.DB_NAME,
      username: process.env.VECTOR_DB_USER || process.env.DB_USER,
      password: process.env.VECTOR_DB_PASSWORD || process.env.DB_PASSWORD,
      ssl: process.env.VECTOR_DB_SSL === 'true'
    },
    
    // RAG Configuration
    rag: {
      embeddingModel: process.env.EMBEDDING_MODEL || 'text-embedding-ada-002',
      chunkSize: parseInt(process.env.RAG_CHUNK_SIZE || '1000'),
      chunkOverlap: parseInt(process.env.RAG_CHUNK_OVERLAP || '200'),
      maxResults: parseInt(process.env.RAG_MAX_RESULTS || '5'),
      similarityThreshold: parseFloat(process.env.RAG_SIMILARITY_THRESHOLD || '0.7')
    },
    
    // Security Configuration
    security: {
      fraudDetectionEnabled: process.env.FRAUD_DETECTION_ENABLED === 'true',
      suspiciousPatternThreshold: parseFloat(process.env.SUSPICIOUS_PATTERN_THRESHOLD || '0.8'),
      maxSuspiciousActivities: parseInt(process.env.MAX_SUSPICIOUS_ACTIVITIES || '3'),
      blockDurationDays: parseInt(process.env.BLOCK_DURATION_DAYS || '7')
    },
    
    // Call Management Configuration
    calls: {
      maxConcurrentCalls: parseInt(process.env.MAX_CONCURRENT_CALLS || '10'),
      callTimeoutSeconds: parseInt(process.env.CALL_TIMEOUT_SECONDS || '300'),
      recordingEnabled: process.env.CALL_RECORDING_ENABLED === 'true',
      recordingRetentionDays: parseInt(process.env.CALL_RECORDING_RETENTION_DAYS || '30')
    },
    
    // Payment Configuration
    payment: {
      enabled: process.env.PAYMENT_PROCESSING_ENABLED === 'true',
      baseUrl: process.env.PAYMENT_BASE_URL || 'https://payments.flexdesk.com',
      webhookSecret: process.env.PAYMENT_WEBHOOK_SECRET,
      supportedCurrencies: (process.env.SUPPORTED_CURRENCIES || 'NGN,USD,EUR').split(',')
    }
  },

  // Twilio Configuration
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || '+13252412472',
    webhookBaseUrl: process.env.TWILIO_WEBHOOK_BASE_URL || `https://${process.env.SERVER_DOMAIN || 'localhost:8000'}`,
    voiceSettings: {
      language: process.env.TWILIO_VOICE_LANGUAGE || 'en-US',
      gender: process.env.TWILIO_VOICE_GENDER || 'dynamic',
      speed: process.env.TWILIO_VOICE_SPEED || 'normal'
    }
  }
};

export default env;