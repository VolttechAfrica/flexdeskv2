import { FastifyInstance } from "fastify";
import { HttpStatusCode } from "axios";
import RedisService from "./redis.service.js";
import { UserError } from "../utils/errorhandler.js";


class SchoolService {
    private app: FastifyInstance;
    private schoolRepositories: any;
    private redis: RedisService;
    constructor(app: FastifyInstance, schoolRepositories: any) {
        this.app = app;
        this.schoolRepositories = schoolRepositories;
        this.redis = new RedisService(app);
    }

    async getSchoolInfo(schoolId: string): Promise<any> {
        const school = await this.redis.get(`SCHOOL:${schoolId}`);
        if (!school) {
            const school = await this.schoolRepositories.getSchoolInfo(schoolId);
            await this.redis.set({
                key: `SCHOOL:${schoolId}`,
                value: school,
                ttl: 7 * 24 * 60 * 60,
            });
            return school;
        }
        return school;
    }

    async getCurrentTerm(schoolId: string): Promise<any> {
        const verifySchool = await this.getSchoolInfo(schoolId);
        if (!verifySchool) throw new UserError(HttpStatusCode.NotFound, "Invalid schoolId, please try again");
        const term = await this.schoolRepositories.getCurrentTerm(schoolId);
        if(!term) throw new UserError(HttpStatusCode.NotFound, "No active term found, the admin needs to set a term");
        return term;
    }

    async getAllTerms(schoolId: string): Promise<any> {
        const verifySchool = await this.getSchoolInfo(schoolId);
        if (!verifySchool) throw new UserError(HttpStatusCode.NotFound, "Invalid schoolId, please try again");
        const terms = await this.schoolRepositories.getAllTerms(schoolId);
        return terms;
    }

    async createTerm(data: any): Promise<any> {
        const verifySchool = await this.getSchoolInfo(data.schoolId);
        if (!verifySchool) throw new UserError(HttpStatusCode.NotFound, "Invalid schoolId, please try again");
        const term = await this.schoolRepositories.createTerm(data);
        return term;
    }

    async makeTermActive(schoolId: string, termId: string): Promise<any> {
        const verifySchool = await this.getSchoolInfo(schoolId);
        if (!verifySchool) throw new UserError(HttpStatusCode.NotFound, "Invalid schoolId, please try again");
        const term = await this.schoolRepositories.makeTermActive(schoolId, termId);
        return term;
    }

}



export default SchoolService;