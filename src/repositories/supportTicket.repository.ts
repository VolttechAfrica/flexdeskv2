import { PrismaClient, SupportTicketStatus, SupportTicketPriority, SupportTicketCategory } from "@prisma/client";
import prisma from "../model/prismaClient.js";
import { UserError } from "../utils/errorhandler.js";
import { HttpStatusCode } from "axios";
import { BaseRepository } from "./base.repository.js";
import { FastifyInstance } from "fastify";

interface CreateSupportTicketData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  message: string;
  priority?: SupportTicketPriority;
  category?: SupportTicketCategory;
}

interface UpdateSupportTicketData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  message?: string;
  priority?: SupportTicketPriority;
  status?: SupportTicketStatus;
  category?: SupportTicketCategory;
}

interface SupportTicketFilters {
  status?: SupportTicketStatus;
  priority?: SupportTicketPriority;
  category?: SupportTicketCategory;
  email?: string;
  startDate?: Date;
  endDate?: Date;
}

interface SupportTicketStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  byPriority: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };
  byCategory: {
    technical: number;
    billing: number;
    general: number;
    featureRequest: number;
    other: number;
  };
}

class SupportTicketRepository extends BaseRepository {
  constructor(prisma: PrismaClient, fastify: FastifyInstance) {
    super(prisma, fastify);
  }

