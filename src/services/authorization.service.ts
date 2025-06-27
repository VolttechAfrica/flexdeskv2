import { FastifyInstance } from "fastify";
import { AuthError, TokenExpiredError } from "../utils/errorhandler.js";
import { HttpStatusCode } from "axios";
import { responseMessage } from "../utils/responseMessage.js";
import RedisService from "./redis.service.js";
import { DatabaseMonitor } from "../plugins/monitoring/database.js";
import { CacheMonitor } from "../plugins/monitoring/cache.js";
import prisma from "../model/prismaClient.js";

interface TokenPayload {
    id: string;
    role: string;
    [key: string]: any;
}

interface AuthResponse {
    status: boolean;
    token?: string;
    error?: string;
}

class AuthorizationService {
    private readonly app: FastifyInstance;
    private readonly redis: RedisService;
    private readonly dbMonitor: DatabaseMonitor;
    private readonly cacheMonitor: CacheMonitor;
    private readonly LOGIN_TOKEN_TTL = '30m';
    private readonly REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 days in seconds
    private readonly DEFAULT_TOKEN_TTL = '15m';

    constructor(app: FastifyInstance) {
        this.app = app;
        this.redis = new RedisService(app);
        this.dbMonitor = new DatabaseMonitor(prisma);
        this.cacheMonitor = new CacheMonitor(app);
    }

    private async verifyToken(token: string): Promise<TokenPayload> {
        const startTime = Date.now();
        try {
            const decoded = await this.app.jwt.verify(token);
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

    private async saveRefreshToken(token: string, ttl: number, key: string): Promise<void> {
        const startTime = Date.now();
        try {
            await this.redis.set({ key, value: token, ttl });
            await this.cacheMonitor.trackHit(key);
        } catch (error) {
            await this.cacheMonitor.trackError(error as Error);
            throw new AuthError(HttpStatusCode.InternalServerError, 'Failed to save refresh token');
        } finally {
            await this.cacheMonitor.trackMiss(key);
        }
    }

    async generateLoginToken(payload: TokenPayload): Promise<string> {
        const startTime = Date.now();
        try {
            const [token, refreshToken] = await Promise.all([
                this.app.jwt.sign(payload, { expiresIn: this.LOGIN_TOKEN_TTL }),
                this.app.jwt.sign(payload, { expiresIn: `${this.REFRESH_TOKEN_TTL}s` }),
            ]);

            const key = `REFRESHTOKEN:${payload.id}`;
            await this.saveRefreshToken(refreshToken, this.REFRESH_TOKEN_TTL, key);

            await this.dbMonitor.trackQuery('generateLoginToken', Date.now() - startTime);
            return `Bearer ${token}`;
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

    async authorizeUser(token: string, id: string, role: string): Promise<AuthResponse> {
        const startTime = Date.now();
        try {
            if(!token || !id || !role) throw new AuthError(HttpStatusCode.Unauthorized, 'Missing parameters'); 
            const decoded = await this.verifyToken(token.replace('Bearer ', ''));
            
            if (decoded.id !== id || decoded.role !== role.toString()) {
                throw new AuthError(HttpStatusCode.Unauthorized, 'Unauthorized access');
            }

            await this.dbMonitor.trackQuery('authorizeUser', Date.now() - startTime);
            return { status: true, token };
        } catch (error: any) {
            console.log(error);
            await this.dbMonitor.trackError(error);
            
            if (error instanceof TokenExpiredError) {
                return await this.handleRefreshToken(id, role);
            }
            
            return { 
                status: false, 
                token: '', 
                error: error.message || 'Authorization failed'
            };
        }
    }

    private async handleRefreshToken(id: string, role: string): Promise<AuthResponse> {
        const startTime = Date.now();
        try {
            const refreshToken = await this.redis.get(`REFRESHTOKEN:${id}`);
            
            if (!refreshToken) {
                throw new AuthError(HttpStatusCode.Unauthorized, 'Please login again');
            }

            const decoded = await this.verifyToken(refreshToken as string);
            
            if (decoded.id !== id || decoded.role !== role) {
                throw new AuthError(HttpStatusCode.Unauthorized, 'Invalid refresh token');
            }

            const newToken = await this.generateToken({ id, role }, this.LOGIN_TOKEN_TTL);
            await this.dbMonitor.trackQuery('handleRefreshToken', Date.now() - startTime);
            
            return { status: true, token: newToken };
        } catch (error: any) {
            await this.dbMonitor.trackError(error);
            return { 
                status: false, 
                token: '', 
                error: error.message || 'Token refresh failed'
            };
        }
    }
}

export default AuthorizationService;
