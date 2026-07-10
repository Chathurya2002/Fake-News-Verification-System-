from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.api import auth_routes, prediction_routes, system_routes, admin_routes, report_routes
from app.core.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Run dynamic schema updates for older SQLite databases first
    from app.core.models import check_and_update_db_schema
    check_and_update_db_schema()

    # Initialize DB tables
    from app.core.database import Base, engine, SessionLocal
    from app.core.models import ModelVersion, User, FactCheck, SourceCredibility
    from app.core.security import get_password_hash
    
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Seed Fact Checks if empty
        if db.query(FactCheck).count() == 0:
            fcs = [
                FactCheck(claim="corporations suppress miracle cures and medical secrets", verdict="fake", source_name="Snopes", source_url="https://www.snopes.com"),
                FactCheck(claim="COVID-19 vaccination causes electromagnetic fields in body", verdict="fake", source_name="Politifact", source_url="https://www.politifact.com"),
                FactCheck(claim="Sri Lanka government receives $500 million IMF bailout package", verdict="real", source_name="FactCheck.lk", source_url="https://factcheck.lk"),
                FactCheck(claim="ලංකාවේ වැට් බද්ද සියයට 30 දක්වා වැඩි කිරීමට තීරණය කර ඇත", verdict="fake", source_name="FactCheck.lk", source_url="https://factcheck.lk"),
                FactCheck(claim="Fuel price in Sri Lanka reduced by 50 rupees next Monday", verdict="partially_true", source_name="FactCrescendo", source_url="https://srilanka.factcrescendo.com"),
                FactCheck(claim="Sri Lanka tourist arrivals exceeded 100,000 in May 2026", verdict="real", source_name="FactCheck.lk", source_url="https://factcheck.lk"),
                FactCheck(claim="Alien spacecraft found crashed inside Wilpattu forest reserve", verdict="fake", source_name="FactCrescendo", source_url="https://srilanka.factcrescendo.com"),
                FactCheck(claim="schools will close tomorrow due to extreme weather conditions", verdict="fake", source_name="FactCrescendo", source_url="https://srilanka.factcrescendo.com")
            ]
            db.add_all(fcs)
            db.commit()

        # Seed Source Credibility if empty
        if db.query(SourceCredibility).count() == 0:
            scs = [
                SourceCredibility(domain="dailymirror.lk", source_name="Daily Mirror Sri Lanka", credibility_score=85, category="trusted", notes="Mainstream Sri Lankan newspaper"),
                SourceCredibility(domain="sundaytimes.lk", source_name="Sunday Times Sri Lanka", credibility_score=88, category="trusted", notes="Leading Sri Lankan Sunday newspaper"),
                SourceCredibility(domain="ft.lk", source_name="Daily FT Sri Lanka", credibility_score=90, category="trusted", notes="Sri Lanka's daily business paper"),
                SourceCredibility(domain="newsfirst.lk", source_name="NewsFirst Sri Lanka", credibility_score=80, category="trusted", notes="Popular broadcast and web news source"),
                SourceCredibility(domain="adaderana.lk", source_name="Ada Derana Sri Lanka", credibility_score=82, category="trusted", notes="Major local web and TV news platform"),
                SourceCredibility(domain="bbc.com", source_name="BBC News", credibility_score=92, category="trusted", notes="Global public service broadcaster"),
                SourceCredibility(domain="nytimes.com", source_name="The New York Times", credibility_score=90, category="trusted", notes="Major international newspaper of record"),
                SourceCredibility(domain="reuters.com", source_name="Reuters", credibility_score=95, category="trusted", notes="International news agency"),
                SourceCredibility(domain="factcheck.lk", source_name="FactCheck Sri Lanka", credibility_score=98, category="fact_checker", notes="Dedicated fact-checking platform for Sri Lanka"),
                SourceCredibility(domain="srilanka.factcrescendo.com", source_name="Fact Crescendo Sri Lanka", credibility_score=98, category="fact_checker", notes="IFCN certified local fact-checking group"),
                SourceCredibility(domain="theonion.com", source_name="The Onion", credibility_score=15, category="satire", notes="Parody and satirical news website"),
                SourceCredibility(domain="worldnewsdailyreport.com", source_name="World News Daily Report", credibility_score=5, category="satire", notes="Known hoax and satire outlet"),
                SourceCredibility(domain="nationalreport.com", source_name="National Report", credibility_score=10, category="unreliable", notes="Unreliable clickbait publisher")
            ]
            db.add_all(scs)
            db.commit()

        active_model = db.query(ModelVersion).filter(ModelVersion.is_active == True).first()
        if not active_model:
            mv1 = ModelVersion(
                id=1,
                model_name="Development Baseline Model",
                algorithm="TF-IDF + Logistic Regression",
                artifact_path="app/ml/artifacts/tfidf_logreg_v1.json",
                dataset_name="Synthetic Fake News Dataset",
                dataset_version="v1",
                accuracy=0.9850,
                precision_score=0.9800,
                recall_score=0.9900,
                f1_score=0.9850,
                is_active=True,
                notes="Baseline model trained on synthetic news articles."
            )
            mv2 = ModelVersion(
                id=2,
                model_name="DistilBERT Transformer Candidate",
                algorithm="Transformer Sequence Classification",
                artifact_path="app/ml/artifacts/distilbert_v1.joblib",
                dataset_name="Academic Release Blend",
                dataset_version="v1.1",
                accuracy=0.945,
                precision_score=0.942,
                recall_score=0.948,
                f1_score=0.945,
                is_active=False,
                notes="Candidate transformer model."
            )
            db.add(mv1)
            db.add(mv2)
            db.commit()

        # Seed default users
        admin_user = db.query(User).filter(User.email == "admin@truthlens.com").first()
        if not admin_user:
            admin = User(
                id=1,
                full_name="TruthLens Admin",
                email="admin@truthlens.com",
                password_hash=get_password_hash("adminpassword"),
                role="admin",
                is_active=True
            )
            db.add(admin)
            db.commit()
            
        normal_user = db.query(User).filter(User.email == "user@truthlens.com").first()
        if not normal_user:
            user = User(
                id=2,
                full_name="Regular User",
                email="user@truthlens.com",
                password_hash=get_password_hash("userpassword"),
                role="user",
                is_active=True
            )
            db.add(user)
            db.commit()
    finally:
        db.close()
        
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title="AI-Based Fake News Detection API",
        version="0.1.0",
        description="Backend API for final-year fake news detection project.",
        lifespan=lifespan
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(system_routes.router)
    app.include_router(auth_routes.router, prefix="/api/auth", tags=["auth"])
    app.include_router(prediction_routes.router, prefix="/api/predictions", tags=["predictions"])
    app.include_router(admin_routes.router, prefix="/api/admin", tags=["admin"])
    app.include_router(report_routes.router, prefix="/api/reports", tags=["reports"])

    return app


app = create_app()
