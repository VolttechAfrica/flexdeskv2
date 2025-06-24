import fp from 'fastify-plugin'
import { FastifyPluginAsync } from 'fastify'
import fastifySensible from '@fastify/sensible'

const sensible: FastifyPluginAsync = fp(async function (fastify) {
  fastify.register(fastifySensible)
})

export default sensible;
