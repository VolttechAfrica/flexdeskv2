import { FastifyInstance } from "fastify";
import TaskController from "../controllers/task.controller.js";
import { TaskStatus, TaskPriority, TaskMemberRole, TaskMemberStatus } from "@prisma/client";

interface TaskQueryParams {
  status?: TaskStatus;
  priority?: TaskPriority;
  startDate?: string;
  endDate?: string;
  role?: TaskMemberRole;
}

interface TaskParams {
  taskId: string;
  memberId?: string;
  schoolId?: string;
}

interface CreateTaskBody {
  name: string;
  description?: string;
  priority?: TaskPriority;
  startDate: string;
  endDate: string;
  schoolId: string;
  termId: string;
  notes?: string;
  members?: {
    memberId: string;
    role?: TaskMemberRole;
  }[];
}

interface UpdateTaskBody {
  name?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  startDate?: string;
  endDate?: string;
  notes?: string;
}

interface AddTaskMemberBody {
  memberId: string;
  role?: TaskMemberRole;
}

interface UpdateTaskMemberBody {
  status: TaskMemberStatus;
}

export default async function taskRoutes(fastify: FastifyInstance) {
  const taskController = new TaskController(fastify);

  // Create a new task
  fastify.post<{
    Body: CreateTaskBody;
  }>(
    "/tasks",
    {
      preHandler: [fastify.authenticate],
      schema: {
        body: {
          type: "object",
          required: ["name", "startDate", "endDate", "schoolId", "termId"],
          properties: {
            name: { type: "string", minLength: 1 },
            description: { type: "string" },
            priority: { type: "string", enum: Object.values(TaskPriority) },
            startDate: { type: "string", format: "date-time" },
            endDate: { type: "string", format: "date-time" },
            schoolId: { type: "string" },
            termId: { type: "string" },
            notes: { type: "string" },
            members: {
              type: "array",
              items: {
                type: "object",
                required: ["memberId"],
                properties: {
                  memberId: { type: "string" },
                  role: { type: "string", enum: Object.values(TaskMemberRole) },
                },
              },
            },
          },
        },
      },
    },
    taskController.createTask.bind(taskController)
  );

  // Get a task by ID
  fastify.get<{
    Params: TaskParams;
  }>(
    "/tasks/:taskId",
    {
      preHandler: [fastify.authenticate],
      schema: {
        params: {
          type: "object",
          required: ["taskId"],
          properties: {
            taskId: { type: "string" },
          },
        },
      },
    },
    taskController.getTaskById.bind(taskController)
  );

  // Update a task
  fastify.put<{
    Params: TaskParams;
    Body: UpdateTaskBody;
  }>(
    "/tasks/:taskId",
    {
      preHandler: [fastify.authenticate],
      schema: {
        params: {
          type: "object",
          required: ["taskId"],
          properties: {
            taskId: { type: "string" },
          },
        },
        body: {
          type: "object",
          properties: {
            name: { type: "string", minLength: 1 },
            description: { type: "string" },
            status: { type: "string", enum: Object.values(TaskStatus) },
            priority: { type: "string", enum: Object.values(TaskPriority) },
            startDate: { type: "string", format: "date-time" },
            endDate: { type: "string", format: "date-time" },
            notes: { type: "string" },
          },
        },
      },
    },
    taskController.updateTask.bind(taskController)
  );

  // Delete a task
  fastify.delete<{
    Params: TaskParams;
  }>(
    "/tasks/:taskId",
    {
      preHandler: [fastify.authenticate],
      schema: {
        params: {
          type: "object",
          required: ["taskId"],
          properties: {
            taskId: { type: "string" },
          },
        },
      },
    },
    taskController.deleteTask.bind(taskController)
  );

  // Add a task member
  fastify.post<{
    Params: TaskParams;
    Body: AddTaskMemberBody;
  }>(
    "/tasks/:taskId/members",
    {
      preHandler: [fastify.authenticate],
      schema: {
        params: {
          type: "object",
          required: ["taskId"],
          properties: {
            taskId: { type: "string" },
          },
        },
        body: {
          type: "object",
          required: ["memberId"],
          properties: {
            memberId: { type: "string" },
            role: { type: "string", enum: Object.values(TaskMemberRole) },
          },
        },
      },
    },
    taskController.addTaskMember.bind(taskController)
  );

  // Update task member status
  fastify.put<{
    Params: TaskParams;
    Body: UpdateTaskMemberBody;
  }>(
    "/tasks/:taskId/members/:memberId/status",
    {
      preHandler: [fastify.authenticate],
      schema: {
        params: {
          type: "object",
          required: ["taskId", "memberId"],
          properties: {
            taskId: { type: "string" },
            memberId: { type: "string" },
          },
        },
        body: {
          type: "object",
          required: ["status"],
          properties: {
            status: { type: "string", enum: Object.values(TaskMemberStatus) },
          },
        },
      },
    },
    taskController.updateTaskMemberStatus.bind(taskController)
  );

  
  // Get tasks by school
  fastify.get<{
    Params: TaskParams;
    Querystring: TaskQueryParams;
  }>(
    "/schools/:schoolId/tasks",
    {
      preHandler: [fastify.authenticate],
      schema: {
        params: {
          type: "object",
          required: ["schoolId"],
          properties: {
            schoolId: { type: "string" },
          },
        },
        querystring: {
          type: "object",
          properties: {
            status: { type: "string", enum: Object.values(TaskStatus) },
            priority: { type: "string", enum: Object.values(TaskPriority) },
            startDate: { type: "string", format: "date-time" },
            endDate: { type: "string", format: "date-time" },
            role: { type: "string", enum: Object.values(TaskMemberRole) },
            userId: { type: "string" }
          },
          required: ["userId"],
        },
      },
    },
    taskController.getTasksBySchool.bind(taskController)
  );

  // Get tasks by member
  fastify.get<{
    Params: TaskParams;
    Querystring: TaskQueryParams;
  }>(
    "/members/:memberId/tasks",
    {
      preHandler: [fastify.authenticate],
      schema: {
        params: {
          type: "object",
          required: ["memberId"],
          properties: {
            memberId: { type: "string" },
          },
        },
        querystring: {
          type: "object",
          properties: {
            status: { type: "string", enum: Object.values(TaskStatus) },
            priority: { type: "string", enum: Object.values(TaskPriority) },
            startDate: { type: "string", format: "date-time" },
            endDate: { type: "string", format: "date-time" },
            role: { type: "string", enum: Object.values(TaskMemberRole) },
          },
        },
      },
    },
    taskController.getTasksByMember.bind(taskController)
  );
} 