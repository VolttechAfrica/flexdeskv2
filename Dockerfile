ARG NODE_VERSION=20-slim

FROM node:${NODE_VERSION} AS base

LABEL org.opencontainers.image.source=https://github.com/flexdesk/flexdesk-backend
LABEL org.opencontainers.image.description="Flexdesk Backend"
LABEL org.opencontainers.image.licenses=MIT

WORKDIR /usr/src/app

# Development stage
FROM base AS development
RUN npm cache clean --force
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci --include=dev --loglevel verbose

COPY . .

RUN npx prisma generate
ENV NODE_ENV=development
USER node

CMD ["npm", "run", "dev"]



# Production stage
FROM base AS production

RUN npm cache clean --force
RUN apt-get update -y && apt-get install -y openssl
# Install all dependencies (including dev) for build
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --include=dev --loglevel verbose

COPY . .

RUN npx prisma generate --no-engine
RUN npm run build

# Remove dev dependencies after build
RUN npm prune --production
RUN npm cache clean --force
ENV NODE_ENV=production
USER node

CMD ["sh", "-c", "npx prisma migrate deploy && npm start"] 