import { FastifyInstance } from "fastify";
import { Login } from "../types/login.js";
import { AuthError } from '../utils/errorhandler.js';
import { HttpStatusCode } from "axios";
import { responseMessage } from "../utils/responseMessage.js";
import AuthorizationService from "./authorization.service.js";
import { RegisterRequest, RegisterResponse, StaffType } from "../types/user.js";
import { DEFAULT_PASSWORD } from "../constants/default.js";
import { validateEmail } from "../utils/validator.js";
import { generateRegistrationNumber } from "../utils/registrationNumber.js";
import EmailService from "./email.service.js";

// Constants for better maintainability
const USER_STATUSES = {
    ACTIVE: "ACTIVE",
    PENDING: "PENDING"
} as const;

const USER_ROLES = {
    STAFF: ['800', '801', '802', '803', '807'],
    PARENT: ['805'],
    STUDENT: ['804']
} as const;

const USER_TYPES = {
    STAFF: 'staff',
    PARENT: 'parent',
    STUDENT: 'student',
    OTHER: 'other'
} as const;

type UserType = typeof USER_TYPES[keyof typeof USER_TYPES];

class AuthService {
    private readonly app: FastifyInstance;
    private readonly authRepositories: any;
    private readonly authorizationService: AuthorizationService;
    private readonly emailService: EmailService;

    constructor(app: FastifyInstance, authRepositories: any) {
        this.app = app;
        this.authRepositories = authRepositories;
        this.authorizationService = new AuthorizationService(app);
        this.emailService = new EmailService(app);
    }

    async login(loginCredentials: Login): Promise<any> {
        const { email, password } = loginCredentials;
        
        const user = await this.findUserByEmail(email);
        if (!user) {
            throw new AuthError(responseMessage.InvalidEmailOrPassword.message, HttpStatusCode.NotFound);
        }

        this.validateUserStatus(user.status);
        
        const userType = this.determineUserType(user.roleId);
        const loginData = this.getLoginDataForUserType(user, userType);
        
        if (!loginData) {
            throw new AuthError(responseMessage.Unauthorized.message, HttpStatusCode.Unauthorized);
        }

        await this.validatePassword(password, loginData.password);

        const tokens = await this.generateUserTokens(user, userType);
        const permissions = this.extractUserPermissions(user);
        const userResponse = await this.buildUserResponse(user, tokens, userType, permissions);
        
        return userResponse;
    }

    private validateUserStatus(status: string): void {
        if (status !== USER_STATUSES.ACTIVE && status !== USER_STATUSES.PENDING) {
            throw new Error(responseMessage.UserAccountInactive.message);
        }
    }

    private determineUserType(roleId: string): UserType {
        if (USER_ROLES.STAFF.includes(roleId as any)) return USER_TYPES.STAFF;
        if (USER_ROLES.PARENT.includes(roleId as any)) return USER_TYPES.PARENT;
        if (USER_ROLES.STUDENT.includes(roleId as any)) return USER_TYPES.STUDENT;
        
        return USER_TYPES.OTHER;
    }

    private getLoginDataForUserType(user: any, userType: UserType): any {
        switch (userType) {
            case USER_TYPES.STAFF:
                return user?.staffLogin;
            case USER_TYPES.PARENT:
                return user?.parentLogin;
            default:
                throw new AuthError("Unsupported user type", HttpStatusCode.Unauthorized);
        }
    }

    private async validatePassword(inputPassword: string, storedHash: string): Promise<void> {
        const isPasswordValid = await this.comparePassword(inputPassword, storedHash);
        if (!isPasswordValid) {
            throw new AuthError(responseMessage.InvalidEmailOrPassword.message, HttpStatusCode.Unauthorized);
        }
    }

    private async generateUserTokens(user: any, userType: UserType): Promise<{ accessToken: string; refreshToken: string }> {
        const payload = {
            id: user.id,
            email: user.email,
            role: user.roleId,
            userType,
            schoolId: user.schoolId,
        };

        return await this.authorizationService.generateLoginToken(payload);
    }

    private extractUserPermissions(user: any): string[] {
        if (!user.role?.RolePermission) return [];
        
        return user.role.RolePermission.map((rp: { permission: { action: string } }) => rp.permission.action);
    }

    private async findUserByEmail(email: string): Promise<any> {
        let user = await this.authRepositories.findByEmail(email);
        if (user) return user;

        user = await this.authRepositories.findParentByEmail(email);
        return user || null;
    }

    private async comparePassword(password: string, hash: string): Promise<boolean> {
        return await this.app.bcrypt.compare(password, hash);
    }

