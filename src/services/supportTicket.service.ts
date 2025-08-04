import { FastifyInstance } from "fastify";
import { createSupportTicketRepository } from "../repositories/supportTicket.repository.js";
import { SupportTicketStatus, SupportTicketPriority, SupportTicketCategory } from "@prisma/client";
import { UserError } from "../utils/errorhandler.js";
import { HttpStatusCode } from "axios";

interface CreateSupportTicketRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  message: string;
  priority?: SupportTicketPriority;
  category?: SupportTicketCategory;
}

interface UpdateSupportTicketRequest {
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

class SupportTicketService {
  private app: FastifyInstance;
  private supportTicketRepository: ReturnType<typeof createSupportTicketRepository>;

  constructor(app: FastifyInstance) {
    this.app = app;
    this.supportTicketRepository = createSupportTicketRepository(app);
  }

  private validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private validatePhone(phone?: string): boolean {
    if (!phone) return true;
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  }

  private validateMessage(message: string): boolean {
    return message.trim().length >= 10 && message.trim().length <= 1000;
  }

  private validateName(name: string): boolean {
    return name.trim().length >= 2 && name.trim().length <= 100;
  }

  private sanitizeInput(input: string): string {
    return input.trim().replace(/[<>]/g, '');
  }

  async createSupportTicket(data: CreateSupportTicketRequest) {
    try {
      // Validate required fields
      if (!data.firstName || !data.lastName || !data.email || !data.message) {
        throw new UserError(
          HttpStatusCode.BadRequest,
          "First name, last name, email, and message are required"
        );
      }

      // Validate email format
      if (!this.validateEmail(data.email)) {
        throw new UserError(
          HttpStatusCode.BadRequest,
          "Invalid email format"
        );
      }

      // Validate phone number if provided
      if (data.phone && !this.validatePhone(data.phone)) {
        throw new UserError(
          HttpStatusCode.BadRequest,
          "Invalid phone number format"
        );
      }

      // Validate message length
      if (!this.validateMessage(data.message)) {
        throw new UserError(
          HttpStatusCode.BadRequest,
          "Message must be between 10 and 1000 characters"
        );
      }

      // Validate name length
      if (!this.validateName(data.firstName) || !this.validateName(data.lastName)) {
        throw new UserError(
          HttpStatusCode.BadRequest,
          "First name and last name must be between 2 and 100 characters"
        );
      }

      // Sanitize inputs
      const sanitizedData = {
        firstName: this.sanitizeInput(data.firstName),
        lastName: this.sanitizeInput(data.lastName),
        email: data.email.toLowerCase().trim(),
        phone: data.phone ? this.sanitizeInput(data.phone) : undefined,
        message: this.sanitizeInput(data.message),
        priority: data.priority || SupportTicketPriority.MEDIUM,
        category: data.category || SupportTicketCategory.GENERAL,
      };

      // Check if user has too many pending tickets (prevent spam)
      const existingTickets = await this.supportTicketRepository.getSupportTicketsByEmail(sanitizedData.email);
      const pendingTickets = existingTickets.filter(ticket => ticket.status === SupportTicketStatus.PENDING);
      
      if (pendingTickets.length >= 5) {
        throw new UserError(
          HttpStatusCode.TooManyRequests,
          "You have too many pending support tickets. Please wait for a response before creating a new one."
        );
      }

      const ticket = await this.supportTicketRepository.createSupportTicket(sanitizedData);

      // Log the creation for monitoring
      this.app.log.info(`Support ticket created: ${ticket.id} by ${ticket.email}`);

      return {
        success: true,
        data: ticket,
        message: "Support ticket created successfully"
      };
    } catch (error) {
      if (error instanceof UserError) {
        throw error;
      }
      throw new UserError(
        HttpStatusCode.InternalServerError,
        `Failed to create support ticket: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async getSupportTicketById(ticketId: string) {
    try {
      if (!ticketId) {
        throw new UserError(
          HttpStatusCode.BadRequest,
          "Ticket ID is required"
        );
      }

      const ticket = await this.supportTicketRepository.findSupportTicketById(ticketId);
      
      if (!ticket) {
        throw new UserError(
          HttpStatusCode.NotFound,
          "Support ticket not found"
        );
      }

      return {
        success: true,
        data: ticket
      };
    } catch (error) {
      if (error instanceof UserError) {
        throw error;
      }
      throw new UserError(
        HttpStatusCode.InternalServerError,
        `Failed to get support ticket: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async updateSupportTicket(ticketId: string, data: UpdateSupportTicketRequest) {
    try {
      if (!ticketId) {
        throw new UserError(
          HttpStatusCode.BadRequest,
          "Ticket ID is required"
        );
      }

      // Check if ticket exists
      const existingTicket = await this.supportTicketRepository.findSupportTicketById(ticketId);
      if (!existingTicket) {
        throw new UserError(
          HttpStatusCode.NotFound,
          "Support ticket not found"
        );
      }

      // Validate email if provided
      if (data.email && !this.validateEmail(data.email)) {
        throw new UserError(
          HttpStatusCode.BadRequest,
          "Invalid email format"
        );
      }

      // Validate phone if provided
      if (data.phone && !this.validatePhone(data.phone)) {
        throw new UserError(
          HttpStatusCode.BadRequest,
          "Invalid phone number format"
        );
      }

      // Validate message if provided
      if (data.message && !this.validateMessage(data.message)) {
        throw new UserError(
          HttpStatusCode.BadRequest,
          "Message must be between 10 and 1000 characters"
        );
      }

      // Validate names if provided
      if (data.firstName && !this.validateName(data.firstName)) {
        throw new UserError(
          HttpStatusCode.BadRequest,
          "First name must be between 2 and 100 characters"
        );
      }

      if (data.lastName && !this.validateName(data.lastName)) {
        throw new UserError(
          HttpStatusCode.BadRequest,
          "Last name must be between 2 and 100 characters"
        );
      }

      // Sanitize inputs
      const sanitizedData: UpdateSupportTicketRequest = {};
      if (data.firstName) sanitizedData.firstName = this.sanitizeInput(data.firstName);
      if (data.lastName) sanitizedData.lastName = this.sanitizeInput(data.lastName);
      if (data.email) sanitizedData.email = data.email.toLowerCase().trim();
      if (data.phone) sanitizedData.phone = this.sanitizeInput(data.phone);
      if (data.message) sanitizedData.message = this.sanitizeInput(data.message);
      if (data.priority) sanitizedData.priority = data.priority;
      if (data.status) sanitizedData.status = data.status;
      if (data.category) sanitizedData.category = data.category;

      const updatedTicket = await this.supportTicketRepository.updateSupportTicket(ticketId, sanitizedData);

      // Log the update for monitoring
      this.app.log.info(`Support ticket updated: ${ticketId}`);

      return {
        success: true,
        data: updatedTicket,
        message: "Support ticket updated successfully"
      };
    } catch (error) {
      if (error instanceof UserError) {
        throw error;
      }
      throw new UserError(
        HttpStatusCode.InternalServerError,
        `Failed to update support ticket: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async deleteSupportTicket(ticketId: string) {
    try {
      if (!ticketId) {
        throw new UserError(
          HttpStatusCode.BadRequest,
          "Ticket ID is required"
        );
      }

      // Check if ticket exists
      const existingTicket = await this.supportTicketRepository.findSupportTicketById(ticketId);
      if (!existingTicket) {
        throw new UserError(
          HttpStatusCode.NotFound,
          "Support ticket not found"
        );
      }

      const deletedTicket = await this.supportTicketRepository.deleteSupportTicket(ticketId);

      // Log the deletion for monitoring
      this.app.log.info(`Support ticket deleted: ${ticketId}`);

      return {
        success: true,
        data: deletedTicket,
        message: "Support ticket deleted successfully"
      };
    } catch (error) {
      if (error instanceof UserError) {
        throw error;
      }
      throw new UserError(
        HttpStatusCode.InternalServerError,
        `Failed to delete support ticket: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async getAllSupportTickets(filters?: SupportTicketFilters) {
    try {
      const tickets = await this.supportTicketRepository.getAllSupportTickets(filters);

      return {
        success: true,
        data: tickets,
        count: tickets.length
      };
    } catch (error) {
      throw new UserError(
        HttpStatusCode.InternalServerError,
        `Failed to get support tickets: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async getSupportTicketsByEmail(email: string) {
    try {
      if (!email || !this.validateEmail(email)) {
        throw new UserError(
          HttpStatusCode.BadRequest,
          "Valid email is required"
        );
      }

      const tickets = await this.supportTicketRepository.getSupportTicketsByEmail(email.toLowerCase().trim());

      return {
        success: true,
        data: tickets,
        count: tickets.length
      };
    } catch (error) {
      if (error instanceof UserError) {
        throw error;
      }
      throw new UserError(
        HttpStatusCode.InternalServerError,
        `Failed to get support tickets by email: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async getSupportTicketsByStatus(status: SupportTicketStatus) {
    try {
      const tickets = await this.supportTicketRepository.getSupportTicketsByStatus(status);

      return {
        success: true,
        data: tickets,
        count: tickets.length
      };
    } catch (error) {
      throw new UserError(
        HttpStatusCode.InternalServerError,
        `Failed to get support tickets by status: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async getSupportTicketsByPriority(priority: SupportTicketPriority) {
    try {
      const tickets = await this.supportTicketRepository.getSupportTicketsByPriority(priority);

      return {
        success: true,
        data: tickets,
        count: tickets.length
      };
    } catch (error) {
      throw new UserError(
        HttpStatusCode.InternalServerError,
        `Failed to get support tickets by priority: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async getSupportTicketsByCategory(category: SupportTicketCategory) {
    try {
      const tickets = await this.supportTicketRepository.getSupportTicketsByCategory(category);

      return {
        success: true,
        data: tickets,
        count: tickets.length
      };
    } catch (error) {
      throw new UserError(
        HttpStatusCode.InternalServerError,
        `Failed to get support tickets by category: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async getSupportTicketStats(): Promise<{ success: boolean; data: SupportTicketStats }> {
    try {
      const stats = await this.supportTicketRepository.getSupportTicketStats();

      return {
        success: true,
        data: stats
      };
    } catch (error) {
      throw new UserError(
        HttpStatusCode.InternalServerError,
        `Failed to get support ticket stats: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async getRecentSupportTickets(limit: number = 10) {
    try {
      if (limit < 1 || limit > 100) {
        throw new UserError(
          HttpStatusCode.BadRequest,
          "Limit must be between 1 and 100"
        );
      }

      const tickets = await this.supportTicketRepository.getRecentSupportTickets(limit);

      return {
        success: true,
        data: tickets,
        count: tickets.length
      };
    } catch (error) {
      if (error instanceof UserError) {
        throw error;
      }
      throw new UserError(
        HttpStatusCode.InternalServerError,
        `Failed to get recent support tickets: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async searchSupportTickets(query: string) {
    try {
      if (!query || query.trim().length < 2) {
        throw new UserError(
          HttpStatusCode.BadRequest,
          "Search query must be at least 2 characters long"
        );
      }

      const tickets = await this.supportTicketRepository.searchSupportTickets(query.trim());

      return {
        success: true,
        data: tickets,
        count: tickets.length,
        query: query.trim()
      };
    } catch (error) {
      if (error instanceof UserError) {
        throw error;
      }
      throw new UserError(
        HttpStatusCode.InternalServerError,
        `Failed to search support tickets: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async getSupportTicketCount() {
    try {
      const count = await this.supportTicketRepository.getSupportTicketCount();

      return {
        success: true,
        data: { count }
      };
    } catch (error) {
      throw new UserError(
        HttpStatusCode.InternalServerError,
        `Failed to get support ticket count: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async updateTicketStatus(ticketId: string, status: SupportTicketStatus) {
    try {
      return await this.updateSupportTicket(ticketId, { status });
    } catch (error) {
      throw new UserError(
        HttpStatusCode.InternalServerError,
        `Failed to update ticket status: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async updateTicketPriority(ticketId: string, priority: SupportTicketPriority) {
    try {
      return await this.updateSupportTicket(ticketId, { priority });
    } catch (error) {
      throw new UserError(
        HttpStatusCode.InternalServerError,
        `Failed to update ticket priority: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async updateTicketCategory(ticketId: string, category: SupportTicketCategory) {
    try {
      return await this.updateSupportTicket(ticketId, { category });
    } catch (error) {
      throw new UserError(
        HttpStatusCode.InternalServerError,
        `Failed to update ticket category: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

export default SupportTicketService; 