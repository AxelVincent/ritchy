use axum::{
    middleware,
    routing::{get, post},
    Router,
};
use std::net::SocketAddr;
use tower_http::{
    cors::{Any, CorsLayer},
    limit::RequestBodyLimitLayer,
    trace::TraceLayer,
};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use url::Url;

mod config;
mod error;
mod models;
mod processing;
mod routes;

#[path = "middleware/mod.rs"]
mod app_middleware;

/// Initialize tracing with JSON format and optional Loki integration
/// Mirrors the Node.js pino-loki setup with the same labels
fn init_tracing(config: &config::Config) {
    let env_filter = tracing_subscriber::EnvFilter::new(&config.log_level);
    let json_layer = tracing_subscriber::fmt::layer().json();

    // If LOKI_HOST is configured, add Loki layer
    if let Some(loki_host) = &config.loki_host {
        match Url::parse(loki_host) {
            Ok(loki_url) => {
                // Build Loki layer with labels matching the Node.js pino-loki config
                let (loki_layer, task) = tracing_loki::builder()
                    .label("job", "tracing")
                    .unwrap()
                    .label("service", "ritchy-html-service")
                    .unwrap()
                    .label("environment", &config.environment)
                    .unwrap()
                    .build_url(loki_url)
                    .expect("Failed to build Loki layer");

                tracing_subscriber::registry()
                    .with(env_filter)
                    .with(json_layer)
                    .with(loki_layer)
                    .init();

                // Spawn the background task that sends logs to Loki
                tokio::spawn(task);

                tracing::info!(loki_host = loki_host, "Loki logging enabled");

                return;
            }
            Err(e) => {
                // Fall back to JSON-only logging if Loki URL is invalid
                tracing_subscriber::registry()
                    .with(env_filter)
                    .with(json_layer)
                    .init();

                tracing::warn!(
                    loki_host = loki_host,
                    error = %e,
                    "Invalid LOKI_HOST URL, falling back to console logging"
                );

                return;
            }
        }
    }

    // No Loki configured, use JSON-only logging
    tracing_subscriber::registry()
        .with(env_filter)
        .with(json_layer)
        .init();
}

#[tokio::main]
async fn main() {
    // Load .env file if present (silently ignore if not found)
    let _ = dotenvy::dotenv();

    // Log early startup before config parsing (in case config fails)
    eprintln!(
        "[html-service] Starting up... PORT={:?}, HTML_SERVICE_API_KEY={}",
        std::env::var("PORT").ok(),
        if std::env::var("HTML_SERVICE_API_KEY").is_ok() {
            "set"
        } else {
            "NOT SET"
        }
    );

    let config = config::Config::from_env();

    eprintln!(
        "[html-service] Config loaded successfully. port={}, environment={}",
        config.port, config.environment
    );

    // Initialize tracing with JSON format and optional Loki integration
    init_tracing(&config);

    // Configure CORS for development
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // Build protected routes (require API key)
    let protected_routes = Router::new()
        .route("/process", post(routes::process::process_html))
        .route_layer(middleware::from_fn_with_state(
            config.clone(),
            app_middleware::auth::require_api_key,
        ));

    // Build router with all routes
    let app = Router::new()
        // Health check is public (for load balancers)
        .route("/health", get(routes::health::health_check))
        // Merge protected routes
        .merge(protected_routes)
        .layer(TraceLayer::new_for_http())
        .layer(cors)
        // Limit request body to configured max size (default 10MB)
        .layer(RequestBodyLimitLayer::new(config.max_html_size_bytes));

    // Bind to IPv6 [::] which also accepts IPv4 connections on dual-stack systems
    // Railway internal networking uses IPv6, so we must listen on IPv6
    let addr: SocketAddr = format!("[::]:{}", config.port)
        .parse()
        .expect("Failed to parse socket address");
    tracing::info!(
        port = config.port,
        max_html_size_mb = config.max_html_size_bytes / 1024 / 1024,
        loki_enabled = config.loki_host.is_some(),
        environment = %config.environment,
        "Starting Ritchy HTML Service"
    );

    eprintln!("[html-service] Binding to {}...", addr);

    let listener = match tokio::net::TcpListener::bind(addr).await {
        Ok(l) => {
            eprintln!("[html-service] Successfully bound to {}", addr);
            tracing::info!(address = %addr, "Server listening");
            l
        }
        Err(e) => {
            eprintln!("[html-service] Failed to bind to {}: {}", addr, e);
            tracing::error!(address = %addr, error = %e, "Failed to bind");
            panic!("Failed to bind to {}: {}", addr, e);
        }
    };

    eprintln!("[html-service] Starting to accept connections...");
    axum::serve(listener, app).await.unwrap();
}
