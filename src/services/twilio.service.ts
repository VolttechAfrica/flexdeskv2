import { FastifyInstance } from 'fastify';
import { Twilio } from 'twilio';
import env from '../config/env.js';
import { FrontDeskAgentManager } from '../agents/frontdesk/index.js';
import { CallData, CallStatus } from '../agents/frontdesk/types.js';

export interface TwilioCallData {
  CallSid: string;
  From: string;
  To: string;
  CallStatus: string;
  RecordingUrl?: string;
  RecordingDuration?: string;
  Digits?: string;
  SpeechResult?: string;
  Confidence?: string;
}

export interface TwiMLResponse {
  twiml: string;
  status: number;
}

export class TwilioService {
  private app: FastifyInstance;
  private twilio: Twilio;
  private agentManager: FrontDeskAgentManager;
  private isInitialized: boolean = false;

  constructor(app: FastifyInstance, agentManager: FrontDeskAgentManager) {
    this.app = app;
    this.twilio = new Twilio(env.twilio.accountSid, env.twilio.authToken);
    this.agentManager = agentManager;
  }

  async initialize(): Promise<void> {
    try {
      if (!env.twilio.accountSid || !env.twilio.authToken) {
        throw new Error('Twilio credentials not configured');
      }

      this.isInitialized = true;
      this.app.log.info('Twilio Service initialized successfully');
    } catch (error: any) {
      this.app.log.error('Failed to initialize Twilio Service:', error);
      throw error as any;
    }
  }

  async handleIncomingCall(callData: TwilioCallData): Promise<TwiMLResponse> {
    try {
      if (!this.isInitialized) {
        throw new Error('Twilio Service not initialized');
      }

      this.app.log.info(`Incoming call from ${callData.From} to ${callData.To}`);

      // Generate dynamic greeting using LLM
      const greeting = await this.generateDynamicGreeting();
      
      const twiml = this.generateTwiML(`
        <Response>
          <Say voice="Polly.Amy-Neural">${greeting}</Say>
          <Say voice="Polly.Amy-Neural">I'm here to help you with any school-related questions or assistance you need.</Say>
          <Say voice="Polly.Amy-Neural">You can either tell me what you need help with, or use the keypad options below.</Say>
          <Gather 
            input="speech dtmf" 
            timeout="15" 
            speechTimeout="auto" 
            action="${env.twilio.webhookBaseUrl}/twilio/gather" 
            method="POST"
            recordingStatusCallback="${env.twilio.webhookBaseUrl}/twilio/recording-status"
            recordingStatusCallbackEvent="completed"
            recordingStatusCallbackMethod="POST">
            <Say voice="Polly.Amy-Neural">For quick access, press 1 for school information, 2 for payments, 3 for student records, or 4 for support.</Say>
            <Say voice="Polly.Amy-Neural">Or simply tell me what you need, and I'll help you right away.</Say>
          </Gather>
          <Say voice="Polly.Amy-Neural">I didn't hear anything. Please call back and I'll be happy to assist you.</Say>
        </Response>
      `);

      return { twiml, status: 200 };
    } catch (error: any) {
      this.app.log.error('Error handling incoming call:', error);
      return this.generateErrorResponse('I apologize, but I\'m experiencing some technical difficulties right now. Please try calling back in a few minutes.');
    }
  }

