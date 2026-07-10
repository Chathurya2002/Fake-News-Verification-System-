import re
import json
import math
import collections
from pathlib import Path
from dataclasses import dataclass
from time import perf_counter
from app.core.config import settings


@dataclass(frozen=True)
class PredictionResult:
    label: str
    confidence_score: float
    fake_probability: float | None
    real_probability: float | None
    explanation: str
    processing_time_ms: int
    word_importances: list[dict] | None = None


_model = None
_loaded_model_path = None

# Sinhala stop words list for tokenization
SINHALA_STOPWORDS = {
    "සහ", "නම්", "එම", "මෙම", "යන", "වන", "ලැබූ", "කරන", "කරන්න", "ඇත", "මඟින්", "විසින්",
    "නොව", "සඳහා", "ගැන", "වෙත", "ලෙස", "සිට", "තවද", "වෙතින්", "වැනි", "මෙන්ම", "භාවිතා",
    "කරයි", "කරනු", "කර ඇත", "කර ඇති", "ලැබේ", "පවතී", "බව", "කළ", "නැත", "තවත්", "මෙමඟින්",
    "මගින්", "කිරීම", "සඳහන්", "පිළිබඳ", "පිළිබඳව", "පමණක්", "කළේය", "විය", "නමුත්", "සමඟ",
    "වෙති", "හේතුවෙන්", "තිබේ", "තිබූ", "ලැබී", "ඇති", "කරනවා", "නිසා", "එසේ", "නැවත"
}

def get_model():
    global _model, _loaded_model_path
    
    # 1. Query the database to find the active model version's artifact path
    db_paths = [
        Path("backend/fake_news.db"),
        Path("../backend/fake_news.db"),
        Path("fake_news.db")
    ]
    db_file = None
    for p in db_paths:
        if p.exists():
            db_file = p
            break
            
    active_artifact_path = settings.active_model_path
    if db_file:
        import sqlite3
        try:
            conn = sqlite3.connect(db_file)
            cursor = conn.cursor()
            cursor.execute("SELECT artifact_path FROM model_versions WHERE is_active = 1 LIMIT 1")
            row = cursor.fetchone()
            if row:
                active_artifact_path = row[0]
            conn.close()
        except Exception as e:
            print(f"Error querying active model path from database: {e}")

    model_path = Path(active_artifact_path)
    
    # Standardize path: handle cases where the python process is run in backend subfolder
    if not model_path.exists():
        alternative_path = Path("backend") / model_path
        if alternative_path.exists():
            model_path = alternative_path
        else:
            alternative_path2 = Path("..") / model_path
            if alternative_path2.exists():
                model_path = alternative_path2

    # 2. Check if the active path has changed, and load/reload the model
    if _model is None or _loaded_model_path != str(model_path):
        if model_path.exists():
            try:
                with open(model_path, "r", encoding="utf-8") as f:
                    _model = json.load(f)
                _loaded_model_path = str(model_path)
                print(f"Successfully loaded active classifier model from {model_path}")
            except Exception as e:
                print(f"Error loading model from {model_path}: {e}")
        else:
            print(f"Model file not found at {model_path}. Fallback rule-based active.")
            _model = None
            _loaded_model_path = None
            
    return _model


def tokenize(text):
    tokens = re.findall(r'[a-zA-Z\u0d80-\u0dff]+', text.lower())
    return [t for t in tokens if t not in SINHALA_STOPWORDS]


def sigmoid(z):
    z = max(-50.0, min(50.0, z))
    return 1.0 / (1.0 + math.exp(-z))


