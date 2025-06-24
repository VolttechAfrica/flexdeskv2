import { HttpStatusCode } from "axios";
import { FastifyInstance } from "fastify";
import { UserActivityError } from "../utils/errorhandler.js";

class UserActivityService {
    private app: FastifyInstance;
    private userActivityRepositories: any;

    constructor(app: FastifyInstance, userActivityRepositories: any) {
        this.app = app;
        this.userActivityRepositories = userActivityRepositories;
    }

    async createUserActivity(userId: string, activity: string, ipAddress: string, hostName: string): Promise<boolean> {
        const userActivity = await this.userActivityRepositories.createUserActivity(userId, activity, ipAddress, hostName);
        if(!userActivity) throw new UserActivityError(HttpStatusCode.InternalServerError, "Failed to create user activity");
        return true;
    }
}

export default UserActivityService;