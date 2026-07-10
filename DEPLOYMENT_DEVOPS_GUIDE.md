# Deployment and DevOps Guide

## AI-Based Fake News Detection System

> Status: Assumption-based deployment guide.
>
> The official proposal and final technology stack are not currently confirmed. This guide assumes a React/Next.js frontend, FastAPI backend, PostgreSQL database, and Python ML model artifacts.

## 1. Deployment Goals

The deployment approach should support:

- Reliable final-year project demonstration.
- Reproducible local setup.
- Clear environment configuration.
- Separate frontend, backend, database, and model concerns.
- Easy rollback to local demo if cloud deployment fails.
- Evidence collection for final report and viva.

## 2. Recommended Deployment Options

### Option A: Local Demo Deployment

Best for:

- University lab demonstration.
- Limited internet access.
- Avoiding cloud setup risk.

Components:

- Frontend runs on local machine.
- Backend runs on local machine.
- PostgreSQL runs locally or via Docker.
- Model artifact stored inside backend project.

Pros:

- Most controllable.
- No hosting cost.
- Works without cloud account.

Cons:

- Not publicly accessible.
- Requires setup on demonstration machine.

### Option B: Cloud Prototype Deployment

Best for:

- Public demo link.
- Supervisor review outside the lab.
- More professional delivery.

Components:

- Frontend: Vercel, Netlify, or static hosting.
- Backend: Render, Railway, Fly.io, or VPS.
- Database: Managed PostgreSQL.
- Model artifact: Backend filesystem or object storage.

Pros:

- Professional demonstration.
- Easy supervisor access.
- Useful deployment evidence.

Cons:

- Requires environment setup.
- Free tiers may sleep or have resource limits.
- Model files may exceed platform limits.

### Recommendation

Prepare both:

1. A stable local demo package.
2. A cloud prototype if time and resources allow.

The local demo is the safety net. The cloud deployment is the polish.

## 3. Environment Variables

Backend variables:

```text
APP_ENV=development
DATABASE_URL=postgresql+psycopg://user:password@localhost:5432/fake_news_db
JWT_SECRET_KEY=change-this-secret
JWT_EXPIRES_MINUTES=60
ALLOWED_ORIGINS=http://localhost:3000
ACTIVE_MODEL_PATH=app/ml/artifacts/tfidf_logreg_v1.joblib
MAX_NEWS_TEXT_LENGTH=10000
```

Frontend variables:

```text
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

Production notes:

- Never commit real secrets.
- Use platform secret managers or environment variable settings.
- Use different JWT secrets for local and deployed environments.
- Restrict CORS to the deployed frontend URL.

## 4. Local Development Setup

Recommended local ports:

| Service | Port |
|---|---|
| Frontend | `3000` |
| Backend | `8000` |
| PostgreSQL | `5432` |

Suggested commands after implementation:

```powershell
# Backend
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

```powershell
# Frontend
cd frontend
npm install
npm run dev
```

```powershell
# Database via Docker
docker compose up -d db
```

## 5. Docker Compose Plan

Recommended services:

- `frontend`
- `backend`
- `db`

Example service layout:

```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: fake_news_db
      POSTGRES_USER: fake_news_user
      POSTGRES_PASSWORD: fake_news_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    build:
      context: ./backend
    environment:
      DATABASE_URL: postgresql+psycopg://fake_news_user:fake_news_password@db:5432/fake_news_db
      JWT_SECRET_KEY: change-this-secret
      ALLOWED_ORIGINS: http://localhost:3000
      ACTIVE_MODEL_PATH: app/ml/artifacts/tfidf_logreg_v1.joblib
    ports:
      - "8000:8000"
    depends_on:
      - db

  frontend:
    build:
      context: ./frontend
    environment:
      NEXT_PUBLIC_API_BASE_URL: http://localhost:8000
    ports:
      - "3000:3000"
    depends_on:
      - backend

volumes:
  postgres_data:
```

## 6. CI/CD Plan

Recommended GitHub Actions checks:

