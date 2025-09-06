ARG NODE_VERSION=20-slim

FROM node:${NODE_VERSION} AS base

LABEL org.opencontainers.image.source=https://github.com/flexdesk/flexdesk-backend
LABEL org.opencontainers.image.description="Flexdesk Backend"
LABEL org.opencontainers.image.licenses=MIT

# Create app directory and user
WORKDIR /usr/src/app
RUN groupadd -r nodeuser && useradd -r -g nodeuser nodeuser

# Install system dependencies
RUN apt-get update && apt-get install -y \
    openssl \
    curl \
    dumb-init \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Development stage
FROM base AS development
RUN npm cache clean --force
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci --include=dev --loglevel verbose

COPY --chown=nodeuser:nodeuser . .

RUN npx prisma generate
ENV NODE_ENV=development
USER nodeuser

CMD ["dumb-init", "npm", "run", "dev"]

# Production stage
FROM base AS production

# Install only production dependencies
RUN npm cache clean --force
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci --include=dev --loglevel verbose

# Copy source code and generate Prisma client
COPY --chown=nodeuser:nodeuser . .

# Generate Prisma client and build the application
RUN npx prisma generate
RUN npm run build

# Clean up
RUN npm cache clean --force
RUN rm -rf /tmp/* /var/tmp/*

# Set production environment
ENV NODE_ENV=production
USER nodeuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/api/v2/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
