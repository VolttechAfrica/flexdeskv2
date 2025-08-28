import { FastifyInstance } from "fastify";
import { AuthError, TokenExpiredError } from "../utils/errorhandler.js";
import { HttpStatusCode } from "axios";
import { responseMessage } from "../utils/responseMessage.js";
import { DatabaseMonitor } from "../plugins/monitoring/database.js";
import { CacheMonitor } from "../plugins/monitoring/cache.js";
import prisma from "../model/prismaClient.js";
import RedisService from "./redis.service.js";


const TOKEN_TTL = {
    ACCESS: '15m',
    REFRESH: '7d',
    DEFAULT: '15m'
} as const;

const REDIS_KEYS = {
    REFRESH_TOKEN: (id: string) => `refreshToken:${id}`,
    USER_CACHE: (id: string) => `user:${id}`,
    TOKEN_BLACKLIST: (token: string) => `blacklist:${token}`
} as const;

const SECURITY_CONFIG = {
    MAX_REFRESH_ATTEMPTS: 3,
    REFRESH_ATTEMPT_WINDOW: 5 * 60 * 1000, // 5 minutes
} as const;

interface TokenPayload {
    id: string;
    email: string;
    userType: string;
    schoolId: string;
    role: string;
    iat?: number;
    exp?: number;
    [key: string]: any;
}

interface AuthResponse {
    id?: string;
    status: boolean;
    token?: string;
    email?: string;
    userType?: string;
    schoolId?: string;
    role?: string;
    error?: string;
}

interface TokenPair {
    accessToken: string;
    refreshToken: string;
}

interface RefreshAttempt {
    count: number;
    lastAttempt: number;
}

class AuthorizationService {
    private readonly app: FastifyInstance;
    private readonly dbMonitor: DatabaseMonitor;
    private readonly cacheMonitor: CacheMonitor;
    private readonly redis: RedisService;
    private readonly logger: FastifyInstance['log'];

    constructor(app: FastifyInstance) {
        this.app = app;
        this.dbMonitor = new DatabaseMonitor(prisma);
        this.cacheMonitor = new CacheMonitor(app);
        this.redis = new RedisService(app);
        this.logger = app.log;
    }

 
    private async verifyToken(token: string): Promise<TokenPayload> {
        const startTime = Date.now();
        const cacheKey = `token:${this.hashToken(token)}`;
        
        try {
            // Check blacklist first
            const isBlacklisted = await this.redis.exists(REDIS_KEYS.TOKEN_BLACKLIST(token));
            if (isBlacklisted) {
                throw new AuthError(HttpStatusCode.Unauthorized, 'Token has been revoked');
            }

            // Check cache for valid tokens
            const cachedPayload = await this.redis.get<TokenPayload>(cacheKey);
            if (cachedPayload && this.isTokenValid(cachedPayload)) {
                await this.dbMonitor.trackQuery('verifyToken_cache_hit', Date.now() - startTime);
                return cachedPayload;
            }

            const tokenWithoutBearer = token.replace('Bearer ', '');
            const decoded = await this.app.jwt.verify(tokenWithoutBearer) as TokenPayload;
            
            // Cache valid token for performance
            if (this.isTokenValid(decoded)) {
                await this.redis.set({
                    key: cacheKey,
                    value: decoded,
                    ttl: 300 // 5 minutes cache
                });
            }

            await this.dbMonitor.trackQuery('verifyToken', Date.now() - startTime);
            return decoded;
        } catch (error: any) {
            console.log(error);
            await this.dbMonitor.trackError(error);
            if (error?.name === 'TokenExpiredError') {
                throw new TokenExpiredError(HttpStatusCode.Unauthorized, 'Token has expired');
            }
            throw new AuthError(HttpStatusCode.Unauthorized, error?.message || responseMessage.Unauthorized.message);
        }
    }

    /**
     * Check if token is still valid (not expired)
     */
    private isTokenValid(payload: TokenPayload): boolean {
        if (!payload.exp) return false;
        const now = Math.floor(Date.now() / 1000);
        return payload.exp > now;
    }

    /**
     * Hash token for cache key generation
     */
    private hashToken(token: string): string {
        // Simple hash for cache key - in production, consider using crypto.createHash
        return Buffer.from(token).toString('base64').substring(0, 16);
    }

