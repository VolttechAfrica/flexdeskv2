import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import ForgotPasswordService from "../services/forgotPassword.service.js";
import { createUserRepository } from "../repositories/user.repository.js";
import { UserError } from "../utils/errorhandler.js";
import { HttpStatusCode } from "axios";

interface ForgotPasswordBody {
    email: string;
}

interface VerifyOTPBody {
    email: string;
    otp: string;
}

interface ResetPasswordBody {
    email: string;
    resetToken: string;
    newPassword: string;
    confirmPassword: string;
}

interface ChangePasswordBody {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}

class ForgotPasswordController {
    private readonly app: FastifyInstance;
    private readonly forgotPasswordService: ForgotPasswordService;

    constructor(app: FastifyInstance) {
        this.app = app;
        this.forgotPasswordService = new ForgotPasswordService(app, createUserRepository(app));
    }

    /**
     * Initiate forgot password process
     */
    async initiateForgotPassword(request: FastifyRequest<{ Body: ForgotPasswordBody }>, reply: FastifyReply) {
        try {
            const { email } = request.body;

            if (!email) {
                throw new UserError("Email is required", HttpStatusCode.BadRequest);
            }

            const result = await this.forgotPasswordService.initiateForgotPassword({ email });

            if (result.status) {
                return reply.status(HttpStatusCode.Ok).send(result);
            } else {
                return reply.status(HttpStatusCode.BadRequest).send(result);
            }

        } catch (error) {
            const message = 'Forgot password initiation error';
            if (error instanceof Error) {
                this.app.log.error(error, message);
            } else {
                this.app.log.error({ error }, message);
            }
            return reply.status(HttpStatusCode.InternalServerError).send({
                status: false,
                message: "Failed to initiate password reset",
                error: error instanceof Error ? error.message : "An unknown error occurred"
            });
        }
    }

    /**
     * Verify OTP for password reset
     */
    async verifyOTP(request: FastifyRequest<{ Body: VerifyOTPBody }>, reply: FastifyReply) {
        try {
            const { email, otp } = request.body;

            if (!email || !otp) {
                throw new UserError("Email and OTP are required", HttpStatusCode.BadRequest);
            }

            const result = await this.forgotPasswordService.verifyOTP({ email, otp });

            if (result.status) {
                return reply.status(HttpStatusCode.Ok).send(result);
            } else {
                return reply.status(HttpStatusCode.BadRequest).send(result);
            }

        } catch (error) {
            const message = 'OTP verification error';
            if (error instanceof Error) {
                this.app.log.error(error, message);
            } else {
                this.app.log.error({ error }, message);
            }
            return reply.status(HttpStatusCode.InternalServerError).send({
                status: false,
                message: "Failed to verify OTP",
                error: error instanceof Error ? error.message : "An unknown error occurred"
            });
        }
    }

    /**
     * Reset password using OTP
     */
    async resetPassword(request: FastifyRequest<{ Body: ResetPasswordBody }>, reply: FastifyReply) {
        try {
            const { email, resetToken, newPassword, confirmPassword } = request.body;

            if (!email || !resetToken || !newPassword || !confirmPassword) {
                throw new UserError("All fields are required", HttpStatusCode.BadRequest);
            }

            const result = await this.forgotPasswordService.resetPassword({ 
                email, 
                resetToken, 
                newPassword, 
                confirmPassword 
            });

            if (result.status) {
                return reply.status(HttpStatusCode.Ok).send(result);
            } else {
                return reply.status(HttpStatusCode.BadRequest).send(result);
            }

        } catch (error) {
            const message = 'Password reset error';
            if (error instanceof Error) {
                this.app.log.error(error, message);
            } else {
                this.app.log.error({ error }, message);
            }
            return reply.status(HttpStatusCode.InternalServerError).send({
                status: false,
                message: "Failed to reset password",
                error: error instanceof Error ? error.message : "An unknown error occurred"
            });
        }
    }

    /**
     * Change password for authenticated users
     */
    async changePassword(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { currentPassword, newPassword, confirmPassword } = request.body as ChangePasswordBody;
            const userId = (request.user as any)?.id;

            if (!userId) {
                throw new UserError("User not authenticated", HttpStatusCode.Unauthorized);
            }

            if (!currentPassword || !newPassword || !confirmPassword) {
                throw new UserError("All password fields are required", HttpStatusCode.BadRequest);
            }

            const result = await this.forgotPasswordService.changePassword({
                userId,
                currentPassword,
                newPassword,
                confirmPassword
            });

            if (result.status) {
                return reply.status(HttpStatusCode.Ok).send(result);
            } else {
                return reply.status(HttpStatusCode.BadRequest).send(result);
            }

        } catch (error) {
            const message = 'Password change error';
            if (error instanceof Error) {
                this.app.log.error(error, message);
            } else {
                this.app.log.error({ error }, message);
            }
            return reply.status(HttpStatusCode.InternalServerError).send({
                status: false,
                message: "Failed to change password",
                error: error instanceof Error ? error.message : "An unknown error occurred"
            });
        }
    }
}

export default ForgotPasswordController; 