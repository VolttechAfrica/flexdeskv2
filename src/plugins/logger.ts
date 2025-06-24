import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';

export default fp(async (fastify: FastifyInstance) => {
  fastify.log.info('Logger plugin registered');
});