    private async buildUserResponse(user: any, tokens: { accessToken: string; refreshToken: string }, userType: UserType, permissions: string[]): Promise<any> {
        const baseUserData = this.buildBaseUserData(user, userType);
        const enrichedUserData = this.enrichUserDataByType(baseUserData, user, userType);

        return {
            status: true,
            message: "Login successful",
            data: {
                user: enrichedUserData,
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                userType,
                permissions,
            }
        };
    }

    private buildBaseUserData(user: any, userType: UserType): any {
        return {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            otherName: user.otherName,
            status: user.status,
            userType,
            schoolId: user.schoolId,
            roleId: user.roleId,
            firstTimeLogin: Boolean(user.firstTimeLogin),
        };
    }

    private enrichUserDataByType(baseUserData: any, user: any, userType: UserType): any {
        switch (userType) {
            case USER_TYPES.STAFF:
                return {
                    ...baseUserData,
                    role: user.role?.name,
                    type: user.type,
                    school: user.school,
                    profile: user.profile,
                    assignedClasses: user.assignedClasses,
                    assignedSubjects: user.assignedSubjects,
                };
            case USER_TYPES.PARENT:
                return {
                    ...baseUserData,
                    role: user.role?.name,
                    phone: user.phone,
                    address: user.address,
                    state: user.state,
                    lga: user.lga,
                    city: user.city,
                    children: user.children,
                };
            default:
                return baseUserData;
        }
    }

    async register(registrationRequest: RegisterRequest): Promise<RegisterResponse> {
        try {
            const { user } = registrationRequest;
            
            this.validateRegistrationData(user);
            
            const school = await this.authRepositories.getSchoolById(user.schoolId);
            if (!school) {
                throw new AuthError("School not found", HttpStatusCode.NotFound);
            }

            const registrationNumber = await generateRegistrationNumber(school.shortName);
            const hashedPassword = await this.hashPassword(DEFAULT_PASSWORD);
            
            const userData = this.buildUserDataForRegistration(user, hashedPassword, registrationNumber);
            const newUser = await this.authRepositories.createUser(userData);
            
            if (!newUser) {
                throw new AuthError(responseMessage.FailedToCreateUser.message, HttpStatusCode.BadRequest);
            }

            await this.sendWelcomeEmail(user.email, user.firstName, user.lastName);
            
            return this.buildSuccessfulRegistrationResponse(registrationNumber, user.email, user.type || StaffType.OTHER);
            
        } catch (error) {
            return this.buildFailedRegistrationResponse(error);
        }
    }

    private validateRegistrationData(user: any): void {
        if (!validateEmail(user.email)) {
            throw new AuthError(responseMessage.InvalidEmail.message, HttpStatusCode.BadRequest);
        }

        if (user.type === StaffType.SUBJECT_TEACHER && (!user.subjects || user.subjects.length === 0)) {
            throw new AuthError("Subject teachers must have at least one subject assigned", HttpStatusCode.BadRequest);
        }

        if (user.type !== StaffType.SUBJECT_TEACHER && user.subjects && user.subjects.length > 0) {
            throw new AuthError("Only subject teachers can have subjects assigned", HttpStatusCode.BadRequest);
        }
    }

    private buildUserDataForRegistration(user: any, hashedPassword: string, registrationNumber: string): any {
        return {
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
    }

    private async sendWelcomeEmail(email: string, firstName: string, lastName: string): Promise<void> {
        await this.emailService.sendWelcomeEmail({
            to: email,
            name: `${firstName} ${lastName}`,
            temporaryPassword: DEFAULT_PASSWORD
        });
    }

    private buildSuccessfulRegistrationResponse(staffId: string, email: string, type: StaffType): RegisterResponse {
        return {
            status: true,
            message: "User created successfully",
            data: {
                staffId,
                email,
                type: type || StaffType.OTHER
            }
        };
    }

    private buildFailedRegistrationResponse(error: any): RegisterResponse {
        return {
            status: false,
            message: "Failed to register user",
            error: error instanceof Error ? error.message : "An unknown error occurred"
        };
    }

    async logout(userId: string): Promise<any> {
        try {
            await this.authorizationService.forceLogout(userId);
            
            return {
                status: true,
                message: "User logged out successfully",
            };
        } catch (error) {
            return {
                status: false,
                message: "Failed to logout user",
                error: error instanceof Error ? error.message : "An unknown error occurred"
            };
        }
    }

    private async hashPassword(password: string): Promise<string> {
        return await this.app.bcrypt.hash(password);
    }
}

export default AuthService;