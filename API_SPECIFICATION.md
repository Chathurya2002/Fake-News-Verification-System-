# API Specification

## AI-Based Fake News Detection System

> Status: Assumption-based API specification.
>
> The official proposal is not currently available in the workspace. This API should be updated after proposal review, especially if the required features, user roles, or prediction labels differ.

## 1. API Overview

Recommended backend framework: FastAPI.

Base URL for local development:

```text
http://localhost:8000
```

Base API prefix:

```text
/api
```

Data format:

```text
JSON
```

Authentication method:

```text
Authorization: Bearer <access_token>
```

## 2. Standard Response Formats

### 2.1 Success Response

For object responses, return the object directly:

```json
{
  "id": 1,
  "name": "Example"
}
```

For paginated lists:

```json
{
  "items": [],
  "page": 1,
  "page_size": 10,
  "total": 0
}
```

### 2.2 Error Response

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "News content cannot be empty.",
    "details": {}
  }
}
```

### 2.3 Common Error Codes

| HTTP Status | Code | Meaning |
|---|---|---|
| 400 | `BAD_REQUEST` | Request is malformed or invalid. |
| 401 | `UNAUTHORIZED` | Authentication token is missing or invalid. |
| 403 | `FORBIDDEN` | User does not have permission. |
| 404 | `NOT_FOUND` | Requested resource does not exist. |
| 409 | `CONFLICT` | Resource conflict, such as duplicate email. |
| 422 | `VALIDATION_ERROR` | Request body validation failed. |
| 500 | `INTERNAL_SERVER_ERROR` | Unexpected server error. |
| 503 | `MODEL_UNAVAILABLE` | ML model could not be loaded or used. |

## 3. Authentication APIs

### 3.1 Register User

```text
POST /api/auth/register
```

Authentication: Not required.

Request:

```json
{
  "full_name": "Student User",
  "email": "student@example.com",
  "password": "StrongPassword123"
}
```

Validation:

- `full_name` is required.
- `email` must be valid and unique.
- `password` must meet minimum length and strength rules.

Response `201 Created`:

```json
{
  "id": 1,
  "full_name": "Student User",
  "email": "student@example.com",
  "role": "user",
  "is_active": true,
  "created_at": "2026-06-09T14:00:00Z"
}
```

Possible errors:

- `409 CONFLICT`: Email already exists.
- `422 VALIDATION_ERROR`: Invalid input.

### 3.2 Login

```text
POST /api/auth/login
```

Authentication: Not required.

Request:

```json
{
  "email": "student@example.com",
  "password": "StrongPassword123"
}
```

Response `200 OK`:

```json
{
  "access_token": "jwt-token",
  "token_type": "bearer",
  "expires_in": 3600
}
```

Possible errors:

- `401 UNAUTHORIZED`: Invalid credentials.
- `403 FORBIDDEN`: Account disabled.

### 3.3 Get Current User

```text
GET /api/auth/me
```

Authentication: Required.

Response `200 OK`:

```json
{
  "id": 1,
  "full_name": "Student User",
  "email": "student@example.com",
  "role": "user",
  "is_active": true
}
```

## 4. Prediction APIs

### 4.1 Create Prediction

```text
POST /api/predictions
```

Authentication: Required.

Purpose:

Creates a news submission, runs the active ML model, stores the prediction, and returns the result.

Request for text input:

```json
{
  "input_type": "text",
  "content": "News article text to analyze."
}
```

Request for URL input:

```json
{
  "input_type": "url",
  "content": "https://example.com/news/article"
}
```

Validation:

- `input_type` must be `text` or `url`.
- `content` is required.
- Text content must not be empty.
- Text content must not exceed configured maximum length.
- URL content must be a valid URL when `input_type` is `url`.

Response `201 Created`:

```json
{
  "submission_id": 1001,
  "prediction_id": 5001,
  "label": "fake",
  "confidence_score": 0.91,
  "fake_probability": 0.91,
  "real_probability": 0.09,
  "explanation": "The article contains language patterns associated with unreliable news content.",
  "model_version": {
    "id": 1,
    "model_name": "Baseline Fake News Classifier",
    "algorithm": "TF-IDF + Logistic Regression"
  },
  "processing_time_ms": 420,
  "predicted_at": "2026-06-09T14:00:00Z"
}
```

Possible errors:

- `401 UNAUTHORIZED`: Missing or invalid token.
- `422 VALIDATION_ERROR`: Invalid content.
- `503 MODEL_UNAVAILABLE`: Active model cannot be loaded.

### 4.2 Get Prediction History

```text
GET /api/predictions/history?page=1&page_size=10
```

Authentication: Required.

Query parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| `page` | integer | No | Page number, default `1`. |
| `page_size` | integer | No | Items per page, default `10`, maximum `100`. |
| `label` | string | No | Filter by predicted label. |
| `source_type` | string | No | Filter by `text` or `url`. |

Response `200 OK`:

```json
{
  "items": [
    {
      "prediction_id": 5001,
      "submission_id": 1001,
      "submitted_at": "2026-06-09T14:00:00Z",
      "source_type": "text",
      "label": "fake",
      "confidence_score": 0.91,
      "model_name": "Baseline Fake News Classifier"
    }
  ],
  "page": 1,
  "page_size": 10,
  "total": 1
}
```

### 4.3 Get Prediction Detail

```text
GET /api/predictions/{prediction_id}
```

Authentication: Required.

Authorization:

- Normal users may only view their own predictions.
- Admin users may view all predictions.

Response `200 OK`:

```json
{
  "prediction_id": 5001,
  "submission_id": 1001,
  "input_preview": "News article text to analyze...",
  "source_url": null,
  "source_type": "text",
  "label": "fake",
  "confidence_score": 0.91,
  "fake_probability": 0.91,
  "real_probability": 0.09,
  "explanation": "The article contains language patterns associated with unreliable news content.",
  "model_version": {
    "id": 1,
    "model_name": "Baseline Fake News Classifier",
    "algorithm": "TF-IDF + Logistic Regression",
    "f1_score": 0.89
  },
  "processing_time_ms": 420,
  "submitted_at": "2026-06-09T14:00:00Z",
  "predicted_at": "2026-06-09T14:00:01Z"
}
```

Possible errors:

- `403 FORBIDDEN`: User does not own the prediction.
- `404 NOT_FOUND`: Prediction does not exist.

## 5. Admin APIs

### 5.1 Get Admin Analytics

```text
GET /api/admin/analytics
```

Authentication: Required.

Authorization: Admin only.

Response `200 OK`:

```json
{
  "total_users": 25,
  "total_submissions": 120,
  "total_predictions": 120,
  "label_distribution": {
    "fake": 62,
    "real": 50,
    "uncertain": 8
  },
  "daily_submissions": [
    {
      "date": "2026-06-09",
      "total": 12
    }
  ],
  "active_model": {
    "id": 1,
    "model_name": "Baseline Fake News Classifier",
    "algorithm": "TF-IDF + Logistic Regression",
    "f1_score": 0.89
  }
}
```

### 5.2 List Model Versions

```text
GET /api/admin/models
```

Authentication: Required.

Authorization: Admin only.

Response `200 OK`:

```json
{
  "items": [
    {
      "id": 1,
      "model_name": "Baseline Fake News Classifier",
      "algorithm": "TF-IDF + Logistic Regression",
      "dataset_name": "Fake and Real News Dataset",
      "accuracy": 0.90,
      "precision_score": 0.89,
      "recall_score": 0.91,
      "f1_score": 0.90,
      "trained_at": "2026-06-09T14:00:00Z",
      "is_active": true
    }
  ],
  "page": 1,
  "page_size": 10,
  "total": 1
}
```

### 5.3 Activate Model Version

```text
POST /api/admin/models/{model_id}/activate
```

Authentication: Required.

Authorization: Admin only.

Response `200 OK`:

```json
{
  "id": 2,
  "model_name": "DistilBERT Fake News Classifier",
  "is_active": true,
  "message": "Model activated successfully."
}
```

Possible errors:

- `404 NOT_FOUND`: Model version does not exist.
- `403 FORBIDDEN`: User is not an admin.

### 5.4 List Dataset Metadata

```text
GET /api/admin/datasets
```

Authentication: Required.

Authorization: Admin only.

Response `200 OK`:

```json
{
  "items": [
    {
      "name": "Fake and Real News Dataset",
      "version": "v1",
      "source": "Pending proposal confirmation",
      "records": 44898,
      "language": "en"
    }
  ]
}
```

## 6. Report APIs

### 6.1 Generate Report

```text
POST /api/reports
```

Authentication: Required.

Request:

```json
{
  "report_type": "prediction_summary",
  "title": "Prediction Summary Report"
}
```

Response `201 Created`:

```json
{
  "id": 1,
  "report_type": "prediction_summary",
  "title": "Prediction Summary Report",
  "file_path": "reports/prediction-summary-1.pdf",
  "generated_at": "2026-06-09T14:00:00Z"
}
```

### 6.2 List My Reports

```text
GET /api/reports
```

Authentication: Required.

Response `200 OK`:

```json
{
  "items": [
    {
      "id": 1,
      "report_type": "prediction_summary",
      "title": "Prediction Summary Report",
      "generated_at": "2026-06-09T14:00:00Z"
    }
  ],
  "page": 1,
  "page_size": 10,
  "total": 1
}
```

## 7. Health and System APIs

### 7.1 Health Check

```text
GET /health
```

Authentication: Not required.

Response `200 OK`:

```json
{
  "status": "ok",
  "service": "fake-news-detection-api",
  "version": "0.1.0"
}
```

### 7.2 Model Health

```text
GET /api/system/model-health
```

Authentication: Admin recommended.

Response `200 OK`:

```json
{
  "model_loaded": true,
  "active_model_id": 1,
  "model_name": "Baseline Fake News Classifier",
  "algorithm": "TF-IDF + Logistic Regression"
}
```

## 8. Frontend Integration Notes

### 8.1 Token Storage

For the final-year prototype, the frontend may store JWT in memory or secure browser storage. For stronger production security, use an HTTP-only cookie approach.

### 8.2 Loading States

The frontend should show loading states for:

- Login request.
- Registration request.
- Prediction request.
- History loading.
- Admin analytics loading.

### 8.3 Error Handling

The frontend should map API errors into friendly messages:

| API Code | User Message |
|---|---|
| `VALIDATION_ERROR` | Please check the entered information. |
| `UNAUTHORIZED` | Please log in again. |
| `FORBIDDEN` | You do not have permission to access this page. |
| `MODEL_UNAVAILABLE` | The prediction model is temporarily unavailable. |
| `INTERNAL_SERVER_ERROR` | Something went wrong. Please try again. |

## 9. Security Requirements

- All protected APIs must validate JWT tokens.
- Admin APIs must validate user role.
- Passwords must be hashed before storage.
- Prediction input must be length-limited.
- URLs must be validated before extraction.
- Raw stack traces must not be returned to users.
- CORS must be restricted in production.
- Rate limiting should be added to prediction endpoints for production deployment.

## 10. API Testing Checklist

Authentication:

- Register valid user.
- Reject duplicate email.
- Reject weak password.
- Login valid user.
- Reject invalid login.
- Fetch current user with token.
- Reject current user request without token.

Prediction:

- Submit valid text.
- Reject empty text.
- Reject oversized text.
- Submit valid URL if enabled.
- Handle invalid URL.
- Return label and confidence.
- Store prediction with model version.

History:

- Return current user's history.
- Prevent access to another user's prediction.
- Support pagination.

Admin:

- Return analytics for admin.
- Reject analytics for normal user.
- List model versions.
- Activate model version.

Reports:

- Generate report.
- List current user's reports.

## 11. Proposal Confirmation Checklist

Update this API spec after confirming:

- Exact prediction labels.
- Whether URL analysis is mandatory.
- Whether reports must generate PDF files.
- Whether admin model activation is required.
- Whether users can delete prediction history.
- Whether user feedback on predictions is required.
- Whether external fact-checking APIs are included.
