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

  // Rate limiting metrics
  RATE_LIMIT_ATTEMPT: 'rate_limit.attempt',
  RATE_LIMIT_BLOCKED: 'rate_limit.blocked',
  RATE_LIMIT_RESPONSE_TIME: 'rate_limit.response_time',
  RATE_LIMIT_WINDOW_SIZE: 'rate_limit.window_size',
  RATE_LIMIT_MAX_REQUESTS: 'rate_limit.max_requests',
};

export default tracer; 