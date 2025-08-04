import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import SupportTicketService from "../services/supportTicket.service.js";
import { SupportTicketStatus, SupportTicketPriority, SupportTicketCategory } from "@prisma/client";
import { UserError } from "../utils/errorhandler.js";
import { HttpStatusCode } from "axios";

interface CreateSupportTicketBody {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  message: string;
  priority?: SupportTicketPriority;
  category?: SupportTicketCategory;
}

interface UpdateSupportTicketBody {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  message?: string;
  priority?: SupportTicketPriority;
  status?: SupportTicketStatus;
  category?: SupportTicketCategory;
}

interface SupportTicketFiltersQuery {
  status?: SupportTicketStatus;
  priority?: SupportTicketPriority;
  category?: SupportTicketCategory;
  email?: string;
  startDate?: string;
  endDate?: string;
}

interface GetTicketParams {
  id: string;
}

interface SearchQuery {
  q: string;
}

interface RecentTicketsQuery {
  limit?: string;
}

class SupportTicketController {
  private app: FastifyInstance;
  private supportTicketService: SupportTicketService;

  constructor(app: FastifyInstance) {
    this.app = app;
    this.supportTicketService = new SupportTicketService(app);
  }

  async createSupportTicket(
    request: FastifyRequest<{ Body: CreateSupportTicketBody }>,
    reply: FastifyReply
  ) {
    try {
      const { firstName, lastName, email, phone, message, priority, category } = request.body;

      const result = await this.supportTicketService.createSupportTicket({
        firstName,
        lastName,
        email,
        phone,
        message,
        priority,
        category,
      });

      return reply.status(HttpStatusCode.Created).send({
        success: true,
        message: result.message,
        data: result.data,
      });
    } catch (error) {
      if (error instanceof UserError) {
        return reply.status(error.statusCode).send({
          success: false,
          message: error.message,
        });
      }

      this.app.log.error(`Error creating support ticket: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return reply.status(HttpStatusCode.InternalServerError).send({
        success: false,
        message: "Internal server error",
      });
    }
  }

  async getSupportTicketById(
    request: FastifyRequest<{ Params: GetTicketParams }>,
    reply: FastifyReply
  ) {
    try {
      const { id } = request.params;

      const result = await this.supportTicketService.getSupportTicketById(id);

      return reply.status(HttpStatusCode.Ok).send({
        success: true,
        data: result.data,
      });
    } catch (error) {
      if (error instanceof UserError) {
        return reply.status(error.statusCode).send({
          success: false,
          message: error.message,
        });
      }

      this.app.log.error(`Error getting support ticket: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return reply.status(HttpStatusCode.InternalServerError).send({
        success: false,
        message: "Internal server error",
      });
    }
  }

  async updateSupportTicket(
    request: FastifyRequest<{ 
      Params: GetTicketParams; 
      Body: UpdateSupportTicketBody 
    }>,
    reply: FastifyReply
  ) {
    try {
      const { id } = request.params;
      const updateData = request.body;

      const result = await this.supportTicketService.updateSupportTicket(id, updateData);

      return reply.status(HttpStatusCode.Ok).send({
        success: true,
        message: result.message,
        data: result.data,
      });
    } catch (error) {
      if (error instanceof UserError) {
        return reply.status(error.statusCode).send({
          success: false,
          message: error.message,
        });
      }

      this.app.log.error(`Error updating support ticket: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return reply.status(HttpStatusCode.InternalServerError).send({
        success: false,
        message: "Internal server error",
      });
    }
  }

  async deleteSupportTicket(
    request: FastifyRequest<{ Params: GetTicketParams }>,
    reply: FastifyReply
  ) {
    try {
      const { id } = request.params;

      const result = await this.supportTicketService.deleteSupportTicket(id);

      return reply.status(HttpStatusCode.Ok).send({
        success: true,
        message: result.message,
        data: result.data,
      });
    } catch (error) {
      if (error instanceof UserError) {
        return reply.status(error.statusCode).send({
          success: false,
          message: error.message,
        });
      }

      this.app.log.error(`Error deleting support ticket: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return reply.status(HttpStatusCode.InternalServerError).send({
        success: false,
        message: "Internal server error",
      });
    }
  }

  async getAllSupportTickets(
    request: FastifyRequest<{ Querystring: SupportTicketFiltersQuery }>,
    reply: FastifyReply
  ) {
    try {
      const filters = request.query;
      
      // Convert date strings to Date objects if provided
      const processedFilters = {
        ...filters,
        startDate: filters.startDate ? new Date(filters.startDate) : undefined,
        endDate: filters.endDate ? new Date(filters.endDate) : undefined,
      };

      const result = await this.supportTicketService.getAllSupportTickets(processedFilters);

      return reply.status(HttpStatusCode.Ok).send({
        success: true,
        data: result.data,
        count: result.count,
      });
    } catch (error) {
      if (error instanceof UserError) {
        return reply.status(error.statusCode).send({
          success: false,
          message: error.message,
        });
      }

      this.app.log.error(`Error getting all support tickets: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return reply.status(HttpStatusCode.InternalServerError).send({
        success: false,
        message: "Internal server error",
      });
    }
  }

  async getSupportTicketsByEmail(
    request: FastifyRequest<{ Querystring: { email: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { email } = request.query;

      if (!email) {
        return reply.status(HttpStatusCode.BadRequest).send({
          success: false,
          message: "Email parameter is required",
        });
      }

      const result = await this.supportTicketService.getSupportTicketsByEmail(email);

      return reply.status(HttpStatusCode.Ok).send({
        success: true,
        data: result.data,
        count: result.count,
      });
    } catch (error) {
      if (error instanceof UserError) {
        return reply.status(error.statusCode).send({
          success: false,
          message: error.message,
        });
      }

      this.app.log.error(`Error getting support tickets by email: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return reply.status(HttpStatusCode.InternalServerError).send({
        success: false,
        message: "Internal server error",
      });
    }
  }

  async getSupportTicketsByStatus(
    request: FastifyRequest<{ Querystring: { status: SupportTicketStatus } }>,
    reply: FastifyReply
  ) {
    try {
      const { status } = request.query;

      if (!status) {
        return reply.status(HttpStatusCode.BadRequest).send({
          success: false,
          message: "Status parameter is required",
        });
      }

      const result = await this.supportTicketService.getSupportTicketsByStatus(status);

      return reply.status(HttpStatusCode.Ok).send({
        success: true,
        data: result.data,
        count: result.count,
      });
    } catch (error) {
      if (error instanceof UserError) {
        return reply.status(error.statusCode).send({
          success: false,
          message: error.message,
        });
      }

      this.app.log.error(`Error getting support tickets by status: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return reply.status(HttpStatusCode.InternalServerError).send({
        success: false,
        message: "Internal server error",
      });
    }
  }

  async getSupportTicketsByPriority(
    request: FastifyRequest<{ Querystring: { priority: SupportTicketPriority } }>,
    reply: FastifyReply
  ) {
    try {
      const { priority } = request.query;

      if (!priority) {
        return reply.status(HttpStatusCode.BadRequest).send({
          success: false,
          message: "Priority parameter is required",
        });
      }

      const result = await this.supportTicketService.getSupportTicketsByPriority(priority);

      return reply.status(HttpStatusCode.Ok).send({
        success: true,
        data: result.data,
        count: result.count,
      });
    } catch (error) {
      if (error instanceof UserError) {
        return reply.status(error.statusCode).send({
          success: false,
          message: error.message,
        });
      }

      this.app.log.error(`Error getting support tickets by priority: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return reply.status(HttpStatusCode.InternalServerError).send({
        success: false,
        message: "Internal server error",
      });
    }
  }

  async getSupportTicketsByCategory(
    request: FastifyRequest<{ Querystring: { category: SupportTicketCategory } }>,
    reply: FastifyReply
  ) {
    try {
      const { category } = request.query;

      if (!category) {
        return reply.status(HttpStatusCode.BadRequest).send({
          success: false,
          message: "Category parameter is required",
        });
      }

      const result = await this.supportTicketService.getSupportTicketsByCategory(category);

      return reply.status(HttpStatusCode.Ok).send({
        success: true,
        data: result.data,
        count: result.count,
      });
    } catch (error) {
      if (error instanceof UserError) {
        return reply.status(error.statusCode).send({
          success: false,
          message: error.message,
        });
      }

      this.app.log.error(`Error getting support tickets by category: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return reply.status(HttpStatusCode.InternalServerError).send({
        success: false,
        message: "Internal server error",
      });
    }
  }

  async getSupportTicketStats(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    try {
      const result = await this.supportTicketService.getSupportTicketStats();

      return reply.status(HttpStatusCode.Ok).send({
        success: true,
        data: result.data,
      });
    } catch (error) {
      if (error instanceof UserError) {
        return reply.status(error.statusCode).send({
          success: false,
          message: error.message,
        });
      }

      this.app.log.error(`Error getting support ticket stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return reply.status(HttpStatusCode.InternalServerError).send({
        success: false,
        message: "Internal server error",
      });
    }
  }

  async getRecentSupportTickets(
    request: FastifyRequest<{ Querystring: RecentTicketsQuery }>,
    reply: FastifyReply
  ) {
    try {
      const { limit } = request.query;
      const limitNumber = limit ? parseInt(limit, 10) : 10;

      if (limit && (isNaN(limitNumber) || limitNumber < 1 || limitNumber > 100)) {
        return reply.status(HttpStatusCode.BadRequest).send({
          success: false,
          message: "Limit must be a number between 1 and 100",
        });
      }

      const result = await this.supportTicketService.getRecentSupportTickets(limitNumber);

      return reply.status(HttpStatusCode.Ok).send({
        success: true,
        data: result.data,
        count: result.count,
      });
    } catch (error) {
      if (error instanceof UserError) {
        return reply.status(error.statusCode).send({
          success: false,
          message: error.message,
        });
      }

      this.app.log.error(`Error getting recent support tickets: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return reply.status(HttpStatusCode.InternalServerError).send({
        success: false,
        message: "Internal server error",
      });
    }
  }

  async searchSupportTickets(
    request: FastifyRequest<{ Querystring: SearchQuery }>,
    reply: FastifyReply
  ) {
    try {
      const { q } = request.query;

      if (!q || q.trim().length < 2) {
        return reply.status(HttpStatusCode.BadRequest).send({
          success: false,
          message: "Search query must be at least 2 characters long",
        });
      }

      const result = await this.supportTicketService.searchSupportTickets(q);

      return reply.status(HttpStatusCode.Ok).send({
        success: true,
        data: result.data,
        count: result.count,
        query: result.query,
      });
    } catch (error) {
      if (error instanceof UserError) {
        return reply.status(error.statusCode).send({
          success: false,
          message: error.message,
        });
      }

      this.app.log.error(`Error searching support tickets: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return reply.status(HttpStatusCode.InternalServerError).send({
        success: false,
        message: "Internal server error",
      });
    }
  }

  async getSupportTicketCount(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    try {
      const result = await this.supportTicketService.getSupportTicketCount();

      return reply.status(HttpStatusCode.Ok).send({
        success: true,
        data: result.data,
      });
    } catch (error) {
      if (error instanceof UserError) {
        return reply.status(error.statusCode).send({
          success: false,
          message: error.message,
        });
      }

      this.app.log.error(`Error getting support ticket count: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return reply.status(HttpStatusCode.InternalServerError).send({
        success: false,
        message: "Internal server error",
      });
    }
  }

  async updateTicketStatus(
    request: FastifyRequest<{ 
      Params: GetTicketParams; 
      Body: { status: SupportTicketStatus } 
    }>,
    reply: FastifyReply
  ) {
    try {
      const { id } = request.params;
      const { status } = request.body;

      if (!status) {
        return reply.status(HttpStatusCode.BadRequest).send({
          success: false,
          message: "Status is required",
        });
      }

      const result = await this.supportTicketService.updateTicketStatus(id, status);

      return reply.status(HttpStatusCode.Ok).send({
        success: true,
        message: result.message,
        data: result.data,
      });
    } catch (error) {
      if (error instanceof UserError) {
        return reply.status(error.statusCode).send({
          success: false,
          message: error.message,
        });
      }

      this.app.log.error(`Error updating ticket status: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return reply.status(HttpStatusCode.InternalServerError).send({
        success: false,
        message: "Internal server error",
      });
    }
  }

  async updateTicketPriority(
    request: FastifyRequest<{ 
      Params: GetTicketParams; 
      Body: { priority: SupportTicketPriority } 
    }>,
    reply: FastifyReply
  ) {
    try {
      const { id } = request.params;
      const { priority } = request.body;

      if (!priority) {
        return reply.status(HttpStatusCode.BadRequest).send({
          success: false,
          message: "Priority is required",
        });
      }

      const result = await this.supportTicketService.updateTicketPriority(id, priority);

      return reply.status(HttpStatusCode.Ok).send({
        success: true,
        message: result.message,
        data: result.data,
      });
    } catch (error) {
      if (error instanceof UserError) {
        return reply.status(error.statusCode).send({
          success: false,
          message: error.message,
        });
      }

      this.app.log.error(`Error updating ticket priority: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return reply.status(HttpStatusCode.InternalServerError).send({
        success: false,
        message: "Internal server error",
      });
    }
  }

  async updateTicketCategory(
    request: FastifyRequest<{ 
      Params: GetTicketParams; 
      Body: { category: SupportTicketCategory } 
    }>,
    reply: FastifyReply
  ) {
    try {
      const { id } = request.params;
      const { category } = request.body;

      if (!category) {
        return reply.status(HttpStatusCode.BadRequest).send({
          success: false,
          message: "Category is required",
        });
      }

      const result = await this.supportTicketService.updateTicketCategory(id, category);

      return reply.status(HttpStatusCode.Ok).send({
        success: true,
        message: result.message,
        data: result.data,
      });
    } catch (error) {
      if (error instanceof UserError) {
        return reply.status(error.statusCode).send({
          success: false,
          message: error.message,
        });
      }

      this.app.log.error(`Error updating ticket category: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return reply.status(HttpStatusCode.InternalServerError).send({
        success: false,
        message: "Internal server error",
      });
    }
  }
}

export default SupportTicketController; 