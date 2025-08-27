import { FastifyInstance } from 'fastify';
import twilioRoutes from '../../routes/twilio.routes.js';

export async function registerTwilioRoutes(app: FastifyInstance): Promise<void> {
  try {
    // Register Twilio routes
    await app.register(twilioRoutes, { prefix: '/api/v1' });
    
    app.log.info('Twilio routes registered successfully');
    
    // Log the available endpoints
    app.log.info('Available Twilio endpoints:');
    app.log.info('  POST /api/v1/twilio/incoming - Handle incoming calls');
    app.log.info('  POST /api/v1/twilio/gather - Process user input');
    app.log.info('  POST /api/v1/twilio/call-status - Handle call status updates');
    app.log.info('  POST /api/v1/twilio/recording-status - Handle recording updates');
    app.log.info('  POST /api/v1/twilio/outgoing - Make outgoing calls');
    app.log.info('  GET  /api/v1/twilio/outgoing-twiml - Generate outgoing call TwiML');
    app.log.info('  GET  /api/v1/twilio/health - Health check');
    
  } catch (error) {
    app.log.error('Failed to register Twilio routes:', error);
    throw error;
  }
}

export default registerTwilioRoutes; 