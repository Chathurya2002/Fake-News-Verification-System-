# Academic Documentation Plan

## AI-Based Fake News Detection System

> Status: Assumption-based documentation plan.
>
> This plan should be updated after the official project proposal is uploaded and reviewed.

## 1. Required Academic Deliverables

| Deliverable | Purpose | Recommended Status |
|---|---|---|
| Proposal | Defines the problem, objectives, scope, methodology, and timeline. | Pending official upload |
| SRS | Defines detailed functional and non-functional requirements. | Draft created |
| Design Document | Explains system architecture, UML, database, APIs, UI, ML design, and deployment. | Draft created |
| Progress Reports | Records weekly or milestone-based development progress. | Template needed |
| Final Report | Complete academic report covering analysis, design, implementation, testing, and evaluation. | To be drafted later |
| Viva Presentation | Slide deck for final defense and demonstration. | To be drafted later |

## 2. Proposal Improvement Checklist

When the proposal is available, verify that it includes:

- Clear project title.
- Background and motivation.
- Problem statement.
- Aim and measurable objectives.
- Scope and limitations.
- Literature review or related work summary.
- Proposed methodology.
- Dataset source and description.
- AI/ML model approach.
- Technology stack.
- Expected outcomes.
- Project timeline.
- Ethical considerations.
- References.

Common improvements:

- Add measurable model evaluation metrics.
- Explain why fake news detection is socially and academically important.
- Define whether the system detects full articles, headlines, claims, or URLs.
- Define supported language or languages.
- Clarify whether the output is binary or multi-class.
- Add a disclaimer that AI predictions support, not replace, fact-checking.

## 3. SRS Structure

Recommended sections:

1. Introduction
2. Overall description
3. External interface requirements
4. Functional requirements
5. Non-functional requirements
6. Data requirements
7. API requirements
8. Requirement traceability matrix
9. Acceptance criteria
10. Open items

Current draft:

- `SRS.md`

Required future update:

- Replace assumptions with exact proposal facts.
- Add supervisor-specific formatting if required.
- Add final project title and student details.

## 4. Design Document Structure

Recommended sections:

1. Design overview
2. High-level architecture
3. Module design
4. Repository structure
5. Database design
6. API design
7. AI/ML design
8. Frontend design
9. Backend design
10. Security design
11. Testing design
12. Deployment design
13. Traceability
14. Open design decisions

Current draft:

- `DESIGN_DOCUMENT.md`

Required future update:

- Confirm exact stack.
- Confirm dataset and model.
- Add final UI wireframes if required.
- Add screenshots after implementation.

## 5. Progress Report Template

Use this structure for each weekly or milestone report:

```markdown
# Progress Report - Week X

## Reporting Period

Start date:
End date:

## Planned Work

- Item 1
- Item 2
- Item 3

## Completed Work

- Item 1
- Item 2
- Item 3

## Technical Details

Describe implementation work, design decisions, experiments, or testing performed.

## Evidence

- Screenshots:
- Git commits:
- Test results:
- Model metrics:

## Problems Encountered

- Problem:
- Cause:
- Resolution or mitigation:

## Next Week Plan

- Item 1
- Item 2
- Item 3

## Supervisor Feedback

Record feedback and action items.
```

## 6. Final Report Recommended Structure

### Chapter 1: Introduction

- Background.
- Problem statement.
- Aim and objectives.
- Scope.
- Significance.
- Report structure.

### Chapter 2: Literature Review

- Fake news and misinformation overview.
- Existing fake news detection techniques.
- Traditional ML methods for text classification.
- Deep learning or transformer-based NLP methods.
- Explainability in AI-based detection.
- Research gap and justification.

### Chapter 3: Methodology

- Research methodology.
- Dataset selection.
- Data preprocessing.
- Model training approach.
- System development methodology.
- Tools and technologies.

### Chapter 4: System Analysis and Design

- Requirements summary.
- Functional and non-functional requirements.
- Architecture.
- UML diagrams.
- Database design.
- API design.
- UI design.

### Chapter 5: Implementation

- Frontend implementation.
- Backend implementation.
- Database implementation.
- ML model implementation.
- Integration.
- Security features.

### Chapter 6: Testing and Evaluation

- Test strategy.
- Functional testing.
- API testing.
- ML evaluation.
- Performance testing.
- User acceptance testing.
- Results and discussion.

### Chapter 7: Conclusion and Future Work

- Summary of achievements.
- Limitations.
- Future enhancements.
- Final conclusion.

## 7. Viva Presentation Structure

Recommended slide order:

1. Title slide
2. Problem background
3. Problem statement
4. Aim and objectives
5. Proposed solution
6. System architecture
7. AI/ML workflow
8. Database design
9. Key system features
10. Demonstration flow
11. Model evaluation results
12. Testing summary
13. Challenges and solutions
14. Limitations
15. Future enhancements
16. Conclusion
17. Q&A

## 8. Viva Demo Flow

Recommended demo sequence:

1. Open the application.
2. Register or log in.
3. Submit a real-looking news sample.
4. Show prediction label, confidence, explanation, and model version.
5. Submit a fake-looking or misleading sample.
6. Show prediction history.
7. Log in as admin.
8. Show analytics and model performance summary.
9. Briefly show source code structure and model metrics.

## 9. Evidence to Collect During Development

Collect these continuously:

- Screenshots of completed UI pages.
- API response examples.
- Database table screenshots or schema exports.
- Model training metrics.
- Confusion matrix image.
- Test execution output.
- Git commit history.
- Deployment URL and screenshots.
- Supervisor feedback and changes made.

## 10. Immediate Documentation Tasks

1. Upload official proposal.
2. Update `PROJECT_BLUEPRINT.md` using proposal facts.
3. Finalize `SRS.md`.
4. Finalize `DESIGN_DOCUMENT.md`.
5. Create `docs/progress-reports/Week-01.md`.
6. Start collecting implementation evidence from the first coding milestone.
