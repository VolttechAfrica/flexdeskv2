import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'info', emit: 'event' },
    { level: 'warn', emit: 'event' },
    { level: 'error', emit: 'event' },
  ],
});

// Connection health check and slow query monitoring
prisma.$on('query', (e) => {
  if (e.duration > 2000) {
    console.warn(`Slow query detected: ${e.duration}ms - ${e.query}`);
  }
});

// Error monitoring
prisma.$on('error', (e) => {
  console.error('Prisma error:', e);
});

export default prisma;
