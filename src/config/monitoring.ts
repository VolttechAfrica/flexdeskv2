import tracer from "dd-trace";
import StatsD from "hot-shots";
import env from "./env.js";

// Initialize Datadog tracer
tracer.init({
  service: 'flexdesk-backend',
  env: env.env,
  logInjection: true,
});

// Initialize StatsD client
const statsd = new StatsD({
  host: env.datadog.host,
  port: env.datadog.port,
  prefix: 'flexdesk.',
  errorHandler: (error) => {
    console.error('StatsD error:', error);
  }
});

// Custom metrics helper
export const recordMetric = async (
  name: string,
  value: number,
  tags: string[] = []
) => {
  try {
    // Use setImmediate to ensure this doesn't block the main thread
    setImmediate(() => {
      statsd.gauge(name, value, tags);
    });
  } catch (error) {
    // Silently fail - don't let metrics interfere with the main application
    console.error('Failed to submit metric:', error);
  }
};

// Common metrics
export const Metrics = {
  API_REQUEST: 'api.request',
  API_ERROR: 'api.error',
  DB_QUERY: 'db.query',
  DB_ERROR: 'db.error',
  CACHE_HIT: 'cache.hit',
  CACHE_MISS: 'cache.miss',
  AUTH_SUCCESS: 'auth.success',
  AUTH_FAILURE: 'auth.failure',
};

export default tracer; 