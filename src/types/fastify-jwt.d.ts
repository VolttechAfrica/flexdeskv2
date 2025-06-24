import '@fastify/jwt';
import { User } from './user.js';
import { FastifyBcryptPlugin } from 'fastify-bcrypt';
import { FastifyInstance } from 'fastify';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { id: string; value?: string; role?: string }; // For .sign()
    user: {
        id: String;
        roleId: String;
        permissions: String[];
        token: String;
    }; 
    IsAuthorized: boolean;
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    bcrypt: FastifyBcryptPlugin;
  }
}
