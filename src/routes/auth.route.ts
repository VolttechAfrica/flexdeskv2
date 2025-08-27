import { FastifyInstance } from 'fastify';
import AuthController from '../controllers/auth.controller.js';
import authorize from '../hooks/auth.hook.js';
import { RegisterRequest, StaffType } from '../types/user.js';
import { FastifyRequest, FastifyReply } from 'fastify';
import AuthorizationService from '../services/authorization.service.js';

async function authRoutes(app: FastifyInstance){
    const authHandler = new AuthController(app);
    

    app.route({
        method: "POST",
        url: "/login",
        schema: {
            body: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string', minLength: 1 }
                }
            }
        },
        handler: authHandler.login.bind(authHandler)
    })

    app.route({
        method: "POST",
        url: "/logout",
        preHandler: [app.authenticate],
        handler: authHandler.logout.bind(authHandler)
    })

    app.route({
        method: "POST",
        url: "/token/refresh",
        schema: {
            headers: {
                type: 'object',
                required: ['x-refresh-token'],
                properties: {
                    'x-refresh-token': { type: 'string' }
                }
            }
        },
        handler: async (request: FastifyRequest<{ Headers: { 'x-refresh-token': string } }>, reply: FastifyReply) => {
            const refreshToken = request.headers['x-refresh-token'];
            if (!refreshToken) {
                return reply.status(400).send({ error: 'Refresh token is required' });
            }
            
            try {
                const authorizationService = new AuthorizationService(app);
                const newToken = await authorizationService.refreshToken(refreshToken);
                return reply.status(200).send(newToken);
            } catch (error: any) {
                return reply.status(401).send({ 
                    error: error.message || 'Failed to refresh token',
                    forceLogout: error.message?.includes('logged out') || false
                });
            }
        }
    })

    const registerAuthorization = await authorize("manage_staff");
    app.route<{ Body: RegisterRequest }>({
        method: "POST",
        url: "/register",
        schema: {
            body: {
                type: 'object',
                required: ['user'],
                properties: {
                    user: {
                        type: 'object',
                        required: ['firstName', 'lastName', 'email', 'roleId', 'schoolId'],
                        properties: {
                            firstName: { 
                                type: 'string', 
                                minLength: 1,
                                description: 'First name of the staff member'
                            },
                            lastName: { 
                                type: 'string', 
                                minLength: 1,
                                description: 'Last name of the staff member'
                            },
                            otherName: { 
                                type: 'string',
                                description: 'Optional middle name or other names'
                            },
                            email: { 
                                type: 'string', 
                                format: 'email',
                                description: 'Email address for the staff member'
                            },
                            roleId: { 
                                type: 'string',
                                description: 'Role ID from the roles table'
                            },
                            schoolId: { 
                                type: 'string',
                                description: 'School ID where the staff member will work'
                            },
                            staffId: { 
                                type: 'string',
                                description: 'Optional custom staff ID. If not provided, system will generate one'
                            },
                            type: { 
                                type: 'string',
                                enum: Object.values(StaffType),
                                description: 'Staff type: ADMIN, CLASS_ROOM_TEACHER, SUBJECT_TEACHER, or OTHER'
                            },
                            classId: { 
                                type: 'string',
                                description: 'Class ID for class room teachers'
                            },
                            classArmId: { 
                                type: 'string',
                                description: 'Class arm ID for class room teachers'
                            },
                            subjects: {
                                type: 'array',
                                items: { type: 'string' },
                                description: 'Array of subject IDs. Required for SUBJECT_TEACHER type'
                            }
                        }
                    }
                }
            }
        },
        preHandler: [app.authenticate, registerAuthorization],
        handler: authHandler.register.bind(authHandler)
    })
}

export default authRoutes
