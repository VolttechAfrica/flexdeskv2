import { FastifyInstance } from "fastify";
import SupportTicketController from "../controllers/supportTicket.controller.js";

export default async function supportTicketRoutes(fastify: FastifyInstance) {
  const supportTicketController = new SupportTicketController(fastify);

  // Create support ticket
  fastify.post(
    "/tickets",
    {
      schema: {
        description: "Create a new support ticket",
        tags: ["Support Tickets"],
        body: {
          type: "object",
          required: ["firstName", "lastName", "email", "message"],
          properties: {
            firstName: {
              type: "string",
              minLength: 2,
              maxLength: 100,
              description: "First name of the person creating the ticket"
            },
            lastName: {
              type: "string",
              minLength: 2,
              maxLength: 100,
              description: "Last name of the person creating the ticket"
            },
            email: {
              type: "string",
              format: "email",
              description: "Email address of the person creating the ticket"
            },
            phone: {
              type: "string",
              description: "Phone number (optional)"
            },
            message: {
              type: "string",
              minLength: 10,
              maxLength: 1000,
              description: "Support ticket message"
            },
            priority: {
              type: "string",
              enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
              default: "MEDIUM",
              description: "Priority level of the ticket"
            },
            category: {
              type: "string",
              enum: ["TECHNICAL", "BILLING", "GENERAL", "FEATURE_REQUEST", "OTHER"],
              default: "GENERAL",
              description: "Category of the support ticket"
            }
          }
        },
        response: {
          201: {
            description: "Support ticket created successfully",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
              data: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  firstName: { type: "string" },
                  lastName: { type: "string" },
                  email: { type: "string" },
                  phone: { type: "string" },
                  message: { type: "string" },
                  priority: { type: "string" },
                  category: { type: "string" },
                  status: { type: "string" },
                  createdAt: { type: "string", format: "date-time" },
                  updatedAt: { type: "string", format: "date-time" }
                }
              }
            }
          },
          400: {
            description: "Bad request",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" }
            }
          },
          500: {
            description: "Internal server error",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" }
            }
          }
        }
      }
    },
    supportTicketController.createSupportTicket.bind(supportTicketController)
  );

  // Get support ticket by ID
  fastify.get(
    "/tickets/:id",
    {
      schema: {
        description: "Get a support ticket by ID",
        tags: ["Support Tickets"],
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: {
              type: "string",
              description: "Support ticket ID"
            }
          }
        },
        response: {
          200: {
            description: "Support ticket retrieved successfully",
            type: "object",
            properties: {
              success: { type: "boolean" },
              data: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  firstName: { type: "string" },
                  lastName: { type: "string" },
                  email: { type: "string" },
                  phone: { type: "string" },
                  message: { type: "string" },
                  priority: { type: "string" },
                  category: { type: "string" },
                  status: { type: "string" },
                  createdAt: { type: "string", format: "date-time" },
                  updatedAt: { type: "string", format: "date-time" }
                }
              }
            }
          },
          404: {
            description: "Support ticket not found",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" }
            }
          }
        }
      }
    },
    supportTicketController.getSupportTicketById.bind(supportTicketController)
  );

  // Update support ticket
  fastify.put(
    "/tickets/:id",
    {
      schema: {
        description: "Update a support ticket",
        tags: ["Support Tickets"],
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: {
              type: "string",
              description: "Support ticket ID"
            }
          }
        },
        body: {
          type: "object",
          properties: {
            firstName: {
              type: "string",
              minLength: 2,
              maxLength: 100
            },
            lastName: {
              type: "string",
              minLength: 2,
              maxLength: 100
            },
            email: {
              type: "string",
              format: "email"
            },
            phone: {
              type: "string"
            },
            message: {
              type: "string",
              minLength: 10,
              maxLength: 1000
            },
            priority: {
              type: "string",
              enum: ["LOW", "MEDIUM", "HIGH", "URGENT"]
            },
            status: {
              type: "string",
              enum: ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]
            },
            category: {
              type: "string",
              enum: ["TECHNICAL", "BILLING", "GENERAL", "FEATURE_REQUEST", "OTHER"]
            }
          }
        },
        response: {
          200: {
            description: "Support ticket updated successfully",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
              data: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  firstName: { type: "string" },
                  lastName: { type: "string" },
                  email: { type: "string" },
                  phone: { type: "string" },
                  message: { type: "string" },
                  priority: { type: "string" },
                  category: { type: "string" },
                  status: { type: "string" },
                  createdAt: { type: "string", format: "date-time" },
                  updatedAt: { type: "string", format: "date-time" }
                }
              }
            }
          },
          404: {
            description: "Support ticket not found",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" }
            }
          }
        }
      }
    },
    supportTicketController.updateSupportTicket.bind(supportTicketController)
  );

  // Delete support ticket
  fastify.delete(
    "/tickets/:id",
    {
      schema: {
        description: "Delete a support ticket",
        tags: ["Support Tickets"],
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: {
              type: "string",
              description: "Support ticket ID"
            }
          }
        },
        response: {
          200: {
            description: "Support ticket deleted successfully",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
              data: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  firstName: { type: "string" },
                  lastName: { type: "string" },
                  email: { type: "string" },
                  phone: { type: "string" },
                  message: { type: "string" },
                  priority: { type: "string" },
                  category: { type: "string" },
                  status: { type: "string" },
                  createdAt: { type: "string", format: "date-time" },
                  updatedAt: { type: "string", format: "date-time" }
                }
              }
            }
          },
          404: {
            description: "Support ticket not found",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" }
            }
          }
        }
      }
    },
    supportTicketController.deleteSupportTicket.bind(supportTicketController)
  );

  // Get all support tickets with filters
  fastify.get(
    "/tickets",
    {
      schema: {
        description: "Get all support tickets with optional filters",
        tags: ["Support Tickets"],
        querystring: {
          type: "object",
          properties: {
            status: {
              type: "string",
              enum: ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
              description: "Filter by status"
            },
            priority: {
              type: "string",
              enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
              description: "Filter by priority"
            },
            category: {
              type: "string",
              enum: ["TECHNICAL", "BILLING", "GENERAL", "FEATURE_REQUEST", "OTHER"],
              description: "Filter by category"
            },
            email: {
              type: "string",
              description: "Filter by email"
            },
            startDate: {
              type: "string",
              format: "date",
              description: "Filter by start date (YYYY-MM-DD)"
            },
            endDate: {
              type: "string",
              format: "date",
              description: "Filter by end date (YYYY-MM-DD)"
            }
          }
        },
        response: {
          200: {
            description: "Support tickets retrieved successfully",
            type: "object",
            properties: {
              success: { type: "boolean" },
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    firstName: { type: "string" },
                    lastName: { type: "string" },
                    email: { type: "string" },
                    phone: { type: "string" },
                    message: { type: "string" },
                    priority: { type: "string" },
                    category: { type: "string" },
                    status: { type: "string" },
                    createdAt: { type: "string", format: "date-time" },
                    updatedAt: { type: "string", format: "date-time" }
                  }
                }
              },
              count: { type: "number" }
            }
          }
        }
      }
    },
    supportTicketController.getAllSupportTickets.bind(supportTicketController)
  );

  // Get support tickets by email
  fastify.get(
    "/tickets/by-email",
    {
      schema: {
        description: "Get support tickets by email address",
        tags: ["Support Tickets"],
        querystring: {
          type: "object",
          required: ["email"],
          properties: {
            email: {
              type: "string",
              format: "email",
              description: "Email address to filter by"
            }
          }
        },
        response: {
          200: {
            description: "Support tickets retrieved successfully",
            type: "object",
            properties: {
              success: { type: "boolean" },
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    firstName: { type: "string" },
                    lastName: { type: "string" },
                    email: { type: "string" },
                    phone: { type: "string" },
                    message: { type: "string" },
                    priority: { type: "string" },
                    category: { type: "string" },
                    status: { type: "string" },
                    createdAt: { type: "string", format: "date-time" },
                    updatedAt: { type: "string", format: "date-time" }
                  }
                }
              },
              count: { type: "number" }
            }
          },
          400: {
            description: "Bad request",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" }
            }
          }
        }
      }
    },
    supportTicketController.getSupportTicketsByEmail.bind(supportTicketController)
  );

  // Get support tickets by status
  fastify.get(
    "/tickets/by-status",
    {
      schema: {
        description: "Get support tickets by status",
        tags: ["Support Tickets"],
        querystring: {
          type: "object",
          required: ["status"],
          properties: {
            status: {
              type: "string",
              enum: ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
              description: "Status to filter by"
            }
          }
        },
        response: {
          200: {
            description: "Support tickets retrieved successfully",
            type: "object",
            properties: {
              success: { type: "boolean" },
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    firstName: { type: "string" },
                    lastName: { type: "string" },
                    email: { type: "string" },
                    phone: { type: "string" },
                    message: { type: "string" },
                    priority: { type: "string" },
                    category: { type: "string" },
                    status: { type: "string" },
                    createdAt: { type: "string", format: "date-time" },
                    updatedAt: { type: "string", format: "date-time" }
                  }
                }
              },
              count: { type: "number" }
            }
          },
          400: {
            description: "Bad request",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" }
            }
          }
        }
      }
    },
    supportTicketController.getSupportTicketsByStatus.bind(supportTicketController)
  );

  // Get support tickets by priority
  fastify.get(
    "/support-tickets/by-priority",
    {
      schema: {
        description: "Get support tickets by priority",
        tags: ["Support Tickets"],
        querystring: {
          type: "object",
          required: ["priority"],
          properties: {
            priority: {
              type: "string",
              enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
              description: "Priority to filter by"
            }
          }
        },
        response: {
          200: {
            description: "Support tickets retrieved successfully",
            type: "object",
            properties: {
              success: { type: "boolean" },
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    firstName: { type: "string" },
                    lastName: { type: "string" },
                    email: { type: "string" },
                    phone: { type: "string" },
                    message: { type: "string" },
                    priority: { type: "string" },
                    category: { type: "string" },
                    status: { type: "string" },
                    createdAt: { type: "string", format: "date-time" },
                    updatedAt: { type: "string", format: "date-time" }
                  }
                }
              },
              count: { type: "number" }
            }
          },
          400: {
            description: "Bad request",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" }
            }
          }
        }
      }
    },
    supportTicketController.getSupportTicketsByPriority.bind(supportTicketController)
  );

  // Get support tickets by category
  fastify.get(
    "/support-tickets/by-category",
    {
      schema: {
        description: "Get support tickets by category",
        tags: ["Support Tickets"],
        querystring: {
          type: "object",
          required: ["category"],
          properties: {
            category: {
              type: "string",
              enum: ["TECHNICAL", "BILLING", "GENERAL", "FEATURE_REQUEST", "OTHER"],
              description: "Category to filter by"
            }
          }
        },
        response: {
          200: {
            description: "Support tickets retrieved successfully",
            type: "object",
            properties: {
              success: { type: "boolean" },
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    firstName: { type: "string" },
                    lastName: { type: "string" },
                    email: { type: "string" },
                    phone: { type: "string" },
                    message: { type: "string" },
                    priority: { type: "string" },
                    category: { type: "string" },
                    status: { type: "string" },
                    createdAt: { type: "string", format: "date-time" },
                    updatedAt: { type: "string", format: "date-time" }
                  }
                }
              },
              count: { type: "number" }
            }
          },
          400: {
            description: "Bad request",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" }
            }
          }
        }
      }
    },
    supportTicketController.getSupportTicketsByCategory.bind(supportTicketController)
  );

  // Get support ticket statistics
  fastify.get(
    "/support-tickets/stats",
    {
      schema: {
        description: "Get support ticket statistics",
        tags: ["Support Tickets"],
        response: {
          200: {
            description: "Statistics retrieved successfully",
            type: "object",
            properties: {
              success: { type: "boolean" },
              data: {
                type: "object",
                properties: {
                  total: { type: "number" },
                  pending: { type: "number" },
                  inProgress: { type: "number" },
                  completed: { type: "number" },
                  cancelled: { type: "number" },
                  byPriority: {
                    type: "object",
                    properties: {
                      low: { type: "number" },
                      medium: { type: "number" },
                      high: { type: "number" },
                      urgent: { type: "number" }
                    }
                  },
                  byCategory: {
                    type: "object",
                    properties: {
                      technical: { type: "number" },
                      billing: { type: "number" },
                      general: { type: "number" },
                      featureRequest: { type: "number" },
                      other: { type: "number" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    supportTicketController.getSupportTicketStats.bind(supportTicketController)
  );

  // Get recent support tickets
  fastify.get(
    "/tickets/recent",
    {
      schema: {
        description: "Get recent support tickets",
        tags: ["Support Tickets"],
        querystring: {
          type: "object",
          properties: {
            limit: {
              type: "string",
              pattern: "^[1-9][0-9]?$|^100$",
              description: "Number of recent tickets to return (1-100, default: 10)"
            }
          }
        },
        response: {
          200: {
            description: "Recent support tickets retrieved successfully",
            type: "object",
            properties: {
              success: { type: "boolean" },
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    firstName: { type: "string" },
                    lastName: { type: "string" },
                    email: { type: "string" },
                    phone: { type: "string" },
                    message: { type: "string" },
                    priority: { type: "string" },
                    category: { type: "string" },
                    status: { type: "string" },
                    createdAt: { type: "string", format: "date-time" },
                    updatedAt: { type: "string", format: "date-time" }
                  }
                }
              },
              count: { type: "number" }
            }
          },
          400: {
            description: "Bad request",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" }
            }
          }
        }
      }
    },
    supportTicketController.getRecentSupportTickets.bind(supportTicketController)
  );

  // Search support tickets
  fastify.get(
    "/tickets/search",
    {
      schema: {
        description: "Search support tickets",
        tags: ["Support Tickets"],
        querystring: {
          type: "object",
          required: ["q"],
          properties: {
            q: {
              type: "string",
              minLength: 2,
              description: "Search query (minimum 2 characters)"
            }
          }
        },
        response: {
          200: {
            description: "Search results retrieved successfully",
            type: "object",
            properties: {
              success: { type: "boolean" },
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    firstName: { type: "string" },
                    lastName: { type: "string" },
                    email: { type: "string" },
                    phone: { type: "string" },
                    message: { type: "string" },
                    priority: { type: "string" },
                    category: { type: "string" },
                    status: { type: "string" },
                    createdAt: { type: "string", format: "date-time" },
                    updatedAt: { type: "string", format: "date-time" }
                  }
                }
              },
              count: { type: "number" },
              query: { type: "string" }
            }
          },
          400: {
            description: "Bad request",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" }
            }
          }
        }
      }
    },
    supportTicketController.searchSupportTickets.bind(supportTicketController)
  );

  // Get support ticket count
  fastify.get(
    "/tickets/count",
    {
      schema: {
        description: "Get total number of support tickets",
        tags: ["Support Tickets"],
        response: {
          200: {
            description: "Count retrieved successfully",
            type: "object",
            properties: {
              success: { type: "boolean" },
              data: {
                type: "object",
                properties: {
                  count: { type: "number" }
                }
              }
            }
          }
        }
      }
    },
    supportTicketController.getSupportTicketCount.bind(supportTicketController)
  );

  // Update ticket status
  fastify.patch(
    "/tickets/:id/status",
    {
      schema: {
        description: "Update support ticket status",
        tags: ["Support Tickets"],
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: {
              type: "string",
              description: "Support ticket ID"
            }
          }
        },
        body: {
          type: "object",
          required: ["status"],
          properties: {
            status: {
              type: "string",
              enum: ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
              description: "New status for the ticket"
            }
          }
        },
        response: {
          200: {
            description: "Status updated successfully",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
              data: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  firstName: { type: "string" },
                  lastName: { type: "string" },
                  email: { type: "string" },
                  phone: { type: "string" },
                  message: { type: "string" },
                  priority: { type: "string" },
                  category: { type: "string" },
                  status: { type: "string" },
                  createdAt: { type: "string", format: "date-time" },
                  updatedAt: { type: "string", format: "date-time" }
                }
              }
            }
          },
          404: {
            description: "Support ticket not found",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" }
            }
          }
        }
      }
    },
    supportTicketController.updateTicketStatus.bind(supportTicketController)
  );

  // Update ticket priority
  fastify.patch(
    "/tickets/:id/priority",
    {
      schema: {
        description: "Update support ticket priority",
        tags: ["Support Tickets"],
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: {
              type: "string",
              description: "Support ticket ID"
            }
          }
        },
        body: {
          type: "object",
          required: ["priority"],
          properties: {
            priority: {
              type: "string",
              enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
              description: "New priority for the ticket"
            }
          }
        },
        response: {
          200: {
            description: "Priority updated successfully",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
              data: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  firstName: { type: "string" },
                  lastName: { type: "string" },
                  email: { type: "string" },
                  phone: { type: "string" },
                  message: { type: "string" },
                  priority: { type: "string" },
                  category: { type: "string" },
                  status: { type: "string" },
                  createdAt: { type: "string", format: "date-time" },
                  updatedAt: { type: "string", format: "date-time" }
                }
              }
            }
          },
          404: {
            description: "Support ticket not found",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" }
            }
          }
        }
      }
    },
    supportTicketController.updateTicketPriority.bind(supportTicketController)
  );

  // Update ticket category
  fastify.patch(
    "/tickets/:id/category",
    {
      schema: {
        description: "Update support ticket category",
        tags: ["Support Tickets"],
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: {
              type: "string",
              description: "Support ticket ID"
            }
          }
        },
        body: {
          type: "object",
          required: ["category"],
          properties: {
            category: {
              type: "string",
              enum: ["TECHNICAL", "BILLING", "GENERAL", "FEATURE_REQUEST", "OTHER"],
              description: "New category for the ticket"
            }
          }
        },
        response: {
          200: {
            description: "Category updated successfully",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
              data: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  firstName: { type: "string" },
                  lastName: { type: "string" },
                  email: { type: "string" },
                  phone: { type: "string" },
                  message: { type: "string" },
                  priority: { type: "string" },
                  category: { type: "string" },
                  status: { type: "string" },
                  createdAt: { type: "string", format: "date-time" },
                  updatedAt: { type: "string", format: "date-time" }
                }
              }
            }
          },
          404: {
            description: "Support ticket not found",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" }
            }
          }
        }
      }
    },
    supportTicketController.updateTicketCategory.bind(supportTicketController)
  );
} 