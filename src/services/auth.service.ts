import { FastifyInstance } from "fastify";
import { Login } from "../types/login.js";
import { AuthError } from '../utils/errorhandler.js';
import { HttpStatusCode } from "axios";
import { responseMessage } from "../utils/responseMessage.js";
import AuthorizationService from "./authorization.service.js";
import { RegisterRequest, RegisterResponse, RegisterUser, StaffType } from "../types/user.js";
import { DEFAULT_PASSWORD } from "../constants/default.js";
import { validateEmail } from "../utils/validator.js";
import { generateRegistrationNumber } from "../utils/registrationNumber.js";
import EmailService from "./email.service.js";
import RedisService from "./redis.service.js";



class AuthService {
    private app: FastifyInstance;
    private authRepositories: any;
    private authHelper: AuthorizationService;
    private emailService: EmailService;
    private redis: RedisService;
    
    constructor(app: FastifyInstance, authRepositories: any) {
        this.app = app;
        this.authRepositories = authRepositories;
        this.authHelper = new AuthorizationService(app);
        this.emailService = new EmailService(app);
        this.redis = new RedisService(app);
    }

    private async hashPassword(password: string): Promise<string> {
        return await this.app.bcrypt.hash(password);
    }

    private async comparePassword(password: string, hash: string): Promise<boolean> {
        return await this.app.bcrypt.compare(password, hash);
    }
    private async storeUserInRedis(userId: string): Promise<any> {
        const key = `user:${userId}`;
        const ttl = 7 * 24 * 60 * 60;
        await this.redis.set({key, value: userId, ttl});
        return true;
    }

    async getUserFromRedis(userId: string): Promise<any> {
        const key = `user:${userId}`;
        const user = await this.redis.get(key);
        if(!user) return null;
        return user;
    }

    async login({ email, password }: Login): Promise<any> {
        let user: any;
        let loginData: any;
        let userTypeDetected: 'staff' | 'parent' | 'student' | 'other';

        user = await this.findUserByEmail(email);
        if (!user) {
            throw new AuthError(HttpStatusCode.NotFound, responseMessage.InvalidEmailOrPassword.message);
        }

        userTypeDetected = this.detectUserType(user);

        if (user.status !== "ACTIVE" && user.status !== "PENDING") {
            throw new Error(responseMessage.UserAccountInactive.message);
        }

        switch (userTypeDetected) {
            case 'staff':
                loginData = user?.staffLogin;
                break;
            case 'parent':
                loginData = user?.parentLogin;
                break;
            default:
                throw new AuthError(HttpStatusCode.Unauthorized, "Unsupported user type");
        }

        if (!loginData) {
            throw new AuthError(HttpStatusCode.Unauthorized, responseMessage.Unauthorized.message);
        }

        const isPasswordValid = await this.comparePassword(password, loginData.password);
        if (!isPasswordValid) {
            throw new AuthError(HttpStatusCode.Unauthorized, responseMessage.InvalidEmailOrPassword.message);
        }

        const payload = {
            id: user?.id,
            email: user?.email,
            role: user?.roleId,
            userType: userTypeDetected,
            schoolId: user?.schoolId,
        };

        const token = await this.authHelper.generateLoginToken(payload);

        let permissions: string[] = [];
        if (user.role?.RolePermission) {
            permissions = user.role.RolePermission.map((rp: { permission: { action: string } }) => rp.permission.action);
        }

        await this.storeUserInRedis(user.id);

        const userResponse = await this.formatUserResponse(user, token, userTypeDetected, permissions);
        return userResponse;
    }

    private async findUserByEmail(email: string): Promise<any> {
        let user = await this.authRepositories.findByEmail(email);
        if (user) return user;

        user = await this.authRepositories.findParentByEmail(email);
        if (user) return user;

        return null;
    }

    private detectUserType(user: any): 'staff' | 'parent' | 'student' | 'other' {
        const staffRoles = ['800', '801', '802', '803', '807'];
        const parentRole = ['805'];
        const studentRole = ['804'];

        if (staffRoles.includes(user.roleId)) return 'staff';
        if (parentRole.includes(user.roleId)) return 'parent';
        if (studentRole.includes(user.roleId)) return 'student';
        
        return 'other';
    }

