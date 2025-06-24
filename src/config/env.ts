import dotenv from 'dotenv';

dotenv.config();

const env = {
  port: parseInt(process.env.PORT || '8000', 10),
  env: process.env.NODE_ENV || 'development',
  db: {
    connectionString:
      process.env.NODE_ENV === 'production'
        ? process.env.DB_CONNECTION_STRING_PROD
        : process.env.DB_CONNECTION_STRING_DEV
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expire: process.env.JWT_EXPIRATION

  },

  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD,
    username: process.env.REDIS_USER,
    tlsEnabled: true
  },
  email: {
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
  },
  datadog: {
    apiKey: process.env.DD_API_KEY,
    appKey: process.env.DD_APP_KEY,
    host: process.env.DD_AGENT_HOST || 'localhost',
    port: parseInt(process.env.DD_AGENT_PORT || '8125'),
  }

};

export default env;