- Backend linting.
- Backend tests.
- ML smoke test.
- Frontend build.
- Optional Docker build.

Suggested pipeline stages:

```mermaid
flowchart LR
    Push["Git Push"] --> BackendTests["Backend Tests"]
    Push --> FrontendBuild["Frontend Build"]
    Push --> MLSmoke["ML Smoke Test"]
    BackendTests --> DockerBuild["Docker Build"]
    FrontendBuild --> DockerBuild
    MLSmoke --> DockerBuild
    DockerBuild --> Deploy["Deploy if Main Branch"]
```

Minimum CI acceptance:

- Backend tests pass.
- Frontend builds successfully.
- Model artifact can be loaded or mocked.

## 7. Database Migration Plan

Recommended tool: Alembic.

Migration workflow:

```powershell
cd backend
alembic revision --autogenerate -m "create initial schema"
alembic upgrade head
```

Deployment migration rule:

- Run migrations before starting the production backend.
- Keep database backups before schema changes.
- Do not manually edit production database tables during demo week.

## 8. Model Artifact Deployment

For the first version:

- Store model artifact under `backend/app/ml/artifacts/`.
- Track metadata in `model_versions`.
- Keep the artifact path configurable through `ACTIVE_MODEL_PATH`.

For larger models:

- Store artifacts in object storage.
- Download or mount model during backend startup.
- Avoid loading the model on every request.

Model startup check:

- Backend should verify active model availability at startup.
- `/api/system/model-health` should report loaded model status.

## 9. Deployment Smoke Test

After deployment, verify:

1. Frontend opens.
2. Backend `/health` returns `status: ok`.
3. User registration works.
4. Login works.
5. Prediction request works.
6. Prediction result is stored.
7. History page loads.
8. Admin dashboard works if included.
9. Model health endpoint is healthy.
10. No secrets are visible in browser console or logs.

## 10. Monitoring and Logging

For final-year prototype:

- Log application errors.
- Log prediction request failures.
- Log model loading failures.
- Log deployment startup events.

Avoid logging:

- Passwords.
- JWT tokens.
- Full raw user submissions in production logs.

Useful log fields:

- Timestamp.
- Request path.
- User ID if authenticated.
- Error code.
- Processing time.
- Model version ID.

## 11. Backup and Recovery

Minimum backup strategy:

- Export database before major demo or submission.
- Keep a copy of trained model artifact.
- Keep final dataset preprocessing scripts.
- Keep `.env.example` but not real `.env`.
- Tag stable demo version in Git.

Recommended Git tags:

```text
v0.1-srs-approved
v0.2-baseline-model
v0.3-demo-ready
v1.0-final-submission
```

## 12. Security Checklist Before Deployment

- Real secrets are not committed.
- Password hashing is enabled.
- JWT secret is strong.
- CORS allows only approved origins.
- Admin routes require admin role.
- Debug mode is disabled.
- Database is not publicly exposed without protection.
- Error responses do not expose stack traces.
- Prediction input length is limited.

## 13. Final Demo Strategy

Prepare two demo modes:

### Primary Demo

- Use deployed cloud app if stable.
- Show public URL.
- Demonstrate complete user journey.

### Backup Demo

- Use local Docker Compose or local backend/frontend.
- Keep sample login credentials ready.
- Keep sample news texts ready.
- Keep screenshots in final report in case live network fails.

## 14. Deployment Evidence for Final Report

Collect:

- Screenshot of deployed frontend.
- Screenshot of backend health endpoint.
- Screenshot of database tables or migration output.
- Screenshot of successful prediction result.
- Screenshot of admin dashboard.
- Deployment architecture diagram.
- Environment configuration summary without secrets.
- GitHub Actions test/build screenshot if CI is used.

## 15. Open Deployment Decisions

Confirm later:

- Whether deployment is required by the university.
- Whether cloud hosting is allowed.
- Final frontend framework.
- Final backend framework.
- Final model size.
- Whether GPU is required.
- Whether public access is needed for supervisor review.
