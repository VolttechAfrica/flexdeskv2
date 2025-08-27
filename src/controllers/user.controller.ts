import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import userService from "../services/user.service.js";
import { createUserRepository } from "../repositories/user.repository.js";
import { HttpStatusCode } from "axios";
import { UserError } from "../utils/errorhandler.js";
import { responseMessage } from "../utils/responseMessage.js";

class UserController {
    private app: FastifyInstance;
    private userService: any;

    constructor(app: FastifyInstance) {
        this.app = app;
        this.userService = new userService(app, createUserRepository(app));
    }

    async completeOnboarding(request: FastifyRequest, reply: FastifyReply) {
        try {
            if (!request.user) throw new UserError(HttpStatusCode.Unauthorized, responseMessage.Unauthorized.message);
            
            const data = request.body as any;
            const result = await this.userService.completeOnboarding(data, request.user.id);
            
            return reply.status(HttpStatusCode.Ok).send({
                ...result,
                token: request.user.token
            });
        } catch (error: any) {
            throw error;
        }
    }

    async updateProfilePicture(request: FastifyRequest, reply: FastifyReply) {
        try {
            if (!request.user) throw new UserError(HttpStatusCode.Unauthorized, responseMessage.Unauthorized.message);
            
            const { profilePicture } = request.body as any;
            const result = await this.userService.updateProfilePicture(profilePicture, request.user.id);
            
            return reply.status(HttpStatusCode.Ok).send({
                ...result,
                token: request.user.token
            });
        } catch (error: any) {
            throw error;
        }
    }

    async deleteFirstTimeLogin(request: FastifyRequest, reply: FastifyReply) {
        try {
            if (!request.user) throw new UserError(HttpStatusCode.Unauthorized, responseMessage.Unauthorized.message);
            
            const result = await this.userService.deleteFirstTimeLogin(request.user.id);
            
            return reply.status(HttpStatusCode.Ok).send({
                ...result,
                token: request.user.token
            });
        } catch (error: any) {
            throw error;
        }
    }
}

export default UserController;