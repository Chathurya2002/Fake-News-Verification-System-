# UML and System Diagrams

## AI-Based Fake News Detection System

> Status: Assumption-based diagram set.
>
> The official proposal is not currently available in the workspace. These diagrams should be validated and updated after proposal review.

## 1. Use Case Diagram

This diagram shows the main actors and the system functions they can perform.

```mermaid
flowchart LR
    Guest["Guest User"]
    User["Registered User"]
    Admin["Admin"]
    Evaluator["Project Evaluator"]

    UC_Register(("Register"))
    UC_Login(("Login"))
    UC_SubmitText(("Submit News Text"))
    UC_SubmitURL(("Submit News URL"))
    UC_ViewResult(("View Prediction Result"))
    UC_ViewHistory(("View Prediction History"))
    UC_Profile(("Manage Profile"))
    UC_Analytics(("View Analytics"))
    UC_Models(("Manage Model Versions"))
    UC_Datasets(("Manage Dataset Metadata"))
    UC_Reports(("Generate Reports"))
    UC_Demo(("Review Demo and Results"))

    Guest --> UC_Register
    Guest --> UC_Login

    User --> UC_Login
    User --> UC_SubmitText
    User --> UC_SubmitURL
    User --> UC_ViewResult
    User --> UC_ViewHistory
    User --> UC_Profile

    Admin --> UC_Login
    Admin --> UC_Analytics
    Admin --> UC_Models
    Admin --> UC_Datasets
    Admin --> UC_Reports

    Evaluator --> UC_Demo
    Evaluator --> UC_Reports
```

## 2. Class Diagram

This diagram shows the main domain classes and service classes.

```mermaid
classDiagram
    class User {
        +bigint id
        +string fullName
        +string email
        +string passwordHash
        +string role
        +bool isActive
        +register()
        +login()
        +viewHistory()
    }

    class NewsSubmission {
        +bigint id
        +bigint userId
        +string inputText
        +string sourceUrl
        +string sourceType
        +datetime submittedAt
        +validate()
    }

    class Prediction {
        +bigint id
        +bigint submissionId
        +bigint modelVersionId
        +string predictedLabel
        +float confidenceScore
        +float fakeProbability
        +float realProbability
        +string explanation
        +datetime predictedAt
    }

    class ModelVersion {
        +bigint id
        +string modelName
        +string algorithm
        +string artifactPath
        +float accuracy
        +float precision
        +float recall
        +float f1Score
        +bool isActive
        +loadArtifact()
    }

    class Report {
        +bigint id
        +bigint userId
        +string reportType
        +string filePath
        +datetime generatedAt
    }

    class AuthService {
        +register(data)
        +authenticate(email, password)
        +createToken(user)
        +getCurrentUser(token)
    }

    class PredictionService {
        +createSubmission(user, input)
        +predict(submission)
        +savePrediction(result)
        +getHistory(user)
    }

    class MLInferenceService {
        +loadActiveModel()
        +preprocess(text)
        +predict(features)
        +explain(text, prediction)
    }

    class AdminService {
        +getAnalytics()
        +listModelVersions()
        +activateModel(modelId)
    }

    User "1" --> "*" NewsSubmission
    NewsSubmission "1" --> "1" Prediction
    ModelVersion "1" --> "*" Prediction
    User "1" --> "*" Report
    PredictionService --> MLInferenceService
    PredictionService --> NewsSubmission
    PredictionService --> Prediction
    AuthService --> User
    AdminService --> ModelVersion
```

## 3. Sequence Diagram - User Login

This diagram explains the authentication flow.

```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend
    participant API as Backend API
    participant Auth as Auth Service
    participant DB as Database

    User->>FE: Enter email and password
    FE->>API: POST /api/auth/login
    API->>Auth: authenticate(email, password)
    Auth->>DB: Find user by email
    DB-->>Auth: User record
    Auth->>Auth: Verify password hash
    Auth-->>API: JWT access token
    API-->>FE: Return token
    FE-->>User: Redirect to dashboard
```

