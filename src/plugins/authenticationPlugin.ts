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
  refreshToken?: string;
}

interface JwtPayload {
  id: string;
  email: string;
  userType: string;
  schoolId: string;
  role: string;
  [key: string]: any;
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
      const refreshToken = request.headers['x-refresh-token'] as string;

      if (!token || !token.startsWith('Bearer ')) {
        throw new UserError(
          HttpStatusCode.Unauthorized, 
          'Missing or invalid authorization token'
        );
      }

      const authorizationService = new AuthorizationService(fastify);
      
      try {
        // First attempt: verify the main token
        const { status, email, userType, schoolId, role, token: userToken, id: userId } = await authorizationService.authorizeUser(token);
        
        if (status) {
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
          return;
        }
      } catch (error: any) {
        // If main token is expired and we have a refresh token, try to refresh
        if (error?.name === 'TokenExpiredError' && refreshToken) {
          try {
            const newToken = await authorizationService.refreshToken(refreshToken);
            
            reply.header('x-new-access-token', newToken.accessToken);
            
            const decoded = await authorizationService.authorizeUser(newToken.accessToken);
            
            if (decoded.status) {
              const authenticatedUser: AuthenticatedUser = {
                id: decoded.id || '',
                email: decoded.email || '',
                userType: decoded.userType || '',
                schoolId: decoded.schoolId || '',
                role: decoded.role || '',
                roleId: decoded.role || '',
                permissions: [],
                token: newToken.accessToken,
                refreshToken: refreshToken
              };

              request.user = authenticatedUser;
              return;
            }
          } catch (refreshError: any) {
            fastify.log.error('Token refresh failed:', refreshError);
            throw new TokenExpiredError(
              HttpStatusCode.Unauthorized,
              'Both access and refresh tokens are invalid. Please login again.'
            );
          }
        }
        throw error;
      }

      throw new TokenExpiredError(
        HttpStatusCode.Unauthorized, 
        'Token expired or invalid, please login again'
      );

    } catch (error) {
      fastify.log.error('Authentication failed:', error);
      throw error;
    }
  });

  // signToken decorator
  fastify.decorate('signToken', function (
    payload: JwtPayload,
    options?: { expiresIn?: string | number }
  ): string {
    return fastify.jwt.sign(payload, {
      expiresIn: options?.expiresIn || jwtExpire,
    });
  });

  // generating login tokens
  fastify.decorate('generateLoginTokens', async function (
    payload: JwtPayload
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const authorizationService = new AuthorizationService(fastify);
    return await authorizationService.generateLoginToken(payload);
  });

  //  checking token expiration
  fastify.decorate('isTokenExpired', async function (
    token: string
  ): Promise<boolean> {
    const authorizationService = new AuthorizationService(fastify);
    return await authorizationService.isTokenExpired(token);
  });

  // revoking tokens
  fastify.decorate('revokeTokens', async function (
    userId: string
  ): Promise<void> {
    const authorizationService = new AuthorizationService(fastify);
    await authorizationService.forceLogout(userId);
  });
}); 