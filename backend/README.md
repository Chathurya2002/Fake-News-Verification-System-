# Backend

FastAPI backend for the AI-Based Fake News Detection System.

## Planned Responsibilities

- Authentication and authorization.
- News submission validation.
- ML model inference orchestration.
- Prediction persistence.
- Admin analytics.
- Report metadata.

## Local Setup

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Health Check

```text
GET http://localhost:8000/health
```
