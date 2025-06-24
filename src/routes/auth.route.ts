import { FastifyInstance } from 'fastify';
import AuthController from '../controllers/auth.controller.js';
import authorize from '../hooks/auth.hook.js';
import { RegisterRequest } from '../types/user.js';

async function authRoutes(app: FastifyInstance){
    const authHandler = new AuthController(app);
    

    app.route({
        method: "POST",
        url: "/login",
        handler: authHandler.login.bind(authHandler)
    })

    app.route({
        method: "POST",
        url: "/logout",
        preHandler: [app.authenticate],
        handler: authHandler.logout.bind(authHandler)
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
                            firstName: { type: 'string' },
                            lastName: { type: 'string' },
                            otherName: { type: 'string' },
                            email: { type: 'string', format: 'email' },
                            roleId: { type: 'string' },
                            schoolId: { type: 'string' },
                            staffId: { type: 'string' },
                            classArmId: { type: 'string' },
                            classId: { type: 'string' },
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
