import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { TwilioService } from '../services/twilio.service.js';
import { FrontDeskAgentManager } from '../agents/frontdesk/index.js';

interface TwilioWebhookRequest {
  Body: {
    CallSid: string;
    From: string;
    To: string;
    CallStatus: string;
    RecordingUrl?: string;
    RecordingDuration?: string;
    Digits?: string;
    SpeechResult?: string;
    Confidence?: string;
    [key: string]: any;
  };
}

interface OutgoingCallRequest {
  Body: {
    to: string;
    message: string;
    purpose?: string;
  };
}

export default async function twilioRoutes(fastify: FastifyInstance) {
  let twilioService: TwilioService;
  let agentManager: FrontDeskAgentManager;

  // Initialize services when routes are registered
  fastify.addHook('onReady', async () => {
    try {
      agentManager = new FrontDeskAgentManager(fastify);
      await agentManager.initialize();
      
      twilioService = new TwilioService(fastify, agentManager);
      await twilioService.initialize();
      
      fastify.log.info('Twilio routes initialized successfully');
    } catch (error) {
      fastify.log.error('Failed to initialize Twilio routes:', error);
    }
  });

  // Handle incoming calls
  fastify.post<TwilioWebhookRequest>(
    '/twilio/incoming',
    {
      schema: {
        body: {
          type: 'object',
          required: ['CallSid', 'From', 'To', 'CallStatus'],
          properties: {
            CallSid: { type: 'string' },
            From: { type: 'string' },
            To: { type: 'string' },
            CallStatus: { type: 'string' },
            RecordingUrl: { type: 'string' },
            RecordingDuration: { type: 'string' },
            Digits: { type: 'string' },
            SpeechResult: { type: 'string' },
            Confidence: { type: 'string' }
          }
        }
      }
    },
    async (request: FastifyRequest<TwilioWebhookRequest>, reply: FastifyReply) => {
      try {
        if (!twilioService) {
          return reply.status(503).send({
            error: 'Twilio service not initialized',
            timestamp: new Date()
          });
        }

        const callData = request.body;
        const response = await twilioService.handleIncomingCall(callData);

        // Set proper headers for Twilio
        reply.header('Content-Type', 'text/xml');
        return reply.status(response.status).send(response.twiml);
      } catch (error) {
        fastify.log.error('Error handling incoming call:', error);
        
        // Return error TwiML
        const errorTwiML = `<?xml version="1.0" encoding="UTF-8"?>
          <Response>
            <Say voice="Polly.Amy-Neural">I'm sorry, but I'm experiencing technical difficulties right now.</Say>
            <Say voice="Polly.Amy-Neural">Please try calling back in a few minutes or contact our support team directly.</Say>
            <Say voice="Polly.Amy-Neural">Thank you for your patience.</Say>
          </Response>`;
        
        reply.header('Content-Type', 'text/xml');
        return reply.status(200).send(errorTwiML);
      }
    }
  );

  // Handle gather input (user selections or speech)
  fastify.post<TwilioWebhookRequest>(
    '/twilio/gather',
    {
      schema: {
        body: {
          type: 'object',
          required: ['CallSid', 'From', 'To'],
          properties: {
            CallSid: { type: 'string' },
            From: { type: 'string' },
            To: { type: 'string' },
            CallStatus: { type: 'string' },
            Digits: { type: 'string' },
            SpeechResult: { type: 'string' },
            Confidence: { type: 'string' }
          }
        }
      }
    },
    async (request: FastifyRequest<TwilioWebhookRequest>, reply: FastifyReply) => {
      try {
        if (!twilioService) {
          return reply.status(503).send({
            error: 'Twilio service not initialized',
            timestamp: new Date()
          });
        }

        const callData = request.body;
        const response = await twilioService.handleGatherInput(callData);

        // Set proper headers for Twilio
        reply.header('Content-Type', 'text/xml');
        return reply.status(response.status).send(response.twiml);
      } catch (error) {
        fastify.log.error('Error handling gather input:', error);
        
        // Return error TwiML
        const errorTwiML = `<?xml version="1.0" encoding="UTF-8"?>
          <Response>
            <Say voice="Polly.Amy-Neural">I'm sorry, but I'm experiencing technical difficulties right now.</Say>
            <Say voice="Polly.Amy-Neural">I've created a support ticket for you and our team will contact you shortly.</Say>
            <Say voice="Polly.Amy-Neural">Thank you for calling. Have a great day!</Say>
          </Response>`;
        
        reply.header('Content-Type', 'text/xml');
        return reply.status(200).send(errorTwiML);
      }
    }
  );

  // Handle call status updates
  fastify.post<TwilioWebhookRequest>(
    '/twilio/call-status',
    {
      schema: {
        body: {
          type: 'object',
          required: ['CallSid', 'CallStatus'],
          properties: {
            CallSid: { type: 'string' },
            CallStatus: { type: 'string' },
            From: { type: 'string' },
            To: { type: 'string' },
            RecordingUrl: { type: 'string' },
            RecordingDuration: { type: 'string' }
          }
        }
      }
    },
    async (request: FastifyRequest<TwilioWebhookRequest>, reply: FastifyReply) => {
      try {
        if (!twilioService) {
          return reply.status(503).send({
            error: 'Twilio service not initialized',
            timestamp: new Date()
          });
        }

        const callData = request.body;
        await twilioService.handleCallStatus(callData);

        return reply.status(200).send({ success: true });
      } catch (error) {
        fastify.log.error('Error handling call status:', error);
        return reply.status(500).send({
          error: 'Failed to process call status',
          timestamp: new Date()
        });
      }
    }
  );

  // Handle recording status updates
  fastify.post(
    '/twilio/recording-status',
    {
      schema: {
        body: {
          type: 'object',
          required: ['RecordingSid', 'RecordingUrl', 'CallSid'],
          properties: {
            RecordingSid: { type: 'string' },
            RecordingUrl: { type: 'string' },
            CallSid: { type: 'string' },
            RecordingStatus: { type: 'string' },
            RecordingDuration: { type: 'string' }
          }
        }
      }
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        if (!twilioService) {
          return reply.status(503).send({
            error: 'Twilio service not initialized',
            timestamp: new Date()
          });
        }

        const recordingData = request.body;
        await twilioService.handleRecordingStatus(recordingData);

        return reply.status(200).send({ success: true });
      } catch (error) {
        fastify.log.error('Error handling recording status:', error);
        return reply.status(500).send({
          error: 'Failed to process recording status',
          timestamp: new Date()
        });
      }
    }
  );

  // Handle outgoing calls
  fastify.post<OutgoingCallRequest>(
    '/twilio/outgoing',
    {
      schema: {
        body: {
          type: 'object',
          required: ['to', 'message'],
          properties: {
            to: { type: 'string' },
            message: { type: 'string' },
            purpose: { type: 'string' }
          }
        }
      }
    },
    async (request: FastifyRequest<OutgoingCallRequest>, reply: FastifyReply) => {
      try {
        if (!twilioService) {
          return reply.status(503).send({
            error: 'Twilio service not initialized',
            timestamp: new Date()
          });
        }

        const { to, message, purpose } = request.body;
        const call = await twilioService.makeOutgoingCall(to, message);

        return reply.status(200).send({
          success: true,
          callSid: call.sid,
          status: call.status,
          timestamp: new Date()
        });
      } catch (error) {
        fastify.log.error('Error making outgoing call:', error);
        return reply.status(500).send({
          error: 'Failed to make outgoing call',
          details: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date()
        });
      }
    }
  );

  // Generate TwiML for outgoing calls
  fastify.get('/twilio/outgoing-twiml', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { message, purpose } = request.query as { message?: string; purpose?: string };
      
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say voice="Polly.Amy-Neural">Hello, this is FlexDesk calling regarding ${purpose || 'your inquiry'}.</Say>
          <Say voice="Polly.Amy-Neural">${message || 'We have an update for you.'}</Say>
          <Say voice="Polly.Amy-Neural">Please call us back at our main number if you need further assistance.</Say>
          <Say voice="Polly.Amy-Neural">Thank you and have a great day!</Say>
        </Response>`;

      reply.header('Content-Type', 'text/xml');
      return reply.status(200).send(twiml);
    } catch (error) {
      fastify.log.error('Error generating outgoing TwiML:', error);
      
      const errorTwiML = `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say voice="Polly.Amy-Neural">I'm sorry, but I'm experiencing technical difficulties right now.</Say>
          <Say voice="Polly.Amy-Neural">Please call our main number for assistance.</Say>
          <Say voice="Polly.Amy-Neural">Thank you.</Say>
        </Response>`;
      
      reply.header('Content-Type', 'text/xml');
      return reply.status(200).send(errorTwiML);
    }
  });

  // Health check for Twilio service
  fastify.get('/twilio/health', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!twilioService) {
        return reply.status(503).send({
          status: 'unavailable',
          message: 'Twilio service not initialized',
          timestamp: new Date()
        });
      }

      return reply.status(200).send({
        status: 'healthy',
        message: 'Twilio service is running',
        timestamp: new Date()
      });
    } catch (error) {
      fastify.log.error('Error checking Twilio health:', error);
      return reply.status(500).send({
        status: 'unhealthy',
        error: 'Health check failed',
        timestamp: new Date()
      });
    }
  });

  // Cleanup on server shutdown
  fastify.addHook('onClose', async () => {
    try {
      if (twilioService) {
        await twilioService.cleanup();
      }
      if (agentManager) {
        await agentManager['agent'].cleanup();
      }
      fastify.log.info('Twilio routes cleaned up');
    } catch (error) {
      fastify.log.error('Error during cleanup:', error);
    }
  });
} 