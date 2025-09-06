import { FastifyInstance } from 'fastify';
import ForgotPasswordController from '../controllers/forgotPassword.controller.js';

async function forgotPasswordRoutes(app: FastifyInstance) {
    const forgotPasswordHandler = new ForgotPasswordController(app);

    // Initiate forgot password process
    app.route({
        method: "POST",
        url: "/forgot-password",
        schema: {
            body: {
                type: 'object',
                required: ['email'],
                properties: {
                    email: { 
                        type: 'string', 
                        format: 'email',
                        description: 'User email address'
                    }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        status: { type: 'boolean' },
                        message: { type: 'string' },
                        data: {
                            type: 'object',
                            properties: {
                                email: { type: 'string' },
                                expiresIn: { type: 'number' }
                            }
                        }
                    }
                },
                400: {
                    type: 'object',
                    properties: {
                        status: { type: 'boolean' },
                        message: { type: 'string' },
                        error: { type: 'string' }
                    }
                }
            }
        },
        preHandler: [app.authRateLimit],
        handler: forgotPasswordHandler.initiateForgotPassword.bind(forgotPasswordHandler)
    });

    // Verify OTP
    app.route({
        method: "POST",
        url: "/verify-otp",
        schema: {
            body: {
                type: 'object',
                required: ['email', 'otp'],
                properties: {
                    email: { 
                        type: 'string', 
                        format: 'email',
                        description: 'User email address'
                    },
                    otp: { 
                        type: 'string', 
                        minLength: 6,
                        maxLength: 6,
                        pattern: '^[0-9]{6}$',
                        description: '6-digit OTP code'
                    }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        status: { type: 'boolean' },
                        message: { type: 'string' },
                        data: {
                            type: 'object',
                            properties: {
                                email: { type: 'string' },
                                resetToken: { type: 'string' }
                            }
                        }
                    }
                },
                400: {
                    type: 'object',
                    properties: {
                        status: { type: 'boolean' },
                        message: { type: 'string' },
                        error: { type: 'string' }
                    }
                }
            }
        },
       preHandler: [app.authRateLimit],
        handler: forgotPasswordHandler.verifyOTP.bind(forgotPasswordHandler)
    });

    // Reset password with OTP
    app.route({
        method: "POST",
        url: "/reset-password",
        schema: {
            body: {
                type: 'object',
                required: ['email', 'resetToken', 'newPassword', 'confirmPassword'],
                properties: {
                    email: { 
                        type: 'string', 
                        format: 'email',
                        description: 'User email address'
                    },
                    resetToken: { 
                        type: 'string',
                        description: 'Reset token'
                    },
                    newPassword: { 
                        type: 'string', 
                        minLength: 8,
                        maxLength: 128,
                        description: 'New password (8-128 characters)'
                    },
                    confirmPassword: { 
                        type: 'string', 
                        minLength: 8,
                        maxLength: 128,
                        description: 'Password confirmation'
                    }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        status: { type: 'boolean' },
                        message: { type: 'string' }
                    }
                },
                400: {
                    type: 'object',
                    properties: {
                        status: { type: 'boolean' },
                        message: { type: 'string' },
                        error: { type: 'string' }
                    }
                }
            }
        },
        preHandler: [app.authRateLimit],
        handler: forgotPasswordHandler.resetPassword.bind(forgotPasswordHandler)
    });

    // Change password (authenticated users)
    app.route({
        method: "POST",
        url: "/change-password",
        schema: {
            body: {
                type: 'object',
                required: ['currentPassword', 'newPassword', 'confirmPassword'],
                properties: {
                    currentPassword: { 
                        type: 'string', 
                        minLength: 1,
                        description: 'Current password'
                    },
                    newPassword: { 
                        type: 'string', 
                        minLength: 8,
                        maxLength: 128,
                        description: 'New password (8-128 characters)'
                    },
                    confirmPassword: { 
                        type: 'string', 
                        minLength: 8,
                        maxLength: 128,
                        description: 'Password confirmation'
                    }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        status: { type: 'boolean' },
                        message: { type: 'string' }
                    }
                },
                400: {
                    type: 'object',
                    properties: {
                        status: { type: 'boolean' },
                        message: { type: 'string' },
                        error: { type: 'string' }
                    }
                },
                401: {
                    type: 'object',
                    properties: {
                        status: { type: 'boolean' },
                        message: { type: 'string' },
                        error: { type: 'string' }
                    }
                }
            }
        },
        preHandler: [app.authenticate, app.authRateLimit],
        handler: forgotPasswordHandler.changePassword.bind(forgotPasswordHandler)
    });
}

export default forgotPasswordRoutes; 