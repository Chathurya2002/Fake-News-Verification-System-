# Implementation Roadmap

## AI-Based Fake News Detection System

> Status: Assumption-based development roadmap.
>
> This roadmap is based on the current blueprint, SRS, and design document. It should be validated against the official project proposal when it becomes available.

## 1. Development Strategy

### 1.1 Recommended Build Order

The project should be developed in thin, working vertical slices. The first priority is to make the core user journey work end to end:

1. User logs in.
2. User submits news text.
3. Backend receives and validates the text.
4. ML model returns a prediction.
5. Result is stored.
6. User sees the prediction and history.

After this core flow works, admin features, reporting, advanced model comparison, and deployment should be added.

### 1.2 Priority Levels

| Priority | Meaning |
|---|---|
| P0 | Required for minimum viable final-year project demo. |
| P1 | Strongly recommended for a complete academic project. |
| P2 | Enhancement if time permits. |

## 2. Milestone Plan

### Milestone 1: Requirements and Design Finalization

Estimated duration: 1 week

Tasks:

- Confirm official proposal details.
- Finalize SRS.
- Finalize design document.
- Confirm technology stack.
- Confirm dataset source.
- Confirm project scope and exclusions.

Deliverables:

- Final SRS.
- Final design document.
- Approved system architecture.
- Development backlog.

Acceptance checks:

- All requirements are traceable.
- Major diagrams are complete.
- Scope is realistic for the timeline.

### Milestone 2: Project Setup

Estimated duration: 1 week

Tasks:

- Create repository structure.
- Set up backend project.
- Set up frontend project.
- Configure environment variables.
- Add Docker Compose for local services.
- Configure database connection.
- Add basic README instructions.

Deliverables:

- Running backend health endpoint.
- Running frontend app shell.
- Running local PostgreSQL database.

Acceptance checks:

- `GET /health` returns success.
- Frontend loads without errors.
- Backend connects to database.

### Milestone 3: Authentication and User Management

Estimated duration: 1 week

Tasks:

- Implement user table.
- Implement database migrations.
- Implement password hashing.
- Implement user registration API.
- Implement login API.
- Implement JWT authentication.
- Implement frontend login and registration pages.
- Implement protected frontend routes.

Deliverables:

- User can register.
- User can log in.
- Authenticated session is persisted on frontend.

Acceptance checks:

- Duplicate emails are rejected.
- Invalid password is rejected.
- Protected API rejects unauthenticated requests.
- Admin-only route rejects normal user.

### Milestone 4: Baseline AI/ML Model

Estimated duration: 1-2 weeks

Tasks:

- Select dataset.
- Document dataset source and license.
- Clean dataset.
- Split data into train, validation, and test sets.
- Train TF-IDF + Logistic Regression baseline.
- Evaluate baseline model.
- Save trained model artifact.
- Create model metadata record.

Deliverables:

- Training script.
- Saved baseline model.
- Evaluation metrics.
- Confusion matrix.

Acceptance checks:

- Training can be reproduced.
- Model artifact can be loaded.
- Metrics are recorded in report format.

### Milestone 5: Prediction Backend Integration

Estimated duration: 1 week

Tasks:

- Implement news submission database model.
- Implement prediction database model.
- Implement model loading service.
- Implement preprocessing service.
- Implement prediction service.
- Implement prediction API.
- Store prediction results in database.
- Return label, confidence, explanation, and model version.

Deliverables:

- `POST /api/predictions` endpoint.
- Stored submissions and predictions.
- Prediction response contract.

Acceptance checks:

- Valid news text returns prediction.
- Empty text is rejected.
- Oversized text is rejected.
- Prediction includes model version.
- Prediction is stored in database.

### Milestone 6: User Prediction Interface

Estimated duration: 1 week

Tasks:

- Build news analysis page.
- Add text input validation.
- Add optional URL input if required.
- Add prediction loading state.
- Build prediction result component.
- Display label, confidence, explanation, and disclaimer.
- Build prediction history page.

Deliverables:

- User can submit news from frontend.
- User can view prediction result.
- User can view prediction history.

Acceptance checks:

- Result page handles success and error states.
- User sees only their own history.
- UI works on desktop and mobile.

### Milestone 7: Admin and Reporting

Estimated duration: 1 week

Tasks:

- Implement admin analytics API.
- Implement model versions API.
- Implement reports API.
- Build admin dashboard.
- Show total users, submissions, predictions, and label distribution.
- Show model metrics.
- Add report generation metadata.

