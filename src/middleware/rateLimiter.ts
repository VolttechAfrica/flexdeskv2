import { FastifyRequest, FastifyReply } from "fastify";
import RedisService from "../services/redis.service.js";
import { RateLimitError } from "../utils/errorhandler.js";
import { recordMetric } from "../config/monitoring.js";

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (request: FastifyRequest) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  message?: string;
  metricsPrefix?: string;
}

class RateLimiter {
  private redis: RedisService;

  constructor(redis: RedisService) {
    this.redis = redis;
  }

  private getDefaultKey(request: FastifyRequest): string {
    return `rate_limit:${request.ip}`;
  }

  private async getRequestCount(key: string, windowMs: number): Promise<number> {
    try {
      const count = await this.redis.get<number>(key);
      return count || 0;
    } catch (error) {
      return 0;
    }
  }

  private async incrementRequestCount(key: string, windowMs: number): Promise<number> {
    try {
      const current = await this.getRequestCount(key, windowMs);
      const newCount = current + 1;
      
      await this.redis.set({
        key,
        value: newCount,
        ttl: Math.ceil(windowMs / 1000)
      });
      
      return newCount;
    } catch (error) {
      return 1;
    }
  }

  private async recordRateLimitMetrics(
    config: RateLimitConfig, 
    blocked: boolean, 
    responseTime: number,
    request: FastifyRequest
  ): Promise<void> {
    try {
      const tags = [
        `type:${config.metricsPrefix || 'general'}`,
        `blocked:${blocked}`,
        `ip:${request.ip}`,
        `method:${request.method}`,
        `path:${request.routeOptions?.url || 'unknown'}`
      ];

      // Record rate limit attempt
      await recordMetric('rate_limit.attempt', 1, tags);

      // Record blocked requests
      if (blocked) {
        await recordMetric('rate_limit.blocked', 1, tags);
      }

      // Record response time for rate limiting
      await recordMetric('rate_limit.response_time', responseTime, tags);

      // Record rate limit window metrics
      await recordMetric('rate_limit.window_size', config.windowMs, [
        `type:${config.metricsPrefix || 'general'}`
      ]);

      await recordMetric('rate_limit.max_requests', config.maxRequests, [
        `type:${config.metricsPrefix || 'general'}`
      ]);

    } catch (error) {
      console.warn('Failed to record rate limit metrics:', error);
    }
  }

  private calculateRetryAfter(windowMs: number): number {
    return Math.ceil(windowMs / 1000);
  }

  createRateLimit(config: RateLimitConfig) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const startTime = Date.now();
      let blocked = false;

      try {
        const key = config.keyGenerator 
          ? config.keyGenerator(request)
          : this.getDefaultKey(request);

        const currentCount = await this.getRequestCount(key, config.windowMs);
        
        if (currentCount >= config.maxRequests) {
          blocked = true;
          const retryAfter = this.calculateRetryAfter(config.windowMs);
          
          reply.header('Retry-After', retryAfter.toString());
          reply.header('X-RateLimit-Limit', config.maxRequests.toString());
          reply.header('X-RateLimit-Remaining', '0');
          reply.header('X-RateLimit-Reset', new Date(Date.now() + config.windowMs).toISOString());
          
          throw new RateLimitError(
            config.message || 'Too many requests, please try again later',
            retryAfter,
            429,
            request.id
          );
        }

        const newCount = await this.incrementRequestCount(key, config.windowMs);
        
        reply.header('X-RateLimit-Limit', config.maxRequests.toString());
        reply.header('X-RateLimit-Remaining', Math.max(0, config.maxRequests - newCount).toString());
        reply.header('X-RateLimit-Reset', new Date(Date.now() + config.windowMs).toISOString());
        
      } catch (error) {
        if (error instanceof RateLimitError) {
          throw error;
        }
        
        request.log.error('Rate limiter error:', error as any);
      } finally {
        const responseTime = Date.now() - startTime;
        await this.recordRateLimitMetrics(config, blocked, responseTime, request);
      }
    };
  }
}

export const createAuthRateLimit = (redis: RedisService) => {
  const rateLimiter = new RateLimiter(redis);
  
  return rateLimiter.createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    keyGenerator: (request) => `auth_rate_limit:${request.ip}`,
    message: 'Too many authentication attempts, please try again later',
    metricsPrefix: 'auth'
  });
};

export const createGeneralRateLimit = (redis: RedisService) => {
  const rateLimiter = new RateLimiter(redis);
  
  return rateLimiter.createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    keyGenerator: (request) => `general_rate_limit:${request.ip}`,
    message: 'Too many requests, please slow down',
    metricsPrefix: 'general'
  });
};

export const createStrictRateLimit = (redis: RedisService) => {
  const rateLimiter = new RateLimiter(redis);
  
  return rateLimiter.createRateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    keyGenerator: (request) => `strict_rate_limit:${request.ip}`,
    message: 'Rate limit exceeded, please slow down',
    metricsPrefix: 'strict'
  });
};

export default RateLimiter;
