import re
import json
import math
import collections
from pathlib import Path
from dataclasses import dataclass
from time import perf_counter

import joblib


# ============================================================
# PREDICTION RESULT
# ============================================================

@dataclass(frozen=True)
class PredictionResult:
    label: str
    confidence_score: float
    fake_probability: float | None
    real_probability: float | None
    explanation: str
    processing_time_ms: int
    word_importances: list[dict] | None = None


# ============================================================
# MODEL PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

ARTIFACT_DIR = BASE_DIR / "artifacts"

ENGLISH_MODEL_PATH = (
    ARTIFACT_DIR / "tfidf_best_model.json"
)

SINHALA_MODEL_PATH = (
    ARTIFACT_DIR / "sinhala_final_model.joblib"
)


# ============================================================
# MODEL CACHE
# ============================================================

_english_model = None
_sinhala_model = None


# ============================================================
# SINHALA STOP WORDS
# ============================================================

SINHALA_STOPWORDS = {
    "සහ", "නම්", "එම", "මෙම", "යන", "වන",
    "ලැබූ", "කරන", "කරන්න", "ඇත", "මඟින්",
    "විසින්", "නොව", "සඳහා", "ගැන", "වෙත",
    "ලෙස", "සිට", "තවද", "වෙතින්", "වැනි",
    "මෙන්ම", "බව", "කළ", "නැත", "තවත්",
    "මගින්", "කිරීම", "සඳහන්", "පිළිබඳ",
    "පිළිබඳව", "පමණක්", "විය", "නමුත්",
    "සමඟ", "තිබේ", "තිබූ", "ලැබී", "ඇති",
    "කරනවා", "නිසා", "එසේ", "නැවත"
}


# ============================================================
# LANGUAGE DETECTION
# ============================================================

def detect_language(text: str) -> str:

    text = str(text)

    sinhala_chars = re.findall(
        r"[\u0D80-\u0DFF]",
        text
    )

    english_chars = re.findall(
        r"[A-Za-z]",
        text
    )

    sinhala_count = len(sinhala_chars)
    english_count = len(english_chars)

    total_letters = (
        sinhala_count
        + english_count
    )

    if total_letters == 0:
        return "english"

    sinhala_ratio = (
        sinhala_count
        / total_letters
    )

    # Sinhala article may contain English names,
    # URLs or organisation names.
    if (
        sinhala_count >= 3
        and sinhala_ratio >= 0.20
    ):
        return "sinhala"

    return "english"


# ============================================================
# LOAD ENGLISH MODEL
# ============================================================

def get_english_model():

    global _english_model

    if _english_model is None:

        if not ENGLISH_MODEL_PATH.exists():

            print(
                "English model not found:",
                ENGLISH_MODEL_PATH
            )

            return None

        try:

            with open(
                ENGLISH_MODEL_PATH,
                "r",
                encoding="utf-8"
            ) as file:

                _english_model = json.load(
                    file
                )

            print(
                "English model loaded:"
            )

            print(
                _english_model.get(
                    "model_name",
                    "Unknown"
                )
            )

        except Exception as error:

            print(
                "English model loading error:",
                error
            )

            _english_model = None

    return _english_model


# ============================================================
# LOAD SINHALA MODEL
# ============================================================

def get_sinhala_model():

    global _sinhala_model

    if _sinhala_model is None:

        if not SINHALA_MODEL_PATH.exists():

            print(
                "Sinhala model not found:",
                SINHALA_MODEL_PATH
            )

            return None

        try:

            _sinhala_model = joblib.load(
                SINHALA_MODEL_PATH
            )

            print(
                "Sinhala model loaded successfully."
            )

        except Exception as error:

            print(
                "Sinhala model loading error:",
                error
            )

            _sinhala_model = None

    return _sinhala_model


# ============================================================
# ENGLISH TOKENIZER
# ============================================================

def english_tokenize(text: str):

    tokens = re.findall(
        r"[a-zA-Z\u0D80-\u0DFF]+",
        str(text).lower()
    )

    return [
        token
        for token in tokens
        if token not in SINHALA_STOPWORDS
    ]