Deliverables:

- Admin dashboard.
- Model performance page.
- Report generation capability.

Acceptance checks:

- Admin can view analytics.
- Normal user cannot view admin pages.
- Model metrics are visible.

### Milestone 8: Advanced ML and Explainability

Estimated duration: 1-2 weeks

Tasks:

- Train second model for comparison.
- Compare baseline with candidate model.
- Add top-term explanation or LIME/SHAP if feasible.
- Document false positives and false negatives.
- Finalize model selection.

Deliverables:

- Model comparison table.
- Final selected model.
- Explainability output.
- ML evaluation report.

Acceptance checks:

- At least two model approaches are compared.
- Final model selection is justified.
- Limitations are documented honestly.

### Milestone 9: Testing and Quality Assurance

Estimated duration: 1 week

Tasks:

- Add backend unit tests.
- Add API integration tests.
- Add frontend form and route tests if time permits.
- Add ML inference tests.
- Test authorization boundaries.
- Test invalid inputs.
- Test deployment configuration.

Deliverables:

- Test report.
- Bug fix log.
- Stable demo build.

Acceptance checks:

- Critical backend tests pass.
- Auth and admin access rules work.
- Prediction flow works end to end.

### Milestone 10: Deployment and Final Delivery

Estimated duration: 1 week

Tasks:

- Prepare production environment variables.
- Deploy frontend.
- Deploy backend.
- Deploy or configure database.
- Verify deployed prediction flow.
- Capture screenshots.
- Finalize final report.
- Prepare viva presentation.
- Rehearse demo.

Deliverables:

- Deployed application or local demo package.
- Final report.
- Viva slides.
- Demo script.

Acceptance checks:

- Application runs from clean setup instructions.
- Demo flow is stable.
- Final report includes screenshots and results.

## 3. Module-by-Module Coding Tasks

### 3.1 Backend Tasks

| Order | Task | Priority |
|---|---|---|
| 1 | Create FastAPI project structure. | P0 |
| 2 | Add configuration management. | P0 |
| 3 | Add database connection and ORM setup. | P0 |
| 4 | Add health endpoint. | P0 |
| 5 | Create user model and migration. | P0 |
| 6 | Implement password hashing. | P0 |
| 7 | Implement registration endpoint. | P0 |
| 8 | Implement login endpoint. | P0 |
| 9 | Implement JWT authentication dependency. | P0 |
| 10 | Create submission and prediction models. | P0 |
| 11 | Implement prediction request schema. | P0 |
| 12 | Add ML inference service. | P0 |
| 13 | Implement prediction endpoint. | P0 |
| 14 | Implement prediction history endpoint. | P0 |
| 15 | Implement admin authorization dependency. | P1 |
| 16 | Implement admin analytics endpoint. | P1 |
| 17 | Implement model version endpoints. | P1 |
| 18 | Implement report endpoint. | P1 |
| 19 | Add centralized error handling. | P1 |
| 20 | Add backend tests. | P1 |

### 3.2 Frontend Tasks

| Order | Task | Priority |
|---|---|---|
| 1 | Create React or Next.js project. | P0 |
| 2 | Configure routes and layouts. | P0 |
| 3 | Build API client. | P0 |
| 4 | Build login page. | P0 |
| 5 | Build registration page. | P0 |
| 6 | Implement auth state and token handling. | P0 |
| 7 | Add protected routes. | P0 |
| 8 | Build dashboard shell. | P0 |
| 9 | Build news analysis form. | P0 |
| 10 | Build prediction result component. | P0 |
| 11 | Build prediction history page. | P0 |
| 12 | Build admin dashboard. | P1 |
| 13 | Build model metrics page. | P1 |
| 14 | Build reports page. | P1 |
| 15 | Add responsive styling. | P1 |
| 16 | Add loading, empty, and error states. | P1 |
| 17 | Add frontend tests if time permits. | P2 |

### 3.3 ML Tasks

| Order | Task | Priority |
|---|---|---|
| 1 | Select dataset. | P0 |
| 2 | Document dataset source and license. | P0 |
| 3 | Create data cleaning script. | P0 |
| 4 | Create preprocessing pipeline. | P0 |
| 5 | Train baseline model. | P0 |
| 6 | Evaluate baseline model. | P0 |
| 7 | Save model artifact. | P0 |
| 8 | Create inference wrapper. | P0 |
| 9 | Add model metadata export. | P1 |
| 10 | Train comparison model. | P1 |
| 11 | Add explainability output. | P1 |
| 12 | Perform error analysis. | P1 |
| 13 | Document limitations. | P0 |

