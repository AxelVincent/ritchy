/// Application configuration loaded from environment variables
#[derive(Clone)]
pub struct Config {
    /// Port to listen on (default: 3001)
    pub port: u16,
    /// Maximum HTML size in bytes (default: 10MB)
    pub max_html_size_bytes: usize,
    /// Loki host URL for log ingestion (default: http://localhost:3100)
    pub loki_host: Option<String>,
    /// Log level (default: info)
    pub log_level: String,
    /// Environment name (default: development)
    pub environment: String,
    /// API key for authentication (required)
    pub api_key: String,
}

impl Config {
    /// Load configuration from environment variables with sensible defaults
    pub fn from_env() -> Self {
        let port = std::env::var("PORT")
            .unwrap_or_else(|_| "3001".into())
            .parse()
            .expect("PORT must be a valid number");

        let max_html_size_mb: usize = std::env::var("MAX_HTML_SIZE_MB")
            .unwrap_or_else(|_| "10".into())
            .parse()
            .expect("MAX_HTML_SIZE_MB must be a valid number");

        let loki_host = std::env::var("LOKI_HOST").ok();

        let log_level = std::env::var("RUST_LOG").unwrap_or_else(|_| "info".into());

        let environment = std::env::var("NODE_ENV").unwrap_or_else(|_| "development".into());

        let api_key = std::env::var("HTML_SERVICE_API_KEY")
            .expect("HTML_SERVICE_API_KEY environment variable is required");

        Self {
            port,
            max_html_size_bytes: max_html_size_mb * 1024 * 1024,
            loki_host,
            log_level,
            environment,
            api_key,
        }
    }
}
