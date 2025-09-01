import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { HttpStatusCode } from 'axios';
import { UserError } from '../utils/errorhandler.js';
import CloudinaryService from '../services/cloudinary.service.js';



class CloudinaryController {
    private app: FastifyInstance;
    private cloudinaryService: CloudinaryService;

    constructor(app: FastifyInstance) {
        this.app = app;
        this.cloudinaryService = new CloudinaryService();
    }

    async generateSignature(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { public_id, ...otherParams } = request.body as any;
            
            const params = {
                timestamp: Math.round(new Date().getTime() / 1000),
                public_id,
                ...otherParams
            };

            const result = await this.cloudinaryService.generateSignature(params);

            return reply.status(HttpStatusCode.Ok).send({
                status: true,
                message: 'Signature generated successfully',
                data: result
            });

        } catch (error: any) {
            this.app.log.error('Error generating signature:', error);
            throw new UserError(
                'Failed to generate signature',
                HttpStatusCode.InternalServerError
            );
        }
    }
}

export default CloudinaryController;