# ============================================================
# ENGLISH TF-IDF VECTOR
# ============================================================

def build_english_vector(
    tokens,
    vocabulary,
    idfs
):

    counts = collections.Counter(
        tokens
    )

    vector = {}

    squared_sum = 0.0

    for word, count in counts.items():

        if (
            word not in vocabulary
            or word not in idfs
        ):
            continue

        index = vocabulary[word]

        # Training used raw TF * IDF
        value = (
            float(count)
            * float(idfs[word])
        )

        vector[index] = value

        squared_sum += (
            value * value
        )

    # L2 normalization
    norm = math.sqrt(
        squared_sum
    )

    if norm > 0:

        for index in list(
            vector.keys()
        ):

            vector[index] /= norm

    return vector


# ============================================================
# SVM MARGIN CONFIDENCE
# ============================================================

def svm_margin_confidence(
    decision_score: float
) -> float:

    """
    Linear SVM does not provide native calibrated
    probabilities.

    This converts decision margin magnitude into a
    simple display confidence value.
    """

    magnitude = abs(
        float(decision_score)
    )

    confidence = (
        1.0
        / (
            1.0
            + math.exp(-magnitude)
        )
    )

    return min(
        max(
            confidence,
            0.50
        ),
        0.99
    )


# ============================================================
# ENGLISH PREDICTION
# ============================================================

def predict_english(
    text: str
) -> PredictionResult:

    start = perf_counter()

    model = get_english_model()

    if model is None:

        raise RuntimeError(
            "English trained model could not be loaded."
        )

    vocabulary = model[
        "vocabulary"
    ]

    idfs = model[
        "idfs"
    ]

    weights = model[
        "weights"
    ]

    intercept = float(
        model["intercept"]
    )

    tokens = english_tokenize(
        text
    )

    vector = build_english_vector(
        tokens,
        vocabulary,
        idfs
    )

    # --------------------------------------------------------
    # UNKNOWN / VERY LOW VOCABULARY COVERAGE
    # --------------------------------------------------------

    if not vector:

        elapsed_ms = int(
            (
                perf_counter()
                - start
            )
            * 1000
        )

        return PredictionResult(
            label="real",
            confidence_score=0.50,
            fake_probability=None,
            real_probability=None,
            explanation=(
                "Language detected: English. "
                "The text contained too few terms "
                "recognised by the trained English "
                "model, so this prediction has low "
                "confidence."
            ),
            processing_time_ms=max(
                1,
                elapsed_ms
            ),
            word_importances=[]
        )

    # --------------------------------------------------------
    # LINEAR SVM DECISION SCORE
    # --------------------------------------------------------

    decision_score = (

        sum(
            vector[index]
            * float(weights[index])

            for index in vector

            if index < len(weights)
        )

        + intercept
    )

    # Class 1 = Fake
    # Class 0 = Real

    label = (
        "fake"
        if decision_score >= 0
        else "real"
    )

    confidence = svm_margin_confidence(
        decision_score
    )

    # --------------------------------------------------------
    # WORD CONTRIBUTIONS
    # --------------------------------------------------------

    reverse_vocabulary = {
        index: word
        for word, index
        in vocabulary.items()
    }

    importances = []

    for index, tfidf_value in vector.items():

        if index >= len(weights):
            continue

        word = reverse_vocabulary.get(
            index
        )

        if not word:
            continue

        contribution = (
            tfidf_value
            * float(weights[index])
        )

        importances.append(
            {
                "word": word,
                "weight": round(
                    contribution,
                    4
                ),
                "is_fake_indicator":
                    contribution > 0
            }
        )

    importances.sort(
        key=lambda item:
            abs(item["weight"]),
        reverse=True
    )

    importances = importances[:20]

    important_words = [
        item["word"]
        for item in importances[:5]
    ]

    explanation = (
        f"Language detected: English. "
        f"The final English Linear SVM model "
        f"classified the article as "
        f"{label.upper()}."
    )

    if important_words:

        explanation += (
            " Important TF-IDF terms included: "
            + ", ".join(
                important_words
            )
            + "."
        )

    elapsed_ms = int(
        (
            perf_counter()
            - start
        )
        * 1000
    )

    return PredictionResult(
        label=label,
        confidence_score=round(
            confidence,
            4
        ),
        # Linear SVM does not provide
        # calibrated probabilities.
        fake_probability=None,
        real_probability=None,
        explanation=explanation,
        processing_time_ms=max(
            1,
            elapsed_ms
        ),
        word_importances=importances
    )


