import { PrismaClient } from "@prisma/client";
import prisma from "../model/prismaClient.js";
import { UserActivityError } from "../utils/errorhandler.js";
import { HttpStatusCode } from "axios";


class ActivitiesRepositories {
    private prisma: PrismaClient;

    constructor(prisma: PrismaClient) {
        this.prisma = prisma;
    }

    async createUserActivity(userId: string, activity: string, ipAddress: string, hostName: string): Promise<boolean> {
        const userActivity = await this.prisma.userActivity.create({
            data: { userId, activity, ipAddress, hostName }
        });
        if(!userActivity) throw new UserActivityError(HttpStatusCode.InternalServerError, "Failed to create user activity");
        return true;
    }
}

const userActivityRepositories = new ActivitiesRepositories(prisma);

export default userActivityRepositories;