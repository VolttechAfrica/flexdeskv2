import { FastifyRequest, FastifyReply } from "fastify";
import { HttpStatusCode } from "axios";

// Base error class with proper error handling
export abstract class BaseError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly timestamp: string;
  public readonly requestId?: string;

  constructor(
    message: string,
    statusCode: number | string | any = 500,
    isOperational: boolean = true,
    requestId?: string
  ) {
    super(message);
    
    this.name = this.constructor.name;
    this.statusCode = typeof statusCode === 'string' ? parseInt(statusCode) : (typeof statusCode === 'number' ? statusCode : Number(statusCode));
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    this.requestId = requestId;
    
    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

// Authentication related errors
export class AuthError extends BaseError {
  constructor(message: string, statusCode: number | string | any = 401, requestId?: string) {
    super(message, statusCode, true, requestId);
    this.name = "AuthError";
  }
}

export class TokenExpiredError extends BaseError {
  constructor(message: string, statusCode: number | string | any = 401, requestId?: string) {
    super(message, statusCode, true, requestId);
    this.name = "TokenExpiredError";
  }
}

export class InsufficientPermissionsError extends BaseError {
  constructor(message: string, statusCode: number | string | any = 403, requestId?: string) {
    super(message, statusCode, true, requestId);
    this.name = "InsufficientPermissionsError";
  }
}

// User related errors
export class UserError extends BaseError {
  constructor(message: string, statusCode: number | string | any = 400, requestId?: string) {
    super(message, statusCode, true, requestId);
    this.name = "UserError";
  }
}

export class UserNotFoundError extends BaseError {
  constructor(message: string, statusCode: number | string | any = 404, requestId?: string) {
    super(message, statusCode, true, requestId);
    this.name = "UserNotFoundError";
  }
}

export class UserActivityError extends BaseError {
  constructor(message: string, statusCode: number | string | any = 400, requestId?: string) {
    super(message, statusCode, true, requestId);
    this.name = "UserActivityError";
  }
}

// Validation errors
export class ValidationError extends BaseError {
  public readonly field?: string;
  public readonly value?: any;

  constructor(
    message: string,
    field?: string,
    value?: any,
    statusCode: number | string | any = 400,
    requestId?: string
  ) {
    super(message, statusCode, true, requestId);
    this.name = "ValidationError";
    this.field = field;
    this.value = value;
  }
}

// Database related errors
export class DatabaseError extends BaseError {
  constructor(message: string, statusCode: number | string | any = 500, requestId?: string) {
    super(message, statusCode, false, requestId);
    this.name = "DatabaseError";
  }
}

export class DuplicateEntryError extends BaseError {
  constructor(message: string, statusCode: number | string | any = 409, requestId?: string) {
    super(message, statusCode, true, requestId);
    this.name = "DuplicateEntryError";
  }
}

// External service errors
export class ExternalServiceError extends BaseError {
  public readonly service: string;

  constructor(
    message: string,
    service: string,
    statusCode: number | string | any = 502,
    requestId?: string
  ) {
    super(message, statusCode, false, requestId);
    this.name = "ExternalServiceError";
    this.service = service;
  }
}

// Rate limiting errors
export class RateLimitError extends BaseError {
  public readonly retryAfter?: number;

  constructor(
    message: string,
    retryAfter?: number,
    statusCode: number | string | any = 429,
    requestId?: string
  ) {
    super(message, statusCode, true, requestId);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

// Configuration errors
export class ConfigurationError extends BaseError {
  constructor(message: string, statusCode: number | string | any = 500, requestId?: string) {
    super(message, statusCode, false, requestId);
    this.name = "ConfigurationError";
  }
}

// Error response interface
interface ErrorResponse {
  success: false;
  error: {
    name: string;
    message: string;
    statusCode: number;
    timestamp: string;
    requestId?: string;
    field?: string;
    service?: string;
    retryAfter?: number;
  };
  stack?: string;
}

// Error handler function
export function handleError(
  error: Error,
  request?: FastifyRequest,
  reply?: FastifyReply
): ErrorResponse {
  const requestId = request?.id || 'unknown';
  
  // Handle known error types
  if (error instanceof BaseError) {
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        name: error.name,
        message: error.message,
        statusCode: error.statusCode,
        timestamp: error.timestamp,
        requestId: error.requestId || requestId,
        ...(error instanceof ValidationError && { field: error.field }),
        ...(error instanceof ExternalServiceError && { service: error.service }),
        ...(error instanceof RateLimitError && { retryAfter: error.retryAfter })
      }
    };

    // Add stack trace in development
    if (process.env.NODE_ENV === 'development') {
      errorResponse.stack = error.stack;
    }

    return errorResponse;
  }

  // Handle unknown errors
  const unknownError: ErrorResponse = {
    success: false,
    error: {
      name: 'InternalServerError',
      message: process.env.NODE_ENV === 'production' 
        ? 'An unexpected error occurred' 
        : error.message,
      statusCode: 500,
      timestamp: new Date().toISOString(),
      requestId
    }
  };

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    unknownError.stack = error.stack;
  }

  return unknownError;
}

// Async error wrapper
export function asyncHandler<T extends any[], R>(
  fn: (...args: T) => Promise<R>
) {
  return (...args: T): Promise<R> => {
    return fn(...args).catch((error) => {
      throw error;
    });
  };
}

// Error logging helper
export function logError(error: Error, context?: Record<string, any>): void {
  const errorInfo = {
    name: error.name,
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    ...context
  };

  if (error instanceof BaseError) {
    console.error('Operational Error:', errorInfo);
  } else {
    console.error('Programmer Error:', errorInfo);
  }
}
