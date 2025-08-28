import { FastifyInstance } from 'fastify';
import { CallData, CallStatus } from './types.js';
import { ConversationManager } from './conversation-manager.js';
import { SecurityManager } from './security-manager.js';
import { PrismaClient } from '@prisma/client';

export class CallHandler {
  private app: FastifyInstance;
  private prisma: PrismaClient;
  private conversationManager: ConversationManager;
  private securityManager: SecurityManager;
  private activeCalls: Map<string, CallData>;
  private isInitialized: boolean = false;

  constructor(
    app: FastifyInstance,
    conversationManager: ConversationManager,
    securityManager: SecurityManager
  ) {
    this.app = app;
    this.prisma = new PrismaClient();
    this.conversationManager = conversationManager;
    this.securityManager = securityManager;
    this.activeCalls = new Map();
  }

  async initialize(): Promise<void> {
    try {
      await this.createCallTables();
      this.isInitialized = true;
      this.app.log.info('Call Handler initialized successfully');
    } catch (error: any) {
      this.app.log.error('Failed to initialize Call Handler:', error);
      throw error as any;
    }
  }

  private async createCallTables(): Promise<void> {
    try {
      // Create calls table
      await this.prisma.$executeRaw`
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

      // Create call logs table
      await this.prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS call_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          call_id VARCHAR(100) NOT NULL,
          action VARCHAR(100) NOT NULL,
          details JSONB,
          timestamp TIMESTAMP DEFAULT NOW(),
          metadata JSONB DEFAULT '{}'
        );
      `;

      // Create indexes
      await this.prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS idx_calls_call_id ON calls(call_id);
        CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);
        CREATE INDEX IF NOT EXISTS idx_calls_timestamp ON calls(timestamp);
        CREATE INDEX IF NOT EXISTS idx_call_logs_call_id ON call_logs(call_id);
        CREATE INDEX IF NOT EXISTS idx_call_logs_timestamp ON call_logs(timestamp);
      `;

    } catch (error: any) {
      this.app.log.warn('Could not create call tables:', error);
    }
  }

  async handleIncomingCall(callData: Omit<CallData, 'id' | 'timestamp'>): Promise<CallData> {
    try {
      if (!this.isInitialized) {
        throw new Error('Call Handler not initialized');
      }

      const callId = crypto.randomUUID();
      const timestamp = new Date();

      const fullCallData: CallData = {
        ...callData,
        id: callId,
        timestamp,
        status: CallStatus.INCOMING
      };

      // Store call in memory
      this.activeCalls.set(callId, fullCallData);

      // Log call to database
      await this.logCallToDatabase(fullCallData);

      // Start conversation
      await this.conversationManager.startConversation(callId, callData.callerInfo);

      // Log the incoming call action
      await this.logCallAction(callId, 'INCOMING_CALL_RECEIVED', {
        callerPhone: callData.callerInfo.phoneNumber,
        userQuery: callData.userQuery
      });

      this.app.log.info(`Incoming call handled: ${callId}`);
      return fullCallData;
    } catch (error: any) {
      this.app.log.error('Error handling incoming call:', error);
      throw error as any;
    }
  }

  async makeOutgoingCall(callData: Omit<CallData, 'id' | 'timestamp' | 'status'>): Promise<CallData> {
    try {
      if (!this.isInitialized) {
        throw new Error('Call Handler not initialized');
      }

      const callId = crypto.randomUUID();
      const timestamp = new Date();

      const fullCallData: CallData = {
        ...callData,
        id: callId,
        timestamp,
        status: CallStatus.OUTGOING
      };

      // Store call in memory
      this.activeCalls.set(callId, fullCallData);

      // Log call to database
      await this.logCallToDatabase(fullCallData);

      // Log the outgoing call action
      await this.logCallAction(callId, 'OUTGOING_CALL_INITIATED', {
        targetPhone: callData.callerInfo.phoneNumber,
        purpose: callData.userQuery
      });

      this.app.log.info(`Outgoing call initiated: ${callId}`);
      return fullCallData;
    } catch (error: any) {
      this.app.log.error('Error making outgoing call:', error);
      throw error as any;
    }
  }

  async updateCallStatus(callId: string, status: CallStatus, additionalData?: {
    duration?: number;
    recordingUrl?: string;
  }): Promise<void> {
    try {
      if (!this.isInitialized) {
        throw new Error('Call Handler not initialized');
      }

      const call = this.activeCalls.get(callId);
      if (call) {
        call.status = status;
        // Add updatedAt to metadata since it's not in the interface
        call.metadata = { ...call.metadata, updatedAt: new Date() };
        
        if (additionalData?.duration) {
          call.duration = additionalData.duration;
        }
        if (additionalData?.recordingUrl) {
          call.recordingUrl = additionalData.recordingUrl;
        }

        // Update in database
        await this.updateCallInDatabase(callId, status, additionalData);

        // Log the status change
        await this.logCallAction(callId, 'CALL_STATUS_UPDATED', {
          newStatus: status,
          additionalData
        });

        // If call is completed, remove from active calls
        if (status === CallStatus.COMPLETED || status === CallStatus.FAILED) {
          this.activeCalls.delete(callId);
          
          // End conversation
          await this.conversationManager.endConversation(callId);
        }
      }
    } catch (error: any) {
      this.app.log.error('Error updating call status:', error);
      throw error as any;
    }
  }

  async getCall(callId: string): Promise<CallData | null> {
    try {
      if (!this.isInitialized) {
        throw new Error('Call Handler not initialized');
      }

      // Check memory first
      let call: CallData | null = this.activeCalls.get(callId) || null;
      
      if (!call) {
        // Load from database
        call = await this.loadCallFromDatabase(callId);
      }

      return call;
    } catch (error: any) {
      this.app.log.error('Error getting call:', error);
      return null;
    }
  }

  async getActiveCallsCount(): Promise<number> {
    return this.activeCalls.size;
  }

  async getActiveCalls(): Promise<CallData[]> {
    return Array.from(this.activeCalls.values());
  }

  async getCallHistory(phoneNumber: string, limit: number = 10): Promise<CallData[]> {
    try {
      if (!this.isInitialized) {
        throw new Error('Call Handler not initialized');
      }

      const result = await this.prisma.$queryRaw`
        SELECT * FROM calls 
        WHERE caller_info->>'phoneNumber' = ${phoneNumber}
        ORDER BY timestamp DESC 
        LIMIT ${limit};
      `;

      return (result as any[]).map((call: any) => ({
        id: call.id,
        status: call.status as CallStatus,
        callerInfo: call.caller_info,
        userQuery: call.user_query,
        timestamp: new Date(call.timestamp),
        duration: call.duration,
        recordingUrl: call.recording_url,
        metadata: call.metadata
      }));
    } catch (error: any) {
      this.app.log.error('Error getting call history:', error);
      return [];
    }
  }

  async scheduleCallback(callbackData: {
    phoneNumber: string;
    preferredTime: string;
    purpose: string;
    priority?: string;
  }): Promise<string> {
    try {
      if (!this.isInitialized) {
        throw new Error('Call Handler not initialized');
      }

      const callId = crypto.randomUUID();
      const timestamp = new Date();

      const scheduledCall: CallData = {
        id: callId,
        status: CallStatus.SCHEDULED,
        callerInfo: {
          phoneNumber: callbackData.phoneNumber,
          preferredTime: callbackData.preferredTime
        },
        userQuery: callbackData.purpose,
        timestamp,
        metadata: {
          type: 'callback',
          priority: callbackData.priority || 'MEDIUM',
          scheduledTime: callbackData.preferredTime
        }
      };

      // Store in database
      await this.logCallToDatabase(scheduledCall);

      // Log the callback scheduling
      await this.logCallAction(callId, 'CALLBACK_SCHEDULED', {
        targetPhone: callbackData.phoneNumber,
        scheduledTime: callbackData.preferredTime,
        purpose: callbackData.purpose
      });

      this.app.log.info(`Callback scheduled: ${callId} for ${callbackData.phoneNumber}`);
      return callId;
    } catch (error: any) {
      this.app.log.error('Error scheduling callback:', error);
      throw error as any;
    }
  }

  async processScheduledCallbacks(): Promise<void> {
    try {
      if (!this.isInitialized) {
        throw new Error('Call Handler not initialized');
      }

      // Get all scheduled callbacks that are due
      const dueCallbacks = await this.prisma.$queryRaw`
        SELECT * FROM calls 
        WHERE status = 'SCHEDULED' 
        AND metadata->>'type' = 'callback'
        AND metadata->>'scheduledTime' <= NOW();
      `;

      for (const callback of (dueCallbacks as any[])) {
        try {
          // Update status to outgoing
          await this.updateCallStatus(callback.id, CallStatus.OUTGOING);
          
          // Log the callback execution
          await this.logCallAction(callback.id, 'CALLBACK_EXECUTED', {
            scheduledTime: callback.metadata?.scheduledTime,
            executedTime: new Date()
          });

          this.app.log.info(`Scheduled callback executed: ${callback.id}`);
        } catch (error: any) {
          this.app.log.error(`Error executing scheduled callback ${callback.id}:`, error);
        }
      }
    } catch (error: any) {
      this.app.log.error('Error processing scheduled callbacks:', error);
    }
  }

  private async logCallToDatabase(callData: CallData): Promise<void> {
    try {
      await this.prisma.$executeRaw`
        INSERT INTO calls (id, call_id, status, caller_info, user_query, timestamp, duration, recording_url, metadata, created_at, updated_at)
        VALUES (
          ${callData.id},
          ${callData.id},
          ${callData.status},
          ${JSON.stringify(callData.callerInfo)},
          ${callData.userQuery},
          ${callData.timestamp},
          ${callData.duration || null},
          ${callData.recordingUrl || null},
          ${JSON.stringify(callData.metadata || {})},
          ${callData.timestamp},
          ${callData.timestamp}
        );
      `;
    } catch (error: any) {
      this.app.log.error('Error logging call to database:', error);
      throw error as any;
    }
  }

  private async updateCallInDatabase(callId: string, status: CallStatus, additionalData?: any): Promise<void> {
    try {
      if (additionalData?.duration && additionalData?.recordingUrl) {
        await this.prisma.$executeRaw`
          UPDATE calls 
          SET status = ${status}, updated_at = NOW(), duration = ${additionalData.duration}, recording_url = ${additionalData.recordingUrl}
          WHERE call_id = ${callId}
        `;
      } else if (additionalData?.duration) {
        await this.prisma.$executeRaw`
          UPDATE calls 
          SET status = ${status}, updated_at = NOW(), duration = ${additionalData.duration}
          WHERE call_id = ${callId}
        `;
      } else if (additionalData?.recordingUrl) {
        await this.prisma.$executeRaw`
          UPDATE calls 
          SET status = ${status}, updated_at = NOW(), recording_url = ${additionalData.recordingUrl}
          WHERE call_id = ${callId}
        `;
      } else {
        await this.prisma.$executeRaw`
          UPDATE calls 
          SET status = ${status}, updated_at = NOW()
          WHERE call_id = ${callId}
        `;
      }
    } catch (error: any) {
      this.app.log.error('Error updating call in database:', error);
      throw error as any;
    }
  }

  private async logCallAction(callId: string, action: string, details?: any): Promise<void> {
    try {
      await this.prisma.$executeRaw`
        INSERT INTO call_logs (call_id, action, details, timestamp, metadata)
        VALUES (
          ${callId},
          ${action},
          ${JSON.stringify(details || {})},
          NOW(),
          ${JSON.stringify({ timestamp: new Date() })}
        );
      `;
    } catch (error: any) {
      this.app.log.error('Error logging call action:', error);
    }
  }

  private async loadCallFromDatabase(callId: string): Promise<CallData | null> {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT * FROM calls WHERE call_id = ${callId};
      `;

      if (result && (result as any[]).length > 0) {
        const dbCall = (result as any[])[0];
        return {
          id: dbCall.id,
          status: dbCall.status as CallStatus,
          callerInfo: dbCall.caller_info,
          userQuery: dbCall.user_query,
          timestamp: new Date(dbCall.timestamp),
          duration: dbCall.duration,
          recordingUrl: dbCall.recording_url,
          metadata: dbCall.metadata
        };
      }

      return null;
    } catch (error: any) {
      this.app.log.error('Error loading call from database:', error);
      return null;
    }
  }

  async cleanup(): Promise<void> {
    try {
      await this.prisma.$disconnect();
      this.activeCalls.clear();
      this.isInitialized = false;
    } catch (error: any) {
      this.app.log.error('Error during call handler cleanup:', error);
    }
  }
} 