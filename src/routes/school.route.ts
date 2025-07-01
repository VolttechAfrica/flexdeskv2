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

  app.route({
    method: "PUT",
    url: "/term/update",
    preHandler: [app.authenticate, registerAuthorization],
    schema: {
      body: {
        type: "object",
        properties: {
          schoolId: { type: "string" },
          termId: { type: "string" },
          name: { type: "string" },
          startDate: { type: "string" },
          endDate: { type: "string" },
          year: { type: "string" },
        },
        required: ["schoolId", "termId", "name", "startDate", "endDate", "year"],
      },
    },
    handler: schoolController.updateTerm.bind(schoolController),
  });

  app.route({
    method: "POST",
    url: "/term/create",
    preHandler: [app.authenticate, registerAuthorization],
    schema: {
      body: {
        type: "object",
        properties: {
          schoolId: { type: "string" },
          name: { type: "string" },
          startDate: { type: "string" },
          endDate: { type: "string" },
          year: { type: "string" },
        },
        required: ["schoolId", "name", "startDate", "endDate", "year"],
      },
    },
    handler: schoolController.createTerm.bind(schoolController),
  });
}
export default schoolRoutes;
