import tracer from 'dd-trace';

// Initialize tracer
tracer.init({
  service: 'flexdesk-backend',
  env: process.env.NODE_ENV || 'development',
  version: process.env.npm_package_version || '1.0.0',
  logInjection: true,
  tags: {
    'service.name': 'flexdesk-backend',
    'env': process.env.NODE_ENV || 'development'
  }
});

export { tracer }; 