## 4. Sequence Diagram - Fake News Prediction

This diagram shows the end-to-end prediction flow.

```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend
    participant API as Backend API
    participant PS as Prediction Service
    participant ML as ML Inference Service
    participant DB as Database

    User->>FE: Submit news text or URL
    FE->>API: POST /api/predictions
    API->>API: Validate JWT and request body
    API->>PS: createPrediction(user, input)
    PS->>DB: Save news submission
    PS->>ML: preprocess and predict
    ML-->>PS: label, probabilities, explanation
    PS->>DB: Save prediction result
    PS-->>API: Prediction response
    API-->>FE: Return label, confidence, explanation
    FE-->>User: Display result
```

## 5. Activity Diagram - News Analysis

This diagram shows the user workflow and validation decisions.

```mermaid
flowchart TD
    Start([Start]) --> Auth{User authenticated?}
    Auth -- No --> Login["Login or register"]
    Login --> Input["Enter news text or URL"]
    Auth -- Yes --> Input
    Input --> Validate{Input valid?}
    Validate -- No --> Error["Show validation error"]
    Error --> Input
    Validate -- Yes --> StoreSubmission["Store submission"]
    StoreSubmission --> Preprocess["Preprocess text"]
    Preprocess --> Predict["Run active ML model"]
    Predict --> Explain["Generate explanation"]
    Explain --> StorePrediction["Store prediction"]
    StorePrediction --> Display["Display result"]
    Display --> History["Update history"]
    History --> End([End])
```

## 6. Component Diagram

This diagram shows the main implementation components and their dependencies.

```mermaid
flowchart TD
    subgraph Frontend["Frontend Application"]
        Pages["Pages and Routes"]
        Components["Reusable UI Components"]
        Client["API Client"]
        AuthState["Auth State"]
    end

    subgraph Backend["Backend Application"]
        Routes["API Routes"]
        Schemas["Request and Response Schemas"]
        Services["Business Services"]
        Security["Security Utilities"]
        ORM["ORM Models"]
    end

    subgraph ML["Machine Learning Package"]
        Preprocessor["Text Preprocessor"]
        Inference["Inference Engine"]
        Explainer["Explanation Generator"]
        ModelFiles["Model Artifacts"]
    end

    subgraph Database["Database"]
        Tables["Relational Tables"]
    end

    Pages --> Components
    Pages --> AuthState
    Components --> Client
    Client --> Routes
    Routes --> Schemas
    Routes --> Services
    Services --> Security
    Services --> ORM
    Services --> Preprocessor
    Preprocessor --> Inference
    Inference --> Explainer
    Inference --> ModelFiles
    ORM --> Tables
```

## 7. Deployment Diagram

This diagram shows a practical final-year deployment model.

```mermaid
flowchart TD
    UserDevice["User Device Browser"] --> FrontendHost["Frontend Hosting"]
    FrontendHost --> BackendHost["Backend API Container"]
    BackendHost --> Database["PostgreSQL Database"]
    BackendHost --> ModelArtifact["Model Artifact Storage"]
    BackendHost --> LogStore["Application Logs"]

    Developer["Developer Machine"] --> GitHub["GitHub Repository"]
    GitHub --> CI["CI/CD Pipeline"]
    CI --> FrontendHost
    CI --> BackendHost
```

## 8. Entity Relationship Diagram

This diagram models the database relationships.

