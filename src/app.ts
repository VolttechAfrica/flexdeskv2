import healthRoutes from "./routes/health.js";
import authRoutes from "./routes/auth.route.js";

import userRoutes from "./routes/user.route.js";
import schoolRoutes from "./routes/school.route.js";
import studentRoutes from "./routes/student.route.js";
import taskRoutes from "./routes/task.routes.js";
import teacherRoutes from "./routes/teacher.route.js";
import supportTicketRoutes from "./routes/supportTicket.routes.js";


import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import fastify, { FastifyPluginAsync } from "fastify";
import loggerPlugin from "./plugins/logger.js";
import jwtPlugin from "./plugins/jwtPlugin.js";
import bcryptPlugin from "./plugins/bcryptPlugin.js";
import redisPlugin from "./plugins/redisPlugin.js";
import sensible from "./plugins/sensiblePlugin.js";
import { FastifyRequest } from "fastify";
import nodemailerPlugin from "./plugins/nodemailerPlugin.js";
import metricsPlugin from "./plugins/metrics.js";
import DatabaseMonitor from "./utils/db-monitor.js";
import CacheMonitor from "./utils/cache-monitor.js";
import { PrismaClient } from "@prisma/client";

const monitoringPlugin: FastifyPluginAsync = async (app) => {
  const prisma = new PrismaClient();
  const dbMonitor = new DatabaseMonitor(prisma);
  const cacheMonitor = new CacheMonitor(app);

  app.get('/api/v2/monitoring/db', async (request, reply) => {
    try {
      await dbMonitor.trackConnectionPool();
      return { status: 'Database monitoring active' };
    } catch (error: any) {
      app.log.error('Database monitoring error:', error);
      return { status: 'Database monitoring error', error: error?.message || 'Unknown error' };
    }
  });

  app.get('/api/v2/monitoring/cache', async (request, reply) => {
    try {
      const stats = await cacheMonitor.getStats();
      return { status: 'Cache monitoring active', stats };
    } catch (error: any) {
      app.log.error('Cache monitoring error:', error);
      return { status: 'Cache monitoring error', error: error?.message || 'Unknown error' };
    }
  });
};

export const buildServer = async () => {
  const app = fastify({ 
    logger: true,
    trustProxy: true,
  });

 
  // Register core plugins first
  app.register(loggerPlugin);
  app.register(redisPlugin); 
  app.register(jwtPlugin);
  app.register(bcryptPlugin);
  app.register(nodemailerPlugin);
  app.register(helmet);
  app.register(cors, {
    origin: ["*"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  });
  app.register(sensible);

  // Register rate limiting before error handlers
  app.register(rateLimit, {
    max: 50,
    timeWindow: "1 minute",
    skipOnError: false,
    errorResponseBuilder: (req: FastifyRequest, context: any) => {
      return {
        statusCode: 429,
        error: "Too Many Requests",
        message: "You have exceeded the request limit. Please try again later.",
        retryAfter: context.after,
      };
    },
  });

  // Set error handlers before registering metrics plugin
  app.setNotFoundHandler((request, reply) => {
    reply.notFound("The requested resource was not found.");
  });

  app.setErrorHandler((error, request, reply) => {
    app.log.error('Error handler called:', {
      error: error.message,
      code: error.code,
      statusCode: error.statusCode,
      replySent: reply.sent,
      url: request.url,
      method: request.method
    });
    
    // Check if response has already been sent
    if (reply.sent) {
      app.log.warn('Response already sent, skipping error handler');
      return;
    }
    
    // Check if this is a Fastify internal error that we shouldn't handle
    if (error.code === 'FST_ERR_SEND_INSIDE_ONERR') {
      app.log.error('Fastify internal error detected, not sending response');
      return;
    }
    
    try {
      // Handle different types of errors
      if (error.statusCode) {
        return reply.status(error.statusCode).send({
          status: false,
          error: error.name || 'Error',
          message: error.message || 'An error occurred',
        });
      }
      
      // Default error response
      reply.status(500).send({
        status: false,
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
      });
    } catch (sendError) {
      app.log.error('Error sending error response:', sendError);
    }
  });

  app.register(metricsPlugin);
  app.register(monitoringPlugin);

  // Register all routes
  app.register(healthRoutes, { prefix: "/api/v2" });
  app.register(authRoutes, { prefix: "/api/v2/auth" });
  app.register(userRoutes, { prefix: "/api/v2/user" });
  app.register(schoolRoutes, { prefix: "/api/v2/school" });
  app.register(studentRoutes, { prefix: "/api/v2/students" }); 
  app.register(taskRoutes, { prefix: "/api/v2" });
  app.register(teacherRoutes, { prefix: "/api/v2/teachers" });
  app.register(supportTicketRoutes, { prefix: "/api/v2/support" });

  app.get("/", async (request, reply) => {
    reply.unauthorized();
  });

  // Wait for Redis to be ready
  await app.ready();

  return app;
};