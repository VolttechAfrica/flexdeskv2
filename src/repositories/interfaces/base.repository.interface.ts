/**
 * Base repository interface defining common operations
 * Following Repository Pattern and Clean Architecture principles
 */

import { 
  BaseEntity, 
  PaginationParams, 
  PaginationResult, 
  QueryOptions, 
  RepositoryResult,
  UserContext,
  SearchParams,
  FilterParams,
  SortParams,
  BulkOperationResult
} from '../types/common.types.js';

export interface IBaseRepository<T extends BaseEntity, CreateInput, UpdateInput, FilterInput = FilterParams> {
  // CRUD Operations
  findById(id: string, options?: QueryOptions): Promise<RepositoryResult<T>>;
  findMany(filters?: FilterInput, options?: QueryOptions): Promise<RepositoryResult<T[]>>;
  findFirst(filters: FilterInput, options?: QueryOptions): Promise<RepositoryResult<T | null>>;
  create(data: CreateInput, context?: UserContext): Promise<RepositoryResult<T>>;
  update(id: string, data: UpdateInput, context?: UserContext): Promise<RepositoryResult<T>>;
  delete(id: string, context?: UserContext): Promise<RepositoryResult<boolean>>;
  softDelete(id: string, context?: UserContext): Promise<RepositoryResult<boolean>>;

  // Pagination
  findManyPaginated(
    filters?: FilterInput, 
    pagination?: PaginationParams, 
    options?: QueryOptions
  ): Promise<RepositoryResult<PaginationResult<T>>>;

  // Search
  search(params: SearchParams, options?: QueryOptions): Promise<RepositoryResult<T[]>>;

  // Bulk Operations
  createMany(data: CreateInput[], context?: UserContext): Promise<RepositoryResult<BulkOperationResult>>;
  updateMany(filters: FilterInput, data: UpdateInput, context?: UserContext): Promise<RepositoryResult<BulkOperationResult>>;
  deleteMany(filters: FilterInput, context?: UserContext): Promise<RepositoryResult<BulkOperationResult>>;

  // Utility Operations
  exists(filters: FilterInput): Promise<RepositoryResult<boolean>>;
  count(filters?: FilterInput): Promise<RepositoryResult<number>>;
  
  // Cache Operations
  invalidateCache(keys: string[]): Promise<void>;
  refreshCache(id: string): Promise<RepositoryResult<T>>;
}

export interface IRepositoryFactory<T> {
  create(fastify: any): T;
}

export interface ICacheableRepository<T> {
  getFromCache(key: string): Promise<T | null>;
  setCache(key: string, data: T, ttl?: number): Promise<void>;
  invalidateCachePattern(pattern: string): Promise<void>;
}

export interface IAuditableRepository<T> {
  getAuditLog(id: string): Promise<RepositoryResult<any[]>>;
  trackChanges(entity: T, changes: Partial<T>, context: UserContext): Promise<void>;
}

export interface ISearchableRepository<T> {
  buildSearchQuery(params: SearchParams): any;
  executeSearch(query: any, options?: QueryOptions): Promise<RepositoryResult<T[]>>;
}

export interface IValidatableRepository<T> {
  validateCreate(data: any): Promise<RepositoryResult<boolean>>;
  validateUpdate(data: any, existing: T): Promise<RepositoryResult<boolean>>;
  validateDelete(entity: T, context: UserContext): Promise<RepositoryResult<boolean>>;
}