    private async formatUserResponse(user: any, token: string, userType: 'staff' | 'parent' | 'student' | 'other', permissions: string[]): Promise<any> {
        const baseUserData: any = {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            otherName: user.otherName,
            status: user.status,
            userType: userType,
            schoolId: user?.schoolId,
            roleId: user?.roleId,
            firstTimeLogin: true,
        };

        switch (userType) {
            case 'staff':
                baseUserData.role = user.role?.name;
                baseUserData.type = user.type;
                baseUserData.school = user.school;
                baseUserData.profile = user.profile;
                baseUserData.assignedClasses = user.assignedClasses;
                baseUserData.assignedSubjects = user.assignedSubjects;
                break;
            case 'parent':
                baseUserData.role = user.role?.name;
                baseUserData.phone = user.phone;
                baseUserData.address = user.address;
                baseUserData.state = user.state;
                baseUserData.lga = user.lga;
                baseUserData.city = user.city;
                baseUserData.children = user.children;
                break;
        }

        return {
            status: true,
            message: "Login successful",
            data: {
                user: baseUserData,
                token,
                userType,
                permissions,
            }
        };
    }

    async register({ user }: RegisterRequest): Promise<RegisterResponse> {
        try {
            const hashedPassword = await this.hashPassword(DEFAULT_PASSWORD);
            
            if (!validateEmail(user.email)) {
                throw new AuthError(HttpStatusCode.BadRequest, responseMessage.InvalidEmail.message);
            }

            if (user.type === StaffType.SUBJECT_TEACHER && (!user.subjects || user.subjects.length === 0)) {
                throw new AuthError(HttpStatusCode.BadRequest, "Subject teachers must have at least one subject assigned");
            }

            if (user.type !== StaffType.SUBJECT_TEACHER && user.subjects && user.subjects.length > 0) {
                throw new AuthError(HttpStatusCode.BadRequest, "Only subject teachers can have subjects assigned");
            }

            const school = await this.authRepositories.getSchoolById(user.schoolId);
            if (!school) {
                throw new AuthError(HttpStatusCode.NotFound, "School not found");
            }
            const registrationNumber = await generateRegistrationNumber(school.shortName);
            
            const userData = {
                firstName: user.firstName,
                lastName: user.lastName,
                otherName: user.otherName,
                email: user.email,
                password: hashedPassword,
                roleId: user.roleId,
                schoolId: user.schoolId,
                staffId: registrationNumber,
                type: user.type || StaffType.OTHER,
                classId: user.classId,
                classArmId: user.classArmId,
                subjects: user.subjects,
            };

            const newUser = await this.authRepositories.createUser(userData);
            if(!newUser) {
                throw new AuthError(HttpStatusCode.BadRequest, responseMessage.FailedToCreateUser.message);
            }

            await this.emailService.sendWelcomeEmail({
                to: user.email,
                name: `${user.firstName} ${user.lastName}`,
                temporaryPassword: DEFAULT_PASSWORD
            });
            
            return {
                status: true,
                message: "User created successfully",
                data: {
                    staffId: registrationNumber,
                    email: user.email,
                    type: user.type || StaffType.OTHER
                }
            }
            
        } catch (error) {
            return {
                status: false,
                message: "Failed to register user",
                error: error instanceof Error ? error.message : "An unknown error occurred"
            }
        }
    }

    async refreshToken(email: string): Promise<any> {
        try {
            const user = await this.findUserByEmail(email);
            if(!user) throw new AuthError(HttpStatusCode.Unauthorized, responseMessage.Unauthorized.message);

            const payload = {
                id: user?.id,
                email: user?.email,
                role: user?.roleId,
                userType: this.detectUserType(user),
                schoolId: user?.schoolId
            };

            const token = await this.authHelper.generateLoginToken(payload);
            return token;
        } catch (error) {
            throw new AuthError(HttpStatusCode.Unauthorized, responseMessage.Unauthorized.message);
        }
    }

    async logout(userId: string): Promise<any> {
        try {
            await this.redis.delete(`user:${userId}`);
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