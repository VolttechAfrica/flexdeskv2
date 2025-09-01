import { PrismaClient } from "@prisma/client";
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

    async getTeacherById(schoolId: string, teacherId: string) {
        const cacheKey = `teachers:${teacherId}`;
        return this.withCache(cacheKey, 'getTeacherById', () =>
            this.executeQuery('getTeacherById', 'teacher', () =>
                this.prisma.staff.findFirst({
                    where: { id: teacherId, schoolId, roleId: '803' },
                    include: {
                        profile: true,
                        qualifications: true,
                        firstTimeLogin: true,
                    },
                })
            )
        );
    }

    // get the teacher that fit the memberId []
    async getTeachersAssignedClassByMemberIds(memberIds: string[]) {
        if (!memberIds || memberIds.length === 0) {
            return [];
        }
        const cacheKey = `teachers:memberIds:${memberIds.join(',')}`;
        return this.withCache(cacheKey, 'getTeachersAssignedClassByMemberIds', () =>
            this.executeQuery('getTeachersAssignedClassByMemberIds', 'teacher', () =>
                this.prisma.assignedClasses.findMany({
                    where: {
                        staffId: { in: memberIds },
                    },
                    include: {
                        class: {
                            select: {
                                level: true,
                                name: true,
                            }
                        }
                    }
                })
            )
        );
    }



}

export const createTeacherRepository = (fastify: FastifyInstance) => {
    return new TeacherRepository(prisma, fastify);
};