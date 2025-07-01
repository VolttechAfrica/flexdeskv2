import { FastifyInstance } from "fastify";
import { createTeacherRepository } from "../repositories/teacher.respository.js";


class TeacherService {
    private app: FastifyInstance;
    private teacherRepositories: any;
    constructor(app: FastifyInstance, teacherRepositories: any) {
        this.app = app;
        this.teacherRepositories = teacherRepositories;
    }

    async getAllTeachers(schoolId: string, options: any): Promise<any> {
        const teachers = await this.teacherRepositories.getAllTeachers(schoolId, options);
        return teachers;
    }
}

export const createTeacherService = (app: FastifyInstance) => {
    return new TeacherService(app, createTeacherRepository(app));
};