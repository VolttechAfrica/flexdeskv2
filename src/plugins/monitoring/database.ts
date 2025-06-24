import { PrismaClient } from '@prisma/client';

export class DatabaseMonitor {
  private prisma: PrismaClient;
  private metrics: any;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.metrics = {
      queryCount: 0,
      errorCount: 0,
      slowQueries: 0,
      lastError: null,
      connectionPool: {
        active: 0,
        idle: 0,
        total: 0
      }
    };
  }

  async trackQuery(query: string, duration: number) {
    this.metrics.queryCount++;
    
    if (duration > 1000) { // Queries taking more than 1 second
      this.metrics.slowQueries++;
    }

    // Track query metrics in Datadog
    if (global.ddTracer) {
      const span = global.ddTracer.startSpan('database.query');
      span.setTag('query', query);
      span.setTag('duration', duration);
      span.finish();
    }
  }

  async trackError(error: Error) {
    this.metrics.errorCount++;
    this.metrics.lastError = {
      message: error.message,
      timestamp: new Date().toISOString()
    };

    // Track error in Datadog
    if (global.ddTracer) {
      const span = global.ddTracer.startSpan('database.error');
      span.setTag('error.message', error.message);
      span.setTag('error.stack', error.stack);
      span.finish();
    }
  }

  async trackConnectionPool() {
    try {
      // Get connection pool stats from Prisma
      const result = await this.prisma.$queryRaw`SELECT * FROM pg_stat_activity` as Array<{ state: string }>;
      
      this.metrics.connectionPool = {
        active: result.filter((conn) => conn.state === 'active').length,
        idle: result.filter((conn) => conn.state === 'idle').length,
        total: result.length
      };

      // Track connection pool metrics in Datadog
      if (global.ddTracer) {
        const span = global.ddTracer.startSpan('database.connection_pool');
        span.setTag('active_connections', this.metrics.connectionPool.active);
        span.setTag('idle_connections', this.metrics.connectionPool.idle);
        span.setTag('total_connections', this.metrics.connectionPool.total);
        span.finish();
      }

      return this.metrics.connectionPool;
    } catch (error) {
      await this.trackError(error as Error);
      throw error;
    }
  }

  getMetrics() {
    return this.metrics;
  }
} 