import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import StudentService from "../services/student.service.js";
import { HttpStatusCode } from "axios";
import { responseMessage } from "../utils/responseMessage.js";
import { UserError } from "../utils/errorhandler.js";
import { createStudentRepository } from "../repositories/student.respository.js";
import { StudentStatus } from "@prisma/client";

interface StudentQueryParams {
    schoolId: string;
    page?: string;
    limit?: string;
    status?: StudentStatus;
    classId?: string;
    classArmId?: string;
    searchTerm?: string;
}

class StudentController {
    private readonly studentService: any;

    constructor(app: FastifyInstance) {
        this.studentService = new StudentService(app, createStudentRepository(app));
    }

    private parseQueryParams(query: StudentQueryParams) {
        return {
            schoolId: query.schoolId,
            page: query.page ? parseInt(query.page, 10) : undefined,
            limit: query.limit ? parseInt(query.limit, 10) : undefined,
            status: query.status,
            classId: query.classId,
            classArmId: query.classArmId,
            searchTerm: query.searchTerm
        };
    }

    async getAllStudents(request: FastifyRequest<{ Querystring: StudentQueryParams }>, reply: FastifyReply) {
        try {
            if (!request.user) {
                throw new UserError(HttpStatusCode.Unauthorized, responseMessage.Unauthorized.message);
            }

            const queryParams = this.parseQueryParams(request.query);
            const students = await this.studentService.getAllStudents(queryParams.schoolId, queryParams);

            return reply.status(HttpStatusCode.Ok).send({
                ...students,
                token: request.user.token
            });
        } catch (error) {
            this.handleError(error, reply);
        }
    }

    async getStudentById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
        try {
            if (!request.user) {
                throw new UserError(HttpStatusCode.Unauthorized, responseMessage.Unauthorized.message);
            }

            const { id } = request.params;
            const student = await this.studentService.getStudentById(id);

            if (!student) {
                throw new UserError(HttpStatusCode.NotFound, "Student not found");
            }

            return reply.status(HttpStatusCode.Ok).send({
                status: true,
                message: "Student fetched successfully",
                data: student,
                token: request.user.token
            });
        } catch (error) {
            this.handleError(error, reply);
        }
    }

    async updateStudentStatus(request: FastifyRequest<{ Params: { id: string }, Body: { status: StudentStatus } }>, reply: FastifyReply) {
        try {
            if (!request.user) {
                throw new UserError(HttpStatusCode.Unauthorized, responseMessage.Unauthorized.message);
            }

            const { id } = request.params;
            const { status } = request.body;

            const student = await this.studentService.updateStudentStatus(id, status);
            await this.studentService.invalidateCache(student.schoolId);

            return reply.status(HttpStatusCode.Ok).send({
                status: true,
                message: "Student status updated successfully",
                data: student,
                token: request.user.token
            });
        } catch (error) {
            this.handleError(error, reply);
        }
    }

    private handleError(error: unknown, reply: FastifyReply) {
        if (error instanceof UserError) {
            return reply.status(error.statusCode).send({
                status: false,
                message: error.message
            });
        }

        return reply.status(HttpStatusCode.InternalServerError).send({
            status: false,
            message: "Internal server error"
        });
    }
}

export default StudentController;