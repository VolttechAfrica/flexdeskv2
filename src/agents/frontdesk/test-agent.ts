#!/usr/bin/env node

import { FastifyInstance } from 'fastify';
import { FrontDeskAgentManager } from './index.js';

async function testAgent() {
  try {
    console.log('🧪 Testing Front Desk AI Agent...');
    
    // Create a mock Fastify instance for testing
    const mockApp = {
      log: {
        info: (msg: string) => console.log(`ℹ️  ${msg}`),
        error: (msg: string, error?: any) => console.error(`❌ ${msg}`, error),
        warn: (msg: string) => console.warn(`⚠️  ${msg}`)
      },
      prisma: null
    } as any;

    // Initialize the agent manager
    const agentManager = new FrontDeskAgentManager(mockApp);
    await agentManager.initialize();
    
    console.log('✅ Agent initialized successfully');
    
    // Test agent status
    const status = await agentManager.getAgentStatus();
    console.log('📊 Agent Status:', status);
    
    console.log('🎉 All tests passed!');
    
  } catch (error) {
    console.error('💥 Test failed:', error);
    process.exit(1);
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testAgent();
}

export { testAgent }; 