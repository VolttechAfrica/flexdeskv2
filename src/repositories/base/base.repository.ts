import { PrismaClient } from "@prisma/client";
import { FastifyInstance } from "fastify";
import { 
  BaseEntity, 
  PaginationParams, 
  PaginationResult, 
  QueryOptions, 
  RepositoryResult,
  UserContext,
  SearchParams,
  FilterParams,
  BulkOperationResult,
} from '../types/common.types.js';
import { 
  RepositoryError, 
  EntityNotFoundError, 
  ValidationError,
} from '../errors/repository.errors.js';
import { IBaseRepository } from '../interfaces/base.repository.interface.js';
import DatabaseMonitor from "../../utils/db-monitor.js";
import CacheMonitor from "../../utils/cache-monitor.js";
import { recordMetric, Metrics } from "../../config/monitoring.js";
import RedisService from "../../services/redis.service.js";
import { REDIS_KEYS } from "../../services/authorization.service.js";

export abstract class BaseRepository<
  T extends BaseEntity,
  CreateInput,
  UpdateInput,
  FilterInput = FilterParams
> implements IBaseRepository<T, CreateInput, UpdateInput, FilterInput> {
  
  protected readonly prisma: PrismaClient;
  protected readonly fastify: FastifyInstance;
  protected readonly dbMonitor: DatabaseMonitor;
  protected readonly cacheMonitor: CacheMonitor;
  protected readonly redis: RedisService;
  protected readonly entityName: string;

  constructor(
    prisma: PrismaClient, 
    fastify: FastifyInstance,
    entityName: string
  ) {
    this.prisma = prisma;
    this.fastify = fastify;
    this.entityName = entityName;
    this.dbMonitor = new DatabaseMonitor(prisma);
    this.cacheMonitor = new CacheMonitor(fastify);
    this.redis = new RedisService(fastify);
  }

  // Abstract methods to be implemented by concrete repositories
  protected abstract getModel(): any;
  protected abstract buildWhereClause(filters: FilterInput): any;
  protected abstract buildCreateData(data: CreateInput, context?: UserContext): any;
  protected abstract buildUpdateData(data: UpdateInput, context?: UserContext): any;
  protected abstract validateCreateData(data: CreateInput): Promise<RepositoryResult<boolean>>;
  protected abstract validateUpdateData(data: UpdateInput, existing: T): Promise<RepositoryResult<boolean>>;
  protected abstract getCacheKey(id: string): string;
  protected abstract getCachePattern(): string;

  // CRUD Operations
  async findById(id: string, options?: QueryOptions): Promise<RepositoryResult<T>> {
    try {
      const cacheKey = this.getCacheKey(id);
      
      // Try cache first
      const cached = await this.getFromCache(cacheKey);
      if (cached) {
        await recordMetric(Metrics.CACHE_HIT, 1, [`entity:${this.entityName}`, `operation:findById`]);
        return { success: true, data: cached };
      }

      await recordMetric(Metrics.CACHE_MISS, 1, [`entity:${this.entityName}`, `operation:findById`]);

      const model = this.getModel();
      const queryOptions = this.buildQueryOptions(options);
      
      const entity = await this.executeQuery<T | null>('findById', () =>
        model.findUnique({
          where: { id },
          ...queryOptions
        })
      );

      if (!entity) {
        throw new EntityNotFoundError(this.entityName, id);
      }

      // Cache the result
      await this.setCache(cacheKey, entity);

      return { success: true, data: entity };
    } catch (error) {
      return this.handleError(error, 'findById', { id, options });
    }
  }

  async findMany(filters?: FilterInput, options?: QueryOptions): Promise<RepositoryResult<T[]>> {
    try {
      const whereClause = filters ? this.buildWhereClause(filters) : {};
      const queryOptions = this.buildQueryOptions(options);
      
      const entities = await this.executeQuery<T[]>('findMany', () =>
        this.getModel().findMany({
          where: whereClause,
          ...queryOptions
        })
      );

      return { success: true, data: entities };
    } catch (error) {
      return this.handleError(error, 'findMany', { filters, options });
    }
  }

  async findFirst(filters: FilterInput, options?: QueryOptions): Promise<RepositoryResult<T | null>> {
    try {
      const whereClause = this.buildWhereClause(filters);
      const queryOptions = this.buildQueryOptions(options);
      
      const entity = await this.executeQuery<T | null>('findFirst', () =>
        this.getModel().findFirst({
          where: whereClause,
          ...queryOptions
        })
      );

      return { success: true, data: entity };
    } catch (error) {
      return this.handleError(error, 'findFirst', { filters, options });
    }
  }

  async create(data: CreateInput, context?: UserContext): Promise<RepositoryResult<T>> {
    try {
      // Validate input data
      const validation = await this.validateCreateData(data);
      if (!validation.success) {
        throw new ValidationError(validation.error || 'Invalid data');
      }

      const createData = this.buildCreateData(data, context);
      
      const entity = await this.executeQuery<T>('create', () =>
        this.getModel().create({
          data: createData
        })
      );

      // Cache the new entity
      const cacheKey = this.getCacheKey(entity.id);
      await this.setCache(cacheKey, entity);

      // Invalidate related caches
      await this.invalidateRelatedCaches(entity);

      return { success: true, data: entity };
    } catch (error) {
      return this.handleError(error, 'create', { data, context });
    }
  }

  async update(id: string, data: UpdateInput, context?: UserContext): Promise<RepositoryResult<T>> {
    try {
      // Check if entity exists
      const existing = await this.findById(id);
      if (!existing.success || !existing.data) {
        throw new EntityNotFoundError(this.entityName, id);
      }

      // Validate update data
      const validation = await this.validateUpdateData(data, existing.data);
      if (!validation.success) {
        throw new ValidationError(validation.error || 'Invalid update data');
      }

      const updateData = this.buildUpdateData(data, context);
      
      const entity = await this.executeQuery<T>('update', () =>
        this.getModel().update({
          where: { id },
          data: updateData
        })
      );

      // Update cache
      const cacheKey = this.getCacheKey(id);
      await this.setCache(cacheKey, entity);

      // Invalidate related caches
      await this.invalidateRelatedCaches(entity);

      return { success: true, data: entity };
    } catch (error) {
      return this.handleError(error, 'update', { id, data, context });
    }
  }

  async delete(id: string, context?: UserContext): Promise<RepositoryResult<boolean>> {
    try {
      // Check if entity exists
      const existing = await this.findById(id);
      if (!existing.success || !existing.data) {
        throw new EntityNotFoundError(this.entityName, id);
      }

      await this.executeQuery('delete', () =>
        this.getModel().delete({
          where: { id }
        })
      );

      // Invalidate cache
      const cacheKey = this.getCacheKey(id);
      await this.invalidateCache([cacheKey]);

      return { success: true, data: true };
    } catch (error) {
      return this.handleError(error, 'delete', { id, context });
    }
  }

  async softDelete(id: string, context?: UserContext): Promise<RepositoryResult<boolean>> {
    try {
      // Check if entity exists
      const existing = await this.findById(id);
      if (!existing.success || !existing.data) {
        throw new EntityNotFoundError(this.entityName, id);
      }

      const updateData = this.buildUpdateData(
        { deleted: true, deletedAt: new Date(), deletedBy: context?.userId } as any,
        context
      );
      
      await this.executeQuery('softDelete', () =>
        this.getModel().update({
          where: { id },
          data: updateData
        })
      );

      // Invalidate cache
      const cacheKey = this.getCacheKey(id);
      await this.invalidateCache([cacheKey]);

      return { success: true, data: true };
    } catch (error) {
      return this.handleError(error, 'softDelete', { id, context });
    }
  }

  // Pagination
  async findManyPaginated(
    filters?: FilterInput,
    pagination?: PaginationParams,
    options?: QueryOptions
  ): Promise<RepositoryResult<PaginationResult<T>>> {
    try {
      const page = pagination?.page || 1;
      const limit = pagination?.limit || 10;
      const skip = (page - 1) * limit;

      const whereClause = filters ? this.buildWhereClause(filters) : {};
      const queryOptions = this.buildQueryOptions(options);

      const [entities, total] = await Promise.all([
        this.executeQuery<T[]>('findManyPaginated', () =>
          this.getModel().findMany({
            where: whereClause,
            skip,
            take: limit,
            ...queryOptions
          })
        ),
        this.executeQuery<number>('count', () =>
          this.getModel().count({
            where: whereClause
          })
        )
      ]);

      const totalPages = Math.ceil(total / limit);

      const result: PaginationResult<T> = {
        data: entities,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };

      return { success: true, data: result };
    } catch (error) {
      return this.handleError(error, 'findManyPaginated', { filters, pagination, options });
    }
  }

  // Search
  async search(params: SearchParams, options?: QueryOptions): Promise<RepositoryResult<T[]>> {
    try {
      const searchQuery = this.buildSearchQuery(params);
      const queryOptions = this.buildQueryOptions(options);
      
      const entities = await this.executeQuery<T[]>('search', () =>
        this.getModel().findMany({
          where: searchQuery,
          ...queryOptions
        })
      );

      return { success: true, data: entities };
    } catch (error) {
      return this.handleError(error, 'search', { params, options });
    }
  }

  // Bulk Operations
  async createMany(data: CreateInput[], context?: UserContext): Promise<RepositoryResult<BulkOperationResult>> {
    try {
      const results: BulkOperationResult = {
        success: true,
        processed: 0,
        failed: 0,
        errors: []
      };

      for (let i = 0; i < data.length; i++) {
        try {
          const validation = await this.validateCreateData(data[i]);
          if (!validation.success) {
            results.errors.push({
              index: i,
              error: validation.error || 'Validation failed',
              data: data[i]
            });
            results.failed++;
            continue;
          }

          const createData = this.buildCreateData(data[i], context);
          await this.getModel().create({ data: createData });
          results.processed++;
        } catch (error) {
          results.errors.push({
            index: i,
            error: error instanceof Error ? error.message : 'Unknown error',
            data: data[i]
          });
          results.failed++;
        }
      }

      results.success = results.failed === 0;
      return { success: true, data: results };
    } catch (error) {
      return this.handleError(error, 'createMany', { data, context });
    }
  }

  async updateMany(
    filters: FilterInput, 
    data: UpdateInput, 
    context?: UserContext
  ): Promise<RepositoryResult<BulkOperationResult>> {
    try {
      const whereClause = this.buildWhereClause(filters);
      const updateData = this.buildUpdateData(data, context);
      
      const result = await this.executeQuery<{ count: number }>('updateMany', () =>
        this.getModel().updateMany({
          where: whereClause,
          data: updateData
        })
      );

      // Invalidate related caches
      await this.invalidateCachePattern(this.getCachePattern());

      const bulkResult: BulkOperationResult = {
        success: true,
        processed: result.count,
        failed: 0,
        errors: []
      };

      return { success: true, data: bulkResult };
    } catch (error) {
      return this.handleError(error, 'updateMany', { filters, data, context });
    }
  }

  async deleteMany(filters: FilterInput, context?: UserContext): Promise<RepositoryResult<BulkOperationResult>> {
    try {
      const whereClause = this.buildWhereClause(filters);
      
      const result = await this.executeQuery<{ count: number }>('deleteMany', () =>
        this.getModel().deleteMany({
          where: whereClause
        })
      );

      // Invalidate related caches
      await this.invalidateCachePattern(this.getCachePattern());

      const bulkResult: BulkOperationResult = {
        success: true,
        processed: result.count,
        failed: 0,
        errors: []
      };

      return { success: true, data: bulkResult };
    } catch (error) {
      return this.handleError(error, 'deleteMany', { filters, context });
    }
  }

  // Utility Operations
  async exists(filters: FilterInput): Promise<RepositoryResult<boolean>> {
    try {
      const whereClause = this.buildWhereClause(filters);
      
      const count = await this.executeQuery<number>('exists', () =>
        this.getModel().count({
          where: whereClause
        })
      );

      return { success: true, data: count > 0 };
    } catch (error) {
      return this.handleError(error, 'exists', { filters });
    }
  }

  async count(filters?: FilterInput): Promise<RepositoryResult<number>> {
    try {
      const whereClause = filters ? this.buildWhereClause(filters) : {};
      
      const count = await this.executeQuery<number>('count', () =>
        this.getModel().count({
          where: whereClause
        })
      );

      return { success: true, data: count };
    } catch (error) {
      return this.handleError(error, 'count', { filters });
    }
  }

  // Cache Operations
  async invalidateCache(keys: string[]): Promise<void> {
    try {
      await Promise.allSettled(
        keys.map(key => this.redis.delete(key))
      );
    } catch (error) {
      this.fastify.log.warn(`Failed to invalidate cache keys: ${keys.join(', ')}`, error);
    }
  }

  async refreshCache(id: string): Promise<RepositoryResult<T>> {
    try {
      const cacheKey = this.getCacheKey(id);
      const entity = await this.findById(id);
      
      if (entity.success && entity.data) {
        await this.setCache(cacheKey, entity.data);
      }
      
      return entity;
    } catch (error) {
      return this.handleError(error, 'refreshCache', { id });
    }
  }

  // Protected helper methods
  protected async getFromCache(key: string): Promise<T | null> {
    try {
      const cached = await this.redis.get(key);
      if (cached == null) return null;

      if (typeof cached === 'string') {
        if (cached === '[object Object]') {
          this.fastify.log.warn(`Invalid cache value for key: ${key} -> [object Object]. Invalidating.`);
          await this.invalidateCache([key]);
          return null;
        }
        try {
          return JSON.parse(cached) as T;
        } catch (e) {
          this.fastify.log.warn(`Failed to parse JSON cache for key: ${key}. Invalidating.`, e as any);
          await this.invalidateCache([key]);
          return null;
        }
      }

      return cached as T;
    } catch (error) {
      await this.invalidateCache([key]);
      this.fastify.log.warn(`Cache get failed for key: ${key}`, error);
      return null;
    }
  }

  protected async setCache(key: string, data: T, ttl: number = 3600): Promise<void> {
    try {
      await this.redis.set({ 
        key, 
        value: JSON.stringify(data), 
        ttl 
      });
    } catch (error) {
      this.fastify.log.warn(`Cache set failed for key: ${key}`, error);
    }
  }

  // Get user type from Redis
  async getUserTypeFromCache(userId: string): Promise<string | null> {
    try {
      const userType = await this.redis.get(REDIS_KEYS.USER_TYPE(userId));
      return userType as string | null;
    } catch (error) {
      this.fastify.log.warn(`Failed to get user type from cache for userId: ${userId}`, error);
      return null;
    }
  }

  protected async invalidateCachePattern(pattern: string): Promise<void> {
    try {
      // This would need Redis pattern matching implementation
      this.fastify.log.warn(`Pattern invalidation not implemented for: ${pattern}`);
    } catch (error) {
      this.fastify.log.warn(`Cache pattern invalidation failed: ${pattern}`, error);
    }
  }

  protected async executeQuery<R>(
    operation: string,
    queryFn: () => Promise<R>
  ): Promise<R> {
    try {
      const startTime = Date.now();
      const result = await queryFn();
      const duration = Date.now() - startTime;

      await recordMetric(Metrics.DB_QUERY, 1, [
        `entity:${this.entityName}`,
        `operation:${operation}`,
        `duration:${duration}`
      ]);

      return result;
    } catch (error) {
      await recordMetric(Metrics.DB_ERROR, 1, [
        `entity:${this.entityName}`,
        `operation:${operation}`,
        `error:${error instanceof Error ? error.name : 'unknown'}`
      ]);
      throw error;
    }
  }

  protected buildQueryOptions(options?: QueryOptions): any {
    const queryOptions: any = {};

    if (options?.include) {
      queryOptions.include = options.include;
    }

    if (options?.select) {
      queryOptions.select = options.select;
    }

    if (options?.orderBy) {
      queryOptions.orderBy = options.orderBy;
    }

    return queryOptions;
  }

  protected buildSearchQuery(params: SearchParams): any {
    if (!params.query || !params.fields?.length) {
      return {};
    }

    const searchConditions = params.fields.map(field => ({
      [field]: {
        contains: params.query,
        mode: params.caseSensitive ? 'default' : 'insensitive'
      }
    }));

    return params.exact ? searchConditions[0] : { OR: searchConditions };
  }

  protected async invalidateRelatedCaches(entity: T): Promise<void> {
    // Override in concrete repositories to invalidate related caches
    const cacheKey = this.getCacheKey(entity.id);
    await this.invalidateCache([cacheKey]);
  }

  protected handleError(error: any, operation: string, context: any): RepositoryResult<any> {
    this.fastify.log.error(`Repository error in ${operation}:`, {
      error: error.message,
      stack: error.stack,
      context
    });

    if (error instanceof RepositoryError) {
      return {
        success: false,
        error: error.message,
        metadata: { code: error.code, statusCode: error.statusCode }
      };
    }

    return {
      success: false,
      error: `Unexpected error in ${operation}: ${error.message}`,
      metadata: { originalError: error.name }
    };
  }
}
