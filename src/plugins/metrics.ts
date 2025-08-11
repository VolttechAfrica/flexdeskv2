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
    // Safety check: ensure metrics exist before accessing
    if (!request.metrics || typeof request.metrics.startTime !== 'number') {
      return; // Skip metrics recording if metrics are not available
    }
    
    const duration = Date.now() - request.metrics.startTime;
    
    // Record request metrics (fire and forget)
    recordMetric(Metrics.API_REQUEST, 1, [
      `method:${request.method}`,
      `path:${request.routeOptions.url}`,
      `status:${reply.statusCode}`,
    ]).catch(() => {}); // Ignore errors

    // Record response time (fire and forget)
    recordMetric('api.response_time', duration, [
      `method:${request.method}`,
      `path:${request.routeOptions.url}`,
    ]).catch(() => {}); // Ignore errors

    // Record error metrics if status code indicates an error (fire and forget)
    if (reply.statusCode >= 400) {
      recordMetric(Metrics.API_ERROR, 1, [
        `method:${request.method}`,
        `path:${request.routeOptions.url}`,
        `status:${reply.statusCode}`,
      ]).catch(() => {}); // Ignore errors
    }
  });
};

export default fp(metricsPlugin, {
  name: 'metrics-plugin',
}); 