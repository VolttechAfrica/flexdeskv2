import prisma from "../model/prismaClient.js";
import { PrismaClient, Student, StudentStatus } from "@prisma/client";
import { FastifyInstance } from "fastify";
import { BaseRepository } from "./base.repository.js";

interface StudentQueryOptions {
    page?: number;
    limit?: number;
    status?: StudentStatus;
    classId?: string;
    classArmId?: string;
    searchTerm?: string;
}

class StudentRepository extends BaseRepository {
    constructor(prisma: PrismaClient, fastify: FastifyInstance) {
        super(prisma, fastify);
    }

    private buildWhereClause(schoolId: string, options?: StudentQueryOptions) {
        const where: any = { schoolId };

        if (options?.status) {
            where.status = options.status;
        }

        if (options?.classId) {
            where.classId = options.classId;
        }

        if (options?.classArmId) {
            where.classArmId = options.classArmId;
        }

        if (options?.searchTerm) {
            where.OR = [
                { firstName: { contains: options.searchTerm, mode: 'insensitive' } },
                { lastName: { contains: options.searchTerm, mode: 'insensitive' } },
                { otherName: { contains: options.searchTerm, mode: 'insensitive' } }
            ];
        }

        return where;
    }

    async getAllStudents(schoolId: string, options?: StudentQueryOptions): Promise<Student[]> {
        const cacheKey = `students:all:${schoolId}:${JSON.stringify(options)}`;
        return this.withCache(cacheKey, 'getAllStudents', () =>
            this.executeQuery('getAllStudents', 'student', async () => {
                const where = this.buildWhereClause(schoolId, options);
                const skip = options?.page && options?.limit ? (options.page - 1) * options.limit : 0;
                const take = options?.limit;

                return await this.prisma.student.findMany({
                    where,
                    include: {
                        class: {
                            select: {
                                name: true,
                            },
                        },
                        classArm: {
                            select: {
                                name: true,
                            },
                        },
                        profile: {
                            select: {
                                profilePicture: true,
                                dateOfBirth: true,
                                email: true,
                                phoneNumber: true,
                            },
                        },
                    },
                    orderBy: {
                        createdAt: 'desc',
                    },
                    skip,
                    take,
                });
            })
        );
    }

    async getTotalStudents(schoolId: string, options?: StudentQueryOptions): Promise<number> {
        const cacheKey = `students:count:${schoolId}:${JSON.stringify(options)}`;
        return this.withCache(cacheKey, 'getTotalStudents', () =>
            this.executeQuery('getTotalStudents', 'student', async () => {
                const where = this.buildWhereClause(schoolId, options);
                return await this.prisma.student.count({ where });
            })
        );
    }

    async getStudentById(id: string): Promise<Student | null> {
        const cacheKey = `student:${id}`;
        return this.withCache(cacheKey, 'getStudentById', () =>
            this.executeQuery('getStudentById', 'student', () =>
                this.prisma.student.findUnique({
                    where: { id },
                    include: {
                        class: {
                            select: {
                                name: true,
                            },
                        },
                        classArm: {
                            select: {
                                name: true,
                            },
                        },
                        profile: {
                            select: {
                                profilePicture: true,
                                dateOfBirth: true,
                                email: true,
                                phoneNumber: true,
                                address: true,
                                state: true,
                                lga: true,
                            },
                        },
                    },
                })
            )
        );
    }

    async updateStudentStatus(id: string, status: StudentStatus): Promise<Student> {
        return this.executeQuery('updateStudentStatus', 'student', async () => {
            const student = await this.prisma.student.update({
                where: { id },
                data: { status }
            });
            await this.invalidateCache(`student:${id}`);
            return student;
        });
    }
}

export const createStudentRepository = (fastify: FastifyInstance) => {
    return new StudentRepository(prisma, fastify);
};