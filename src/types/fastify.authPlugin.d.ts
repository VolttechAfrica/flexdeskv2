import fastify from "fastify";

declare module 'fastify' {
    interface FastifyInstance {
        authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    }

    interface FastifyRequest {
        user: {
            id: string;
            roleId: string;
            permissions: string[];
            token: string;
        };
    }
}