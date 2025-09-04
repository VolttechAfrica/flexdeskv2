import { FastifyInstance } from "fastify";
import { AuthError, TokenExpiredError } from "../utils/errorhandler.js";
import { HttpStatusCode } from "axios";
import { responseMessage } from "../utils/responseMessage.js";
import { DatabaseMonitor } from "../plugins/monitoring/database.js";
import { CacheMonitor } from "../plugins/monitoring/cache.js";
import prisma from "../model/prismaClient.js";
import RedisService from "./redis.service.js";
import crypto from "crypto";

const TOKEN_TTL = {
    ACCESS: '15m',
    REFRESH: '7d',
    DEFAULT: '15m'
} as const;

const REDIS_KEYS = {
    REFRESH_TOKEN: (id: string) => `refreshToken:${id}`,
    USER_CACHE: (id: string) => `user:${id}`,
    TOKEN_BLACKLIST: (token: string) => `blacklist:${token}`,
    TOKEN_CACHE: (hashedToken: string) => `token:${hashedToken}`,
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

    // =========================
    // Private utility helpers
    // =========================

    private stripBearer(token: string): string {
        return token?.startsWith('Bearer ') ? token.slice(7) : token;
    }

    private cacheKeyForToken(token: string): string {
        return REDIS_KEYS.TOKEN_CACHE(this.hashToken(token));
    }

    private async cacheTokenPayload(cacheKey: string, payload: TokenPayload, ttlSeconds: number = 300): Promise<void> {
        await this.redis.set({
            key: cacheKey,
            value: payload,
            ttl: ttlSeconds,
        });
    }

    private async trackDbOp(name: string, startTime: number): Promise<void> {
        await this.dbMonitor.trackQuery(name, Date.now() - startTime);
    }

    private logAndRethrow(context: string, error: unknown): never {
        this.logger.error(`${context}:`, error as any);
        throw error as any;
    }

    /**
     * Verify and validate JWT token
     */
    private async verifyToken(token: string): Promise<TokenPayload> {
        const startTime = Date.now();
        const tokenWithoutBearer = this.stripBearer(token);
        const cacheKey = this.cacheKeyForToken(tokenWithoutBearer);
        
        try {
            const isBlacklisted = await this.redis.exists(REDIS_KEYS.TOKEN_BLACKLIST(tokenWithoutBearer));
            if (isBlacklisted) {
                throw new AuthError('Token has been revoked', HttpStatusCode.Unauthorized);
            }

            const cachedPayload = await this.redis.get<TokenPayload>(cacheKey);
            if (cachedPayload && this.isTokenValid(cachedPayload)) {
                await this.trackDbOp('verifyToken_cache_hit', startTime);
                return cachedPayload;
            }

            const decoded = await this.app.jwt.verify(tokenWithoutBearer) as TokenPayload;
            
            if (this.isTokenValid(decoded)) {
                await this.cacheTokenPayload(cacheKey, decoded);
            }

            await this.trackDbOp('verifyToken', startTime);
            return decoded;
        } catch (error: any) {
            this.logger.error('Token verification error:', error as any);
            await this.dbMonitor.trackError(error);
            
            if (error?.name === 'TokenExpiredError') {
                throw new TokenExpiredError('Token has expired', HttpStatusCode.Unauthorized);
            }
            throw new AuthError(error?.message || responseMessage.Unauthorized.message, HttpStatusCode.Unauthorized);
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
     * Hash token for cache key generation using crypto
     */
    private hashToken(token: string): string {
        return crypto.createHash('sha256').update(token).digest('hex').substring(0, 16);
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

        await this.redis.set({
            key,
            value: { count: attempts.count + 1, lastAttempt: now },
            ttl: Math.floor(SECURITY_CONFIG.REFRESH_ATTEMPT_WINDOW / 1000)
        });
        return true;
    }

    /**
     * Securely revoke refresh token
     */
    async revokeRefreshToken(id: string): Promise<void> {
        const startTime = Date.now();
        
        try {
            const refreshToken = await this.getRefreshToken(id);
            
            await this.redis.delete(REDIS_KEYS.REFRESH_TOKEN(id));
            
            if (refreshToken) {
                await this.blacklistToken(refreshToken);
            }
            
            await this.trackDbOp('revokeRefreshToken', startTime);
        } catch (error: any) {
            await this.dbMonitor.trackError(error);
            this.logger.error('Token revocation error:', error as any);
            throw new AuthError('Failed to revoke refresh token', HttpStatusCode.InternalServerError);
        }
    }

    /**
     * Force logout - revokes all user tokens and clears cache
     */
    async forceLogout(userId: string): Promise<void> {
        const startTime = Date.now();
        
        try {
            const refreshToken = await this.getRefreshToken(userId);
            
            await Promise.all([
                this.redis.delete(REDIS_KEYS.REFRESH_TOKEN(userId)),
                this.redis.delete(REDIS_KEYS.USER_CACHE(userId))
            ]);
            
            if (refreshToken) {
                await this.blacklistToken(refreshToken);
            }
            
            await this.trackDbOp('forceLogout', startTime);
        } catch (error: any) {
            await this.dbMonitor.trackError(error);
            this.logger.error('Force logout error:', error as any);
            throw new AuthError('Failed to force logout', HttpStatusCode.InternalServerError);
        }
    }

    /**
     * Secure refresh token generation - only generates new access token
     */
    async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
        const startTime = Date.now();
        
        try {
            if (!refreshToken) {
                throw new AuthError('Refresh token is required', HttpStatusCode.BadRequest);
            }
            const refreshTokenWithoutBearer = this.stripBearer(refreshToken);

            const decoded = await this.app.jwt.verify(refreshTokenWithoutBearer) as TokenPayload;
            
            const isAllowed = await this.checkRefreshRateLimit(decoded.id);
            if (!isAllowed) {
                throw new AuthError('Too many refresh attempts. Please try again later.', HttpStatusCode.TooManyRequests);
            }

            const storedRefreshToken = await this.getRefreshToken(decoded.id);
            if (!storedRefreshToken || storedRefreshToken !== refreshTokenWithoutBearer) {
                await this.forceLogout(decoded.id);
                throw new AuthError('Invalid refresh token. User has been logged out.', HttpStatusCode.Unauthorized);
            }

            const newAccessToken = await this.app.jwt.sign(decoded, { expiresIn: TOKEN_TTL.ACCESS });

            await this.blacklistToken(refreshToken);

            await this.trackDbOp('refreshToken', startTime);
            
            return {
                accessToken: `Bearer ${newAccessToken}`
            };
        } catch (error: any) {
            await this.dbMonitor.trackError(error);
            if (error?.name === 'TokenExpiredError') {
                throw new TokenExpiredError('Refresh token has expired', HttpStatusCode.Unauthorized);
            }
            if (error instanceof AuthError || error instanceof TokenExpiredError) {
                throw error;
            }
            this.logger.error('Refresh token error:', error as any);
            throw new AuthError('Failed to refresh token', HttpStatusCode.InternalServerError);
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

    /**
     * Generate login tokens and initialize user cache
     */
    async generateLoginToken(payload: TokenPayload): Promise<TokenPair> {
        const startTime = Date.now();
        
        try {
            const tokens = await this.generateTokenPair(payload);
            
            await this.redis.set({
                key: REDIS_KEYS.REFRESH_TOKEN(payload.id),
                value: this.stripBearer(tokens.refreshToken),
                ttl: 7 * 24 * 60 * 60
            });

            await this.redis.set({
                key: REDIS_KEYS.USER_CACHE(payload.id),
                value: payload.id,
                ttl: 7 * 24 * 60 * 60 
            });

            await this.trackDbOp('generateLoginToken', startTime);
            return tokens;
        } catch (error: any) {
            await this.dbMonitor.trackError(error);
            this.logger.error('Login token generation error:', error as any);
            throw new AuthError('Failed to generate login token', HttpStatusCode.InternalServerError);
        }
    }

    /**
     * Generate single token with custom TTL
     */
    async generateToken(payload: any, ttl: string = TOKEN_TTL.DEFAULT): Promise<string> {
        const startTime = Date.now();
        
        try {
            const token = await this.app.jwt.sign(payload, { expiresIn: ttl });
            await this.trackDbOp('generateToken', startTime);
            return token;
        } catch (error: any) {
            await this.dbMonitor.trackError(error);
            this.logger.error('Token generation error:', error as any);
            throw new AuthError('Unable to generate token', HttpStatusCode.InternalServerError);
        }
    }

    /**
     * Authorize user with token validation
     */
    async authorizeUser(token: string): Promise<AuthResponse> {
        const startTime = Date.now();
        
        try {
            if (!token) {
                throw new AuthError('Missing authorization token', HttpStatusCode.Unauthorized);
            }

            const { id: decodedId, email, userType, schoolId, role } = await this.verifyToken(token);

            const cachedUserId = await this.redis.get<string>(REDIS_KEYS.USER_CACHE(decodedId));
            if (!cachedUserId) {
                throw new AuthError('User session expired', HttpStatusCode.Unauthorized);
            }

            if (decodedId !== cachedUserId) {
                throw new AuthError('Invalid user session', HttpStatusCode.Unauthorized);
            }

            await this.trackDbOp('authorizeUser', startTime);
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
            this.logger.error('Authorization error:', error as any);
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
            const tokenWithoutBearer = this.stripBearer(token);
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
            const decoded = await this.app.jwt.verify(this.stripBearer(refreshToken)) as TokenPayload;
            const storedRefreshToken = await this.getRefreshToken(decoded.id);
            return storedRefreshToken === this.stripBearer(refreshToken);
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
     * Blacklist a token to prevent reuse
     */
    async blacklistToken(token: string): Promise<void> {
        try {
            await this.redis.set({
                key: REDIS_KEYS.TOKEN_BLACKLIST(this.stripBearer(token)),
                value: 'revoked',
                ttl: 24 * 60 * 60 // 24 hours
            });
        } catch (error: any) {
            this.logger.error('Token blacklist error:', error as any);
            throw new AuthError('Failed to blacklist token', HttpStatusCode.InternalServerError);
        }
    }

    /**
     * Check if a token is blacklisted
     */
    async isTokenBlacklisted(token: string): Promise<boolean> {
        try {
            return await this.redis.exists(REDIS_KEYS.TOKEN_BLACKLIST(this.stripBearer(token)));
        } catch (error: any) {
            this.logger.error('Token blacklist check error:', error as any);
            return false; // Fail safe - assume not blacklisted if check fails
        }
    }

    /**
     * Revoke access token by blacklisting it
     */
    async revokeAccessToken(token: string): Promise<void> {
        try {
            await this.blacklistToken(token);
            this.logger.info('Access token blacklisted successfully');
        } catch (error: any) {
            this.logger.error('Access token revocation error:', error as any);
            throw new AuthError('Failed to revoke access token', HttpStatusCode.InternalServerError);
        }
    }

    /**
     * Revoke both access and refresh tokens
     */
    async revokeAllTokens(userId: string, accessToken?: string): Promise<void> {
        const startTime = Date.now();
        
        try {
            if (accessToken) {
                await this.revokeAccessToken(accessToken);
            }
            
            await this.revokeRefreshToken(userId);
            
            await this.redis.delete(REDIS_KEYS.USER_CACHE(userId));
            
            await this.trackDbOp('revokeAllTokens', startTime);
        } catch (error: any) {
            await this.dbMonitor.trackError(error);
            this.logger.error('Token revocation error:', error as any);
            throw new AuthError('Failed to revoke all tokens', HttpStatusCode.InternalServerError);
        }
    }

}

export default AuthorizationService;
