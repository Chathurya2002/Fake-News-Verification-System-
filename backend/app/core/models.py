from sqlalchemy import Column, Integer, BigInteger, String, Text, Boolean, DateTime, Numeric, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    full_name = Column(String(150), nullable=False)
    email = Column(String(255), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="user")  # 'user' or 'admin'
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    submissions = relationship("NewsSubmission", back_populates="user", cascade="all, delete-orphan")


class ModelVersion(Base):
    __tablename__ = "model_versions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    model_name = Column(String(150), nullable=False)
    algorithm = Column(String(150), nullable=False)
    artifact_path = Column(String(500), nullable=False)
    dataset_name = Column(String(200), nullable=True)
    dataset_version = Column(String(100), nullable=True)
    accuracy = Column(Numeric(5, 4), nullable=True)
    precision_score = Column(Numeric(5, 4), nullable=True)
    recall_score = Column(Numeric(5, 4), nullable=True)
    f1_score = Column(Numeric(5, 4), nullable=True)
    trained_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, nullable=False, default=False)
    notes = Column(Text, nullable=True)

    predictions = relationship("Prediction", back_populates="model_version")


class NewsSubmission(Base):
    __tablename__ = "news_submissions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    input_text = Column(Text, nullable=False)
    source_url = Column(String(1000), nullable=True)
    source_type = Column(String(50), nullable=False, default="text")  # 'text' or 'url' or 'image'
    media_path = Column(String(500), nullable=True)
    media_type = Column(String(50), nullable=True)
    language = Column(String(20), default="en")
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="submissions")
    prediction = relationship("Prediction", back_populates="submission", uselist=False, cascade="all, delete-orphan")


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    submission_id = Column(Integer, ForeignKey("news_submissions.id", ondelete="CASCADE"), nullable=False, unique=True)
    model_version_id = Column(Integer, ForeignKey("model_versions.id", ondelete="RESTRICT"), nullable=False)
    predicted_label = Column(String(50), nullable=False)  # 'fake' or 'real'
    confidence_score = Column(Numeric(5, 4), nullable=False)
    fake_probability = Column(Numeric(5, 4), nullable=True)
    real_probability = Column(Numeric(5, 4), nullable=True)
    explanation = Column(Text, nullable=True)
    word_importances = Column(Text, nullable=True)  # JSON list
    fact_check_results = Column(Text, nullable=True)  # JSON list
    source_credibility_results = Column(Text, nullable=True)  # JSON dict
    processing_time_ms = Column(Integer, nullable=True)
    predicted_at = Column(DateTime(timezone=True), server_default=func.now())

    submission = relationship("NewsSubmission", back_populates="prediction")
    model_version = relationship("ModelVersion", back_populates="predictions")


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    report_type = Column(String(100), nullable=False)
    title = Column(String(200), nullable=False)
    file_path = Column(String(500), nullable=True)
    generated_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")


class FactCheck(Base):
    __tablename__ = "fact_checks"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    claim = Column(Text, nullable=False)
    verdict = Column(String(50), nullable=False)  # 'fake', 'real', 'misleading', 'partially_true'
    source_name = Column(String(100), nullable=False)
    source_url = Column(String(1000), nullable=False)
    checked_date = Column(DateTime(timezone=True), server_default=func.now())


class SourceCredibility(Base):
    __tablename__ = "source_credibility"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    domain = Column(String(255), unique=True, index=True, nullable=False)
    source_name = Column(String(150), nullable=False)
    credibility_score = Column(Integer, nullable=False)  # 0 to 100
    category = Column(String(50), nullable=False)  # 'trusted', 'unreliable', 'satire', 'fact_checker'
    notes = Column(Text, nullable=True)


def check_and_update_db_schema():
    # Run dynamic alters for existing databases
    import sqlite3
    from pathlib import Path
    db_paths = ["backend/fake_news.db", "fake_news.db", "../backend/fake_news.db"]
    for p in db_paths:
        path = Path(p)
        if path.exists():
            try:
                conn = sqlite3.connect(path)
                cursor = conn.cursor()
                cursor.execute("PRAGMA table_info(predictions)")
                columns = [col[1] for col in cursor.fetchall()]
                if "word_importances" not in columns:
                    cursor.execute("ALTER TABLE predictions ADD COLUMN word_importances TEXT")
                if "fact_check_results" not in columns:
                    cursor.execute("ALTER TABLE predictions ADD COLUMN fact_check_results TEXT")
                if "source_credibility_results" not in columns:
                    cursor.execute("ALTER TABLE predictions ADD COLUMN source_credibility_results TEXT")
                    
                cursor.execute("PRAGMA table_info(news_submissions)")
                sub_columns = [col[1] for col in cursor.fetchall()]
                if "media_path" not in sub_columns:
                    cursor.execute("ALTER TABLE news_submissions ADD COLUMN media_path TEXT")
                if "media_type" not in sub_columns:
                    cursor.execute("ALTER TABLE news_submissions ADD COLUMN media_type TEXT")

                conn.commit()
                conn.close()
                print(f"Checked and updated columns on SQLite database: {path}")
            except Exception as e:
                print(f"Error updating predictions schema for {path}: {e}")

