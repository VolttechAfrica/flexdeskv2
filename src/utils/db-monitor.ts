import { PrismaClient, Prisma } from "@prisma/client";
import { recordMetric, Metrics } from '../config/monitoring.js';
import { tracer } from "./tracer.js";

export default class DatabaseMonitor {
  private prisma: PrismaClient;
  private queryCount: number = 0;
  private errorCount: number = 0;
  private totalQueryTime: number = 0;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.initializeMonitoring();
  }

  private initializeMonitoring() {
    // Monitor Prisma query events using event listeners
    try {
      (this.prisma as any).$on('query' as any, (e: Prisma.QueryEvent) => {
        this.queryCount++;
        this.totalQueryTime += e.duration;
        
        const span = tracer.startSpan('prisma.query', {
          tags: {
            'db.type': 'prisma',
            'db.query': e.query,
            'db.duration_ms': e.duration,
            'db.params': JSON.stringify(e.params)
          }
        });
        
        span.finish();
      });

      // Monitor Prisma errors
      (this.prisma as any).$on('error' as any, (e: Error) => {
        this.errorCount++;
        
        const span = tracer.startSpan('prisma.error', {
          tags: {
            'error.type': 'database_error',
            'error.message': e.message,
            'error.stack': e.stack
          }
        });
        
        span.finish();
      });
    } catch (error) {
      console.warn('Prisma monitoring events not available:', error);
    }
  }

  // Helper method to track connection pool metrics
  public async trackConnectionPool() {
    const span = tracer.startSpan('db.connection_pool');
    try {
      const result = await this.prisma.$queryRaw`SELECT 1`;
      span.setTag('status', 'success');
      return result;
    } catch (error: any) {
      span.setTag('status', 'error');
      span.setTag('error.message', error.message);
      throw error;
    } finally {
      span.finish();
    }
  }

  public trackQuery(duration: number) {
    this.queryCount++;
    this.totalQueryTime += duration;
  }

  public trackError(error: any) {
    this.errorCount++;
    const span = tracer.startSpan('db.error', {
      tags: {
        'error.type': 'database_error',
        'error.message': error.message,
        'error.stack': error.stack
      }
    });
    span.finish();
  }

  public getStats() {
    return {
      queryCount: this.queryCount,
      errorCount: this.errorCount,
      averageQueryTime: this.queryCount > 0 ? this.totalQueryTime / this.queryCount : 0
    };
  }
} 