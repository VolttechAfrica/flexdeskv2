import { FastifyRequest, FastifyReply, FastifyInstance } from "fastify";
import { Login } from "../types/login.js";
import AuthService from "../services/auth.service.js";
import {createUserRepository } from "../repositories/user.repository.js";
import { AuthError } from "../utils/errorhandler.js";
import { HttpStatusCode } from "axios";
import { RegisterRequest } from "@/types/user.js";
import UserActivityService from "../services/userActivity.service.js";
import userActivityRepositories from "../repositories/activities.respository.js";

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
      if (!email || !password)
        throw new AuthError(
          HttpStatusCode.BadRequest,
          "Invalid request, provide a valid email and password"
        );
      
      const loginData = await this.authService.login({ email, password });
      
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
      console.log(error);
      throw error;
    }
  }

  async register(
    request: FastifyRequest<{ Body: RegisterRequest }>,
    reply: FastifyReply
  ) {
    try {
      const { user } = request.body;
      if (!request.user)
        throw new AuthError(
          HttpStatusCode.Unauthorized,
          "Unauthorized, please login to continue"
        );
      if (!user)
        throw new AuthError(
          HttpStatusCode.BadRequest,
          "Invalid request, provide a valid user"
        );

      // Validate required fields for staff registration
      if (!user.firstName || !user.lastName || !user.email || !user.roleId || !user.schoolId) {
        throw new AuthError(
          HttpStatusCode.BadRequest,
          "Missing required fields: firstName, lastName, email, roleId, and schoolId are required"
        );
      }

      // Validate staff type and subjects if provided
      if (user.type === 'SUBJECT_TEACHER' && (!user.subjects || user.subjects.length === 0)) {
        throw new AuthError(
          HttpStatusCode.BadRequest,
          "Subject teachers must have at least one subject assigned"
        );
      }

      const registerData = await this.authService.register({ user });
      
      await this.userActivityService.createUserActivity(
        request.user.id as string,
        `Successfully registered a new ${user.type || 'staff'} user: ${user.email}`,
        request.ip,
        request.headers["user-agent"] || ""
      );
      
      return reply.status(HttpStatusCode.Ok).send(registerData);
    } catch (error: any) {
      throw error;
    }
  }

  async logout(request: FastifyRequest, reply: FastifyReply) {  
    try {
      if (!request.user)
        throw new AuthError(
          HttpStatusCode.Unauthorized,
          "Unauthorized, please login to continue"
        );
      
      const logoutData = await this.authService.logout(request.user.id as string);
      
      await this.userActivityService.createUserActivity(
        request.user.id as string,
        "Successfully logged out",
        request.ip,
        request.headers["user-agent"] || ""
      );
      
      return reply.status(HttpStatusCode.Ok).send(logoutData);
    } catch (error: any) {
      throw error;
    }
  }
}

export default AuthController;
