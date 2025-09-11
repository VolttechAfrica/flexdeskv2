import { FastifyPluginAsync } from "fastify";
import prisma from "../model/prismaClient.js";
import fp from 'fastify-plugin';
import { PrismaClient } from '@prisma/client';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  } 
}

const prismaPlugin: FastifyPluginAsync = fp(async (fastify) => {
  fastify.decorate('prisma', prisma);
  fastify.addHook('onClose', async (instance) => {
    await instance.prisma.$disconnect();
    fastify.log.info('Prisma connection closed');
  });

  fastify.log.info('Prisma plugin registered successfully');
}, {
  name: 'prisma'
});

export default prismaPlugin;
