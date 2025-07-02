import { TaskStatus, TaskPriority, TaskMemberRole, TaskMemberStatus } from "@prisma/client";
import { FastifyInstance } from "fastify";
import { UserError } from "../utils/errorhandler.js";
import { HttpStatusCode } from "axios";
import { taskRepository } from "../repositories/task.repository.js";


interface CreateTaskDTO {
  name: string;
  description?: string;
  priority?: TaskPriority;
  startDate: Date;
  endDate: Date;
  schoolId: string;
  termId: string;
  createdBy: string;
  notes?: string;
  members?: {
    memberId: string;
    role?: TaskMemberRole;
  }[];
}

interface UpdateTaskDTO {
  name?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  startDate?: Date;
  endDate?: Date;
  notes?: string;
}

interface AddTaskMemberDTO {
  memberId: string;
  role?: TaskMemberRole;
}

interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  startDate?: Date;
  endDate?: Date;
  role?: TaskMemberRole;
  userId?: string;
}

export default class TaskService {
  private taskRepository: ReturnType<typeof taskRepository>;
  private fastify: FastifyInstance;

  constructor(fastify: FastifyInstance) {
    this.taskRepository = taskRepository(fastify);
    this.fastify = fastify;
  }

  async createTask(data: CreateTaskDTO) {
    try {
      // Validate dates
      if (new Date(data.startDate) > new Date(data.endDate)) {
        throw new UserError(
          HttpStatusCode.BadRequest,
          "Start date must be before end date"
        );
      }

      // Create the task
      const task = await this.taskRepository.createTask({
        name: data.name,
        description: data.description,
        priority: data.priority || TaskPriority.MEDIUM,
        startDate: data.startDate,
        endDate: data.endDate,
        schoolId: data.schoolId,
        termId: data.termId,
        createdBy: data.createdBy,
        notes: data.notes,
      });

      // Add task members if provided
      if (data.members && data.members.length > 0) {
        await this.taskRepository.createTaskMembers(
          data.members.map((member) => ({
            taskId: task.id,
            memberId: member.memberId,
            role: member.role || TaskMemberRole.ASSIGNEE,
          }))
        );
      }

      return this.getTaskById(task.id);
    } catch (error) {
      if (error instanceof UserError) {
        throw error;
      }
      throw new UserError(
        HttpStatusCode.InternalServerError,
        `Failed to create task: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async getTaskById(taskId: string) {
    try {
      const task = await this.taskRepository.findTaskById(taskId);
      if (!task) {
        throw new UserError(HttpStatusCode.NotFound, "Task not found");
      }
      return task;
    } catch (error) {
      if (error instanceof UserError) {
        throw error;
      }
      throw new UserError(
        HttpStatusCode.InternalServerError,
        `Failed to get task: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async updateTask(taskId: string, data: UpdateTaskDTO) {
    try {
      // Check if task exists
      const task = await this.getTaskById(taskId);
      if (!task) {
        throw new UserError(HttpStatusCode.NotFound, "Task not found");
      }

      // Validate dates if both are provided
      if (data.startDate && data.endDate && new Date(data.startDate) > new Date(data.endDate)) {
        throw new UserError(
          HttpStatusCode.BadRequest,
          "Start date must be before end date"
        );
      }

      const updatedTask = await this.taskRepository.updateTask(taskId, {
        ...data,
        completedAt: data.status === TaskStatus.COMPLETED ? new Date() : undefined,
      });

      return this.getTaskById(updatedTask.id);
    } catch (error) {
      if (error instanceof UserError) {
        throw error;
      }
      throw new UserError(
        HttpStatusCode.InternalServerError,
        `Failed to update task: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async deleteTask(taskId: string) {
    try {
      // Check if task exists
      const task = await this.getTaskById(taskId);
      if (!task) {
        throw new UserError(HttpStatusCode.NotFound, "Task not found");
      }

      await this.taskRepository.deleteTask(taskId);
      return { message: "Task deleted successfully" };
    } catch (error) {
      if (error instanceof UserError) {
        throw error;
      }
      throw new UserError(
        HttpStatusCode.InternalServerError,
        `Failed to delete task: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async addTaskMember(taskId: string, data: AddTaskMemberDTO) {
    try {
      // Check if task exists
      const task = await this.getTaskById(taskId);
      if (!task) {
        throw new UserError(HttpStatusCode.NotFound, "Task not found");
      }

      await this.taskRepository.createTaskMember({
        taskId,
        memberId: data.memberId,
        role: data.role || TaskMemberRole.ASSIGNEE,
      });

      return this.getTaskById(taskId);
    } catch (error) {
      if (error instanceof UserError) {
        throw error;
      }
      throw new UserError(
        HttpStatusCode.InternalServerError,
        `Failed to add task member: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async updateTaskMemberStatus(taskId: string, memberId: string, status: TaskMemberStatus) {
    try {
      // Check if task exists
      const task = await this.getTaskById(taskId);
      if (!task) {
        throw new UserError(HttpStatusCode.NotFound, "Task not found");
      }

      await this.taskRepository.updateTaskMember(taskId, memberId, {
        status,
        leftAt: status === TaskMemberStatus.REJECTED ? new Date() : undefined,
      });

      return this.getTaskById(taskId);
    } catch (error) {
      if (error instanceof UserError) {
        throw error;
      }
      throw new UserError(
        HttpStatusCode.InternalServerError,
        `Failed to update task member status: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async getTasksBySchool(schoolId: string, filters?: TaskFilters) {
    try {
      delete filters?.userId;
      return await this.taskRepository.findTasksBySchool(schoolId, filters);
    } catch (error) {
      if (error instanceof UserError) {
        throw error;
      }
      throw new UserError(
        HttpStatusCode.InternalServerError,
        `Failed to get tasks by school: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async getTasksByMember(memberId: string, filters?: TaskFilters) {
    try {
      return await this.taskRepository.findTasksByMember(memberId, filters);
    } catch (error) {
      if (error instanceof UserError) {
        throw error;
      }
      throw new UserError(
        HttpStatusCode.InternalServerError,
        `Failed to get tasks by member: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
} 