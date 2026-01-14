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
ARG VITE_RITCHY_INTERNAL_BASE_URL
ARG VITE_RITCHY_API_BASE_URL
ARG VITE_WS_BASE_URL
ARG VITE_CLERK_PUBLISHABLE_KEY
ARG VITE_MAPBOX_ACCESS_TOKEN
ARG VITE_STRIPE_PUBLIC_KEY
ARG SENTRY_AUTH_TOKEN
ARG VITE_POSTHOG_KEY
ARG VITE_POSTHOG_HOST


# Set them as environment variables
ENV VITE_RITCHY_INTERNAL_BASE_URL=$VITE_RITCHY_INTERNAL_BASE_URL
ENV VITE_RITCHY_API_BASE_URL=$VITE_RITCHY_API_BASE_URL
ENV VITE_WS_BASE_URL=$VITE_WS_BASE_URL
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_MAPBOX_ACCESS_TOKEN=$VITE_MAPBOX_ACCESS_TOKEN
ENV VITE_STRIPE_PUBLIC_KEY=$VITE_STRIPE_PUBLIC_KEY
ENV SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN
ENV VITE_POSTHOG_KEY=$VITE_POSTHOG_KEY
ENV VITE_POSTHOG_HOST=$VITE_POSTHOG_HOST

COPY --from=builder /app/out/full/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml

# Install dependencies and build the project
# Modified to use --no-frozen-lockfile to address the lockfile mismatch
RUN pnpm install --no-frozen-lockfile && pnpm -v && node -v

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