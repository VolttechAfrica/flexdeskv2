import { FastifyInstance } from "fastify";
import UserController from "../controllers/user.controller.js";

async function userRoutes(app: FastifyInstance) {
    const userController = new UserController(app);

    app.route({
        method: "POST",
        preHandler: [app.authenticate],
        url: "/personal-information",
        schema: {
            body: {
                type: "object",
                properties: {
                    firstName: { type: "string" },
                    lastName: { type: "string" },
                    otherName: { type: "string" },
                    gender: { type: "string" },
                    dateOfBirth: { type: "string" },
                    phoneNumber: { type: "string" },
                },
                required: ["firstName", "lastName", "otherName", "gender", "dateOfBirth", "phoneNumber"],
            },
        },
        handler: userController.updateOboardingInfoStepOne.bind(userController),
    })

    app.route({
        method: "POST",
        preHandler: [app.authenticate],
        url: "/contact-address",
        schema: {
            body: {
                type: "object",
                properties: {
                    address: { type: "string" },
                    state: { type: "string" },
                    city: { type: "string" },
                    lga: { type: "string" },
                },
                required: ["address", "state", "city", "lga"],
            },
        },
        handler: userController.updateOboardingInfoStepTwo.bind(userController),
    })

    app.route({
        method: "GET",
        preHandler: [app.authenticate],
        url: "/qualification/:userId",
        schema: {
            params: {
                type: "object",
                properties: {
                    userId: { type: "string" },
                },
            },
        },
        handler: userController.getEducationalQualification.bind(userController),
    })

    app.route({
        method: "POST",
        preHandler: [app.authenticate],
        url: "/qualification",
        schema: {
            body: {
                type: "object",
                properties: {
                    qualification: { type: "string" },
                    institution: { type: "string" },
                    course: { type: "string" },
                    grade: { type: "string" },
                    yearObtained: { type: "string" },
                },
                required: ["qualification", "institution", "course", "grade", "yearObtained"],
            },
        },
        handler: userController.updateEducationalQualification.bind(userController),
    })

    app.route({
        method: "PUT",
        preHandler: [app.authenticate],
        url: "/profile-picture/:userId",
        schema: {
            params: {
                type: "object",
                properties: {
                    userId: { type: "string" },
                },
                required: ["userId"],
            },
            body: {
                type: "object",
                properties: {
                    profilePicture: { type: "string" },
                },
                required: ["profilePicture"],
            },
        },
        handler: userController.updateUserProfilePicture.bind(userController),
    })

    app.route({
        method: "POST",
        preHandler: [app.authenticate],
        url: "/first-time-login",
        schema: {
            body: {
                type: "object",
                properties: {
                    staffId: { type: "string" },
                },
                required: ["staffId"],
            },
        },
        handler: userController.deleteFirstTimeLogin.bind(userController),
    })
    
}

export default userRoutes;