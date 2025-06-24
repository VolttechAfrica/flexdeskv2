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
      if (!loginData.data.staffId)
        throw new AuthError(HttpStatusCode.BadRequest, "Staff ID not found");
      await this.userActivityService.createUserActivity(
        loginData.data.staffId,
        "Successfully logged in",
        request.ip,
        request.headers["user-agent"] || ""
      );
      return reply.status(HttpStatusCode.Ok).send(loginData);
    } catch (error: any) {
      console.log(error);
      return reply.status(HttpStatusCode.Unauthorized).send({
        status: false,
        message: error?.message,
      });
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
      const registerData = await this.authService.register({ user });
      await this.userActivityService.createUserActivity(
        request.user.id as string,
        "Successfully registered a new user",
        request.ip,
        request.headers["user-agent"] || ""
      );
      return reply.status(HttpStatusCode.Ok).send(registerData);
    } catch (error: any) {
      return reply.status(HttpStatusCode.InternalServerError).send({
        status: false,
        message: error?.message,
      });
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
      return reply.status(HttpStatusCode.Ok).send(logoutData);
    } catch (error: any) {
      return reply.status(HttpStatusCode.InternalServerError).send({
        status: false,
        message: error?.message,
      });
    }
  }
}

export default AuthController;
