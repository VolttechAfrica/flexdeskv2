import { PrismaClient, TaskStatus, TaskPriority, TaskMemberRole, TaskMemberStatus } from "@prisma/client";
import prisma from "../model/prismaClient.js";
import { UserError } from "../utils/errorhandler.js";
import { HttpStatusCode } from "axios";
import { BaseRepository } from "./base.repository.js";
import { FastifyInstance } from "fastify";
import { createTeacherRepository } from "./teacher.respository.js";
import { createClassRepository } from "./class.repository.js";

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
  tag?: string;
  members?: Members[];
}

interface CreateTaskMemberData {
  taskId: string;
  memberId: string;
  role: TaskMemberRole
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

interface Members {
  memberId: string;
}

class TaskRepository extends BaseRepository {
  private teacherRepository: ReturnType<typeof createTeacherRepository>;
  private classRepository: ReturnType<typeof createClassRepository>;
  constructor(prisma: PrismaClient, fastify: FastifyInstance) {
    super(prisma, fastify);
    this.teacherRepository = createTeacherRepository(fastify);
    this.classRepository = createClassRepository(fastify);
  }

  private defineClassRange(level: number): 'primary' | 'secondary' | 'unknown' {
    if (level >= 1 && level <= 10) {
      return 'primary';
    } else if (level >= 11 && level <= 17) {
      return 'secondary';
    } else {
      return 'unknown';
    }
  }

  private async getTeacherClassRange(members: Members[]): Promise<('primary' | 'secondary' | 'unknown')[]> {
    try {
      const teacherIds = members.map((member) => member.memberId);
      const teachers = await this.teacherRepository.getTeachersAssignedClassByMemberIds(teacherIds);
      const classRanges = teachers.map((teacher) => this.defineClassRange(teacher?.class?.level || 0));
      return classRanges;
    } catch (error) {
      throw new UserError(`Failed to get teacher class range: ${error instanceof Error ? error.message : 'Unknown error'}`, HttpStatusCode.InternalServerError);
    }
  }

  private determineClassRange(classRange: string): number[] {
    if(classRange === 'primary'){
      return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    } else if(classRange === 'secondary'){
      return [11, 12, 13, 14, 15, 16, 17];
    } else {
      return [];
    }
  }

  private async createTaskProcess(data: CreateTaskData) {
    try {
      // Get class data outside transaction if needed for subtasks
      let classes: any[] = [];
      if (data.tag === 'Result upload' && data.members && data.members.length > 0) {
        // Get teacher class ranges
        const classRanges = await this.getTeacherClassRange(data.members);
        
        // Get unique class ranges
        const uniqueClassRanges = [...new Set(classRanges)];
        
        // Get all classes within the determined ranges
        const classRangesForQuery = uniqueClassRanges
          .filter(range => range !== 'unknown')
          .map(range => this.determineClassRange(range))
          .flat();

        if (classRangesForQuery.length > 0) {
          classes = await this.classRepository.getClassWithinRange(
            classRangesForQuery.map(level => ({ level })),
            data.schoolId
          );
        }
      }

      // Wrap in transaction
      const result = await this.prisma.$transaction(async (tx) => {
        // Create the main task
        const createTask = await tx.task.create({
          data: {
            name: data.name,
            description: data.description,
            priority: data.priority,
            startDate: data.startDate,
            endDate: data.endDate,
            schoolId: data.schoolId,
            termId: data.termId,
            createdBy: data.createdBy,
            notes: data.notes,
          },
        });

        if (!createTask) {
          throw new Error("Failed to create task");
        }

        // If tag is 'Result upload' and members are provided, create subtasks
        if (data.tag === 'Result upload' && data.members && data.members.length > 0 && classes.length > 0) {
          // Create subtasks for each class, class arm, and subject combination
          const subtasks = [];
          for (const classData of classes) {
            for (const classArm of classData.classArms) {
              for (const subject of classData.subjects) {
                const subtaskName = `${data.name} - ${classData.name} ${classArm.name} ${subject.name}`;
                const subtask = await tx.subTask.create({
                  data: {
                    name: subtaskName,
                    taskId: createTask.id,
                    notes: `Upload result for ${classData.name} ${classArm.name} ${subject.name}`,
                    tagTo: `${classData.id}_${classArm.id}_${subject.id}`,
                  },
                });
                subtasks.push(subtask);
              }
            }
          }
        }

        return createTask;
      });

      // Invalidate cache
      await this.invalidateCache(`tasks:school:${data.schoolId}`);
      
      return result;
    } catch (error) {
      throw new UserError(
        `Failed to create task process: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatusCode.InternalServerError
      );
    }
  }

  async createTask(data: CreateTaskData) {
    try {
      // Use the process method for handling complex task creation
      return await this.createTaskProcess(data);
    } catch (error) {
      throw new UserError(
        `Failed to create task: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatusCode.InternalServerError
      );
    }
  }

