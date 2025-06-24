import 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    redis: {
      set: (key: string, ttl: number, value: string) => Promise<'OK'>;
      get: (key: string) => Promise<string | null>;
      del: (key: string) => Promise<number>;
      exists: (key: string) => Promise<number>;
      expire: (key: string, ttl: number) => Promise<number>;
      keys: (pattern: string) => Promise<string[]>;
      flushall: () => Promise<'OK'>;
      flushdb: () => Promise<'OK'>;
    };
  }
}