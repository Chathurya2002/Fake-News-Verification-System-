# AI-Based Fake News Detection System

This repository contains planning, design, and implementation guidance for a final-year project focused on AI-based fake news detection.

> Current status: The official proposal file is not yet present in this workspace. Existing documents are assumption-based and should be reconciled with the proposal after upload.

## Project Summary

The assumed project goal is to build a web-based system that allows users to submit news text or URLs and receive an AI-assisted prediction indicating whether the content is likely to be fake, real, misleading, suspicious, or uncertain.

The planned system includes:

- User authentication.
- News submission.
- AI/ML fake news prediction.
- Confidence score and explanation.
- Prediction history.
- Admin analytics.
- Model version tracking.
- Reports and academic documentation.

## Documentation Index

| Document | Purpose |
|---|---|
| `PROJECT_BLUEPRINT.md` | Complete project analysis, architecture, requirements, roadmap, and guidance. |
| `SRS.md` | Formal Software Requirements Specification. |
| `DESIGN_DOCUMENT.md` | System architecture, module design, APIs, database, ML, security, and testing design. |
| `UML_DIAGRAMS.md` | Standalone Mermaid diagrams for reports and viva. |
| `DATABASE_SCHEMA.md` | PostgreSQL schema, DDL, constraints, indexes, and migration guidance. |
| `API_SPECIFICATION.md` | REST API endpoints, request/response examples, errors, and testing checklist. |
| `IMPLEMENTATION_ROADMAP.md` | Milestones, weekly plan, coding tasks, and Definition of Done. |
| `TESTING_QA_PLAN.md` | Functional, API, database, ML, security, performance, and UAT tests. |
| `DEPLOYMENT_DEVOPS_GUIDE.md` | Local/cloud deployment, Docker, CI/CD, security, and demo strategy. |
| `DOCUMENTATION_PLAN.md` | Proposal, SRS, design document, progress report, final report, and viva plan. |

## Recommended Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React.js or Next.js |
| Backend | FastAPI |
| Database | PostgreSQL |
| ML | scikit-learn baseline, optional Hugging Face Transformers |
| Auth | JWT with bcrypt or Argon2 password hashing |
| Deployment | Docker, optional cloud hosting |
| CI/CD | GitHub Actions |

## Proposed Development Order

1. Upload and analyze official proposal.
2. Finalize SRS.
3. Finalize design document and diagrams.
4. Set up frontend, backend, database, and ML project structure.
5. Implement authentication.
6. Train baseline fake news model.
7. Implement prediction API.
8. Build frontend prediction flow.
9. Add history, admin dashboard, and reports.
10. Test and deploy.
11. Complete final report and viva presentation.

## Current Open Item

The official project proposal must be uploaded to this workspace so the assumption-based documents can be corrected and finalized.
