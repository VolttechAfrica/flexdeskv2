import { PrismaClient } from "@prisma/client";
import { FastifyInstance } from "fastify";
import DatabaseMonitor from "../utils/db-monitor.js";
import CacheMonitor from "../utils/cache-monitor.js";
import { recordMetric, Metrics } from "../config/monitoring.js";
import RedisService from "../services/redis.service.js";

export abstract class BaseRepository {
  protected prisma: PrismaClient;
  protected fastify: FastifyInstance;
  protected dbMonitor: DatabaseMonitor;
  protected cacheMonitor: CacheMonitor;
  protected redis: RedisService;

  constructor(prisma: PrismaClient, fastify: FastifyInstance) {
    this.prisma = prisma;
    this.fastify = fastify;
    this.dbMonitor = new DatabaseMonitor(prisma);
    this.cacheMonitor = new CacheMonitor(fastify);
    this.redis = new RedisService(fastify);
  }

  protected async withCache<T>(
    cacheKey: string,
    operation: string,
    queryFn: () => Promise<T>,
    ttl: number = 3600
  ): Promise<T> {
    try {
      const cachedData = await this.redis.get(cacheKey);
      if (cachedData) {
        await recordMetric(Metrics.CACHE_HIT, 1, [`key:${cacheKey}`]);
        return cachedData as T;
      }

      await recordMetric(Metrics.CACHE_MISS, 1, [`key:${cacheKey}`]);

      const startTime = Date.now();
      const data = await queryFn();
      const duration = Date.now() - startTime;

      await recordMetric(Metrics.DB_QUERY, 1, [
        `operation:${operation}`,
        `duration:${duration}`
      ]);

      if (data) {
        await this.redis.set({ key: cacheKey, value: JSON.stringify(data), ttl });
        const userInfoKey = `user:info:${(data as any)?.id}`;
        if (userInfoKey !== cacheKey) {
          await this.redis.set({ key: userInfoKey, value: JSON.stringify(data), ttl });
        }
      }

      return data;
    } catch (error) {
      await recordMetric(Metrics.DB_ERROR, 1, [
        `operation:${operation}`,
        `error:${error instanceof Error ? error.name : 'unknown'}`
      ]);
      throw error;
    }
  }

  protected async invalidateCache(cacheKey: string): Promise<void> {
    try {
      await this.redis.delete(cacheKey);
    } catch (error) {
      await recordMetric('cache.error', 1, [
        `operation:invalidate`,
        `key:${cacheKey}`,
        `error:${error instanceof Error ? error.name : 'unknown'}`
      ]);
      // Don't throw error for cache invalidation failures
      this.fastify.log.warn(`Failed to invalidate cache: ${cacheKey}`, error as any);
    }
  }

  protected async invalidateUserCache(userId: string): Promise<void> {
    const cacheKeys = [
      `user:info:${userId}`,
      `user:profile:${userId}`,
      `user:email:*` // TODO: This would need pattern matching in Redis
    ];
    
    await Promise.allSettled(
      cacheKeys.map(key => this.invalidateCache(key))
    );
  }

  protected async executeQuery<T>(
    operation: string,
    entity: string,
    queryFn: () => Promise<T>
  ): Promise<T> {
    try {
      const startTime = Date.now();
      const result = await queryFn();
      const duration = Date.now() - startTime;

      await recordMetric(Metrics.DB_QUERY, 1, [
        `operation:${operation}`,
        `entity:${entity}`,
        `duration:${duration}`
      ]);
      return result;
    } catch (error) {
      await recordMetric(Metrics.DB_ERROR, 1, [
        `operation:${operation}`,
        `entity:${entity}`,
        `error:${error instanceof Error ? error.name : 'unknown'}`
      ]);
      throw error;
    }
  }

  protected async executeTransaction<T>(
    operation: string,
    entity: string,
    transactionFn: (tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">) => Promise<T>
  ): Promise<T> {
    try {
      const startTime = Date.now();
      const result = await this.prisma.$transaction(transactionFn);
      const duration = Date.now() - startTime;

      await recordMetric(Metrics.DB_QUERY, 1, [
        `operation:${operation}`,
        `entity:${entity}`,
        `type:transaction`,
        `duration:${duration}`
      ]);
      return result;
    } catch (error) {
      await recordMetric(Metrics.DB_ERROR, 1, [
        `operation:${operation}`,
        `entity:${entity}`,
        `type:transaction`,
        `error:${error instanceof Error ? error.name : 'unknown'}`
      ]);
      throw error;
    }
  }
}
