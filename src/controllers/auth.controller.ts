import { FastifyRequest, FastifyReply, FastifyInstance } from "fastify";
import { Login } from "../types/login.js";
import AuthService from "../services/auth.service.js";
import {createUserRepository } from "../repositories/user.repository.js";
import { AuthError, ValidationError } from "../utils/errorhandler.js";
import { HttpStatusCode } from "axios";
import { RegisterRequest } from "@/types/user.js";
import UserActivityService from "../services/userActivity.service.js";
import userActivityRepositories from "../repositories/activities.respository.js";
import { validateEmail, validatePassword, validateName, validateRequest, sanitizeInput } from "../utils/validator.js";

class AuthController {
  private authService: AuthService;
  private userActivityService: UserActivityService;

  constructor(app: FastifyInstance) {
    this.authService = new AuthService(app, createUserRepository(app));
    this.userActivityService = new UserActivityService(
      app,
      userActivityRepositories
    );
  }

  async login(request: FastifyRequest<{ Body: Login }>, reply: FastifyReply) {
    try {
      const { email, password } = request.body;
      
      // Input validation
      if (!email || !password) {
        throw new ValidationError(
          "Email and password are required",
          "credentials",
          { email: !!email, password: !!password },
          HttpStatusCode.BadRequest,
          request.id
        );
      }

      // Sanitize inputs
      const sanitizedEmail = sanitizeInput(email.toLowerCase().trim());
      const sanitizedPassword = sanitizeInput(password);

      // Validate email format
      if (!validateEmail(sanitizedEmail)) {
        throw new ValidationError(
          "Invalid email format",
          "email",
          sanitizedEmail,
          HttpStatusCode.BadRequest,
          request.id
        );
      }

      
      const loginData = await this.authService.login({ 
        email: sanitizedEmail, 
        password: sanitizedPassword 
      });
      
      // Log user activity based on detected user type
      const userId = loginData.data.user.id;
      const userTypeDetected = loginData.data.userType;
      
      await this.userActivityService.createUserActivity(
        userId,
        `Successfully logged in as ${userTypeDetected}`,
        request.ip,
        request.headers["user-agent"] || ""
      );
      
      return reply.status(HttpStatusCode.Ok).send(loginData);
    } catch (error: any) {
      request.log.error('Login error:', error as any);
      throw error;
    }
  }

  async register(
    request: FastifyRequest<{ Body: RegisterRequest }>,
    reply: FastifyReply
  ) {
    try {
      const { user } = request.body;
      
      // Authentication check
      if (!request.user) {
        throw new AuthError(
          "Unauthorized, please login to continue",
          HttpStatusCode.Unauthorized,
          request.id
        );
      }

      // Input validation
      if (!user) {
        throw new ValidationError(
          "User data is required",
          "user",
          null,
          HttpStatusCode.BadRequest,
          request.id
        );
      }

      // Validate required fields
      const requiredFields = ['firstName', 'lastName', 'email', 'roleId', 'schoolId'];
      const validation = validateRequest(request, requiredFields);
      if (!validation.isValid) {
        throw new ValidationError(
          `Missing required fields: ${validation.errors.join(', ')}`,
          "user",
          user,
          HttpStatusCode.BadRequest,
          request.id
        );
      }

      // Sanitize user inputs
      const sanitizedUser = {
        ...user,
        firstName: sanitizeInput(user.firstName),
        lastName: sanitizeInput(user.lastName),
        otherName: user.otherName ? sanitizeInput(user.otherName) : undefined,
        email: sanitizeInput(user.email.toLowerCase().trim())
      };

      // Validate email format
      if (!validateEmail(sanitizedUser.email)) {
        throw new ValidationError(
          "Invalid email format",
          "email",
          sanitizedUser.email,
          HttpStatusCode.BadRequest,
          request.id
        );
      }

      // Validate names
      const firstNameValidation = validateName(sanitizedUser.firstName);
      if (!firstNameValidation.isValid) {
        throw new ValidationError(
          `Invalid first name: ${firstNameValidation.errors.join(', ')}`,
          "firstName",
          sanitizedUser.firstName,
          HttpStatusCode.BadRequest,
          request.id
        );
      }

      const lastNameValidation = validateName(sanitizedUser.lastName);
      if (!lastNameValidation.isValid) {
        throw new ValidationError(
          `Invalid last name: ${lastNameValidation.errors.join(', ')}`,
          "lastName",
          sanitizedUser.lastName,
          HttpStatusCode.BadRequest,
          request.id
        );
      }

      // Validate staff type and subjects if provided
      if (sanitizedUser.type === 'SUBJECT_TEACHER' && (!sanitizedUser.subjects || sanitizedUser.subjects.length === 0)) {
        throw new ValidationError(
          "Subject teachers must have at least one subject assigned",
          "subjects",
          sanitizedUser.subjects,
          HttpStatusCode.BadRequest,
          request.id
        );
      }

      const registerData = await this.authService.register({ user: sanitizedUser });
      
      await this.userActivityService.createUserActivity(
        request.user.id as string,
        `Successfully registered a new ${sanitizedUser.type || 'staff'} user: ${sanitizedUser.email}`,
        request.ip,
        request.headers["user-agent"] || ""
      );
      
      return reply.status(HttpStatusCode.Ok).send(registerData);
    } catch (error: any) {
      request.log.error('Registration error:', error as any);
      throw error;
    }
  }

  async logout(request: FastifyRequest, reply: FastifyReply) {  
    try {
      if (!request.user) {
        throw new AuthError(
          "Unauthorized, please login to continue",
          HttpStatusCode.Unauthorized,
          request.id
        );
      }
      
      const logoutData = await this.authService.logout(request.user.id as string);
      
      await this.userActivityService.createUserActivity(
        request.user.id as string,
        "Successfully logged out",
        request.ip,
        request.headers["user-agent"] || ""
      );
      
      return reply.status(HttpStatusCode.Ok).send(logoutData);
    } catch (error: any) {
      request.log.error('Logout error:', error as any);
      throw error;
    }
  }
}

export default AuthController;
