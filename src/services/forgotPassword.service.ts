import { FastifyInstance } from "fastify";
import { UserError } from "../utils/errorhandler.js";
import { HttpStatusCode } from "axios";
import { responseMessage } from "../utils/responseMessage.js";
import EmailService from "./email.service.js";
import RedisService from "./redis.service.js";
import { validateEmail } from "../utils/validator.js";
import forgotPasswordEmail from "../utils/emailboilerplate/forgotpassword.js";
import passwordChangeConfirmation from "../utils/emailboilerplate/passwordchangeconfirmation.js";
import crypto from "crypto";
import AuthorizationService from "./authorization.service.js";

// Security constants
const SECURITY_CONFIG = {
    OTP_LENGTH: 6,
    OTP_EXPIRY: 10 * 60, // 10 minutes in seconds
    MAX_ATTEMPTS: 3,
    ATTEMPT_WINDOW: 1 * 60, //15 * 60, // 15 minutes in seconds
    RESET_TOKEN_EXPIRY: 10 * 60, // 10 minutes in seconds
    PASSWORD_MIN_LENGTH: 8,
    PASSWORD_MAX_LENGTH: 128,
} as const;

// Redis key patterns
const REDIS_KEYS = {
    OTP: (email: string) => `otp:${email}`,
    OTP_ATTEMPTS: (email: string) => `otp_attempts:${email}`,
    RESET_TOKEN: (token: string) => `reset_token:${token}`,
    RESET_TOKEN_BY_EMAIL: (email: string) => `reset_token_by_email:${email}`,
    RESET_ATTEMPTS: (email: string) => `reset_attempts:${email}`,
} as const;

// Response messages
const RESPONSE_MESSAGES = {
    OTP_SENT: "OTP sent successfully. Please check your email.",
    OTP_INVALID: "Invalid or expired OTP.",
    OTP_EXPIRED: "OTP has expired. Please request a new one.",
    TOO_MANY_ATTEMPTS: "Too many attempts. Please try again later.",
    PASSWORD_RESET_SUCCESS: "Password reset successfully.",
    PASSWORD_CHANGE_SUCCESS: "Password changed successfully.",
    EMAIL_NOT_FOUND: "Email not found in our system.",
    INVALID_PASSWORD: "Password must be between 8 and 128 characters.",
    PASSWORD_MISMATCH: "Passwords do not match.",
} as const;

interface ForgotPasswordRequest {
    email: string;
}

interface VerifyOTPRequest {
    email: string;
    otp: string;
}

interface ResetPasswordRequest {
    email: string;
    resetToken: string;
    newPassword: string;
    confirmPassword: string;
}

interface ChangePasswordRequest {
    userId: string;
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}

interface ForgotPasswordResponse {
    status: boolean;
    message: string;
    data?: any;
    error?: string;
}

class ForgotPasswordService {
    private readonly app: FastifyInstance;
    private readonly emailService: EmailService;
    private readonly redisService: RedisService;
    private readonly authRepositories: any;
    private readonly authorizationService: AuthorizationService;
    constructor(app: FastifyInstance, authRepositories: any) {
        this.app = app;
        this.emailService = new EmailService(app);
        this.redisService = new RedisService(app);
        this.authRepositories = authRepositories;
        this.authorizationService = new AuthorizationService(app);
    }

    /**
     * Initiate forgot password process by sending OTP
     */
    async initiateForgotPassword(request: ForgotPasswordRequest): Promise<ForgotPasswordResponse> {
        try {
            const { email } = request;
            
            if (!validateEmail(email)) {
                throw new UserError(responseMessage.InvalidEmail.message, HttpStatusCode.BadRequest);
            }

            await this.checkRateLimit(email, 'otp');

            const user = await this.findUserByEmail(email);
            if (!user) {
                throw new UserError(RESPONSE_MESSAGES.EMAIL_NOT_FOUND, HttpStatusCode.NotFound);
            }

            const otp = this.generateOTP();
            await this.storeOTP(email, otp);

            const userName = `${user.firstName} ${user.lastName}`;
            await this.sendOTPEmail(email, userName, otp);
    
            return this.createSuccessResponse(RESPONSE_MESSAGES.OTP_SENT, { email, expiresIn: SECURITY_CONFIG.OTP_EXPIRY});

        } catch (error) {
            this.app.log.error('Forgot password initiation error:', error);
            return this.createErrorResponse(error);
        }
    }