  async createSupportTicket(data: CreateSupportTicketData) {
    try {
      const createTicket = await this.prisma.supportTicket.create({
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          message: data.message,
          priority: data.priority || SupportTicketPriority.MEDIUM,
          category: data.category || SupportTicketCategory.GENERAL,
        },
      });

      if (!createTicket) {
        throw new Error("Failed to create support ticket");
      }

      // Invalidate cache
      await this.invalidateCache('supportTickets:all');
      await this.invalidateCache(`supportTickets:email:${data.email}`);
      
      return createTicket;
    } catch (error) {
      throw new UserError(
        HttpStatusCode.InternalServerError,
        `Failed to create support ticket: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async findSupportTicketById(ticketId: string) {
    try {
      const cacheKey = `supportTicket:${ticketId}`;
      return this.withCache(cacheKey, 'findSupportTicketById', () =>
        this.executeQuery('findSupportTicketById', 'supportTicket', async () =>
          await this.prisma.supportTicket.findUnique({
            where: { id: ticketId },
          })
        )
      );
    } catch (error) {
      throw new UserError(
        HttpStatusCode.InternalServerError,
        `Failed to find support ticket: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async updateSupportTicket(ticketId: string, data: UpdateSupportTicketData) {
    try {
      const updateTicket = await this.prisma.supportTicket.update({
        where: { id: ticketId },
        data,
      });

      if (!updateTicket) {
        throw new Error("Failed to update support ticket");
      }

      // Invalidate cache
      await this.invalidateCache(`supportTicket:${ticketId}`);
      await this.invalidateCache('supportTickets:all');
      if (data.email) {
        await this.invalidateCache(`supportTickets:email:${data.email}`);
      }

      return updateTicket;
    } catch (error) {
      throw new UserError(
        HttpStatusCode.InternalServerError,
        `Failed to update support ticket: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async deleteSupportTicket(ticketId: string) {
    try {
      const deleteTicket = await this.prisma.supportTicket.delete({
        where: { id: ticketId },
      });

      if (!deleteTicket) {
        throw new Error("Failed to delete support ticket");
      }

      // Invalidate cache
      await this.invalidateCache(`supportTicket:${ticketId}`);
      await this.invalidateCache('supportTickets:all');
      await this.invalidateCache(`supportTickets:email:${deleteTicket.email}`);

      return deleteTicket;
    } catch (error) {
      throw new UserError(
        HttpStatusCode.InternalServerError,
        `Failed to delete support ticket: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async getAllSupportTickets(filters?: SupportTicketFilters) {
    try {
      const cacheKey = `supportTickets:all:${JSON.stringify(filters || {})}`;
      return this.withCache(cacheKey, 'getAllSupportTickets', () =>
        this.executeQuery('getAllSupportTickets', 'supportTicket', async () => {
          const whereClause: any = {};

          if (filters?.status) {
            whereClause.status = filters.status;
          }

          if (filters?.priority) {
            whereClause.priority = filters.priority;
          }

          if (filters?.category) {
            whereClause.category = filters.category;
          }

          if (filters?.email) {
            whereClause.email = {
              contains: filters.email,
              mode: 'insensitive',
            };
          }

          if (filters?.startDate || filters?.endDate) {
            whereClause.createdAt = {};
            if (filters.startDate) {
              whereClause.createdAt.gte = filters.startDate;
            }
            if (filters.endDate) {
              whereClause.createdAt.lte = filters.endDate;
            }
          }

          return await this.prisma.supportTicket.findMany({
            where: whereClause,
            orderBy: {
              createdAt: 'desc',
            },
          });
        })
      );
    } catch (error) {
      throw new UserError(
        HttpStatusCode.InternalServerError,
        `Failed to get all support tickets: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async getSupportTicketsByEmail(email: string) {
    try {
      const cacheKey = `supportTickets:email:${email}`;
      return this.withCache(cacheKey, 'getSupportTicketsByEmail', () =>
        this.executeQuery('getSupportTicketsByEmail', 'supportTicket', async () =>
          await this.prisma.supportTicket.findMany({
            where: { email },
            orderBy: {
              createdAt: 'desc',
            },
          })
        )
      );
    } catch (error) {
      throw new UserError(
        HttpStatusCode.InternalServerError,
        `Failed to get support tickets by email: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async getSupportTicketsByStatus(status: SupportTicketStatus) {
    try {
      const cacheKey = `supportTickets:status:${status}`;
      return this.withCache(cacheKey, 'getSupportTicketsByStatus', () =>
        this.executeQuery('getSupportTicketsByStatus', 'supportTicket', async () =>
          await this.prisma.supportTicket.findMany({
            where: { status },
            orderBy: {
              createdAt: 'desc',
            },
          })
        )
      );
    } catch (error) {
      throw new UserError(
        HttpStatusCode.InternalServerError,
        `Failed to get support tickets by status: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async getSupportTicketsByPriority(priority: SupportTicketPriority) {
    try {
      const cacheKey = `supportTickets:priority:${priority}`;
      return this.withCache(cacheKey, 'getSupportTicketsByPriority', () =>
        this.executeQuery('getSupportTicketsByPriority', 'supportTicket', async () =>
          await this.prisma.supportTicket.findMany({
            where: { priority },
            orderBy: {
              createdAt: 'desc',
            },
          })
        )
      );
    } catch (error) {
      throw new UserError(
        HttpStatusCode.InternalServerError,
        `Failed to get support tickets by priority: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async getSupportTicketsByCategory(category: SupportTicketCategory) {
    try {
      const cacheKey = `supportTickets:category:${category}`;
      return this.withCache(cacheKey, 'getSupportTicketsByCategory', () =>
        this.executeQuery('getSupportTicketsByCategory', 'supportTicket', async () =>
          await this.prisma.supportTicket.findMany({
            where: { category },
            orderBy: {
              createdAt: 'desc',
            },
          })
        )
      );
    } catch (error) {
      throw new UserError(
        HttpStatusCode.InternalServerError,
        `Failed to get support tickets by category: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async getSupportTicketStats(): Promise<SupportTicketStats> {
    try {
      const cacheKey = 'supportTickets:stats';
      return this.withCache(cacheKey, 'getSupportTicketStats', () =>
        this.executeQuery('getSupportTicketStats', 'supportTicket', async () => {
          const [
            total,
            pending,
            inProgress,
            completed,
            cancelled,
            lowPriority,
            mediumPriority,
            highPriority,
            urgentPriority,
            technicalCategory,
            billingCategory,
            generalCategory,
            featureRequestCategory,
            otherCategory,
          ] = await Promise.all([
            this.prisma.supportTicket.count(),
            this.prisma.supportTicket.count({ where: { status: SupportTicketStatus.PENDING } }),
            this.prisma.supportTicket.count({ where: { status: SupportTicketStatus.IN_PROGRESS } }),
            this.prisma.supportTicket.count({ where: { status: SupportTicketStatus.COMPLETED } }),
            this.prisma.supportTicket.count({ where: { status: SupportTicketStatus.CANCELLED } }),
            this.prisma.supportTicket.count({ where: { priority: SupportTicketPriority.LOW } }),
            this.prisma.supportTicket.count({ where: { priority: SupportTicketPriority.MEDIUM } }),
            this.prisma.supportTicket.count({ where: { priority: SupportTicketPriority.HIGH } }),
            this.prisma.supportTicket.count({ where: { priority: SupportTicketPriority.URGENT } }),
            this.prisma.supportTicket.count({ where: { category: SupportTicketCategory.TECHNICAL } }),
            this.prisma.supportTicket.count({ where: { category: SupportTicketCategory.BILLING } }),
            this.prisma.supportTicket.count({ where: { category: SupportTicketCategory.GENERAL } }),
            this.prisma.supportTicket.count({ where: { category: SupportTicketCategory.FEATURE_REQUEST } }),
            this.prisma.supportTicket.count({ where: { category: SupportTicketCategory.OTHER } }),
          ]);

          return {
            total,
            pending,
            inProgress,
            completed,
            cancelled,
            byPriority: {
              low: lowPriority,
              medium: mediumPriority,
              high: highPriority,
              urgent: urgentPriority,
            },
            byCategory: {
              technical: technicalCategory,
              billing: billingCategory,
              general: generalCategory,
              featureRequest: featureRequestCategory,
              other: otherCategory,
            },
          };
        })
      );
    } catch (error) {
      throw new UserError(
        HttpStatusCode.InternalServerError,
        `Failed to get support ticket stats: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async getRecentSupportTickets(limit: number = 10) {
    try {
      const cacheKey = `supportTickets:recent:${limit}`;
      return this.withCache(cacheKey, 'getRecentSupportTickets', () =>
        this.executeQuery('getRecentSupportTickets', 'supportTicket', async () =>
          await this.prisma.supportTicket.findMany({
            take: limit,
            orderBy: {
              createdAt: 'desc',
            },
          })
        )
      );
    } catch (error) {
      throw new UserError(
        HttpStatusCode.InternalServerError,
        `Failed to get recent support tickets: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async searchSupportTickets(query: string) {
    try {
      const cacheKey = `supportTickets:search:${query}`;
      return this.withCache(cacheKey, 'searchSupportTickets', () =>
        this.executeQuery('searchSupportTickets', 'supportTicket', async () =>
          await this.prisma.supportTicket.findMany({
            where: {
              OR: [
                {
                  firstName: {
                    contains: query,
                    mode: 'insensitive',
                  },
                },
                {
                  lastName: {
                    contains: query,
                    mode: 'insensitive',
                  },
                },
                {
                  email: {
                    contains: query,
                    mode: 'insensitive',
                  },
                },
                {
                  message: {
                    contains: query,
                    mode: 'insensitive',
                  },
                },
              ],
            },
            orderBy: {
              createdAt: 'desc',
            },
          })
        )
      );
    } catch (error) {
      throw new UserError(
        HttpStatusCode.InternalServerError,
        `Failed to search support tickets: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async getSupportTicketCount() {
    try {
      const cacheKey = 'supportTickets:count';
      return this.withCache(cacheKey, 'getSupportTicketCount', () =>
        this.executeQuery('getSupportTicketCount', 'supportTicket', async () =>
          await this.prisma.supportTicket.count()
        )
      );
    } catch (error) {
      throw new UserError(
        HttpStatusCode.InternalServerError,
        `Failed to get support ticket count: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

export const createSupportTicketRepository = (fastify: FastifyInstance) => {
  return new SupportTicketRepository(prisma, fastify);
};
