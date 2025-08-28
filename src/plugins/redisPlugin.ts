import { FastifyPluginAsync } from "fastify";
import fastifyRedis from "@fastify/redis";
import Redis from "ioredis";
import env from "../config/env.js";
import fp from 'fastify-plugin'



const redisClient = new Redis({
  host: env.redis.host,
  port: Number(env.redis.port),
  password: env.redis.password,
  username: env.redis.username,
});


const redisPlugin: FastifyPluginAsync = fp(async (fastify) => {
 
  redisClient.on("error", (err) => {
    fastify.log.error("❌ Redis connection error:", err as any);
  });
    redisClient.on("connect", () => {
        fastify.log.info("🔌 Redis connected");
    });

  await fastify.register(fastifyRedis, {
    client: redisClient,
  });

  fastify.decorate('redisClient', redisClient);

  fastify.addHook("onClose", async () => {
    fastify.log.info("🔌 Closing Redis connection...");
    await redisClient.quit();
  });
});

export default redisPlugin;