    /**
     * Verify OTP for password reset
     */
    async verifyOTP(request: VerifyOTPRequest): Promise<ForgotPasswordResponse> {
        try {
            const { email, otp } = request;
            if (!email || !otp) {
                throw new UserError("Email and OTP are required", HttpStatusCode.BadRequest);
            }

            await this.checkRateLimit(email, 'verification');

            const isValidOTP = await this.verifyStoredOTP(email, otp);
            if (!isValidOTP) {
                await this.incrementAttempts(email, 'otp');
                throw new UserError(RESPONSE_MESSAGES.OTP_INVALID, HttpStatusCode.BadRequest);
            }

            await this.clearOTP(email);

            const resetToken = await this.generateResetToken({ email, otp });
            await this.storeResetToken(email, resetToken);

            return this.createSuccessResponse("OTP verified successfully", { email, resetToken });

        } catch (error) {
            console.log('error', error);
            this.app.log.error('OTP verification error:', error);
            return this.createErrorResponse(error);
        }
    }

    /**
     * Reset password using OTP and new password
     */
    async resetPassword(request: ResetPasswordRequest): Promise<ForgotPasswordResponse> {
        try {
            const { email, resetToken, newPassword, confirmPassword } = request;

            this.validatePasswordResetInputs(email, resetToken, newPassword, confirmPassword);

            await this.checkRateLimit(email, 'reset');

            const isValidOTP = await this.verifyResetToken({email, token: resetToken});
            if (!isValidOTP) {
                await this.incrementAttempts(email, 'reset');
                throw new UserError(RESPONSE_MESSAGES.OTP_INVALID, HttpStatusCode.BadRequest);
            }

            const user = await this.findUserByEmail(email);
            if (!user) {
                throw new UserError(RESPONSE_MESSAGES.EMAIL_NOT_FOUND, HttpStatusCode.NotFound);
            }

            const hashedPassword = await this.hashPassword(newPassword);

            await this.updateUserPassword(user.id, hashedPassword);

            await this.clearOTP(email);
            await this.clearResetToken(email);

            await this.sendPasswordChangeConfirmation(email, user.firstName || 'User');

            return this.createSuccessResponse(RESPONSE_MESSAGES.PASSWORD_RESET_SUCCESS);

        } catch (error) {
            this.app.log.error('Password reset error:', error);
            return this.createErrorResponse(error);
        }
    }

    /**
     * Change password for authenticated users
     */
    async changePassword(request: ChangePasswordRequest): Promise<ForgotPasswordResponse> {
        try {
            const { userId, currentPassword, newPassword, confirmPassword } = request;

            if (!currentPassword || !newPassword || !confirmPassword) {
                throw new UserError("All password fields are required", HttpStatusCode.BadRequest);
            }

            if (newPassword !== confirmPassword) {
                throw new UserError(RESPONSE_MESSAGES.PASSWORD_MISMATCH, HttpStatusCode.BadRequest);
            }

            this.validatePasswordStrength(newPassword);

            const user = await this.getUserWithPassword(userId);
            if (!user) {
                throw new UserError("User not found", HttpStatusCode.NotFound);
            }

            const isCurrentPasswordValid = await this.verifyCurrentPassword(currentPassword, user.password);
            if (!isCurrentPasswordValid) {
                throw new UserError("Current password is incorrect", HttpStatusCode.BadRequest);
            }

            const hashedPassword = await this.hashPassword(newPassword);

            await this.updateUserPassword(userId, hashedPassword);

            await this.sendPasswordChangeConfirmation(user.email, user.firstName || 'User');

            this.app.log.info(`Password changed successfully for user ${userId}`);

            return this.createSuccessResponse(RESPONSE_MESSAGES.PASSWORD_CHANGE_SUCCESS);

        } catch (error) {
            this.app.log.error('Password change error:', error);
            return this.createErrorResponse(error);
        }
    }

    // Private helper methods

