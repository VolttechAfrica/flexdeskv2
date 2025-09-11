
export class RepositoryError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    code: string = 'REPOSITORY_ERROR',
    statusCode: number = 500,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = 'RepositoryError';
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
  }
}

export class EntityNotFoundError extends RepositoryError {
  constructor(entity: string, identifier: string | Record<string, any>) {
    const identifierStr = typeof identifier === 'string' 
      ? identifier 
      : JSON.stringify(identifier);
    
    super(
      `${entity} not found with identifier: ${identifierStr}`,
      'ENTITY_NOT_FOUND',
      404,
      { entity, identifier }
    );
  }
}

export class DuplicateEntityError extends RepositoryError {
  constructor(entity: string, field: string, value: string) {
    super(
      `${entity} already exists with ${field}: ${value}`,
      'DUPLICATE_ENTITY',
      409,
      { entity, field, value }
    );
  }
}

export class ValidationError extends RepositoryError {
  constructor(message: string, field?: string, value?: any) {
    super(
      `Validation failed: ${message}`,
      'VALIDATION_ERROR',
      400,
      { field, value }
    );
  }
}

export class DatabaseConnectionError extends RepositoryError {
  constructor(operation: string, originalError?: Error) {
    super(
      `Database connection failed during ${operation}`,
      'DATABASE_CONNECTION_ERROR',
      503,
      { operation, originalError: originalError?.message }
    );
  }
}

export class TransactionError extends RepositoryError {
  constructor(operation: string, originalError?: Error) {
    super(
      `Transaction failed during ${operation}`,
      'TRANSACTION_ERROR',
      500,
      { operation, originalError: originalError?.message }
    );
  }
}

export class CacheError extends RepositoryError {
  constructor(operation: string, key?: string, originalError?: Error) {
    super(
      `Cache operation failed: ${operation}`,
      'CACHE_ERROR',
      500,
      { operation, key, originalError: originalError?.message }
    );
  }
}

export class PermissionError extends RepositoryError {
  constructor(userId: string, operation: string, resource: string) {
    super(
      `User ${userId} does not have permission to ${operation} ${resource}`,
      'PERMISSION_ERROR',
      403,
      { userId, operation, resource }
    );
  }
}

export class ConcurrencyError extends RepositoryError {
  constructor(entity: string, identifier: string) {
    super(
      `Concurrent modification detected for ${entity}: ${identifier}`,
      'CONCURRENCY_ERROR',
      409,
      { entity, identifier }
    );
  }
}
