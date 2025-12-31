# Build stage
FROM rust:1.83-slim as builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy manifest
COPY Cargo.toml ./

# Copy source code
COPY src ./src

# Build the application (generates Cargo.lock)
RUN cargo build --release

# Runtime stage - minimal image
FROM debian:bookworm-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the binary from builder
COPY --from=builder /app/target/release/ritchy-html-service /app/

# Set environment variables
ENV PORT=3001
ENV RUST_LOG=info
ENV MAX_HTML_SIZE_MB=10
# LOKI_HOST is optional - set it to enable Grafana Loki logging
# Example: ENV LOKI_HOST=http://loki:3100
ENV NODE_ENV=production

# Expose the service port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Run the service
CMD ["./ritchy-html-service"]