    private generateOTP(): string {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    private async generateResetToken(payload: { email: string, otp: string }): Promise<string> {
        const token = await this.authorizationService.generateToken(payload);
        return token;
    }

    private async storeOTP(email: string, otp: string): Promise<void> {
        const key = REDIS_KEYS.OTP(email);
        await this.redisService.set({ key, value: otp, ttl: SECURITY_CONFIG.OTP_EXPIRY });
    }

    private async storeResetToken(email: string, token: string): Promise<void> {
        const tokenKey = REDIS_KEYS.RESET_TOKEN(token);
        const emailKey = REDIS_KEYS.RESET_TOKEN_BY_EMAIL(email);
        await this.redisService.set({ key: tokenKey, value: email, ttl: SECURITY_CONFIG.RESET_TOKEN_EXPIRY });
        await this.redisService.set({ key: emailKey, value: token, ttl: SECURITY_CONFIG.RESET_TOKEN_EXPIRY });
    }

    private async verifyStoredOTP(email: string, otp: string): Promise<boolean> {
        const key = REDIS_KEYS.OTP(email);
        const storedOTP = await this.redisService.get<string>(key);
        console.log('storedOTP', storedOTP);
        console.log('otp', otp);
        return Number(storedOTP) === Number(otp);
    }

    private async verifyResetToken({email, token}: {email: string, token: string}): Promise<boolean> {
        const key = REDIS_KEYS.RESET_TOKEN(token);
        const emailKey = REDIS_KEYS.RESET_TOKEN_BY_EMAIL(email);
        const storedToken = await this.redisService.get<string>(key);
        const storedEmail = await this.redisService.get<string>(emailKey);

        const decodeToken = await this.app.jwt.verify(token) as any;
        if(!decodeToken) return false;

        return storedToken === token && storedEmail === decodeToken.email;
    }

    private async clearOTP(email: string): Promise<void> {
        const key = REDIS_KEYS.OTP(email);
        await this.redisService.delete(key);
    }

    private async clearResetToken(email: string): Promise<void> {
        const emailKey = REDIS_KEYS.RESET_TOKEN_BY_EMAIL(email);
        const token = await this.redisService.get<string>(emailKey);
        if (token) {
            const tokenKey = REDIS_KEYS.RESET_TOKEN(token);
            await this.redisService.delete(tokenKey);
            await this.redisService.delete(emailKey);
        }
    }

    private async checkRateLimit(email: string, operation: 'otp' | 'verification' | 'reset'): Promise<void> {
        const attemptsKey = REDIS_KEYS.OTP_ATTEMPTS(email);
        const currentAttemptsRaw = await this.redisService.get<string>(attemptsKey);
        const attempts = parseInt(currentAttemptsRaw ?? '0', 10);

        if (attempts >= SECURITY_CONFIG.MAX_ATTEMPTS) {
            throw new UserError(RESPONSE_MESSAGES.TOO_MANY_ATTEMPTS, HttpStatusCode.TooManyRequests);
        }
    }

    private async incrementAttempts(email: string, operation: 'otp' | 'verification' | 'reset'): Promise<void> {
        const attemptsKey = REDIS_KEYS.OTP_ATTEMPTS(email);
        const currentAttemptsRaw = await this.redisService.get<string>(attemptsKey);
        const attempts = parseInt(currentAttemptsRaw ?? '0', 10) + 1;

        await this.redisService.set({ 
            key: attemptsKey, 
            value: attempts.toString(), 
            ttl: SECURITY_CONFIG.ATTEMPT_WINDOW 
        });
    }

    private validatePasswordResetInputs(email: string, resetToken: string, newPassword: string, confirmPassword: string): void {
        if (!email || !resetToken || !newPassword || !confirmPassword) {
            throw new UserError("All fields are required", HttpStatusCode.BadRequest);
        }

        if (newPassword !== confirmPassword) {
            throw new UserError(RESPONSE_MESSAGES.PASSWORD_MISMATCH, HttpStatusCode.BadRequest);
        }

        this.validatePasswordStrength(newPassword);
    }

    private validatePasswordStrength(password: string): void {
        if (password.length < SECURITY_CONFIG.PASSWORD_MIN_LENGTH || 
            password.length > SECURITY_CONFIG.PASSWORD_MAX_LENGTH) {
            throw new UserError(RESPONSE_MESSAGES.INVALID_PASSWORD, HttpStatusCode.BadRequest);
        }
    }

    private async findUserByEmail(email: string): Promise<any> {
        let user = await this.authRepositories.findByEmail(email);
        if (user) return user;

        user = await this.authRepositories.findParentByEmail(email);
        return user;
    }

    private async getUserWithPassword(userId: string): Promise<any> {
        return await this.authRepositories.findById(userId);
    }

    private async verifyCurrentPassword(inputPassword: string, storedHash: string): Promise<boolean> {
        return await this.app.bcrypt.compare(inputPassword, storedHash);
    }

    private async hashPassword(password: string): Promise<string> {
        return await this.app.bcrypt.hash(password);
    }

    private async updateUserPassword(userId: string, hashedPassword: string): Promise<void> {
        await this.authRepositories.updatePassword(userId, hashedPassword);
    }

    private async sendOTPEmail(email: string, userName: string, otp: string): Promise<void> {
        const subject = "Password Reset OTP - Flexdesk";
        const html = forgotPasswordEmail
            .replace("{user_name}", userName)
            .replace("{OTP}", otp);

        await this.emailService.sendGeneralEmail(email, subject, html);
    }

    private async sendPasswordChangeConfirmation(email: string, userName: string): Promise<void> {
        const subject = "Password Changed Successfully - Flexdesk";
        const html = passwordChangeConfirmation
            .replace("{user_name}", userName);

        await this.emailService.sendGeneralEmail(email, subject, html);
    }

    private createSuccessResponse(message: string, data?: any): ForgotPasswordResponse {
        return {
            status: true,
            message,
            data
        };
    }

    private createErrorResponse(error: any): ForgotPasswordResponse {
        return {
            status: false,
            message: error instanceof UserError ? error.message : "An unexpected error occurred",
            error: error instanceof Error ? error.message : "Unknown error"
        };
    }
}

export default ForgotPasswordService; 