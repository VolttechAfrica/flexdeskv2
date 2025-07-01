import { FastifyInstance } from "fastify";
import TeacherController from "../controllers/teacher.controller.js";
import authorize from '../hooks/auth.hook.js';

async function teacherRoutes(app: FastifyInstance) {
  const teacherController = new TeacherController(app);
  const registerAuthorization = await authorize("manage_staff");

  app.route({
    method: "GET",
    url: "/active",
    preHandler: [app.authenticate, registerAuthorization],
    schema: {
      querystring: {
        type: "object",
        properties: {
          schoolId: { type: "string" },
          userId: { type: "string" },
          searchTerm: { type: "string" },
          page: { type: "string" },
          limit: { type: "string" },
          status: { type: "string" },
        },
        required: ["schoolId", "userId"],
      },
    },
    handler: teacherController.getAllTeachers.bind(teacherController),
  });
}

export default teacherRoutes;