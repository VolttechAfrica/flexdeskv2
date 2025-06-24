import { FastifyInstance } from "fastify";
import SchoolController from "../controllers/school.controller.js";
import authorize from '../hooks/auth.hook.js';

async function schoolRoutes(app: FastifyInstance) {
  const schoolController = new SchoolController(app);

  app.route({
    method: "GET",
    url: "/terms/current",
    preHandler: [app.authenticate],
    schema: {
      querystring: {
        type: "object",
        properties: {
          schoolId: { type: "string" },
          userId: { type: "string" },
        },
        required: ["schoolId", "userId"],
      },
    },
    handler: schoolController.getCurrentTerm.bind(schoolController),
  });

  const registerAuthorization = await authorize("manage_school_settings");
  
  app.route({
    method: "GET",
    url: "/terms",
    preHandler: [app.authenticate, registerAuthorization],
    schema: {
      querystring: {
        type: "object",
        properties: {
          schoolId: { type: "string" },
          userId: { type: "string" },
        },
        required: ["schoolId", "userId"],
      },
    },
    handler: schoolController.getAllTerms.bind(schoolController),
  });


  app.route({
    method: "PUT",
    url: "/terms/active",
    preHandler: [app.authenticate, registerAuthorization],
    schema: {
      body: {
        type: "object",
        properties: {
          schoolId: { type: "string" },
          termId: { type: "string" },
        },
        required: ["schoolId", "termId"],
      },
    },
    handler: schoolController.makeTermActive.bind(schoolController),
  });
  }

export default schoolRoutes;