```mermaid
erDiagram
    USERS ||--o{ NEWS_SUBMISSIONS : submits
    NEWS_SUBMISSIONS ||--|| PREDICTIONS : has
    MODEL_VERSIONS ||--o{ PREDICTIONS : generates
    USERS ||--o{ REPORTS : creates
    USERS ||--o{ AUDIT_LOGS : performs

    USERS {
        bigint id PK
        varchar full_name
        varchar email UK
        varchar password_hash
        varchar role
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    NEWS_SUBMISSIONS {
        bigint id PK
        bigint user_id FK
        text input_text
        varchar source_url
        varchar source_type
        varchar language
        timestamp submitted_at
    }

    PREDICTIONS {
        bigint id PK
        bigint submission_id FK
        bigint model_version_id FK
        varchar predicted_label
        numeric confidence_score
        numeric fake_probability
        numeric real_probability
        text explanation
        integer processing_time_ms
        timestamp predicted_at
    }

    MODEL_VERSIONS {
        bigint id PK
        varchar model_name
        varchar algorithm
        varchar artifact_path
        numeric accuracy
        numeric precision_score
        numeric recall_score
        numeric f1_score
        timestamp trained_at
        boolean is_active
    }

    REPORTS {
        bigint id PK
        bigint user_id FK
        varchar report_type
        varchar file_path
        timestamp generated_at
    }

    AUDIT_LOGS {
        bigint id PK
        bigint user_id FK
        varchar action
        varchar entity_type
        bigint entity_id
        timestamp created_at
    }
```

## 9. AI/ML Training Workflow

This diagram shows how the model is trained and selected.

```mermaid
flowchart TD
    Dataset["Labeled Fake/Real News Dataset"] --> Inspect["Inspect Columns and Labels"]
    Inspect --> Clean["Clean and Normalize Text"]
    Clean --> Split["Train, Validation, Test Split"]
    Split --> Vectorize["TF-IDF Vectorization"]
    Vectorize --> Baseline["Train Baseline Classifier"]
    Split --> Candidate["Train Candidate Model"]
    Baseline --> Evaluate["Evaluate Metrics"]
    Candidate --> Evaluate
    Evaluate --> Compare["Compare Accuracy, Precision, Recall, F1"]
    Compare --> Select["Select Final Model"]
    Select --> Export["Export Model Artifact"]
    Export --> Register["Register Model Version"]
```

## 10. AI/ML Inference Workflow

This diagram shows how live user input becomes a prediction.

```mermaid
flowchart TD
    Input["User News Input"] --> Validate["Validate Input"]
    Validate --> Normalize["Normalize Text"]
    Normalize --> Features["Create Model Features"]
    Features --> Model["Active Fake News Model"]
    Model --> Probabilities["Prediction Probabilities"]
    Probabilities --> Label["Predicted Label"]
    Probabilities --> Confidence["Confidence Score"]
    Label --> Explanation["Generate Explanation"]
    Confidence --> Explanation
    Explanation --> Response["Return Result to User"]
```

## 11. State Diagram - Prediction Lifecycle

This diagram shows the lifecycle of a prediction request.

```mermaid
stateDiagram-v2
    [*] --> Draft
    Draft --> Submitted: User submits content
    Submitted --> Validating: Backend receives request
    Validating --> Rejected: Invalid input
    Validating --> Processing: Valid input
    Processing --> Predicted: Model returns result
    Processing --> Failed: Model or server error
    Predicted --> Stored: Save result
    Stored --> Displayed: Return to frontend
    Rejected --> [*]
    Failed --> [*]
    Displayed --> [*]
```

## 12. Data Flow Diagram

This diagram shows how data moves through the system.

```mermaid
flowchart LR
    User["User"] --> Input["News Input"]
    Input --> API["Backend API"]
    API --> DB1["Store Submission"]
    API --> NLP["NLP Processing"]
    NLP --> Model["ML Model"]
    Model --> Result["Prediction Result"]
    Result --> DB2["Store Prediction"]
    Result --> UI["Display to User"]
    Admin["Admin"] --> Analytics["Analytics Dashboard"]
    DB1 --> Analytics
    DB2 --> Analytics
```

## 13. Diagram Update Checklist

Update these diagrams after the official proposal is reviewed:

- Confirm actors and user roles.
- Confirm whether URL submission is required.
- Confirm prediction labels.
- Confirm admin module scope.
- Confirm exact database entities.
- Confirm final AI model approach.
- Confirm deployment target.
