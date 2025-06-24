import fp from 'fastify-plugin'
import fastifyBcrypt from "fastify-bcrypt";
import { FastifyPluginAsync } from "fastify";

const bcryptPlugin: FastifyPluginAsync = fp(async (fastify) => {
  fastify.log.info("Bcrypt plugin registered");
  fastify.register(fastifyBcrypt, {
    saltWorkFactor: 12,
  });
});

export default bcryptPlugin;

