import { FastifyRequest, FastifyReply, FastifyInstance } from "fastify";
import SchoolService from "../services/school.service.js";
import { createSchoolRepository } from "../repositories/school.respository.js";
import UserActivityService from "../services/userActivity.service.js";
import userActivityRepositories from "../repositories/activities.respository.js";
import { HttpStatusCode } from "axios";
import { UserError } from "../utils/errorhandler.js";
import { responseMessage } from "../utils/responseMessage.js";

class SchoolController {
  private schoolService: SchoolService;
  private userActivityService: UserActivityService;
  constructor(app: FastifyInstance) {
    this.schoolService = new SchoolService(app, createSchoolRepository(app));
    this.userActivityService = new UserActivityService(
      app,
      userActivityRepositories
    );
  }

  async getCurrentTerm(request: FastifyRequest, reply: FastifyReply) {
    try {
      if (!request.user)
        throw new UserError(
          HttpStatusCode.Unauthorized,
          responseMessage.Unauthorized.message
        );
      const { schoolId } = request.query as { schoolId: string };
      const term = await this.schoolService.getCurrentTerm(schoolId);
      term.token = request.user.token;
      return reply.status(HttpStatusCode.Ok).send(term);
    } catch (error: any) {
      throw error;
    }
  }

  async getAllTerms(request: FastifyRequest, reply: FastifyReply) {
    try {
      if (!request.user)
        throw new UserError(
          HttpStatusCode.Unauthorized,
          responseMessage.Unauthorized.message
        );
      const { schoolId } = request.query as { schoolId: string };
      const terms = await this.schoolService.getAllTerms(schoolId);
      return reply.status(HttpStatusCode.Ok).send(terms);
    } catch (error: any) {
      throw error;
    }
  }

  async makeTermActive(request: FastifyRequest, reply: FastifyReply) {
    try {
      if (!request.user)
        throw new UserError(
          HttpStatusCode.Unauthorized,
          responseMessage.Unauthorized.message
        );
      const { schoolId, termId } = request.body as {
        schoolId: string;
        termId: string;
      };
      const term = await this.schoolService.makeTermActive(schoolId, termId);
     
      await this.userActivityService.createUserActivity(
        request.user.id as string,
        "Updated active term",
        request.ip,
        request.headers["user-agent"] || ""
      );
      return reply.status(HttpStatusCode.Ok).send(term);
    } catch (error: any) {
      throw error;
    }
  }
}

export default SchoolController;
