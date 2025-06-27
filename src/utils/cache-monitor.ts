import { FastifyInstance } from 'fastify';
import { recordMetric, Metrics } from '../config/monitoring.js';
import Redis from 'ioredis';
import { tracer } from "./tracer.js";

declare module 'fastify' {
  interface FastifyInstance {
    redisClient: Redis;
  }
}

export class CacheMonitor {
  private fastify: FastifyInstance;
  private redis: Redis;
  private hitCount: number = 0;
  private missCount: number = 0;
  private errorCount: number = 0;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
    if (!fastify.redisClient) {
      throw new Error('Redis client not initialized');
    }
    this.redis = fastify.redisClient;
    this.setupMonitoring();
  }

  private setupMonitoring() {
    if (!this.redis.get) {
      throw new Error('Redis get method not available');
    }

    // Monitor Redis operations
    const originalGet = this.redis.get;
    this.redis.get = async (...args) => {
      const start = Date.now();
      try {
        const result = await originalGet.apply(this.redis, args);
        const duration = Date.now() - start;

        // Record cache hit/miss (fire and forget)
        recordMetric(
          result ? Metrics.CACHE_HIT : Metrics.CACHE_MISS,
          1,
          [`key:${args[0]}`]
        ).catch(() => {}); // Ignore errors

        // Record operation duration (fire and forget)
        recordMetric('cache.operation.duration', duration, [
          `operation:get`,
          `key:${args[0]}`,
        ]).catch(() => {}); // Ignore errors

        return result;
      } catch (error) {
        recordMetric('cache.error', 1, [
          `operation:get`,
          `error:${error instanceof Error ? error.name : 'unknown'}`,
        ]).catch(() => {}); // Ignore errors
        throw error instanceof Error ? error : new Error(String(error));
      }
    };

    // Monitor Redis memory usage periodically
    setInterval(async () => {
      try {
        const info = await this.redis.info('memory');
        const usedMemory = parseInt(info.match(/used_memory:(\d+)/)?.[1] || '0');
        
        recordMetric('cache.memory.used', usedMemory, []).catch(() => {}); // Ignore errors
      } catch (error) {
        this.fastify.log.error('Failed to monitor Redis memory:', error);
      }
    }, 60000); // Every minute
  }

  public trackHit() {
    this.hitCount++;
  }

  public trackMiss() {
    this.missCount++;
  }

  public trackError(error: any) {
    this.errorCount++;
    const span = tracer.startSpan('cache.error', {
      tags: {
        'error.type': 'cache_error',
        'error.message': error.message,
        'error.stack': error.stack
      }
    });
    span.finish();
  }

  // Helper method to get cache statistics
  async getStats() {
    try {
      const info = await this.redis.info();
      return {
        connectedClients: parseInt(info.match(/connected_clients:(\d+)/)?.[1] || '0'),
        usedMemory: parseInt(info.match(/used_memory:(\d+)/)?.[1] || '0'),
        totalKeys: parseInt(info.match(/db0:keys=(\d+)/)?.[1] || '0'),
        hitCount: this.hitCount,
        missCount: this.missCount,
        errorCount: this.errorCount,
        hitRate: this.hitCount + this.missCount > 0 
          ? this.hitCount / (this.hitCount + this.missCount) 
          : 0
      };
    } catch (error) {
      this.fastify.log.error('Failed to get Redis stats:', error);
      return null;
    }
  }
}

export default CacheMonitor; 