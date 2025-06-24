import { FastifyInstance } from "fastify";
import StudentController from "../controllers/student.controller.js";
import authorize from "../hooks/auth.hook.js";
import { StudentStatus } from "@prisma/client";

interface StudentQueryParams {
    schoolId: string;
    page?: string;
    limit?: string;
    status?: StudentStatus;
    classId?: string;
    classArmId?: string;
    searchTerm?: string;
}

interface StudentParams {
    id: string;
}

interface StudentStatusBody {
    status: StudentStatus;
}

async function studentRoutes(app: FastifyInstance) {
    const studentController = new StudentController(app);
    const manageStudentsAuth = await authorize("manage_students");

    // Get all students with pagination and filtering
    app.route<{
        Querystring: StudentQueryParams;
    }>({
        method: "GET",
        url: "/",
        preHandler: [app.authenticate, manageStudentsAuth],
        handler: studentController.getAllStudents.bind(studentController),
        schema: {
            querystring: {
                type: "object",
                properties: {
                    schoolId: { type: "string" },
                    page: { type: "string", pattern: "^[1-9]\\d*$" },
                    limit: { type: "string", pattern: "^[1-9]\\d*$" },
                    status: { 
                        type: "string",
                        enum: Object.values(StudentStatus)
                    },
                    classId: { type: "string" },
                    classArmId: { type: "string" },
                    searchTerm: { type: "string", minLength: 2 }
                },
                required: ["schoolId"],
                additionalProperties: false
            },
            response: {
                200: {
                    type: "object",
                    properties: {
                        status: { type: "boolean" },
                        message: { type: "string" },
                        students: { 
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    id: { type: "string" },
                                    firstName: { type: "string" },
                                    lastName: { type: "string" },
                                    otherName: { type: "string" },
                                    status: { type: "string" },
                                    class: {
                                        type: "object",
                                        properties: {
                                            name: { type: "string" }
                                        }
                                    },
                                    classArm: {
                                        type: "object",
                                        properties: {
                                            name: { type: "string" }
                                        }
                                    },
                                    profile: {
                                        type: "object",
                                        properties: {
                                            profilePicture: { type: "string" },
                                            dateOfBirth: { type: "string" },
                                            email: { type: "string" },
                                            phoneNumber: { type: "string" }
                                        }
                                    }
                                }
                            }
                        },
                        total: { type: "number" },
                        page: { type: "number" },
                        limit: { type: "number" },
                        totalPages: { type: "number" },
                        token: { type: "string" }
                    },
                    required: ["status", "message", "students", "total", "token"]
                }
            }
        }
    });

    // Get student by ID
    app.route<{
        Params: StudentParams;
    }>({
        method: "GET",
        url: "/:id",
        preHandler: [app.authenticate, manageStudentsAuth],
        handler: studentController.getStudentById.bind(studentController),
        schema: {
            params: {
                type: "object",
                properties: {
                    id: { type: "string" }
                },
                required: ["id"]
            },
            response: {
                200: {
                    type: "object",
                    properties: {
                        status: { type: "boolean" },
                        message: { type: "string" },
                        data: {
                            type: "object",
                            properties: {
                                id: { type: "string" },
                                firstName: { type: "string" },
                                lastName: { type: "string" },
                                otherName: { type: "string" },
                                status: { type: "string" },
                                class: {
                                    type: "object",
                                    properties: {
                                        name: { type: "string" }
                                    }
                                },
                                classArm: {
                                    type: "object",
                                    properties: {
                                        name: { type: "string" }
                                    }
                                },
                                profile: {
                                    type: "object",
                                    properties: {
                                        profilePicture: { type: "string" },
                                        dateOfBirth: { type: "string" },
                                        email: { type: "string" },
                                        phoneNumber: { type: "string" },
                                        address: { type: "string" },
                                        state: { type: "string" },
                                        lga: { type: "string" }
                                    }
                                }
                            }
                        },
                        token: { type: "string" }
                    },
                    required: ["status", "message", "data", "token"]
                }
            }
        }
    });

    // Update student status
    app.route<{
        Params: StudentParams;
        Body: StudentStatusBody;
    }>({
        method: "PATCH",
        url: "/:id/status",
        preHandler: [app.authenticate, manageStudentsAuth],
        handler: studentController.updateStudentStatus.bind(studentController),
        schema: {
            params: {
                type: "object",
                properties: {
                    id: { type: "string" }
                },
                required: ["id"]
            },
            body: {
                type: "object",
                properties: {
                    status: { 
                        type: "string",
                        enum: Object.values(StudentStatus)
                    }
                },
                required: ["status"]
            },
            response: {
                200: {
                    type: "object",
                    properties: {
                        status: { type: "boolean" },
                        message: { type: "string" },
                        data: {
                            type: "object",
                            properties: {
                                id: { type: "string" },
                                firstName: { type: "string" },
                                lastName: { type: "string" },
                                otherName: { type: "string" },
                                status: { type: "string" },
                                class: {
                                    type: "object",
                                    properties: {
                                        name: { type: "string" }
                                    }
                                },
                                classArm: {
                                    type: "object",
                                    properties: {
                                        name: { type: "string" }
                                    }
                                }
                            }
                        },
                        token: { type: "string" }
                    },
                    required: ["status", "message", "data", "token"]
                }
            }
        }
    });
}

export default studentRoutes;