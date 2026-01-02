use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::Serialize;
use thiserror::Error;

/// Application-level errors
#[derive(Error, Debug)]
#[allow(dead_code)]
pub enum AppError {
    #[error("HTML processing failed: {0}")]
    ProcessingError(String),

    #[error("Invalid URL: {0}")]
    InvalidUrl(String),

    #[error("HTML too large: {size} bytes exceeds {limit} byte limit")]
    HtmlTooLarge { size: usize, limit: usize },

    #[error("Invalid request: {0}")]
    InvalidRequest(String),

    #[error("Unauthorized: {0}")]
    Unauthorized(String),
}

/// Error response body
#[derive(Serialize)]
pub struct ErrorResponse {
    pub success: bool,
    pub error: ErrorDetails,
}

#[derive(Serialize)]
pub struct ErrorDetails {
    pub code: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<serde_json::Value>,
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, code, message, details) = match &self {
            AppError::ProcessingError(msg) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "PROCESSING_ERROR",
                msg.clone(),
                None,
            ),
            AppError::InvalidUrl(msg) => {
                (StatusCode::BAD_REQUEST, "INVALID_URL", msg.clone(), None)
            }
            AppError::HtmlTooLarge { size, limit } => (
                StatusCode::PAYLOAD_TOO_LARGE,
                "HTML_TOO_LARGE",
                self.to_string(),
                Some(serde_json::json!({
                    "size": size,
                    "limit": limit
                })),
            ),
            AppError::InvalidRequest(msg) => (
                StatusCode::BAD_REQUEST,
                "INVALID_REQUEST",
                msg.clone(),
                None,
            ),
            AppError::Unauthorized(msg) => (
                StatusCode::UNAUTHORIZED,
                "UNAUTHORIZED",
                msg.clone(),
                None,
            ),
        };

        let body = Json(ErrorResponse {
            success: false,
            error: ErrorDetails {
                code: code.to_string(),
                message,
                details,
            },
        });

        (status, body).into_response()
    }
}
