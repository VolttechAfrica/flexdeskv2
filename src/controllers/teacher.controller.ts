import { FastifyRequest, FastifyReply, FastifyInstance } from "fastify";
import { createTeacherService } from "../services/teacher.service.js";
import UserActivityService from "../services/userActivity.service.js";
import userActivityRepositories from "../repositories/activities.respository.js";
import { HttpStatusCode } from "axios";
import { UserError } from "../utils/errorhandler.js";
import { responseMessage } from "../utils/responseMessage.js";  

interface TeacherQueryParams {
    schoolId: string;
    searchTerm?: string;
    page?: string;
    limit?: string;
    status?: string;
}

class TeacherController {
    private teacherService: any;
    private userActivityService: UserActivityService;
    constructor(app: FastifyInstance) {
        this.teacherService = createTeacherService(app);
        this.userActivityService = new UserActivityService(app, userActivityRepositories);
    }

    private handleError(error: unknown, reply: FastifyReply) {
        throw error;
    }

    private parseQueryParams(query: TeacherQueryParams) {
        return {
            schoolId: query.schoolId,
            page: query.page ? parseInt(query.page, 10) : undefined,
            limit: query.limit ? parseInt(query.limit, 10) : undefined,
            status: query.status ? query.status : "ACTIVE",

        };
    }
    async getAllTeachers(request: FastifyRequest, reply: FastifyReply) {
        try {
            if (!request.user)
                throw new UserError(
                    HttpStatusCode.Unauthorized,
                    responseMessage.Unauthorized.message
                );
            const queryParams = this.parseQueryParams(request.query as TeacherQueryParams);
            const teachers = await this.teacherService.getAllTeachers(queryParams.schoolId, queryParams);
            teachers.token = request.user.token;
            return reply.status(HttpStatusCode.Ok).send(teachers);
        } catch (error: any) {
            console.log(error);
            this.handleError(error, reply);
        }
    }
}

export default TeacherController;