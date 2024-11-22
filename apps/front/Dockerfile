# Build stage
FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Install turbo and pnpm
RUN pnpm install -g turbo

# Builder Stage
FROM base AS builder
WORKDIR /app

# Define build arguments
ARG VITE_API_WEB_BASE_URL
ARG VITE_CLERK_PUBLISHABLE_KEY
ARG VITE_MAPBOX_ACCESS_TOKEN

# Set them as environment variables
ENV VITE_API_WEB_BASE_URL=$VITE_API_WEB_BASE_URL
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_MAPBOX_ACCESS_TOKEN=$VITE_MAPBOX_ACCESS_TOKEN

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

# Install dependencies
RUN pnpm install

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