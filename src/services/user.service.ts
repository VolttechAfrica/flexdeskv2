import { FastifyInstance } from "fastify";
import { HttpStatusCode } from "axios";
import { responseMessage } from "../utils/responseMessage.js";
import { UserError } from "../utils/errorhandler.js";
import RedisService from "./redis.service.js";
import UserResponse from "../utils/loginResponse.js";

interface OnboardingData {
    profile: {
        email: string;
        profilePicture?: string;
        dateOfBirth?: string;
        gender?: string;
        phoneNumber?: string;
        address?: string;
        state?: string;
        city?: string;
        lga?: string;
    };
    qualifications?: Array<{
        qualification: string;
        institution: string;
        course: string;
        grade?: string;
        yearObtained?: string;
    }>;
    emergencyContact?: {
        name: string;
        relationship: string;
        phoneNumber: string;
    };
    notifications?: {
        email: boolean;
        sms: boolean;
        push: boolean;
    };
}

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
            const user = await this.userRepositories.getUserInfo(staffId);
            if (!user) throw new UserError(HttpStatusCode.NotFound, responseMessage.UserNotFound.message);
            const userResponse = await UserResponse(user);
            return userResponse;

        } catch (error) {
            this.app.log.error('Error getting user info:', error);
            throw new UserError(HttpStatusCode.InternalServerError, responseMessage.FailedToUpdateUser.message);
        }
    }

    async completeOnboarding(data: OnboardingData, staffId: string): Promise<any> {
        try {
            const user = await this.getUserInfo(staffId);
            if (!user) throw new UserError(HttpStatusCode.NotFound, responseMessage.UserNotFound.message);

            const email = user?.data?.email as string;

            if(!email) throw new Error("Internal server error, a value is missing")

            // Update profile information
            if (data.profile) {
                const profileData = {
                    ...data.profile,
                    staffId,
                    email
                };
                await this.userRepositories.updateProfile(profileData);
            }

            // Update qualifications
            if (data.qualifications && data.qualifications.length > 0) {
                for (const qualification of data.qualifications) {
                    const qualificationData = {
                        ...qualification,
                        staffId
                    };
                    await this.userRepositories.updateEducationalQualification(qualificationData);
                }
            }

            // Update emergency contact
            if (data.emergencyContact) {
                const emergencyData = {
                    ...data.emergencyContact,
                    staffId
                };
                await this.userRepositories.updateEmergencyContact(emergencyData);
            }

            // Update notification settings
            if (data.notifications) {
                const notificationData = {
                    ...data.notifications,
                    userId: staffId
                };
                await this.userRepositories.updateNotificationSettings(notificationData);
            }

            return {
                status: true,
                message: "Onboarding completed successfully"
            };

        } catch (error) {
            this.app.log.error('Error completing onboarding:', error);
            throw new UserError(HttpStatusCode.InternalServerError, "Failed to complete onboarding");
        }
    }

    async updateProfilePicture(profilePicture: string, staffId: string): Promise<any> {
        try {
            const user = await this.getUserInfo(staffId);
            if (!user) throw new UserError(HttpStatusCode.NotFound, responseMessage.UserNotFound.message);

            const userData = { profilePicture, staffId };
            const updateUser = await this.userRepositories.updateProfilePicture(userData);
            if (!updateUser) throw new UserError(HttpStatusCode.InternalServerError, "Failed to update profile picture");

            await this.redis.delete(`USER:${staffId}`);

            return {
                status: true,
                message: "Profile picture updated successfully"
            };

        } catch (error) {
            this.app.log.error('Error updating profile picture:', error);
            throw new UserError(HttpStatusCode.InternalServerError, "Failed to update profile picture");
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
                message: "First time login deleted successfully"
            };

        } catch (error) {
            this.app.log.error('Error deleting first time login:', error);
            throw new UserError(HttpStatusCode.InternalServerError, "Failed to delete first time login");
        }
    }
}

export default UserService;