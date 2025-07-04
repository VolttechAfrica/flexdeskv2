import { PrismaClient, SubjectStatus } from "@prisma/client";
import { FastifyInstance } from "fastify";
import { BaseRepository } from "./base.repository.js";
import prisma from "../model/prismaClient.js";
import { HttpStatusCode } from "axios";
import { UserError } from "../utils/errorhandler.js";

interface ClassRange {
    level: number;
}

interface SubjectData {
    id: string;
    name: string;
    status: SubjectStatus;
}

interface ClassArmData {
    id: string;
    name: string;
}

interface ClassData {
    id: string;
    name: string;
    level: number;
    classArms: ClassArmData[];
    subjects: SubjectData[];
}

interface CreateClassData {
    name: string;
    level: number;
    schoolId: string;
}

interface UpdateClassData {
    name?: string;
    level?: number;
}

interface ClassQueryParams {
    schoolId: string;
    level?: number;
    includeInactive?: boolean;
}

class ClassRepository extends BaseRepository {
    constructor(prisma: PrismaClient, fastify: FastifyInstance) {
        super(prisma, fastify);
    } 

    async getClassWithinRange(range: ClassRange[], schoolId: string): Promise<ClassData[]> {
        try {
            if (!range || range.length === 0) {
                throw new UserError(HttpStatusCode.BadRequest, "Class range is required");
            }

            if (!schoolId) {
                throw new UserError(HttpStatusCode.BadRequest, "School ID is required");
            }

            const cacheKey = `class:range:${range.map((r) => r.level).join(',')}:${schoolId}`;
            return this.withCache(cacheKey, 'getClassWithinRange', async () => {
                return this.executeQuery('getClassWithinRange', 'schoolClass', async () => {
                    return this.prisma.schoolClass.findMany({
                        where: {
                            schoolId,
                            level: {
                                in: range.map((r) => r.level),
                            },
                        },
                        select: {
                            id: true,
                            name: true,
                            level: true,
                            classArms: {
                                select: {
                                    id: true,
                                    name: true,
                                },
                            },
                            subjects: {
                                select: {
                                    id: true,
                                    name: true,
                                    status: true,
                                },
                                where: {
                                    status: SubjectStatus.ACTIVE,
                                },
                            },
                        },
                    });
                });
            });
        } catch(error) {
            if (error instanceof UserError) {
                throw error;
            }
            throw new UserError(HttpStatusCode.InternalServerError, `Failed to get class within range: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async getAllClasses(params: ClassQueryParams): Promise<ClassData[]> {
        try {
            const { schoolId, level, includeInactive = false } = params;
            
            if (!schoolId) {
                throw new UserError(HttpStatusCode.BadRequest, "School ID is required");
            }

            const cacheKey = `classes:${schoolId}:${level || 'all'}:${includeInactive}`;
            return this.withCache(cacheKey, 'getAllClasses', async () => {
                return this.executeQuery('getAllClasses', 'schoolClass', async () => {
                    return this.prisma.schoolClass.findMany({
                        where: {
                            schoolId,
                            ...(level && { level }),
                        },
                        select: {
                            id: true,
                            name: true,
                            level: true,
                            classArms: {
                                select: {
                                    id: true,
                                    name: true,
                                },
                            },
                            subjects: {
                                select: {
                                    id: true,
                                    name: true,
                                    status: true,
                                },
                                ...(includeInactive ? {} : { where: { status: SubjectStatus.ACTIVE } }),
                            },
                        },
                        orderBy: {
                            level: 'asc',
                            name: 'asc',
                        },
                    });
                });
            });
        } catch(error) {
            if (error instanceof UserError) {
                throw error;
            }
            throw new UserError(HttpStatusCode.InternalServerError, `Failed to get all classes: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async getClassById(id: string, schoolId: string): Promise<ClassData | null> {
        try {
            if (!id) {
                throw new UserError(HttpStatusCode.BadRequest, "Class ID is required");
            }

            if (!schoolId) {
                throw new UserError(HttpStatusCode.BadRequest, "School ID is required");
            }

            const cacheKey = `class:${id}:${schoolId}`;
            return this.withCache(cacheKey, 'getClassById', async () => {
                return this.executeQuery('getClassById', 'schoolClass', async () => {
                    return this.prisma.schoolClass.findFirst({
                        where: {
                            id,
                            schoolId,
                        },
                        select: {
                            id: true,
                            name: true,
                            level: true,
                            classArms: {
                                select: {
                                    id: true,
                                    name: true,
                                },
                            },
                            subjects: {
                                select: {
                                    id: true,
                                    name: true,
                                    status: true,
                                },
                            },
                        },
                    });
                });
            });
        } catch(error) {
            if (error instanceof UserError) {
                throw error;
            }
            throw new UserError(HttpStatusCode.InternalServerError, `Failed to get class by ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async createClass(data: CreateClassData): Promise<ClassData> {
        try {
            const { name, level, schoolId } = data;

            if (!name || !level || !schoolId) {
                throw new UserError(HttpStatusCode.BadRequest, "Name, level, and school ID are required");
            }

            if (level < 1 || level > 12) {
                throw new UserError(HttpStatusCode.BadRequest, "Level must be between 1 and 12");
            }

            return this.executeQuery('createClass', 'schoolClass', async () => {
                const newClass = await this.prisma.schoolClass.create({
                    data: {
                        name,
                        level,
                        schoolId,
                    },
                    select: {
                        id: true,
                        name: true,
                        level: true,
                        classArms: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                        subjects: {
                            select: {
                                id: true,
                                name: true,
                                status: true,
                            },
                        },
                    },
                });

                // Invalidate related caches
                await this.invalidateCache(`classes:${schoolId}:all:false`);
                await this.invalidateCache(`classes:${schoolId}:all:true`);
                await this.invalidateCache(`class:range:*:${schoolId}`);

                return newClass;
            });
        } catch(error) {
            if (error instanceof UserError) {
                throw error;
            }
            throw new UserError(HttpStatusCode.InternalServerError, `Failed to create class: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async updateClass(id: string, schoolId: string, data: UpdateClassData): Promise<ClassData> {
        try {
            if (!id || !schoolId) {
                throw new UserError(HttpStatusCode.BadRequest, "Class ID and school ID are required");
            }

            if (data.level && (data.level < 1 || data.level > 12)) {
                throw new UserError(HttpStatusCode.BadRequest, "Level must be between 1 and 12");
            }

            return this.executeQuery('updateClass', 'schoolClass', async () => {
                const updatedClass = await this.prisma.schoolClass.update({
                    where: {
                        id,
                        schoolId,
                    },
                    data,
                    select: {
                        id: true,
                        name: true,
                        level: true,
                        classArms: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                        subjects: {
                            select: {
                                id: true,
                                name: true,
                                status: true,
                            },
                        },
                    },
                });

                // Invalidate related caches
                await this.invalidateCache(`class:${id}:${schoolId}`);
                await this.invalidateCache(`classes:${schoolId}:all:false`);
                await this.invalidateCache(`classes:${schoolId}:all:true`);
                await this.invalidateCache(`class:range:*:${schoolId}`);

                return updatedClass;
            });
        } catch(error) {
            if (error instanceof UserError) {
                throw error;
            }
            throw new UserError(HttpStatusCode.InternalServerError, `Failed to update class: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async deleteClass(id: string, schoolId: string): Promise<void> {
        try {
            if (!id || !schoolId) {
                throw new UserError(HttpStatusCode.BadRequest, "Class ID and school ID are required");
            }

            await this.executeQuery('deleteClass', 'schoolClass', async () => {
                await this.prisma.schoolClass.delete({
                    where: {
                        id,
                        schoolId,
                    },
                });
            });

            // Invalidate related caches
            await this.invalidateCache(`class:${id}:${schoolId}`);
            await this.invalidateCache(`classes:${schoolId}:all:false`);
            await this.invalidateCache(`classes:${schoolId}:all:true`);
            await this.invalidateCache(`class:range:*:${schoolId}`);
        } catch(error) {
            if (error instanceof UserError) {
                throw error;
            }
            throw new UserError(HttpStatusCode.InternalServerError, `Failed to delete class: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async getClassCount(schoolId: string): Promise<number> {
        try {
            if (!schoolId) {
                throw new UserError(HttpStatusCode.BadRequest, "School ID is required");
            }

            const cacheKey = `class:count:${schoolId}`;
            return this.withCache(cacheKey, 'getClassCount', async () => {
                return this.executeQuery('getClassCount', 'schoolClass', async () => {
                    return this.prisma.schoolClass.count({
                        where: {
                            schoolId,
                        },
                    });
                });
            });
        } catch(error) {
            if (error instanceof UserError) {
                throw error;
            }
            throw new UserError(HttpStatusCode.InternalServerError, `Failed to get class count: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}

export const createClassRepository = (fastify: FastifyInstance) => {
    return new ClassRepository(prisma, fastify);
}