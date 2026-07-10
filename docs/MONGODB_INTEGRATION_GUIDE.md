# MongoDB Integration Guide for TruthLens

This guide outlines the precise steps required to migrate the database layer of the TruthLens Fake News Detection System from SQLAlchemy (SQLite/PostgreSQL) to **MongoDB** using `motor` (the official asynchronous MongoDB driver for Python/FastAPI) and `pymongo`.

---

## 1. Prerequisites

First, install the required MongoDB python packages. Add these to your `backend/requirements.txt`:

```text
motor==3.3.2
pymongo==4.6.1
```

Run pip install:
```bash
pip install -r requirements.txt
```

---

## 2. Environment Configuration

Add the MongoDB connection string to your `.env` file:

```ini
MONGODB_URL=mongodb://localhost:27017/truthlens_db
```

Update the configuration settings model in [config.py](file:///c:/Users/dewmo/OneDrive/Documents/Fake%20news/backend/app/core/config.py):

```python
class Settings(BaseSettings):
    app_env: str = "development"
    database_url: str = "sqlite:///fake_news.db"  # Keep for fallback
    mongodb_url: str = "mongodb://localhost:27017/truthlens_db"
    # ...
```

---

## 3. Database Layer Setup

Create a new file `backend/app/core/mongodb.py` to establish the connection:

```python
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

class MongoDB:
    client: AsyncIOMotorClient = None
    db = None

db_client = MongoDB()

async def connect_to_mongo():
    db_client.client = AsyncIOMotorClient(settings.mongodb_url)
    # Extract database name from connection string or default
    db_name = settings.mongodb_url.split("/")[-1].split("?")[0] or "truthlens_db"
    db_client.db = db_client.client[db_name]
    print(f"Connected to MongoDB database: {db_name}")

async def close_mongo_connection():
    if db_client.client:
        db_client.client.close()
        print("Closed MongoDB connection.")

def get_mongo_db():
    if db_client.db is None:
        raise RuntimeError("Database connection not initialized.")
    return db_client.db
```

Initialize this connection in `backend/app/main.py` inside the FastAPI lifespan function:

```diff
 @asynccontextmanager
 async def lifespan(app: FastAPI):
+    # Connect to MongoDB
+    from app.core.mongodb import connect_to_mongo, close_mongo_connection
+    await connect_to_mongo()
+    
     # Run dynamic schema updates for SQLite (if still using SQLite fallback)
     from app.core.models import check_and_update_db_schema
     check_and_update_db_schema()
     
     ...
     
     yield
     
+    # Close MongoDB
+    await close_mongo_connection()
```

---

## 4. Collection Structure (Models Representation)

In MongoDB, we replace relational tables with Document Collections.

### `users` collection:
```json
{
  "_id": "ObjectId",
  "full_name": "TruthLens Admin",
  "email": "admin@truthlens.com",
  "password_hash": "$2b$12$...",
  "role": "admin",
  "is_active": true,
  "created_at": "ISODate"
}
```

### `predictions` collection:
```json
{
  "_id": "ObjectId",
  "user_id": "ObjectId",
  "input_text": "News article text...",
  "source_url": "https://example.com/news",
  "source_type": "url",
  "predicted_label": "fake",
  "confidence_score": 0.895,
  "fake_probability": 0.895,
  "real_probability": 0.105,
  "explanation": "Explanation details...",
  "word_importances": [
    { "word": "shocking", "weight": 1.25, "is_fake_indicator": true }
  ],
  "fact_check_results": [
    { "claim": "...", "verdict": "fake", "source_name": "Snopes" }
  ],
  "source_credibility": {
    "source_name": "Example Source",
    "credibility_score": 85,
    "category": "trusted"
  },
  "model_version": {
    "model_name": "Development Baseline Model",
    "algorithm": "TF-IDF + Logistic Regression"
  },
  "processing_time_ms": 12,
  "predicted_at": "ISODate"
}
```

---

## 5. API Router Updates (Example Dependency Injection)

Inject MongoDB client instead of SQLAlchemy `Session`. 

In [prediction_routes.py](file:///c:/Users/dewmo/OneDrive/Documents/Fake%20news/backend/app/api/prediction_routes.py):

```python
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.mongodb import get_mongo_db
from app.core.security import get_current_user
from bson import ObjectId

router = APIRouter()

@router.post("", response_model=PredictionResponse, status_code=201)
async def create_prediction(
    payload: PredictionRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_mongo_db)
) -> PredictionResponse:
    # 1. Prediction heuristics
    result = predict_news(payload.content)
    
    # 2. Query MongoDB Collections instead of SQLite
    active_model = await db["model_versions"].find_one({"is_active": True})
    
    # 3. Perform verification & credibility checks
    # (Update queries in services to use await db['collection'].find())
    
    # 4. Insert into prediction collection
    new_prediction = {
        "user_id": ObjectId(current_user["id"]),
        "input_text": payload.content,
        "predicted_label": result.label,
        "confidence_score": result.confidence_score,
        # ...
    }
    insert_result = await db["predictions"].insert_one(new_prediction)
    
    # 5. Return prediction payload
    # ...
```

> [!TIP]
> Motor is an **asynchronous** library. Always remember to use the `async def` syntax for your API endpoints and prepends `await` to database calls (e.g. `await db['users'].find_one(...)`).
