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

    async updateOboardingInfoStepOne(request: FastifyRequest, reply: FastifyReply) {
        try {
            if(!request.user) throw new UserError(HttpStatusCode.Unauthorized, responseMessage.Unauthorized.message);
            const data = request.body;
            const result = await this.userService.updateOboardingInfoStepOne(data, request.user.id);
            result.token = request.user.token;
            return reply.status(HttpStatusCode.Ok).send(result);
        } catch (error: any) {
            throw error;
        }
    }

    async updateOboardingInfoStepTwo(request: FastifyRequest, reply: FastifyReply) {

        try {
            if(!request.user) throw new UserError(HttpStatusCode.Unauthorized, responseMessage.Unauthorized.message);
            const data = request.body;
            const result = await this.userService.updateOboardingInfoStepTwo(data, request.user.id);
            result.token = request.user.token;
            return reply.status(HttpStatusCode.Ok).send(result);
        } catch (error: any) {
            throw error;
        }
    }

    async getEducationalQualification(request: FastifyRequest, reply: FastifyReply) {
        try {
            if(!request.user) throw new UserError(HttpStatusCode.Unauthorized, responseMessage.Unauthorized.message);
            const result = await this.userService.getEducationalQualification(request.user.id);
            result.token = request.user.token;
            return reply.status(HttpStatusCode.Ok).send(result);
        } catch (error: any) {
            throw error;
        }
    }

    async updateEducationalQualification(request: FastifyRequest, reply: FastifyReply) {
        try {
            if(!request.user) throw new UserError(HttpStatusCode.Unauthorized, responseMessage.Unauthorized.message);
            const data = request.body as any;
            delete data.userId;
            const result = await this.userService.updateEducationalQualification(data, request.user.id);
            result.token = request.user.token;
            return reply.status(HttpStatusCode.Ok).send(result);
        } catch (error: any) {
            throw error;
        }
    }

    async updateUserProfilePicture(request: FastifyRequest, reply: FastifyReply) {
        try {
            if(!request.user) throw new UserError(HttpStatusCode.Unauthorized, responseMessage.Unauthorized.message);
            const data = request.body as any;
            const result = await this.userService.updateUserProfilePicture(data, request.user.id);
            result.token = request.user.token;
            return reply.status(HttpStatusCode.Ok).send(result);
        } catch (error: any) {
            throw error;
        }
    }

    async deleteFirstTimeLogin(request: FastifyRequest, reply: FastifyReply) {
        try {
            if(!request.user) throw new UserError(HttpStatusCode.Unauthorized, responseMessage.Unauthorized.message);
            const result = await this.userService.deleteFirstTimeLogin(request.user.id);
            result.token = request.user.token;
            return reply.status(HttpStatusCode.Ok).send(result);
        } catch (error: any) {
            throw error;
        }
    }
}

export default UserController;