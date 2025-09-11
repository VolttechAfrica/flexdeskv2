
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface QueryOptions {
  include?: Record<string, boolean>;
  select?: Record<string, boolean>;
  orderBy?: Record<string, 'asc' | 'desc'> | Record<string, 'asc' | 'desc'>[];
  where?: Record<string, any>;
}

export interface CacheOptions {
  ttl?: number;
  key?: string;
  invalidatePattern?: string[];
}

export interface RepositoryResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, any>;
}

export type UserType = 'staff' | 'parent' | 'student';

export interface UserContext {
  userId: string;
  userType: UserType;
  schoolId: string;
  roleId: string;
}

export interface AuditFields {
  createdBy?: string;
  updatedBy?: string;
  deletedBy?: string;
  deletedAt?: Date;
}

export interface SoftDeleteEntity extends BaseEntity, AuditFields {
  deleted: boolean;
}

export interface SearchParams {
  query?: string;
  fields?: string[];
  exact?: boolean;
  caseSensitive?: boolean;
}

export interface FilterParams {
  [key: string]: any;
}

export interface SortParams {
  field: string;
  direction: 'asc' | 'desc';
}

export interface BulkOperationResult {
  success: boolean;
  processed: number;
  failed: number;
  errors: Array<{
    index: number;
    error: string;
    data?: any;
  }>;
}
