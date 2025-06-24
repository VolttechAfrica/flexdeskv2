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
    queryFn: () => Promise<T>
  ): Promise<T> {
    try {
      const cachedData = await this.redis.get(cacheKey);
      if (cachedData) {
        await recordMetric(Metrics.CACHE_HIT, 1, [`key:${cacheKey}`]);
        return cachedData as T;
      }

      await recordMetric(Metrics.CACHE_MISS, 1, [`key:${cacheKey}`]);

      // Get from database
      const startTime = Date.now();
      const data = await queryFn();
      const duration = Date.now() - startTime;

      await recordMetric(Metrics.DB_QUERY, 1, [
        `operation:${operation}`,
        `duration:${duration}`
      ]);

      if (data) {
        const userInfoKey = `user:info:${(data as any)?.id}`;
        await this.redis.set({ key: cacheKey, value: JSON.stringify(data), ttl: 3600 });
        await this.redis.set({ key: userInfoKey, value: JSON.stringify(data), ttl: 3600 });
        console.log(userInfoKey);
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
      throw error;
    }
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
} 