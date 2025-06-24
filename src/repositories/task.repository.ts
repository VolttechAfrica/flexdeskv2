import { PrismaClient, TaskStatus, TaskPriority, TaskMemberRole, TaskMemberStatus } from "@prisma/client";
import prisma from "../model/prismaClient.js";
import { UserError } from "../utils/errorhandler.js";
import { HttpStatusCode } from "axios";

interface CreateTaskData {
  name: string;
  description?: string;
  priority?: TaskPriority;
  startDate: Date;
  endDate: Date;
  schoolId: string;
  termId: string;
  createdBy: string;
  notes?: string;
}

interface CreateTaskMemberData {
  taskId: string;
  memberId: string;
  role: TaskMemberRole;
}

interface UpdateTaskData {
  name?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  startDate?: Date;
  endDate?: Date;
  notes?: string;
  completedAt?: Date | null;
}

interface UpdateTaskMemberData {
  status: TaskMemberStatus;
  leftAt?: Date | null;
}

interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  startDate?: Date;
  endDate?: Date;
  role?: TaskMemberRole;
}

class TaskRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async createTask(data: CreateTaskData) {
    try {
      return await this.prisma.task.create({
        data,
      });
    } catch (error) {
      throw new UserError(
        HttpStatusCode.InternalServerError,
        `Failed to create task: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async createTaskMembers(data: CreateTaskMemberData[]) {
    try {
      return await this.prisma.taskMember.createMany({
        data,
      });
    } catch (error) {
      throw new UserError(
        HttpStatusCode.InternalServerError,
        `Failed to create task members: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async findTaskById(taskId: string) {
    try {
      return await this.prisma.task.findUnique({
        where: { id: taskId },
        include: {
          taskMembers: {
            include: {
              member: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });
    } catch (error) {
      throw new UserError(
        HttpStatusCode.InternalServerError,
        `Failed to find task: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async updateTask(taskId: string, data: UpdateTaskData) {
    try {
      return await this.prisma.task.update({
        where: { id: taskId },
        data,
      });
    } catch (error) {
      throw new UserError(
        HttpStatusCode.InternalServerError,
        `Failed to update task: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async deleteTask(taskId: string) {
    try {
      return await this.prisma.task.delete({
        where: { id: taskId },
      });
    } catch (error) {
      throw new UserError(
        HttpStatusCode.InternalServerError,
        `Failed to delete task: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async createTaskMember(data: CreateTaskMemberData) {
    try {
      return await this.prisma.taskMember.create({
        data,
      });
    } catch (error) {
      throw new UserError(
        HttpStatusCode.InternalServerError,
        `Failed to create task member: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async updateTaskMember(taskId: string, memberId: string, data: UpdateTaskMemberData) {
    try {
      return await this.prisma.taskMember.update({
        where: {
          id: `${taskId}_${memberId}`,
        },
        data,
      });
    } catch (error) {
      throw new UserError(
        HttpStatusCode.InternalServerError,
        `Failed to update task member: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async findTasksBySchool(schoolId: string, filters?: TaskFilters) {
    try {
      return await this.prisma.task.findMany({
        where: {
          schoolId,
          ...filters,
        },
        include: {
          taskMembers: {
            include: {
              member: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    } catch (error) {
      throw new UserError(
        HttpStatusCode.InternalServerError,
        `Failed to find tasks by school: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async findTasksByMember(memberId: string, filters?: TaskFilters) {
    try {
      return await this.prisma.task.findMany({
        where: {
          taskMembers: {
            some: {
              memberId,
              role: filters?.role,
            },
          },
          status: filters?.status,
          priority: filters?.priority,
        },
        include: {
          taskMembers: {
            include: {
              member: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    } catch (error) {
      throw new UserError(
        HttpStatusCode.InternalServerError,
        `Failed to find tasks by member: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

const taskRepository = new TaskRepository(prisma);

export default taskRepository;