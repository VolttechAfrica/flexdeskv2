import { FastifyInstance } from "fastify";
import { Login } from "../types/login.js";
import { AuthError } from '../utils/errorhandler.js';
import { HttpStatusCode } from "axios";
import { responseMessage } from "../utils/responseMessage.js";
import AuthorizationService from "./authorization.service.js";
import UserResponse from "../utils/loginResponse.js";
import RedisService from "./redis.service.js";
import { RegisterRequest, RegisterResponse, RegisterUser } from "../types/user.js";
import { DEFAULT_PASSWORD } from "../constants/default.js";
import { validateEmail } from "../utils/validator.js";
import { generateRegistrationNumber } from "../utils/registrationNumber.js";
import EmailService from "./email.service.js";




class AuthService {
    private app: FastifyInstance;
    private authRepositories: any;
    private authHelper: AuthorizationService;
    private redis: RedisService;
    private emailService: EmailService;
    constructor(app: FastifyInstance, authRepositories: any) {
        this.app = app;
        this.authRepositories = authRepositories;
        this.authHelper = new AuthorizationService(app);
        this.redis = new RedisService(app);
        this.emailService = new EmailService(app);
    }

    private async hashPassword(password: string): Promise<string> {
        return await this.app.bcrypt.hash(password);
    }

    private async comparePassword(password: string, hash: string): Promise<boolean> {
        return await this.app.bcrypt.compare(password, hash);
    }

    async login({ email, password }: Login): Promise<any> {
        const findUser = await this.authRepositories.findByEmail(email);
        if (!findUser) throw new AuthError(HttpStatusCode.NotFound, responseMessage.InvalidEmailOrPassword.message);
        if (findUser.status !== "ACTIVE") throw new Error(responseMessage.UserAccountInactive.message);
        const loginData = findUser?.staffLogin;
        if (!loginData) throw new AuthError(HttpStatusCode.Unauthorized, responseMessage.Unauthorized.message);

        const isPasswordValid = await this.comparePassword(password, loginData.password);
        if (!isPasswordValid) throw new AuthError(HttpStatusCode.Unauthorized, responseMessage.InvalidEmailOrPassword.message);

        const payload = {
            id: findUser?.id,
            role: findUser?.roleId,
        };

        const token = await this.authHelper.generateLoginToken(payload);

        const permissions = findUser?.role?.RolePermission?.map((rp: { permission: { action: string } }) => rp.permission.action) || [];
      
         // Save the permissions to the redis
         await this.redis.setInstance({
            key: `PERMISSION:${findUser?.id}`,
            value: permissions,
            ttl: 7 * 24 * 60 * 60, // 7 day
        });

        // Save the role id to the redis
        await this.redis.set({
            key: `ROLE:${findUser?.id}`,
            value: findUser?.roleId,
            ttl: 7 * 24 * 60 * 60,
        });

        // save school information to the redis
        await this.redis.setInstance({
            key: `SCHOOL:${findUser?.schoolId}`,
            value: findUser?.school,
            ttl: 7 * 24 * 60 * 60,
        });

        const user = await UserResponse(findUser, token);
        //save user personal Information to the redis
        await this.redis.setInstance({
            key: `USER:${findUser?.id}`,
            value: user,
            ttl: 7 * 24 * 60 * 60,
        });
        return user;
    }

    async register({ user }: RegisterRequest): Promise<RegisterResponse> {
        try {
            const hashedPassword = await this.hashPassword(DEFAULT_PASSWORD);
            const school = await this.redis.getInstance(`SCHOOL:${user.schoolId}`);
            if (!school) throw new AuthError(HttpStatusCode.NotFound, responseMessage.NotFound.message);

            if (!validateEmail(user.email)) throw new AuthError(HttpStatusCode.BadRequest, responseMessage.InvalidEmail.message);

            const registrationNumber = await generateRegistrationNumber(school.shortName as string);
            
            const userData: RegisterUser = {        
                firstName: user.firstName,
                lastName: user.lastName,
                otherName: user.otherName,
                email: user.email,
                password: hashedPassword,
                roleId: user.roleId,
                schoolId: user.schoolId,
                staffId: registrationNumber,
            }
            if (user.assignClass) {
                userData.classArmId = user?.assignClass?.classArmId;
                userData.classId = user?.assignClass?.classId;
                userData.password = await this.hashPassword(DEFAULT_PASSWORD);
            } 

            const newUser = await this.authRepositories.createUser(userData);
            if(!newUser) throw new AuthError(HttpStatusCode.BadRequest, responseMessage.FailedToCreateUser.message);

            await this.emailService.sendWelcomeEmail({
                to: user.email,
                name: `${user.firstName} ${user.lastName}`,
                temporaryPassword: DEFAULT_PASSWORD
            });
            
            return {
                status: true,
                message: "User created successfully",
            }
            
        } catch (error) {
            return {
                status: false,
                message: "Failed to register user",
                error: error instanceof Error ? error.message : "An unknown error occurred"
            }
        }
    }

    async logout(staffId: string): Promise<any> {
        try {
            await this.redis.delete(`USER:${staffId}`);
            await this.redis.delete(`PERMISSION:${staffId}`);
            await this.redis.delete(`ROLE:${staffId}`);
            return {
                status: true,
                message: "User logged out successfully",
            }
        } catch (error) {
            return {
                status: false,
                message: "Failed to logout user",
                error: error instanceof Error ? error.message : "An unknown error occurred"
            }
        }
    }
}


export default AuthService