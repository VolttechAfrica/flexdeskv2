import { FastifyInstance } from "fastify";
import { HttpStatusCode } from "axios";
import { responseMessage } from "../utils/responseMessage.js";
import { UserError } from "../utils/errorhandler.js";
import RedisService from "./redis.service.js";
import UserResponse from "../utils/loginResponse.js";

class UserService {
    private app: FastifyInstance;
    private userRepositories: any;
    private redis: RedisService;
    constructor(app: FastifyInstance, userRepositories: any) {
        this.app = app;
        this.userRepositories = userRepositories;
        this.redis = new RedisService(app);
    }

    async getUserInfo(staffId: string): Promise<any> {
        try {
            let user = await this.redis.getInstance(`USER:${staffId}`);
            if (!user) {
                user = await this.userRepositories.getUserInfo(staffId);
                if (!user) throw new UserError(HttpStatusCode.NotFound, responseMessage.UserNotFound.message);

                user = await UserResponse(user);

                await this.redis.setInstance({
                    key: `USER:${staffId}`,
                    value: user,
                    ttl: 7 * 24 * 60 * 60,
                });
            }

            return user;

        } catch (error) {
            console.log(error);
            throw new UserError(HttpStatusCode.InternalServerError, responseMessage.FailedToUpdateUser.message);
        }
    }

    async updateOboardingInfoStepOne(data: any, staffId: string): Promise<any> {
        try {
            const user = await this.getUserInfo(staffId);
            if (!user) throw new UserError(HttpStatusCode.NotFound, responseMessage.UserNotFound.message);
            const userData = {
                ...data,
                staffId: staffId,
            }
            const updateUser = await this.userRepositories.updateOboardingInfo(userData);
            if (!updateUser) throw new UserError(HttpStatusCode.InternalServerError, responseMessage.FailedToUpdateUser.message);
            await this.redis.delete(`USER:${staffId}`);
            return {
                status: true,
                message: responseMessage.UserUpdated.message,
            }
        } catch (error) {
            console.log(error);
            throw new UserError(HttpStatusCode.InternalServerError, responseMessage.FailedToUpdateUser.message);
        }
    }

    async updateOboardingInfoStepTwo(data: any, staffId: string): Promise<any> {
        try {
            const user = await this.getUserInfo(staffId);
            if (!user) throw new UserError(HttpStatusCode.NotFound, responseMessage.UserNotFound.message);
            const userData = {
                ...data,
                staffId: staffId,
            }
            const updateUser = await this.userRepositories.updateOboarding2(userData);
            if (!updateUser) throw new UserError(HttpStatusCode.InternalServerError, responseMessage.FailedToUpdateUser.message);
            await this.redis.delete(`USER:${staffId}`);
            return {
                status: true,
                message: responseMessage.UserUpdated.message,
            }
        } catch (error) {
            console.log(error);
            throw new UserError(HttpStatusCode.InternalServerError, responseMessage.FailedToUpdateUser.message);
        }
    }

    async updateEducationalQualification(data: any, staffId: string): Promise<any> {
        try {
            const user = await this.getUserInfo(staffId);
            if (!user) throw new UserError(HttpStatusCode.NotFound, responseMessage.UserNotFound.message);
            const userData = {
                ...data,
                staffId: staffId,
            }
            const updateUser = await this.userRepositories.updateEducationalQualification(userData);
            if (!updateUser) throw new UserError(HttpStatusCode.InternalServerError, "Failed to update educational qualification");
            return {
                status: true,
                message: "Educational qualification updated successfully",
            }
        } catch (error) {
            console.log(error);
            throw new UserError(HttpStatusCode.InternalServerError, "Failed to update educational qualification");
        }
    }

    async getEducationalQualification(staffId: string): Promise<any> {
        try {
            const user = await this.getUserInfo(staffId);
            if (!user) throw new UserError(HttpStatusCode.NotFound, responseMessage.UserNotFound.message);
            const userData = await this.userRepositories.getEducationalQualification(staffId);
            if (!userData) throw new UserError(HttpStatusCode.NotFound, "Educational qualification not found");
            return {
                status: true,
                message: "Educational qualification fetched successfully",
                data: userData,
            }
        } catch (error) {
            console.log(error);
            throw new UserError(HttpStatusCode.InternalServerError, "Failed to fetch educational qualification");
        }
    }

    async updateUserProfilePicture(data: any, staffId: string): Promise<any> {
        try {
            const user = await this.getUserInfo(staffId);
            if (!user) throw new UserError(HttpStatusCode.NotFound, responseMessage.UserNotFound.message);
            const userData = {
                ...data,
                staffId: staffId,
            }
            const updateUser = await this.userRepositories.updateUserProfilePicture(userData);
            if (!updateUser) throw new UserError(HttpStatusCode.InternalServerError, "Failed to update user profile picture");
            await this.redis.delete(`USER:${staffId}`);
            return {
                status: true,
                message: "User profile picture updated successfully",
            }
        } catch (error) {
            console.log(error);
            throw new UserError(HttpStatusCode.InternalServerError, "Failed to update user profile picture");
        }
    }
    
    async deleteFirstTimeLogin(staffId: string): Promise<any> {
        try {
            const user = await this.getUserInfo(staffId);
            if (!user) throw new UserError(HttpStatusCode.NotFound, responseMessage.UserNotFound.message);
            const deleteUser = await this.userRepositories.deleteFirstTimeLogin(staffId);
            if (!deleteUser) throw new UserError(HttpStatusCode.InternalServerError, "Failed to delete first time login");
            return {
                status: true,
                message: "First time login deleted successfully",
            }
        } catch (error) {
            console.log(error);
            throw new UserError(HttpStatusCode.InternalServerError, "Failed to delete first time login");
        }
    }   
}


export default UserService;