import { FastifyRequest, FastifyReply } from "fastify";
import TaskService from "../services/task.service.js";
import { HttpStatusCode } from "axios";
import { TaskStatus, TaskPriority, TaskMemberRole, TaskMemberStatus } from "@prisma/client";
import { UserError } from "../utils/errorhandler.js";

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

export default class TaskController {
  private taskService: TaskService;

  constructor(fastify: any) {
    this.taskService = new TaskService(fastify);
  }

  private handleError(error: unknown, reply: FastifyReply) {
    if (error instanceof UserError) {
      return reply.status(error.statusCode).send({
        status: false,
        message: error.message,
      });
    }

    return reply.status(HttpStatusCode.InternalServerError).send({
      status: false,
      message: "An unexpected error occurred",
    });
  }

  async createTask(
    request: FastifyRequest<{ Body: CreateTaskBody }>,
    reply: FastifyReply
  ) {
    try {
      const task = await this.taskService.createTask({
        ...request.body,
        startDate: new Date(request.body.startDate),
        endDate: new Date(request.body.endDate),
        createdBy: request.user.id as string,
      });

      return reply.status(HttpStatusCode.Created).send({
        token: request.user.token,
        status: true,
        message: "Task created successfully",
        data: task,
      });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  async getTaskById(
    request: FastifyRequest<{ Params: TaskParams }>,
    reply: FastifyReply
  ) {
    try {
      const { taskId } = request.params;
      const task = await this.taskService.getTaskById(taskId);

      return reply.status(HttpStatusCode.Ok).send({
        token: request.user.token,
        status: true,
        message: "Task retrieved successfully",
        data: task,
      });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  async updateTask(
    request: FastifyRequest<{ Params: TaskParams; Body: UpdateTaskBody }>,
    reply: FastifyReply
  ) {
    try {
      const { taskId } = request.params;
      const task = await this.taskService.updateTask(taskId, {
        ...request.body,
        startDate: request.body.startDate ? new Date(request.body.startDate) : undefined,
        endDate: request.body.endDate ? new Date(request.body.endDate) : undefined,
      });

      return reply.status(HttpStatusCode.Ok).send({
        token: request.user.token,
        status: true,
        message: "Task updated successfully",
        data: task,
      });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  async deleteTask(
    request: FastifyRequest<{ Params: TaskParams }>,
    reply: FastifyReply
  ) {
    try {
      const { taskId } = request.params;
      const result = await this.taskService.deleteTask(taskId);

      return reply.status(HttpStatusCode.Ok).send({
        token: request.user.token,
        status: true,
        message: result.message,
      });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  async addTaskMember(
    request: FastifyRequest<{ Params: TaskParams; Body: AddTaskMemberBody }>,
    reply: FastifyReply
  ) {
    try {
      const { taskId } = request.params;
      const task = await this.taskService.addTaskMember(taskId, request.body);

      return reply.status(HttpStatusCode.Ok).send({
        token: request.user.token,
        status: true,
        message: "Task member added successfully",
        data: task,
      });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  async updateTaskMemberStatus(
    request: FastifyRequest<{ Params: TaskParams; Body: UpdateTaskMemberBody }>,
    reply: FastifyReply
  ) {
    try {
      const { taskId, memberId } = request.params;
      const { status } = request.body;
      const task = await this.taskService.updateTaskMemberStatus(taskId, memberId as string, status);

      return reply.status(HttpStatusCode.Ok).send({
        token: request.user.token,
        status: true,
        message: "Task member status updated successfully",
        data: task,
      });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  async getTasksBySchool(
    request: FastifyRequest<{ Params: TaskParams; Querystring: TaskQueryParams }>,
    reply: FastifyReply
  ) {
    try {
      const { schoolId } = request.params;
      const tasks = await this.taskService.getTasksBySchool(schoolId as string, {
        ...request.query,
        startDate: request.query.startDate ? new Date(request.query.startDate) : undefined,
        endDate: request.query.endDate ? new Date(request.query.endDate) : undefined,
      });

      return reply.status(HttpStatusCode.Ok).send({
        token: request.user.token,
        status: true,
        message: "Tasks retrieved successfully",
        data: tasks,
      });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  async getTasksByMember(
    request: FastifyRequest<{ Params: TaskParams; Querystring: TaskQueryParams }>,
    reply: FastifyReply
  ) {
    try {
      const { memberId } = request.params;
      const tasks = await this.taskService.getTasksByMember(memberId as string, {
        ...request.query,
        startDate: request.query.startDate ? new Date(request.query.startDate) : undefined,
        endDate: request.query.endDate ? new Date(request.query.endDate) : undefined,
      });

      return reply.status(HttpStatusCode.Ok).send({
        token: request.user.token,
        status: true,
        message: "Tasks retrieved successfully",
        data: tasks,
      });
    } catch (error) {
      this.handleError(error, reply);
    }
  }
} 