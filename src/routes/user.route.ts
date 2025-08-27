import { FastifyInstance } from "fastify";
import UserController from "../controllers/user.controller.js";

async function userRoutes(app: FastifyInstance) {
    const userController = new UserController(app);

    // Complete onboarding with all information
    app.route({
        method: "POST",
        preHandler: [app.authenticate],
        url: "/onboarding",
        schema: {
            body: {
                type: "object",
                properties: {
                    profile: {
                        type: "object",
                        properties: {
                            profilePicture: { type: "string" },
                            dateOfBirth: { type: "string" },
                            gender: { type: "string" },
                            phoneNumber: { type: "string" },
                            address: { type: "string" },
                            state: { type: "string" },
                            city: { type: "string" },
                            lga: { type: "string" }
                        }
                    },
                    qualifications: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                qualification: { type: "string" },
                                institution: { type: "string" },
                                course: { type: "string" },
                                grade: { type: "string" },
                                yearObtained: { type: "string" }
                            },
                            required: ["qualification", "institution", "course"]
                        }
                    },
                    emergencyContact: {
                        type: "object",
                        properties: {
                            name: { type: "string" },
                            relationship: { type: "string" },
                            phoneNumber: { type: "string" }
                        },
                        required: ["name", "relationship", "phoneNumber"]
                    },
                    notifications: {
                        type: "object",
                        properties: {
                            email: { type: "boolean" },
                            sms: { type: "boolean" },
                            push: { type: "boolean" }
                        }
                    }
                }
            },
            response: {
                200: {
                    type: "object",
                    properties: {
                        status: { type: "boolean" },
                        message: { type: "string" },
                        token: { type: "string" }
                    }
                }
            }
        },
        handler: userController.completeOnboarding.bind(userController),
    });

    // Update profile picture separately
    app.route({
        method: "PUT",
        preHandler: [app.authenticate],
        url: "/profile-picture",
        schema: {
            body: {
                type: "object",
                properties: {
                    profilePicture: { type: "string" }
                },
                required: ["profilePicture"]
            },
            response: {
                200: {
                    type: "object",
                    properties: {
                        status: { type: "boolean" },
                        message: { type: "string" },
                        token: { type: "string" }
                    }
                }
            }
        },
        handler: userController.updateProfilePicture.bind(userController),
    });

    // Complete first-time login process
    app.route({
        method: "POST",
        preHandler: [app.authenticate],
        url: "/complete-onboarding",
        schema: {
            response: {
                200: {
                    type: "object",
                    properties: {
                        status: { type: "boolean" },
                        message: { type: "string" },
                        token: { type: "string" }
                    }
                }
            }
        },
        handler: userController.deleteFirstTimeLogin.bind(userController),
    });
}

export default userRoutes;