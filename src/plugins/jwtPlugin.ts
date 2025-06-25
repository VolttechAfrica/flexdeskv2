import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import { FastifyReply, FastifyRequest } from 'fastify';
import env from '../config/env.js';
import { AuthError, UserError } from '../utils/errorhandler.js';
import { HttpStatusCode } from 'axios';
import AuthorizationService from "../services/authorization.service.js";
import RedisService from "../services/redis.service.js";
import { TokenExpiredError } from '../utils/errorhandler.js';

export default fp(async (fastify) => {
  const jwtSecret = env.jwt.secret;
  const jwtExpire = env.jwt.expire;

  if (!jwtSecret) {
    throw new AuthError(HttpStatusCode.InternalServerError, 'The System is not configured properly');
  }

  fastify.register(fastifyJwt, {
    secret: jwtSecret,
    sign: { expiresIn: jwtExpire },
  });

  fastify.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      // await request.jwtVerify();
      const token = request.headers.authorization;
      let userId = (request.body as any)?.userId;
      if(!userId) userId = (request.query as any)?.userId;

      if (!token || !token.startsWith('Bearer ') || !userId) {
          throw new UserError(HttpStatusCode.Unauthorized, 'Unauthorized request, token not found or invalid');
      }
      const authorizationService = new AuthorizationService(fastify);
      const redis = new RedisService(fastify);

      
      const roleId = await redis.get(`ROLE:${userId}`);
      if(!roleId || typeof roleId !== 'string') throw new UserError(HttpStatusCode.Unauthorized, 'Unauthorized request, invalid user');
      
      const userContext = await authorizationService.authorizeUser(token, userId, roleId);
      if(!userContext.status) throw new TokenExpiredError(HttpStatusCode.Unauthorized, 'Unauthorized request, please login again');
      
      const permissions = await redis.getInstance(`PERMISSION:${userId}`)||[];
  
      request.user = {
        token: userContext?.token || '',
        id: userId,
        roleId: roleId as string,
        permissions: Array.isArray(permissions) ? permissions : [],
      } 

    } catch (err: any) {
      reply.status(HttpStatusCode.Unauthorized).send({ message: err?.message || 'Unauthorized', error: err.name });
    }
  });

  fastify.decorate('signToken', function (
    payload: { id: string; role?: string; value?: string },
    options?: { expiresIn?: string | number }
  ): string {
    return fastify.jwt.sign(payload, {
      expiresIn: options?.expiresIn || jwtExpire,
    });
  });
});
