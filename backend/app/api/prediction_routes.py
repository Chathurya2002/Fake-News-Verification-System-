from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File
import shutil
from pathlib import Path
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.config import settings
from app.core.database import get_db
from app.core.models import User, NewsSubmission, Prediction, ModelVersion
from app.core.security import get_current_user, get_current_user_or_guest
from app.ml.inference import predict_news

router = APIRouter()


class PredictionRequest(BaseModel):
    input_type: str = Field(pattern="^(text|url|social)$")
    content: str = Field(min_length=1)


class ModelVersionResponse(BaseModel):
    id: int
    model_name: str
    algorithm: str


class FactCheckResultResponse(BaseModel):
    claim: str
    verdict: str
    source_name: str
    source_url: str
    checked_date: str | None = None
    similarity_score: float


class SourceCredibilityResponse(BaseModel):
    source_name: str
    domain: str
    credibility_score: int
    category: str
    notes: str | None = None
    status: str


class WordImportanceItem(BaseModel):
    word: str
    weight: float
    is_fake_indicator: bool


class PredictionResponse(BaseModel):
    submission_id: int
    prediction_id: int
    label: str
    confidence_score: float
    fake_probability: float | None
    real_probability: float | None
    explanation: str
    word_importances: list[WordImportanceItem] | None = None
    fact_check_results: list[FactCheckResultResponse] | None = None
    source_credibility: SourceCredibilityResponse | None = None
    model_version: ModelVersionResponse
    processing_time_ms: int


class HistoryItem(BaseModel):
    prediction_id: int
    submitted_at: str
    label: str
    confidence_score: float
    source_type: str
    content: str


class HistoryResponse(BaseModel):
    items: list[HistoryItem]
    page: int
    page_size: int
    total: int


class RelatedPredictionResponse(BaseModel):
    prediction_id: int
    label: str
    confidence_score: float
    content_preview: str
    similarity_score: float


@router.post("", response_model=PredictionResponse, status_code=201)
def create_prediction(
    payload: PredictionRequest,
    current_user: User = Depends(get_current_user_or_guest),
    db: Session = Depends(get_db)
) -> PredictionResponse:
    if len(payload.content) > settings.max_news_text_length:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="News content exceeds maximum configured length."
        )

    # 1. Get the active model version
    active_model = db.query(ModelVersion).filter(ModelVersion.is_active == True).first()
    if not active_model:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No active prediction model version is configured."
        )

    # 2. Perform the classification (with URL text scraping if input_type is url)
    content_to_classify = payload.content
    if payload.input_type in ["url", "social"]:
        from app.services.text_extraction_service import extract_text_from_url
        try:
            content_to_classify = extract_text_from_url(payload.content)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=str(e)
            )

    result = predict_news(content_to_classify)

    # 3. Store News Submission
    submission = NewsSubmission(
        user_id=current_user.id,
        input_text=content_to_classify,
        source_url=payload.content if payload.input_type in ["url", "social"] else None,
        source_type=payload.input_type,
        language="en"
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)

    # Run Fact verification & Source Credibility services
    from app.services.fact_verification_service import verify_claim
    from app.services.credibility_scoring_service import check_source_credibility
    import json

    fc_results = verify_claim(content_to_classify, db)
    sc_results = check_source_credibility(
        submission.source_url,
        content_to_classify,
        db
    )

    # 4. Store Prediction
    prediction = Prediction(
        submission_id=submission.id,
        model_version_id=active_model.id,
        predicted_label=result.label,
        confidence_score=result.confidence_score,
        fake_probability=result.fake_probability,
        real_probability=result.real_probability,
        explanation=result.explanation,
        word_importances=json.dumps(result.word_importances) if result.word_importances else None,
        fact_check_results=json.dumps(fc_results) if fc_results else None,
        source_credibility_results=json.dumps(sc_results) if sc_results else None,
        processing_time_ms=result.processing_time_ms
    )
    db.add(prediction)
    db.commit()
    db.refresh(prediction)

    version_response = ModelVersionResponse(
        id=int(active_model.id),
        model_name=active_model.model_name,
        algorithm=active_model.algorithm
    )

    return PredictionResponse(
        submission_id=int(submission.id),
        prediction_id=int(prediction.id),
        label=prediction.predicted_label,
        confidence_score=float(prediction.confidence_score),
        fake_probability=float(prediction.fake_probability) if prediction.fake_probability is not None else None,
        real_probability=float(prediction.real_probability) if prediction.real_probability is not None else None,
        explanation=prediction.explanation,
        word_importances=result.word_importances,
        fact_check_results=fc_results,
        source_credibility=sc_results,
        model_version=version_response,
        processing_time_ms=prediction.processing_time_ms
    )