  async createTaskMembers(data: CreateTaskMemberData[]) {
    try {
      const addTaskMembers = await this.prisma.taskMember.createMany({
        data,
      });
      if(!addTaskMembers) throw new Error("Failed to create task members");
      await this.invalidateCache(`task:members:${data[0].taskId}`);
      return addTaskMembers;
    } catch (error) {
      throw new UserError(
        `Failed to create task members: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatusCode.InternalServerError
      );
    }
  }

  async findTaskById(taskId: string) {
    try {
      const cacheKey = `task:${taskId}`;
      return this.withCache(cacheKey, 'findTaskById', () =>
        this.executeQuery('findTaskById', 'task', async () =>
          await this.prisma.task.findUnique({
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
          })
        )
      );
    } catch (error) {
      throw new UserError(
        `Failed to find task: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatusCode.InternalServerError
      );
    }
  }

  async updateTask(taskId: string, data: UpdateTaskData) {
    try {
      const updateTask = await this.prisma.task.update({
        where: { id: taskId },
        data,
      });
      if(!updateTask) throw new Error("Failed to update task");
      await this.invalidateCache(`task:${taskId}`);
      return updateTask;
    } catch (error) {
      throw new UserError(
        `Failed to update task: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatusCode.InternalServerError
      );
    }
  }

  async deleteTask(taskId: string) {
    try {
      const deleteTask = await this.prisma.task.delete({
        where: { id: taskId },
      });
      if(!deleteTask) throw new Error("Failed to delete task");
      await this.invalidateCache(`task:${taskId}`);
      return deleteTask;
    } catch (error) {
      throw new UserError(
        `Failed to delete task: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatusCode.InternalServerError
      );
    }
  }

  async createTaskMember(data: CreateTaskMemberData) {
    try {
      const createTaskMember = await this.prisma.taskMember.create({
        data,
      });
      if(!createTaskMember) throw new Error("Failed to create task member");
      await this.invalidateCache(`task:member:${data.taskId}:${data.memberId}`);
      await this.invalidateCache(`task:${data.taskId}`);
      return createTaskMember;
    } catch (error) {
      throw new UserError(
        `Failed to create task member: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatusCode.InternalServerError
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
        `Failed to update task member: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatusCode.InternalServerError
      );
    }
  }

  async findTasksBySchool(schoolId: string, filters?: TaskFilters) {
    try {
      const cacheKey = `tasks:school:${schoolId}`;
      return this.withCache(cacheKey, 'findTasksBySchool', () =>
        this.executeQuery('findTasksBySchool', 'task', async () =>
          await this.prisma.task.findMany({
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
          })
        )
      );
    } catch (error) {
      throw new UserError(
        `Failed to find tasks by school: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatusCode.InternalServerError
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
        `Failed to find tasks by member: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatusCode.InternalServerError
      );
    }
  }
}

export const taskRepository = (fastify: FastifyInstance) => {
  return new TaskRepository(prisma, fastify);
};