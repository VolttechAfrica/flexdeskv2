import { FastifyInstance } from "fastify";
import { AuthError, TokenExpiredError } from "../utils/errorhandler.js";
import { HttpStatusCode } from "axios";
import { responseMessage } from "../utils/responseMessage.js";
import { DatabaseMonitor } from "../plugins/monitoring/database.js";
import { CacheMonitor } from "../plugins/monitoring/cache.js";
import prisma from "../model/prismaClient.js";
import RedisService from "./redis.service.js";

interface TokenPayload {
    id: string;
    email: string;
    userType: string;
    schoolId: string;
    role: string;
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

class AuthorizationService {
    private readonly app: FastifyInstance;
    private readonly dbMonitor: DatabaseMonitor;
    private readonly cacheMonitor: CacheMonitor;
    private readonly LOGIN_TOKEN_TTL = '30m';
    private readonly DEFAULT_TOKEN_TTL = '15m';
    private readonly REFRESH_TOKEN_TTL = '7d';
    private readonly redis: RedisService;

    constructor(app: FastifyInstance) {
        this.app = app;
        this.dbMonitor = new DatabaseMonitor(prisma);
        this.cacheMonitor = new CacheMonitor(app);
        this.redis = new RedisService(app);
    }

    private async verifyToken(token: string): Promise<TokenPayload> {
        const startTime = Date.now();
        try {
            const tokenWithoutBearer = token.replace('Bearer ', '');
            const decoded = await this.app.jwt.verify(tokenWithoutBearer);
            await this.dbMonitor.trackQuery('verifyToken', Date.now() - startTime);
            return decoded as TokenPayload;
        } catch (error: any) {
            await this.dbMonitor.trackError(error);
            if (error?.name === 'TokenExpiredError') {
                throw new TokenExpiredError(HttpStatusCode.Unauthorized, error?.message);
            }
            throw new AuthError(HttpStatusCode.Unauthorized, error?.message || responseMessage.Unauthorized.message);
        }
    }

    async isTokenExpired(token: string): Promise<boolean> {
        try {
            const tokenWithoutBearer = token.replace('Bearer ', '');
            await this.app.jwt.verify(tokenWithoutBearer);
            return false; // Token is valid
        } catch (error: any) {
            return error?.name === 'TokenExpiredError';
        }
    }

    async validateRefreshToken(refreshToken: string): Promise<boolean> {
        try {
            const decoded = await this.app.jwt.verify(refreshToken) as TokenPayload;
            const storedRefreshToken = await this.getRefreshToken(decoded.id);
            return storedRefreshToken === refreshToken;
        } catch (error: any) {
            return false;
        }
    }

    private async getRefreshToken(id: string): Promise<string> {
        const refreshToken = await this.redis.get(`refreshToken:${id}`);
        return refreshToken as string;
    }

    async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
        const startTime = Date.now();
        try {
            if (!refreshToken) {
                throw new AuthError(HttpStatusCode.BadRequest, 'Refresh token is required');
            }

            // Verify the refresh token
            const decoded = await this.app.jwt.verify(refreshToken) as TokenPayload;
            
            // Check if refresh token exists in Redis
            const storedRefreshToken = await this.getRefreshToken(decoded.id);
            if (!storedRefreshToken || storedRefreshToken !== refreshToken) {
                throw new AuthError(HttpStatusCode.Unauthorized, 'Invalid refresh token');
            }

            // Generate new tokens
            const newAccessToken = await this.app.jwt.sign(decoded, { expiresIn: this.LOGIN_TOKEN_TTL });
            const newRefreshToken = await this.app.jwt.sign(decoded, { expiresIn: this.REFRESH_TOKEN_TTL });

            // Update refresh token in Redis
            await this.redis.set({
                key: `refreshToken:${decoded.id}`, 
                value: newRefreshToken, 
                ttl: 7 * 24 * 60 * 60
            });

            await this.dbMonitor.trackQuery('refreshToken', Date.now() - startTime);
            
            return {
                accessToken: `Bearer ${newAccessToken}`,
                refreshToken: newRefreshToken
            };
        } catch (error: any) {
            await this.dbMonitor.trackError(error);
            if (error?.name === 'TokenExpiredError') {
                throw new TokenExpiredError(HttpStatusCode.Unauthorized, 'Refresh token has expired');
            }
            if (error instanceof AuthError || error instanceof TokenExpiredError) {
                throw error;
            }
            throw new AuthError(HttpStatusCode.InternalServerError, 'Failed to refresh token');
        }
    }

    async revokeRefreshToken(id: string): Promise<void> {
        const startTime = Date.now();
        try {
            await this.redis.delete(`refreshToken:${id}`);
            await this.dbMonitor.trackQuery('revokeRefreshToken', Date.now() - startTime);
        } catch (error: any) {
            await this.dbMonitor.trackError(error);
            throw new AuthError(HttpStatusCode.InternalServerError, 'Failed to revoke refresh token');
        }
    }

    async generateLoginToken(payload: TokenPayload): Promise<{ accessToken: string; refreshToken: string }> {
        const startTime = Date.now();
        try {
            const accessToken = await this.app.jwt.sign(payload, { expiresIn: this.LOGIN_TOKEN_TTL });
            const refreshToken = await this.app.jwt.sign(payload, { expiresIn: this.REFRESH_TOKEN_TTL });
            await this.redis.set({key: `refreshToken:${payload.id}`, value: refreshToken, ttl: 7 * 24 * 60 * 60});
            await this.dbMonitor.trackQuery('generateLoginToken', Date.now() - startTime);
            return {
                accessToken: `Bearer ${accessToken}`,
                refreshToken: refreshToken
            };
        } catch (error: any) {
            await this.dbMonitor.trackError(error);
            throw new AuthError(HttpStatusCode.InternalServerError, error?.message || 'Failed to generate login token');
        }
    }

    async generateToken(payload: TokenPayload, ttl: string = this.DEFAULT_TOKEN_TTL): Promise<string> {
        const startTime = Date.now();
        try {
            const token = await this.app.jwt.sign(payload, { expiresIn: ttl });
            await this.dbMonitor.trackQuery('generateToken', Date.now() - startTime);
            return `Bearer ${token}`;
        } catch (error: any) {
            await this.dbMonitor.trackError(error);
            throw new AuthError(HttpStatusCode.InternalServerError, error?.message || 'Unable to generate token');
        }
    }

    async authorizeUser(token: string): Promise<AuthResponse> {
        const startTime = Date.now();
        try {
            if(!token) throw new AuthError(HttpStatusCode.Unauthorized, 'Missing parameters, please login again'); 

            const {id: decodedId, email, userType, schoolId, role} = await this.verifyToken(token.replace('Bearer ', ''));

            const id = await this.redis.get(`user:${decodedId}`);
            if(!id) throw new AuthError(HttpStatusCode.Unauthorized, 'Unauthorized access');
            
            if (decodedId !== id) {
                throw new AuthError(HttpStatusCode.Unauthorized, 'Unauthorized access');
            }

            await this.dbMonitor.trackQuery('authorizeUser', Date.now() - startTime);
            return { status: true, token, email, userType, schoolId, role, id: decodedId };
        } catch (error: any) {
            console.log(error);
            await this.dbMonitor.trackError(error); 
            return { 
                status: false, 
                token: '', 
                error: error.message || 'Authorization failed'
            };
        }
    }
}

export default AuthorizationService;
