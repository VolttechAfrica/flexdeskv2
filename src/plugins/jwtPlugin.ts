import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import { FastifyReply, FastifyRequest } from 'fastify';
import env from '../config/env.js';
import { AuthError, UserError, TokenExpiredError } from '../utils/errorhandler.js';
import { HttpStatusCode } from 'axios';
import AuthorizationService from "../services/authorization.service.js";

interface AuthenticatedUser {
  id: string;
  email: string;
  userType: string;
  schoolId: string;
  role: string;
  roleId: string;
  permissions: string[];
  token: string;
}

interface JwtPayload {
  id: string;
  role?: string;
  value?: string;
}

export default fp(async (fastify) => {
  const { jwt: { secret: jwtSecret, expire: jwtExpire } } = env;

  if (!jwtSecret) {
    throw new AuthError(
      HttpStatusCode.InternalServerError, 
      'JWT secret is not configured'
    );
  }

  fastify.register(fastifyJwt, {
    secret: jwtSecret,
    sign: { expiresIn: jwtExpire },
  });

  fastify.decorate('authenticate', async function (
    request: FastifyRequest, 
    reply: FastifyReply
  ): Promise<void> {
    try {
      const token = request.headers.authorization;

      if (!token || !token.startsWith('Bearer ')) {
        throw new UserError(
          HttpStatusCode.Unauthorized, 
          'Missing or invalid authorization token'
        );
      }

      const authorizationService = new AuthorizationService(fastify);
      const { status, email, userType, schoolId, role, token: userToken, id: userId } = await authorizationService.authorizeUser(token);
      
      if (!status) {
        throw new TokenExpiredError(
          HttpStatusCode.Unauthorized, 
          'Token expired or invalid, please login again'
        );
      }

      const authenticatedUser: AuthenticatedUser = {
        id: userId || '',
        email: email || '',
        userType: userType || '',
        schoolId: schoolId || '',
        role: role || '',
        roleId: role || '',
        permissions: [],
        token: userToken || ''
      };

      request.user = authenticatedUser;

    } catch (error) {
      fastify.log.error('Authentication failed:', error);
      throw error;
    }
  });

  fastify.decorate('signToken', function (
    payload: JwtPayload,
    options?: { expiresIn?: string | number }
  ): string {
    return fastify.jwt.sign(payload, {
      expiresIn: options?.expiresIn || jwtExpire,
    });
  });
});