def generate_explanation(vocab, weights, idfs, tokens, label) -> str:
    try:
        counts = collections.Counter(tokens)
        word_scores = []
        for word, count in counts.items():
            if word in vocab:
                idx = vocab[word]
                tfidf_val = count * idfs[word]
                weight = weights[idx]
                score = weight * tfidf_val
                word_scores.append((word, score))
                
        if not word_scores:
            return "No strong indicative terms found in the text."
            
        # If label is 'fake' (class 1, positive coefficients), we sort descending.
        # If label is 'real' (class 0, negative coefficients), we sort ascending.
        if label == "fake":
            word_scores.sort(key=lambda x: x[1], reverse=True)
        else:
            word_scores.sort(key=lambda x: x[1], reverse=False)
            
        top_words = [word for word, score in word_scores[:5]]
        if top_words:
            return f"The text was classified as {label} due to the presence and frequency of characteristic terms: {', '.join(top_words)}."
        return "No specific indicative terms were highlighted."
    except Exception as e:
        return f"Explanation unavailable: {str(e)}"


def predict_news(text: str) -> PredictionResult:
    start = perf_counter()
    model = get_model()

    if model is not None:
        try:
            tokens = tokenize(text)
            vocab = model["vocabulary"]
            idfs = model["idfs"]
            weights = model["weights"]
            intercept = model["intercept"]

            # Compute L2-normalized TF-IDF sparse vector
            counts = collections.Counter(tokens)
            doc_vector = {}
            sq_sum = 0.0
            word_scores = []
            
            for word, count in counts.items():
                if word in vocab:
                    idx = vocab[word]
                    val = count * idfs[word]
                    doc_vector[idx] = val
                    sq_sum += val * val
                    
                    # Calculate weight contribution for explainable AI
                    weight = weights[idx]
                    score = weight * val
                    word_scores.append((word, score))

            norm = math.sqrt(sq_sum)
            if norm > 0:
                for idx in doc_vector:
                    doc_vector[idx] /= norm

            # Compute logistic regression prediction
            z = sum(doc_vector[idx] * weights[idx] for idx in doc_vector) + intercept
            fake_probability = sigmoid(z)
            real_probability = 1.0 - fake_probability

            label = "fake" if fake_probability >= 0.5 else "real"
            confidence_score = fake_probability if label == "fake" else real_probability
            
            explanation = generate_explanation(vocab, weights, idfs, tokens, label)
            
            # Format word importances
            word_importances = []
            for word, score in word_scores:
                word_importances.append({
                    "word": word,
                    "weight": round(float(score), 4),
                    "is_fake_indicator": bool(score > 0)
                })
            # Sort by absolute weight descending
            word_importances.sort(key=lambda x: abs(x["weight"]), reverse=True)
            
            elapsed_ms = int((perf_counter() - start) * 1000)

            return PredictionResult(
                label=label,
                confidence_score=round(confidence_score, 4),
                fake_probability=round(fake_probability, 4),
                real_probability=round(real_probability, 4),
                explanation=explanation,
                processing_time_ms=max(1, elapsed_ms),
                word_importances=word_importances
            )
        except Exception as e:
            print(f"Error during model prediction: {e}. Falling back to rules.")

    # Rule-based fallback if model is missing or prediction fails
    lowered = text.lower()
    suspicious_terms = ["shocking", "miracle", "secret", "urgent", "exposed", "fake"]
    matches = [term for term in suspicious_terms if term in lowered]

    fake_probability = min(0.95, 0.35 + (0.12 * len(matches)))
    real_probability = round(1.0 - fake_probability, 4)
    label = "fake" if fake_probability >= 0.5 else "real"

    explanation = (
        "Rule-based prediction. No trained model available. Matches: " + ", ".join(matches)
        if matches
        else "Rule-based prediction. No trained model available and no key patterns detected."
    )

    word_importances = []
    for term in suspicious_terms:
        if term in lowered:
            word_importances.append({
                "word": term,
                "weight": 1.0,
                "is_fake_indicator": True
            })

    elapsed_ms = int((perf_counter() - start) * 1000)

    return PredictionResult(
        label=label,
        confidence_score=round(max(fake_probability, real_probability), 4),
        fake_probability=round(fake_probability, 4),
        real_probability=real_probability,
        explanation=explanation,
        processing_time_ms=max(1, elapsed_ms),
        word_importances=word_importances
    )