### 3.4 Database Tasks

| Order | Task | Priority |
|---|---|---|
| 1 | Create database schema migration. | P0 |
| 2 | Create users table. | P0 |
| 3 | Create news submissions table. | P0 |
| 4 | Create model versions table. | P0 |
| 5 | Create predictions table. | P0 |
| 6 | Create reports table. | P1 |
| 7 | Create audit logs table. | P1 |
| 8 | Add indexes. | P1 |
| 9 | Add seed admin user script. | P1 |

## 4. Weekly Development Plan

| Week | Main Focus | Output |
|---|---|---|
| 1 | Proposal analysis and requirement finalization | Final SRS and design approval |
| 2 | Project setup | Running frontend, backend, and database |
| 3 | Authentication | Login/register working |
| 4 | Dataset and baseline model | Trained baseline model and metrics |
| 5 | Prediction API | Backend prediction flow working |
| 6 | User UI | Submit news and view result |
| 7 | History and persistence | Prediction history working |
| 8 | Admin dashboard | Analytics and model metrics |
| 9 | Model comparison and explainability | Improved model and explanation |
| 10 | Testing | Test report and bug fixes |
| 11 | Deployment | Deployed app or stable local package |
| 12 | Final report and viva | Final documents and demo rehearsal |

## 5. Definition of Done

### 5.1 Feature Definition of Done

A feature is considered complete when:

- It satisfies the related SRS requirement.
- It has frontend and backend integration where applicable.
- It handles validation and error states.
- It stores or retrieves required data correctly.
- It has at least basic manual test evidence.
- It is documented in a progress report.

### 5.2 ML Definition of Done

The ML component is considered complete when:

- Dataset source is documented.
- Preprocessing steps are reproducible.
- Baseline model is trained.
- Model metrics are recorded.
- Model artifact is loadable by the backend.
- Inference returns label and confidence.
- Limitations are documented.

### 5.3 Final Project Definition of Done

The project is considered ready for final evaluation when:

- The application supports the complete demo flow.
- SRS and design document are updated.
- Final report is complete.
- Viva presentation is ready.
- Model evaluation results are available.
- Security basics are implemented.
- Testing evidence is collected.
- Setup or deployment instructions work.

## 6. Suggested Technology Stack

| Layer | Recommended Technology | Reason |
|---|---|---|
| Frontend | React.js or Next.js | Modern UI development and strong ecosystem. |
| Backend | FastAPI | Python-native, fast, excellent for ML APIs. |
| Database | PostgreSQL | Reliable relational database with strong integrity. |
| ORM | SQLAlchemy | Mature Python ORM. |
| Migration Tool | Alembic | Standard database migration workflow for SQLAlchemy. |
| ML Baseline | scikit-learn | Reliable for TF-IDF and classical ML models. |
| Advanced ML | Hugging Face Transformers | Strong NLP model ecosystem. |
| Auth | JWT + bcrypt/Argon2 | Common and secure approach for web apps. |
| Deployment | Docker + Render/Railway/VPS | Reproducible and demo-friendly. |
| CI/CD | GitHub Actions | Automates tests and deployment checks. |

## 7. Risk-Controlled Scope Plan

### Minimum Viable Demo

Must include:

- Login/register.
- Text-based news prediction.
- Baseline ML model.
- Prediction result page.
- Prediction history.
- Basic admin analytics.
- Final report and viva slides.

### Strong Final-Year Version

Should include:

- Model comparison.
- Explainability.
- URL extraction.
- Model version tracking.
- Testing report.
- Deployment.

### Stretch Version

Can include:

- Transformer model.
- Multilingual support.
- Browser extension.
- Fact-checking source links.
- Real-time trend dashboard.

## 8. Supervisor Review Checkpoints

Recommended review moments:

1. After SRS completion.
2. After design document completion.
3. After baseline model evaluation.
4. After prediction API integration.
5. After UI demo is ready.
6. After testing and deployment.
7. Before final viva.

For each review, prepare:

- Current progress report.
- Screenshots or demo.
- Known issues.
- Questions for supervisor.
- Next milestone plan.
