# Build stage
FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"


# Install turbo and pnpm
RUN npm install -g pnpm@9.7.1 turbo

# Builder Stage
FROM base AS builder
WORKDIR /app

# Copy source code
COPY . .

# Prune the workspace
RUN turbo prune front --docker

# Installer Stage    
FROM base AS installer
WORKDIR /app

# Define build arguments again
ARG VITE_API_WEB_BASE_URL
ARG VITE_CLERK_PUBLISHABLE_KEY
ARG VITE_MAPBOX_ACCESS_TOKEN

# Set them as environment variables
ENV VITE_API_WEB_BASE_URL=$VITE_API_WEB_BASE_URL
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_MAPBOX_ACCESS_TOKEN=$VITE_MAPBOX_ACCESS_TOKEN

COPY --from=builder /app/out/full/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml

# Install dependencies and verify versions
RUN pnpm install && pnpm -v && node -v

# Build the project
RUN pnpm turbo build --filter=front...

# Production image
FROM caddy:2-alpine AS runner
WORKDIR /app

# Copy Caddy configuration
COPY apps/front/Caddyfile /etc/caddy/Caddyfile

# Copy the built project
COPY --from=installer /app/apps/front/dist /app/dist


# Expose port
EXPOSE 80

# Start Caddy
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile"]