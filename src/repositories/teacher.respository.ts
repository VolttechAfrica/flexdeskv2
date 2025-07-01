import { PrismaClient } from "@prisma/client";
import { HttpStatusCode } from "axios";
import { AuthError } from "../utils/errorhandler.js";
import { BaseRepository } from "./base.repository.js";
import { FastifyInstance } from "fastify";
import prisma from "../model/prismaClient.js";


class TeacherRepository extends BaseRepository {
    constructor(prisma: PrismaClient, fastify: FastifyInstance) {
      super(prisma, fastify);
    }

    private buildWhereClause(schoolId: string, options?: any) {
        const where: any = { schoolId, roleId: '803' };
        if (options?.status) {
            where.status = options.status;
        }
        if (options?.searchTerm) {
            where.OR = [
                { firstName: { contains: options.searchTerm, mode: 'insensitive' } },
                { lastName: { contains: options.searchTerm, mode: 'insensitive' } },
                { otherName: { contains: options.searchTerm, mode: 'insensitive' } },
            ];
        }
        return where;
    }

    async getAllTeachers(schoolId: string, options: any) {
        const cacheKey = `teachers:all:${schoolId}:${JSON.stringify(options)}`;
        return this.withCache(cacheKey, 'getAllTeachers', () =>
            this.executeQuery('getAllTeachers', 'teacher', () =>
                this.prisma.staff.findMany({
                    where: this.buildWhereClause(schoolId, options),
                    include: {
                        profile: true,
                        qualifications: true,
                        firstTimeLogin: true,
                    },
                })
            )
        );
    }



}

export const createTeacherRepository = (fastify: FastifyInstance) => {
    return new TeacherRepository(prisma, fastify);
};