@router.post("/image", response_model=PredictionResponse, status_code=201)
def analyze_image_prediction(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user_or_guest),
    db: Session = Depends(get_db)
) -> PredictionResponse:
    active_model = db.query(ModelVersion).filter(ModelVersion.is_active == True).first()
    if not active_model:
        raise HTTPException(status_code=500, detail="No active prediction model version is configured.")

    upload_dir = Path("uploads")
    upload_dir.mkdir(exist_ok=True)
    file_path = upload_dir / file.filename
    
    file_bytes = file.file.read()
    with open(file_path, "wb") as f:
        f.write(file_bytes)
        
    from app.services.image_verification_service import analyze_image
    result = analyze_image(file_bytes, file.filename)
    
    submission = NewsSubmission(
        user_id=current_user.id,
        input_text=file.filename,
        source_type="image",
        media_path=str(file_path).replace('\\', '/'),
        media_type=file.content_type,
        language="en"
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)
    
    import json
    prediction = Prediction(
        submission_id=submission.id,
        model_version_id=active_model.id,
        predicted_label=result.label,
        confidence_score=result.confidence_score,
        fake_probability=result.fake_probability,
        real_probability=result.real_probability,
        explanation=result.explanation,
        word_importances=json.dumps(result.word_importances) if result.word_importances else None,
        processing_time_ms=result.processing_time_ms
    )
    db.add(prediction)
    db.commit()
    db.refresh(prediction)
    
    version_response = ModelVersionResponse(
        id=int(active_model.id),
        model_name=active_model.model_name,
        algorithm=active_model.algorithm
    )
    
    return PredictionResponse(
        submission_id=int(submission.id),
        prediction_id=int(prediction.id),
        label=prediction.predicted_label,
        confidence_score=float(prediction.confidence_score),
        fake_probability=float(prediction.fake_probability) if prediction.fake_probability is not None else None,
        real_probability=float(prediction.real_probability) if prediction.real_probability is not None else None,
        explanation=prediction.explanation,
        word_importances=result.word_importances,
        fact_check_results=None,
        source_credibility=None,
        model_version=version_response,
        processing_time_ms=prediction.processing_time_ms
    )



@router.get("/history", response_model=HistoryResponse)
def get_prediction_history(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> HistoryResponse:
    # Query all predictions belonging to current user
    query = db.query(Prediction).join(NewsSubmission).filter(NewsSubmission.user_id == current_user.id)
    total = query.count()
    
    # Sort by submitted_at DESC
    predictions = query.order_by(Prediction.predicted_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    
    items = []
    for p in predictions:
        items.append(HistoryItem(
            prediction_id=int(p.id),
            submitted_at=p.predicted_at.isoformat() + "Z" if p.predicted_at else datetime.utcnow().isoformat() + "Z",
            label=p.predicted_label,
            confidence_score=float(p.confidence_score),
            source_type=p.submission.source_type,
            content=p.submission.input_text
        ))
        
    return HistoryResponse(
        items=items,
        page=page,
        page_size=page_size,
        total=total
    )


class PredictionDetailResponse(BaseModel):
    prediction_id: int
    submission_id: int
    input_preview: str
    source_url: str | None
    source_type: str
    label: str
    confidence_score: float
    fake_probability: float | None
    real_probability: float | None
    explanation: str
    word_importances: list[WordImportanceItem] | None = None
    fact_check_results: list[FactCheckResultResponse] | None = None
    source_credibility: SourceCredibilityResponse | None = None
    model_version: ModelVersionResponse
    related_predictions: list[RelatedPredictionResponse] | None = None
    processing_time_ms: int
    submitted_at: str
    predicted_at: str


@router.get("/{prediction_id}", response_model=PredictionDetailResponse)
def get_prediction_detail(
    prediction_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> PredictionDetailResponse:
    prediction = db.query(Prediction).filter(Prediction.id == prediction_id).first()
    if not prediction:
        raise HTTPException(status_code=404, detail="Prediction not found.")
        
    submission = prediction.submission
    if current_user.role != "admin" and submission.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this prediction detail.")
        
    version_response = ModelVersionResponse(
        id=int(prediction.model_version.id),
        model_name=prediction.model_version.model_name,
        algorithm=prediction.model_version.algorithm
    )
    
    import json
    wi = json.loads(prediction.word_importances) if prediction.word_importances else None
    fcr = json.loads(prediction.fact_check_results) if prediction.fact_check_results else None
    scr = json.loads(prediction.source_credibility_results) if prediction.source_credibility_results else None

    # Calculate related predictions
    from app.services.fact_verification_service import tokenize_and_clean
    current_tokens = tokenize_and_clean(submission.input_text)
    related_list = []
    if current_tokens:
        other_predictions = db.query(Prediction).join(NewsSubmission).filter(
            Prediction.id != prediction_id
        ).order_by(Prediction.predicted_at.desc()).limit(100).all()
        
        for p in other_predictions:
            other_tokens = tokenize_and_clean(p.submission.input_text)
            if not other_tokens:
                continue
            intersection = current_tokens.intersection(other_tokens)
            if not intersection:
                continue
            union = current_tokens.union(other_tokens)
            score = len(intersection) / len(union) if union else 0
            if score > 0.05:
                related_list.append(RelatedPredictionResponse(
                    prediction_id=int(p.id),
                    label=p.predicted_label,
                    confidence_score=float(p.confidence_score),
                    content_preview=p.submission.input_text[:120] + "...",
                    similarity_score=round(score, 4)
                ))
        related_list.sort(key=lambda x: x.similarity_score, reverse=True)
        related_list = related_list[:3]

    return PredictionDetailResponse(
        prediction_id=int(prediction.id),
        submission_id=int(submission.id),
        input_preview=submission.input_text,
        source_url=submission.source_url,
        source_type=submission.source_type,
        label=prediction.predicted_label,
        confidence_score=float(prediction.confidence_score),
        fake_probability=float(prediction.fake_probability) if prediction.fake_probability is not None else None,
        real_probability=float(prediction.real_probability) if prediction.real_probability is not None else None,
        explanation=prediction.explanation,
        word_importances=wi,
        fact_check_results=fcr,
        source_credibility=scr,
        model_version=version_response,
        related_predictions=related_list if related_list else None,
        processing_time_ms=prediction.processing_time_ms,
        submitted_at=submission.submitted_at.isoformat() + "Z" if submission.submitted_at else "",
        predicted_at=prediction.predicted_at.isoformat() + "Z" if prediction.predicted_at else ""
    )
