import fastify from "fastify";

declare module 'fastify' {
    interface FastifyInstance {
        authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
        handleRefreshToken: (request: FastifyRequest<{ Body: { refreshToken: string } }>, reply: FastifyReply) => Promise<{ accessToken: string; refreshToken: string }>;
        generateLoginTokens: (payload: any) => Promise<{ accessToken: string; refreshToken: string }>;
        isTokenExpired: (token: string) => Promise<boolean>;
        revokeTokens: (userId: string) => Promise<void>;
    }

    interface FastifyRequest {
        user: {
            id: string;
            email: string;
            userType?: string;
            schoolId?: string;
            role?: string;
            roleId?: string;
            permissions?: string[];
            token?: string;
            refreshToken?: string;
        };
    }
}