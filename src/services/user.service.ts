import { FastifyInstance } from "fastify";
import { HttpStatusCode } from "axios";
import { responseMessage } from "../utils/responseMessage.js";
import { UserError } from "../utils/errorhandler.js";
import RedisService from "./redis.service.js";

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

    

    async getUserInfo(userId: string): Promise<any> {
        try {
            const user = await this.userRepositories.getUserInfo(userId);
            if (!user.success) {
                throw new UserError(responseMessage.UserNotFound.message, HttpStatusCode.NotFound);
            }
            return this.buildUserReponse(user.data);
        } catch (error: any) {
            console.log(error);
            this.app.log.error('Error getting user info:', error);
            throw new UserError(responseMessage.FailedToUpdateUser.message, HttpStatusCode.InternalServerError);
        }
    }

    async completeOnboarding(data: OnboardingData, staffId: string): Promise<any> {
        try {
            const { user } = await this.getUserInfo(staffId);
            if (!user) {
                throw new UserError(responseMessage.UserNotFound.message, HttpStatusCode.NotFound);
            }

            const email = user?.email as string;
            if (!email) {
                throw new Error("Internal server error, a value is missing");
            }

            if (data.profile) {
                await this.userRepositories.updateProfile(this.buildProfileData(data.profile, staffId, email));
            }

            if (data.qualifications && data.qualifications.length > 0) {
                for (const qualification of data.qualifications) {
                    await this.userRepositories.updateEducationalQualification(this.buildQualificationData(qualification, staffId));
                }
            }

            if (data.emergencyContact) {
                await this.userRepositories.updateEmergencyContact(this.buildEmergencyContactData(data.emergencyContact, staffId));
            }

            if (data.notifications) {
                await this.userRepositories.updateNotificationSettings(this.buildNotificationSettingsData(data.notifications, staffId));
            }

            await this.deleteFirstTimeLogin(staffId);

            return {
                status: true,
                message: "Onboarding completed successfully"
            };
        } catch (error: any) {
            this.app.log.error('Error completing onboarding:', error);
            throw new UserError("Failed to complete onboarding", HttpStatusCode.InternalServerError);
        }
    }

    async updateProfilePicture(profilePicture: string, staffId: string): Promise<any> {
        try {
            const user = await this.getUserInfo(staffId);
            if (!user) {
                throw new UserError(responseMessage.UserNotFound.message, HttpStatusCode.NotFound);
            }

            const updatePayload = { profilePicture, staffId };
            const updated = await this.userRepositories.updateProfilePicture(updatePayload);
            if (!updated) {
                throw new UserError("Failed to update profile picture", HttpStatusCode.InternalServerError);
            }

            await this.redis.delete(`USER:${staffId}`);

            return {
                status: true,
                message: "Profile picture updated successfully"
            };
        } catch (error: any) {
            this.app.log.error('Error updating profile picture:', error);
            throw new UserError("Failed to update profile picture", HttpStatusCode.InternalServerError);
        }
    }

    async deleteFirstTimeLogin(userId: string): Promise<any> {
        try {
            const deleted = await this.userRepositories.deleteFirstTimeLogin(userId);
            if (!deleted) {
                throw new UserError("Failed to delete first time login", HttpStatusCode.InternalServerError);
            }
            return true;
        } catch (error: any) {
            this.app.log.error('Error deleting first time login:', error);
            throw new UserError("Failed to delete first time login", HttpStatusCode.InternalServerError);
        }
    }


    private buildProfileData(profile: OnboardingData['profile'], staffId: string, email: string) {
        return { ...profile, staffId, email } as any;
    }

    private buildQualificationData(qualification: NonNullable<OnboardingData['qualifications']>[number], staffId: string) {
        return { ...qualification, staffId };
    }

    private buildEmergencyContactData(emergencyContact: NonNullable<OnboardingData['emergencyContact']>, staffId: string) {
        return { ...emergencyContact, staffId };
    }

    private buildNotificationSettingsData(notifications: NonNullable<OnboardingData['notifications']>, staffId: string) {
        return { ...notifications, userId: staffId };
    }

    private buildUserReponse(user: any) {
        const userResponse = {
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                otherName: user.otherName,
                roleId: user.roleId,
                status: user.status,
                userType: user?.userType,
                position: user?.role?.name,
                profile: user?.profile,
                assignedClasses: user?.assignedClasses,
                assignedSubjects: user?.assignedSubjects,
                school: user?.school
            }
        }

        return userResponse;
    }
}

export default UserService;