    /**
     * Rate limiting for refresh attempts
     */
    private async checkRefreshRateLimit(id: string): Promise<boolean> {
        const key = `refresh_attempts:${id}`;
        const attempts = await this.redis.get<RefreshAttempt>(key);
        
        if (!attempts) {
            await this.redis.set({
                key,
                value: { count: 1, lastAttempt: Date.now() },
                ttl: Math.floor(SECURITY_CONFIG.REFRESH_ATTEMPT_WINDOW / 1000)
            });
            return true;
        }

        const now = Date.now();
        if (now - attempts.lastAttempt > SECURITY_CONFIG.REFRESH_ATTEMPT_WINDOW) {
            // Reset counter if window has passed
            await this.redis.set({
                key,
                value: { count: 1, lastAttempt: now },
                ttl: Math.floor(SECURITY_CONFIG.REFRESH_ATTEMPT_WINDOW / 1000)
            });
            return true;
        }

        if (attempts.count >= SECURITY_CONFIG.MAX_REFRESH_ATTEMPTS) {
            return false;
        }

        // Increment counter
        await this.redis.set({
            key,
            value: { count: attempts.count + 1, lastAttempt: now },
            ttl: Math.floor(SECURITY_CONFIG.REFRESH_ATTEMPT_WINDOW / 1000)
        });
        return true;
    }

    /**
     * Secure refresh token generation - only generates new access token
     */
    async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
        const startTime = Date.now();
        
