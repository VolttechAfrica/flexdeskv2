import { HttpStatusCode } from "axios";
import { FastifyInstance } from "fastify";
import { UserActivityError } from "../utils/errorhandler.js";
import { RepositoryResult } from "../repositories/types/common.types.js";

class UserActivityService {
    private app: FastifyInstance;
    private userActivityRepositories: any;

    constructor(app: FastifyInstance, userActivityRepositories: any) {
        this.app = app;
        this.userActivityRepositories = userActivityRepositories;
    }

    async createUserActivity(userId: string, activity: string, ipAddress: string, hostName: string): Promise<boolean> {
        const result: RepositoryResult<any> = await this.userActivityRepositories.createUserActivity(
            userId, 
            activity, 
            ipAddress, 
            hostName
        );
        
        if (!result.success) {
            this.app.log.error(`Failed to create user activity: ${result.error}`, {
                userId,
                activity,
                ipAddress,
                hostName
            });
            throw new UserActivityError(
                result.error || "Failed to create user activity", 
                HttpStatusCode.InternalServerError
            );
        }
        
        return true;
    }
}

export default UserActivityService;