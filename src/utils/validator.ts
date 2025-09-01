import { FastifyRequest } from "fastify";

// Email validation with comprehensive checks
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  return emailRegex.test(email) && 
         email.length >= 5 && 
         email.length <= 254 &&
         !email.includes('..') &&
         !email.startsWith('.') &&
         !email.endsWith('.');
}

// Password validation with security requirements
export function validatePassword(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!password || typeof password !== 'string') {
    errors.push('Password is required');
    return { isValid: false, errors };
  }
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (password.length > 128) {
    errors.push('Password must be less than 128 characters');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  // Check for common weak patterns
  const commonPasswords = ['password', '123456', 'qwerty', 'abc123', 'password123'];
  if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
    errors.push('Password contains common patterns and is not secure');
  }
  
  return { isValid: errors.length === 0, errors };
}

// Phone number validation
export function validatePhoneNumber(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;
  
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Check if it's a valid length (7-15 digits)
  return cleaned.length >= 7 && cleaned.length <= 15;
}

// Name validation
export function validateName(name: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!name || typeof name !== 'string') {
    errors.push('Name is required');
    return { isValid: false, errors };
  }
  
  const trimmed = name.trim();
  
  if (trimmed.length < 2) {
    errors.push('Name must be at least 2 characters long');
  }
  
  if (trimmed.length > 50) {
    errors.push('Name must be less than 50 characters');
  }
  
  // Check for valid characters (letters, spaces, hyphens, apostrophes)
  if (!/^[a-zA-Z\s\-']+$/.test(trimmed)) {
    errors.push('Name can only contain letters, spaces, hyphens, and apostrophes');
  }
  
  return { isValid: errors.length === 0, errors };
}

// Input sanitization
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .substring(0, 1000); // Limit length
}

// SQL injection prevention
export function sanitizeForSQL(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .replace(/['"]/g, '') // Remove quotes
    .replace(/;/g, '') // Remove semicolons
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove block comment start
    .replace(/\*\//g, '') // Remove block comment end
    .replace(/xp_/gi, '') // Remove extended procedures
    .replace(/sp_/gi, '') // Remove stored procedures
    .trim();
}

// Request validation helper
export function validateRequest<T>(request: FastifyRequest, requiredFields: (keyof T)[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const body = request.body as T;
  
  if (!body) {
    errors.push('Request body is required');
    return { isValid: false, errors };
  }
  
  for (const field of requiredFields) {
    if (!body[field] || (typeof body[field] === 'string' && (body[field] as string).trim() === '')) {
      errors.push(`${String(field)} is required`);
    }
  }
  
  return { isValid: errors.length === 0, errors };
}

// Rate limiting helper
export function isRateLimited(attempts: number, maxAttempts: number, windowMs: number, lastAttempt: number): boolean {
  const now = Date.now();
  
  // Reset if window has passed
  if (now - lastAttempt > windowMs) {
    return false;
  }
  
  return attempts >= maxAttempts;
}

// UUID validation
export function validateUUID(uuid: string): boolean {
  if (!uuid || typeof uuid !== 'string') return false;
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// URL validation
export function validateURL(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