# ============================================================
# SINHALA PREDICTION
# ============================================================

def predict_sinhala(
    text: str
) -> PredictionResult:

    start = perf_counter()

    model = get_sinhala_model()

    if model is None:

        raise RuntimeError(
            "Sinhala trained model could not be loaded."
        )

    clean_text = re.sub(
        r"\s+",
        " ",
        str(text)
    ).strip()

    # --------------------------------------------------------
    # CLASSIFICATION
    # --------------------------------------------------------

    prediction = model.predict(
        [clean_text]
    )[0]

    label = str(
        prediction
    ).lower()

    fake_probability = None
    real_probability = None
    confidence = 0.50

    # --------------------------------------------------------
    # LOGISTIC REGRESSION PROBABILITIES
    # --------------------------------------------------------

    if hasattr(
        model,
        "predict_proba"
    ):

        probabilities = (
            model.predict_proba(
                [clean_text]
            )[0]
        )

        classes = list(
            model.classes_
        )

        probability_map = {
            str(class_name).lower():
                float(probability)

            for class_name, probability
            in zip(
                classes,
                probabilities
            )
        }

        fake_probability = (
            probability_map.get(
                "fake"
            )
        )

        real_probability = (
            probability_map.get(
                "real"
            )
        )

        if label == "fake":

            confidence = (
                fake_probability
                if fake_probability is not None
                else 0.50
            )

        else:

            confidence = (
                real_probability
                if real_probability is not None
                else 0.50
            )

    # --------------------------------------------------------
    # FALLBACK FOR LINEAR SVM IF MODEL EVER CHANGES
    # --------------------------------------------------------

    elif hasattr(
        model,
        "decision_function"
    ):

        decision = float(
            model.decision_function(
                [clean_text]
            )[0]
        )

        confidence = (
            svm_margin_confidence(
                decision
            )
        )

    explanation = (
        "Language detected: Sinhala. "
        "The Sinhala fake-news classifier "
        f"classified the article as "
        f"{label.upper()}. "
        "The Sinhala model is an experimental "
        "extension evaluated on a limited "
        "independent real-data sample."
    )

    elapsed_ms = int(
        (
            perf_counter()
            - start
        )
        * 1000
    )

    return PredictionResult(
        label=label,
        confidence_score=round(
            float(confidence),
            4
        ),
        fake_probability=(
            round(
                fake_probability,
                4
            )
            if fake_probability is not None
            else None
        ),
        real_probability=(
            round(
                real_probability,
                4
            )
            if real_probability is not None
            else None
        ),
        explanation=explanation,
        processing_time_ms=max(
            1,
            elapsed_ms
        ),
        word_importances=[]
    )


# ============================================================
# MAIN BILINGUAL PREDICTION
# ============================================================

def predict_news(
    text: str
) -> PredictionResult:

    if not text or not str(
        text
    ).strip():

        return PredictionResult(
            label="real",
            confidence_score=0.50,
            fake_probability=None,
            real_probability=None,
            explanation=(
                "No usable news text was provided."
            ),
            processing_time_ms=1,
            word_importances=[]
        )

    language = detect_language(
        text
    )

    try:

        if language == "sinhala":

            return predict_sinhala(
                text
            )

        return predict_english(
            text
        )

    except Exception as error:

        print(
            "Prediction error:",
            error
        )

        return PredictionResult(
            label="real",
            confidence_score=0.50,
            fake_probability=None,
            real_probability=None,
            explanation=(
                "The trained model could not "
                "complete the prediction. "
                "Please check the model files."
            ),
            processing_time_ms=1,
            word_importances=[]
        )