        try {
            if (!refreshToken) {
                throw new AuthError(HttpStatusCode.BadRequest, 'Refresh token is required');
            }

            // Verify the refresh token
            const decoded = await this.app.jwt.verify(refreshToken) as TokenPayload;
            
            // Check rate limiting
            const isAllowed = await this.checkRefreshRateLimit(decoded.id);
            if (!isAllowed) {
                throw new AuthError(HttpStatusCode.TooManyRequests, 'Too many refresh attempts. Please try again later.');
            }

            // Validate against Redis storage
            const storedRefreshToken = await this.getRefreshToken(decoded.id);
            if (!storedRefreshToken || storedRefreshToken !== refreshToken) {
                // Force logout user if refresh token is invalid
                await this.forceLogout(decoded.id);
                throw new AuthError(HttpStatusCode.Unauthorized, 'Invalid refresh token. User has been logged out.');
            }

            // Generate only new access token (refresh token remains the same)
            const newAccessToken = await this.app.jwt.sign(decoded, { expiresIn: TOKEN_TTL.ACCESS });

            await this.dbMonitor.trackQuery('refreshToken', Date.now() - startTime);
            
            return {
                accessToken: `Bearer ${newAccessToken}`
            };
        } catch (error: any) {
            await this.dbMonitor.trackError(error);
            if (error?.name === 'TokenExpiredError') {
                throw new TokenExpiredError(HttpStatusCode.Unauthorized, 'Refresh token has expired');
            }
            if (error instanceof AuthError || error instanceof TokenExpiredError) {
                throw error;
            }
            this.logger.error('Refresh token error:', error);
            throw new AuthError(HttpStatusCode.InternalServerError, 'Failed to refresh token');
        }
    }

    /**
     * Generate both access and refresh tokens
     */
    private async generateTokenPair(payload: TokenPayload): Promise<TokenPair> {
        const [accessToken, refreshToken] = await Promise.all([
            this.app.jwt.sign(payload, { expiresIn: TOKEN_TTL.ACCESS }),
            this.app.jwt.sign(payload, { expiresIn: TOKEN_TTL.REFRESH })
        ]);

        return {
            accessToken: `Bearer ${accessToken}`,
            refreshToken: `Bearer ${refreshToken}`
        };
    }

   
    async generateLoginToken(payload: TokenPayload): Promise<TokenPair> {
        const startTime = Date.now();
        
        try {
            const tokens = await this.generateTokenPair(payload);
            
            await this.redis.set({
                key: REDIS_KEYS.REFRESH_TOKEN(payload.id),
                value: tokens.refreshToken,
                ttl: 7 * 24 * 60 * 60
            });

            await this.dbMonitor.trackQuery('generateLoginToken', Date.now() - startTime);
            return tokens;
        } catch (error: any) {
            await this.dbMonitor.trackError(error);
            this.logger.error('Login token generation error:', error);
            throw new AuthError(HttpStatusCode.InternalServerError, 'Failed to generate login token');
        }
    }

    async generateToken(payload: TokenPayload, ttl: string = TOKEN_TTL.DEFAULT): Promise<string> {
        const startTime = Date.now();
        
        try {
            const token = await this.app.jwt.sign(payload, { expiresIn: ttl });
            await this.dbMonitor.trackQuery('generateToken', Date.now() - startTime);
            return `Bearer ${token}`;
        } catch (error: any) {
            await this.dbMonitor.trackError(error);
            this.logger.error('Token generation error:', error);
            throw new AuthError(HttpStatusCode.InternalServerError, 'Unable to generate token');
        }
    }

 
    async authorizeUser(token: string): Promise<AuthResponse> {
        const startTime = Date.now();
        
        try {
            if (!token) {
                throw new AuthError(HttpStatusCode.Unauthorized, 'Missing authorization token');
            }

            const { id: decodedId, email, userType, schoolId, role } = await this.verifyToken(token);

            // Check user cache for performance
            const cachedUserId = await this.redis.get<string>(REDIS_KEYS.USER_CACHE(decodedId));
            if (!cachedUserId) {
                throw new AuthError(HttpStatusCode.Unauthorized, 'User session expired');
            }

            if (decodedId !== cachedUserId) {
                throw new AuthError(HttpStatusCode.Unauthorized, 'Invalid user session');
            }

            await this.dbMonitor.trackQuery('authorizeUser', Date.now() - startTime);
            return { 
                status: true, 
                token, 
                email, 
                userType, 
                schoolId, 
                role, 
                id: decodedId 
            };
        } catch (error: any) {
            await this.dbMonitor.trackError(error);
            this.logger.error('Authorization error:', error);
            return { 
                status: false, 
                token: '', 
                error: error.message || 'Authorization failed'
            };
        }
    }

    /**
     * Check token expiration status
     */
    async isTokenExpired(token: string): Promise<boolean> {
        try {
            const tokenWithoutBearer = token.replace('Bearer ', '');
            await this.app.jwt.verify(tokenWithoutBearer);
            return false;
        } catch (error: any) {
            return error?.name === 'TokenExpiredError';
        }
    }

    /**
     * Validate refresh token against storage
     */
    async validateRefreshToken(refreshToken: string): Promise<boolean> {
        try {
            const decoded = await this.app.jwt.verify(refreshToken) as TokenPayload;
            const storedRefreshToken = await this.getRefreshToken(decoded.id);
            return storedRefreshToken === refreshToken;
        } catch (error: any) {
            return false;
        }
    }

    /**
     * Get refresh token from Redis
     */
    private async getRefreshToken(id: string): Promise<string> {
        const refreshToken = await this.redis.get<string>(REDIS_KEYS.REFRESH_TOKEN(id));
        return refreshToken || '';
    }

    /**
     * Securely revoke refresh token
     */
    async revokeRefreshToken(id: string): Promise<void> {
        const startTime = Date.now();
        
        try {
            await this.redis.delete(REDIS_KEYS.REFRESH_TOKEN(id));
            await this.dbMonitor.trackQuery('revokeRefreshToken', Date.now() - startTime);
        } catch (error: any) {
            await this.dbMonitor.trackError(error);
            this.logger.error('Token revocation error:', error);
            throw new AuthError(HttpStatusCode.InternalServerError, 'Failed to revoke refresh token');
        }
    }

    /**
     * Force logout - revokes all user tokens
     */
    async forceLogout(userId: string): Promise<void> {
        const startTime = Date.now();
        
        try {
            await Promise.all([
                this.redis.delete(REDIS_KEYS.REFRESH_TOKEN(userId)),
                this.redis.delete(REDIS_KEYS.USER_CACHE(userId))
            ]);
            
            await this.dbMonitor.trackQuery('forceLogout', Date.now() - startTime);
        } catch (error: any) {
            await this.dbMonitor.trackError(error);
            this.logger.error('Force logout error:', error);
            throw new AuthError(HttpStatusCode.InternalServerError, 'Failed to force logout');
        }
    }
}

export default AuthorizationService;
