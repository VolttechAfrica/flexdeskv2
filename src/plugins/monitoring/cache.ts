import { FastifyInstance } from 'fastify';

export class CacheMonitor {
  private app: FastifyInstance;
  private metrics: any;

  constructor(app: FastifyInstance) {
    this.app = app;
    this.metrics = {
      hits: 0,
      misses: 0,
      errors: 0,
      lastError: null,
      memoryUsage: {
        used: 0,
        total: 0
      },
      keys: 0
    };
  }

  async trackHit(key: string) {
    this.metrics.hits++;
    
    // Track cache hit in Datadog
    if (global.ddTracer) {
      const span = global.ddTracer.startSpan('cache.hit');
      span.setTag('key', key);
      span.finish();
    }
  }

  async trackMiss(key: string) {
    this.metrics.misses++;
    
    // Track cache miss in Datadog
    if (global.ddTracer) {
      const span = global.ddTracer.startSpan('cache.miss');
      span.setTag('key', key);
      span.finish();
    }
  }

  async trackError(error: Error) {
    this.metrics.errors++;
    this.metrics.lastError = {
      message: error.message,
      timestamp: new Date().toISOString()
    };

    // Track error in Datadog
    if (global.ddTracer) {
      const span = global.ddTracer.startSpan('cache.error');
      span.setTag('error.message', error.message);
      span.setTag('error.stack', error.stack);
      span.finish();
    }
  }

  async getStats() {
    try {
      const redis = this.app.redis;
      
      // Get Redis info
      const info = await redis.info();
      const memoryInfo = await redis.info('memory');
      
      // Parse memory info
      const usedMemory = parseInt(memoryInfo.match(/used_memory:(\d+)/)?.[1] || '0');
      const totalMemory = parseInt(memoryInfo.match(/maxmemory:(\d+)/)?.[1] || '0');
      
      // Get total keys
      const keys = await redis.dbsize();
      
      this.metrics.memoryUsage = {
        used: usedMemory,
        total: totalMemory
      };
      this.metrics.keys = keys;

      // Track cache stats in Datadog
      if (global.ddTracer) {
        const span = global.ddTracer.startSpan('cache.stats');
        span.setTag('hits', this.metrics.hits);
        span.setTag('misses', this.metrics.misses);
        span.setTag('errors', this.metrics.errors);
        span.setTag('memory_used', usedMemory);
        span.setTag('memory_total', totalMemory);
        span.setTag('total_keys', keys);
        span.finish();
      }

      return this.metrics;
    } catch (error) {
      await this.trackError(error as Error);
      throw error;
    }
  }
} 