import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import { createGeneralRateLimit, createAuthRateLimit, createStrictRateLimit } from '../middleware/rateLimiter.js';
import RedisService from '../services/redis.service.js';

declare module 'fastify' {
  interface FastifyInstance {
    generalRateLimit: (request: any, reply: any) => Promise<void>;
    authRateLimit: (request: any, reply: any) => Promise<void>;
    strictRateLimit: (request: any, reply: any) => Promise<void>;
  }
}

const rateLimitPlugin: FastifyPluginAsync = fp(async (fastify) => {

  const redisService = new RedisService(fastify);
  
  // Create rate limiters
  const generalRateLimit = createGeneralRateLimit(redisService);
  const authRateLimit = createAuthRateLimit(redisService);
  const strictRateLimit = createStrictRateLimit(redisService);
  
  // Decorate fastify instance with rate limiters
  fastify.decorate('generalRateLimit', generalRateLimit);
  fastify.decorate('authRateLimit', authRateLimit);
  fastify.decorate('strictRateLimit', strictRateLimit);
  
  fastify.addHook('preHandler', async (request, reply) => {
    await generalRateLimit(request, reply);
  });
  
  fastify.log.info('Rate limiting plugin registered with Redis and Datadog metrics');
});

export default rateLimitPlugin;
