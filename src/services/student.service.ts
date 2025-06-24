import { FastifyInstance } from "fastify";
import { HttpStatusCode } from "axios";
import { UserError } from "../utils/errorhandler.js";
import RedisService from "./redis.service.js";
import { PrismaClient, Student, StudentStatus } from "@prisma/client";

// Types
interface StudentResponse {
    students: Student[];
    total: number;
    status: boolean;
    message: string;
    page?: number;
    limit?: number;
    totalPages?: number;
}

interface StudentRepository {
    getAllStudents(schoolId: string, options?: StudentQueryOptions): Promise<Student[]>;
    getTotalStudents(schoolId: string, options?: StudentQueryOptions): Promise<number>;
}

interface StudentQueryOptions {
    page?: number;
    limit?: number;
    status?: StudentStatus;
    classId?: string;
    classArmId?: string;
    searchTerm?: string;
}

class StudentService {
    private readonly app: FastifyInstance;
    private readonly studentRepository: StudentRepository;
    private readonly redis: RedisService;
    private readonly CACHE_TTL = 60 * 60 * 24; // 24 hours in seconds
    private readonly DEFAULT_PAGE_SIZE = 10;
    private readonly MAX_PAGE_SIZE = 100;

    constructor(app: FastifyInstance, studentRepository: StudentRepository) {
        this.app = app;
        this.studentRepository = studentRepository;
        this.redis = new RedisService(app);
    }

    private getCacheKey(schoolId: string, options?: StudentQueryOptions): string {
        const optionsKey = options ? `:${JSON.stringify(options)}` : '';
        return `students:${schoolId}${optionsKey}`;
    }

    private async getCachedStudents(schoolId: string, options?: StudentQueryOptions): Promise<Student[] | null> {
        try {
            const cached = await this.redis.getInstance<{ data: Student[] }>(this.getCacheKey(schoolId, options));
            return cached?.data ?? null;
        } catch (error) {
            this.app.log.error({ error, schoolId, options }, 'Failed to get students from cache');
            return null;
        }
    }

    private async setCachedStudents(schoolId: string, students: Student[], options?: StudentQueryOptions): Promise<void> {
        try {
            await this.redis.setInstance({
                key: this.getCacheKey(schoolId, options),
                value: { data: students },
                ttl: this.CACHE_TTL
            });
        } catch (error) {
            this.app.log.error({ error, schoolId, options }, 'Failed to cache students');
        }
    }

    private async fetchAndCacheStudents(schoolId: string, options?: StudentQueryOptions): Promise<Student[]> {
        const students = await this.studentRepository.getAllStudents(schoolId, options);
        await this.setCachedStudents(schoolId, students, options);
        return students;
    }

    private validateQueryOptions(options?: StudentQueryOptions): StudentQueryOptions {
        if (!options) {
            return { page: 1, limit: this.DEFAULT_PAGE_SIZE };
        }

        const validatedOptions: StudentQueryOptions = {
            page: Math.max(1, options.page || 1),
            limit: Math.min(this.MAX_PAGE_SIZE, Math.max(1, options.limit || this.DEFAULT_PAGE_SIZE))
        };

        if (options.status) validatedOptions.status = options.status;
        if (options.classId) validatedOptions.classId = options.classId;
        if (options.classArmId) validatedOptions.classArmId = options.classArmId;
        if (options.searchTerm) validatedOptions.searchTerm = options.searchTerm;

        return validatedOptions;
    }

    async getStoreStudent(schoolId: string, options?: StudentQueryOptions): Promise<Student[]> {
        try {
            if (!schoolId) {
                throw new UserError(HttpStatusCode.BadRequest, "School ID is required");
            }

            const validatedOptions = this.validateQueryOptions(options);
            const cachedStudents = await this.getCachedStudents(schoolId, validatedOptions);
            
            if (cachedStudents) {
                return cachedStudents;
            }

            return await this.fetchAndCacheStudents(schoolId, validatedOptions);
        } catch (error) {
            this.app.log.error({ error, schoolId, options }, 'Failed to get students');
            if (error instanceof UserError) {
                throw error;
            }
            throw new UserError(
                HttpStatusCode.InternalServerError,
                "Failed to retrieve students"
            );
        }
    }

    async getAllStudents(schoolId: string, options?: StudentQueryOptions): Promise<StudentResponse> {
        try {
            if (!schoolId) {
                throw new UserError(HttpStatusCode.BadRequest, "School ID is required");
            }

            const validatedOptions = this.validateQueryOptions(options);
            const [students, total] = await Promise.all([
                this.getStoreStudent(schoolId, validatedOptions),
                this.studentRepository.getTotalStudents(schoolId, validatedOptions)
            ]);

            const totalPages = Math.ceil(total / validatedOptions.limit!);
            
            return {
                students,
                total,
                status: true,
                message: "Students fetched successfully",
                page: validatedOptions.page,
                limit: validatedOptions.limit,
                totalPages
            };
        } catch (error) {
            this.app.log.error({ error, schoolId, options }, 'Failed to get all students');
            if (error instanceof UserError) {
                throw error;
            }
            throw new UserError(
                HttpStatusCode.InternalServerError,
                "Failed to retrieve students"
            );
        }
    }

    async invalidateCache(schoolId: string): Promise<void> {
        try {
            const pattern = `students:${schoolId}*`;
            const keys = await this.app.redis.keys(pattern);
            
            if (keys.length > 0) {
                await Promise.all(keys.map(key => this.redis.delete(key)));
            }
            
            this.app.log.info({ schoolId, keysCount: keys.length }, 'Successfully invalidated student cache');
        } catch (error) {
            this.app.log.error({ error, schoolId }, 'Failed to invalidate student cache');
            throw new UserError(
                HttpStatusCode.InternalServerError,
                "Failed to invalidate cache"
            );
        }
    }
}

export default StudentService;