  async handleGatherInput(callData: TwilioCallData): Promise<TwiMLResponse> {
    try {
      if (!this.isInitialized) {
        throw new Error('Twilio Service not initialized');
      }

      let userQuery = '';
      let callPurpose = '';

      // Process DTMF input
      if (callData.Digits) {
        switch (callData.Digits) {
          case '1':
            callPurpose = 'school_inquiry';
            userQuery = 'I need information about a school';
            break;
          case '2':
            callPurpose = 'fee_payment';
            userQuery = 'I want to pay school fees';
            break;
          case '3':
            callPurpose = 'student_records';
            userQuery = 'I need information about student records';
            break;
          case '4':
            callPurpose = 'technical_support';
            userQuery = 'I need technical support';
            break;
          default:
            callPurpose = 'general_inquiry';
            userQuery = 'General inquiry';
        }
      } else if (callData.SpeechResult) {
        // Process speech input
        userQuery = callData.SpeechResult;
        callPurpose = await this.analyzeSpeechIntent(callData.SpeechResult);
      }

      // Create call data for the AI agent
      const agentCallData: CallData = {
        id: callData.CallSid,
        status: CallStatus.INCOMING,
        callerInfo: {
          phoneNumber: callData.From,
          language: 'en-US'
        },
        userQuery,
        timestamp: new Date(),
        metadata: {
          twilioCallSid: callData.CallSid,
          callPurpose,
          speechConfidence: callData.Confidence
        }
      };

      // Process with AI agent
      const agentResponse = await this.agentManager.handleIncomingCall(agentCallData);

      // Generate dynamic TwiML response based on agent response
      return this.generateDynamicAgentResponse(agentResponse, callData.CallSid);

    } catch (error: any) {
      this.app.log.error('Error handling gather input:', error);
      return this.generateErrorResponse('I encountered an error processing your request. Let me create a support ticket for you and our team will contact you shortly.');
    }
  }

  async handleCallStatus(callData: TwilioCallData): Promise<void> {
    try {
      if (!this.isInitialized) {
        throw new Error('Twilio Service not initialized');
      }

      this.app.log.info(`Call status update: ${callData.CallSid} - ${callData.CallStatus}`);

      // Update call status in the system
      if (callData.CallStatus === 'completed') {
        await this.agentManager['callHandler'].updateCallStatus(
          callData.CallSid,
          CallStatus.COMPLETED,
          {
            duration: callData.RecordingDuration ? parseInt(callData.RecordingDuration) : undefined,
            recordingUrl: callData.RecordingUrl
          }
        );
      }

    } catch (error: any) {
      this.app.log.error('Error handling call status:', error);
    }
  }

  async handleRecordingStatus(recordingData: any): Promise<void> {
    try {
      if (!this.isInitialized) {
        throw new Error('Twilio Service not initialized');
      }

      this.app.log.info(`Recording completed: ${recordingData.RecordingSid}`);

      // Store recording information
      if (recordingData.RecordingUrl) {
        await this.storeRecordingInfo(recordingData);
      }

    } catch (error: any) {
      this.app.log.error('Error handling recording status:', error);
    }
  }

  private async analyzeSpeechIntent(speechText: string): Promise<string> {
    try {
      const text = speechText.toLowerCase();
      
      if (text.includes('school') || text.includes('academy') || text.includes('college')) {
        return 'school_inquiry';
      } else if (text.includes('pay') || text.includes('fee') || text.includes('payment')) {
        return 'fee_payment';
      } else if (text.includes('student') || text.includes('record') || text.includes('grade')) {
        return 'student_records';
      } else if (text.includes('help') || text.includes('support') || text.includes('technical')) {
        return 'technical_support';
      } else {
        return 'general_inquiry';
      }
    } catch (error: any) {
      this.app.log.error('Error analyzing speech intent:', error);
      return 'general_inquiry';
    }
  }

  private async generateDynamicGreeting(): Promise<string> {
    try {
      // Use MCP to get dynamic greeting
      const greeting = await this.agentManager['agent']['llmService'].generateDynamicGreeting();
      return greeting;
    } catch (error: any) {
      // Fallback greeting
      const greetings = [
        "Hello! Welcome to FlexDesk School Management System.",
        "Hi there! I'm your AI assistant, ready to help with any school-related questions.",
        "Good day! Thank you for calling FlexDesk. How can I assist you today?",
        "Welcome! I'm here to help you with school information and support."
      ];
      return greetings[Math.floor(Math.random() * greetings.length)];
    }
  }

