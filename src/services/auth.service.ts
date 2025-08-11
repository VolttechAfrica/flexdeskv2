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

class AuthService {
    private app: FastifyInstance;
    private authRepositories: any;
    private authHelper: AuthorizationService;
    private emailService: EmailService;
    
    constructor(app: FastifyInstance, authRepositories: any) {
        this.app = app;
        this.authRepositories = authRepositories;
        this.authHelper = new AuthorizationService(app);
        this.emailService = new EmailService(app);
    }

    private async hashPassword(password: string): Promise<string> {
        return await this.app.bcrypt.hash(password);
    }

    private async comparePassword(password: string, hash: string): Promise<boolean> {
        return await this.app.bcrypt.compare(password, hash);
    }

    async login({ email, password }: Login): Promise<any> {
        let user: any;
        let loginData: any;
        let userTypeDetected: 'staff' | 'parent';

        // Auto-detect user type by searching in all user tables
        user = await this.findUserByEmail(email);
        if (!user) {
            throw new AuthError(HttpStatusCode.NotFound, responseMessage.InvalidEmailOrPassword.message);
        }

        userTypeDetected = this.detectUserType(user);

        if (user.status !== "ACTIVE" && user.status !== "PENDING") {
            throw new Error(responseMessage.UserAccountInactive.message);
        }

        // Get login credentials based on detected user type
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
            role: user?.roleId,
            userType: userTypeDetected,
            schoolId: user?.schoolId,
        };

        const token = await this.authHelper.generateLoginToken(payload);

        // Get permissions if user has a role
        let permissions: string[] = [];
        if (user.role?.RolePermission) {
            permissions = user.role.RolePermission.map((rp: { permission: { action: string } }) => rp.permission.action);
        }

        // Format user response based on type
        const userResponse = await this.formatUserResponse(user, token, userTypeDetected, permissions);

        return userResponse;
    }

    private async findUserByEmail(email: string): Promise<any> {
        // Try to find user in all tables
        let user = await this.authRepositories.findByEmail(email);
        if (user) return user;

        user = await this.authRepositories.findParentByEmail(email);
        if (user) return user;

        return null;
    }

    private detectUserType(user: any): 'staff' | 'parent' {
        if (user.staffLogin) return 'staff';
        if (user.parentLogin) return 'parent';
        
        // Fallback based on table structure
        if (user.roleId && user.schoolId) return 'staff';
        if (user.phone && user.roleId) return 'parent';
        
        return 'staff'; // Default fallback
    }

    private async formatUserResponse(user: any, token: string, userType: 'staff' | 'parent', permissions: string[]): Promise<any> {
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
        };

        // Add type-specific data
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

            // Validate staff type and subject assignments
            if (user.type === StaffType.SUBJECT_TEACHER && (!user.subjects || user.subjects.length === 0)) {
                throw new AuthError(HttpStatusCode.BadRequest, "Subject teachers must have at least one subject assigned");
            }

            if (user.type !== StaffType.SUBJECT_TEACHER && user.subjects && user.subjects.length > 0) {
                throw new AuthError(HttpStatusCode.BadRequest, "Only subject teachers can have subjects assigned");
            }

            // For now, only staff registration is supported
            // Student and parent registration would need different logic
            // Get school shortName for registration number generation
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

    async logout(userId: string): Promise<any> {
        try {
            // No need to manually delete from Redis - repository handles this
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