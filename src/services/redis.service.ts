import { FastifyInstance } from "fastify";
import { UserError } from "../utils/errorhandler.js";
import { HttpStatusCode } from "axios";
import { Redis } from "ioredis";

interface RedisSetOptions {
  key: string;
  value: unknown;
  ttl?: number;
}

interface RedisInstanceOptions extends RedisSetOptions {
  value: Record<string, unknown>;
}

class RedisService {
  private readonly redis: Redis;
  private readonly logger: FastifyInstance['log'];
  private readonly DEFAULT_TTL = 300; // 5 minutes

  constructor(app: FastifyInstance) {
    if (!app.redis) {
      throw new Error("Redis client not initialized");
    }
    this.redis = app.redis;
    this.logger = app.log;
  }

  private handleError(operation: string, key: string, error: unknown): never {
    this.logger.error(`Redis ${operation} error for key "${key}":`, error);
    throw new UserError(
      HttpStatusCode.InternalServerError,
      `Redis operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    ) as any;
  }

  async set({ key, value, ttl = this.DEFAULT_TTL }: RedisSetOptions): Promise<void> {
    try {
      const storeValue = this.serializeValue(value);
      await this.redis.set(key, storeValue, 'EX', Number(ttl));
    } catch (error: any) {
      this.handleError('SET', key, error);
    }
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    try {
      const data = await this.redis.get(key);
      return data ? this.deserializeValue<T>(data) : null;
    } catch (error: any) {
      this.handleError('GET', key, error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error: any) {
      this.handleError('DEL', key, error);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      return (await this.redis.exists(key)) === 1;
    } catch (error: any) {
      this.handleError('EXISTS', key, error);
    }
  }

  async setInstance({ key, value, ttl = this.DEFAULT_TTL }: RedisInstanceOptions): Promise<void> {
    try {
      await this.set({ key, value: JSON.stringify(value), ttl });
    } catch (error: any) {
      this.handleError('SET_INSTANCE', key, error);
    }
  }

  async getInstance<T = Record<string, unknown>>(key: string): Promise<T | null> {
    try {
      const data = await this.get<string>(key);
      return data ? JSON.parse(data) as T : null;
    } catch (error: any) {
      this.handleError('GET_INSTANCE', key, error);
    }
  }

  private serializeValue(value: unknown): string {
    if (typeof value === 'string' || typeof value === 'number' || Buffer.isBuffer(value)) {
      return String(value);
    }
    return JSON.stringify(value);
  }

  private deserializeValue<T>(value: string): T {
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  }
}

export default RedisService;
