export class AuthError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = "AuthError";
  }
}

export class UserActivityError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = "UserActivityError";
  }
}

export class UserError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = "UserError";
  }
}

export class TokenExpiredError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = "TokenExpiredError";
  }
}