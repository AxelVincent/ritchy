use axum::{
    body::Body,
    extract::State,
    http::{header, Request, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
    Json,
};

use crate::config::Config;
use crate::error::{ErrorDetails, ErrorResponse};

/// Extract API key from Authorization header
/// Supports both "Bearer <token>" and raw token formats
fn extract_api_key(auth_header: Option<&str>) -> Option<&str> {
    auth_header.map(|h| h.strip_prefix("Bearer ").unwrap_or(h))
}

/// Authentication middleware that validates API key from Authorization header
pub async fn require_api_key(
    State(config): State<Config>,
    request: Request<Body>,
    next: Next,
) -> Response {
    let auth_header = request
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok());

    let api_key = extract_api_key(auth_header);

    match api_key {
        Some(key) if key == config.api_key => next.run(request).await,
        Some(_) => {
            tracing::warn!("Invalid API key provided");
            unauthorized_response("Invalid API key")
        }
        None => {
            tracing::warn!("Missing Authorization header");
            unauthorized_response("Missing Authorization header")
        }
    }
}

fn unauthorized_response(message: &str) -> Response {
    let body = Json(ErrorResponse {
        success: false,
        error: ErrorDetails {
            code: "UNAUTHORIZED".to_string(),
            message: message.to_string(),
            details: None,
        },
    });

    (StatusCode::UNAUTHORIZED, body).into_response()
}