  private generateDynamicAgentResponse(agentResponse: any, callSid: string): TwiMLResponse {
    try {
      if (!agentResponse.success) {
        // Handle unsuccessful responses
        if (agentResponse.fallback) {
          return this.generateFallbackResponse(callSid);
        } else {
          return this.generateErrorResponse(agentResponse.message || 'I encountered an issue. Let me create a support ticket for you.');
        }
      }

      // Generate dynamic response using LLM
      const response = this.generateTwiML(`
        <Response>
          <Say voice="Polly.Amy-Neural">${agentResponse.response || 'I understand your request and I\'m here to help.'}</Say>
          <Say voice="Polly.Amy-Neural">Is there anything else I can assist you with today?</Say>
          <Gather 
            input="speech" 
            timeout="15" 
            action="${env.twilio.webhookBaseUrl}/twilio/gather" 
            method="POST">
          </Gather>
          <Say voice="Polly.Amy-Neural">Thank you for calling. Have a wonderful day!</Say>
        </Response>
      `);

      return { twiml: response, status: 200 };
    } catch (error: any) {
      this.app.log.error('Error generating agent response:', error);
      return this.generateErrorResponse('I encountered an error. Let me create a support ticket for you.');
    }
  }

  private generateFallbackResponse(callSid: string): TwiMLResponse {
    const twiml = this.generateTwiML(`
      <Response>
        <Say voice="Polly.Amy-Neural">I'm having trouble understanding your request right now.</Say>
        <Say voice="Polly.Amy-Neural">Let me create a support ticket so our team can assist you better.</Say>
        <Say voice="Polly.Amy-Neural">Please hold while I process this for you.</Say>
        <Pause length="2"/>
        <Say voice="Polly.Amy-Neural">I've created a support ticket and our team will contact you within 24 hours.</Say>
        <Say voice="Polly.Amy-Neural">Thank you for calling. Have a great day!</Say>
      </Response>
    `);

    return { twiml, status: 200 };
  }

  private generateErrorResponse(message: string): TwiMLResponse {
    const twiml = this.generateTwiML(`
      <Response>
        <Say voice="Polly.Amy-Neural">${message}</Say>
        <Say voice="Polly.Amy-Neural">I've created a support ticket for you.</Say>
        <Say voice="Polly.Amy-Neural">Our team will contact you shortly to resolve this issue.</Say>
        <Say voice="Polly.Amy-Neural">Thank you for calling. Have a great day!</Say>
      </Response>
    `);

    return { twiml, status: 200 };
  }

  private generateTwiML(content: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>${content}`;
  }

  private async storeRecordingInfo(recordingData: any): Promise<void> {
    try {
      // Store recording information in database using the agent manager's database connection
      // This will be handled by the call handler when updating call status
      this.app.log.info(`Recording URL stored: ${recordingData.RecordingUrl}`);
    } catch (error: any) {
      this.app.log.error('Error storing recording info:', error);
    }
  }

  async makeOutgoingCall(to: string, message: string): Promise<any> {
    try {
      if (!this.isInitialized) {
        throw new Error('Twilio Service not initialized');
      }

      const call = await this.twilio.calls.create({
        url: `${env.twilio.webhookBaseUrl}/twilio/outgoing`,
        to,
        from: env.twilio.phoneNumber,
        record: true,
        statusCallback: `${env.twilio.webhookBaseUrl}/twilio/call-status`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        statusCallbackMethod: 'POST'
      });

      this.app.log.info(`Outgoing call initiated: ${call.sid} to ${to}`);
      return call;
    } catch (error: any) {
      this.app.log.error('Error making outgoing call:', error);
      throw error as any;
    }
  }

  async cleanup(): Promise<void> {
    try {
      this.isInitialized = false;
    } catch (error: any) {
      this.app.log.error('Error during Twilio service cleanup:', error);
    }
  }
} 