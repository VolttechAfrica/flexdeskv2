import { FastifyInstance } from 'fastify';
import CloudinaryController from '../controllers/cloudinary.controller.js';

export default async function cloudinaryRoutes(fastify: FastifyInstance) {
    const cloudinaryController = new CloudinaryController(fastify);
    
    // Generate signature for secure client-side uploads
    fastify.route({
        method: 'POST',
        url: '/signature',
        schema: {
            body: {
                type: 'object',
                required: ['public_id'],
                properties: {
                    public_id: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        status: { type: 'boolean' },
                        message: { type: 'string' },
                        data: {
                            type: 'object',
                            properties: {
                                timestamp: { type: 'number' },
                                signature: { type: 'string' }
                            }
                        }
                    }
                }
            }
        },
        preHandler: [fastify.authenticate],
        handler: cloudinaryController.generateSignature.bind(cloudinaryController)
    });
} 