import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import { recordMetric, Metrics } from '../config/monitoring.js';

declare module 'fastify' {
  interface FastifyRequest {
    metrics: {
      startTime: number;
    };
  }
}

const metricsPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', async (request, reply) => {
    request.metrics = {
      startTime: Date.now(),
    };
  });

  fastify.addHook('onResponse', async (request, reply) => {
    const duration = Date.now() - request.metrics.startTime;
    
    // Record request metrics
    await recordMetric(Metrics.API_REQUEST, 1, [
      `method:${request.method}`,
      `path:${request.routeOptions.url}`,
      `status:${reply.statusCode}`,
    ]);

    // Record response time
    await recordMetric('api.response_time', duration, [
      `method:${request.method}`,
      `path:${request.routeOptions.url}`,
    ]);
  });

  fastify.addHook('onError', async (request, reply, error) => {
    await recordMetric(Metrics.API_ERROR, 1, [
      `method:${request.method}`,
      `path:${request.routeOptions.url}`,
      `error:${error.name}`,
    ]);
  });
};

export default fp(metricsPlugin, {
  name: 'metrics-plugin',
}); 