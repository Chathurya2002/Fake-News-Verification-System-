import json
import re
import time
from pathlib import Path

import pandas as pd

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.svm import LinearSVC
from sklearn.model_selection import train_test_split

from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    classification_report
)


DATASET_PATH = Path(
    "ml/data/processed/sinhala_clean.csv"
)

MODEL_PATH = Path(
    "backend/app/ml/artifacts/"
    "tfidf_sinhala_best_model.json"
)

REPORT_PATH = Path(
    "ml/reports/"
    "sinhala_model_comparison.csv"
)


# ==========================================================
# SINHALA TOKENIZER
# ==========================================================

SINHALA_STOPWORDS = {
    "සහ", "එම", "මෙම", "යන", "වන",
    "බව", "සඳහා", "විසින්", "මගින්",
    "මඟින්", "ගැන", "ලෙස", "සිට",
    "නමුත්", "සමඟ", "ඇති", "ඇත",
    "නැත", "විය", "කළ", "කරන",
    "කිරීම", "පිළිබඳ", "තවත්"
}


def sinhala_tokenizer(text):

    tokens = re.findall(
        r"[\u0D80-\u0DFF]+",
        str(text)
    )

    return [
        token
        for token in tokens
        if token not in SINHALA_STOPWORDS
    ]


def main():

    print("=" * 70)
    print("SINHALA FAKE NEWS MODEL COMPARISON")
    print("=" * 70)

    # ======================================================
    # LOAD DATA
    # ======================================================

    df = pd.read_csv(
        DATASET_PATH,
        encoding="utf-8-sig"
    )

    df = df.dropna(
        subset=["content", "label"]
    )

    df["target"] = df["label"].map({
        "real": 0,
        "fake": 1
    })

    print("\nDataset size:")
    print(len(df))

    print("\nClass distribution:")
    print(df["label"].value_counts())

    X = df["content"].astype(str)
    y = df["target"].astype(int)

    # ======================================================
    # TRAIN / TEST SPLIT
    # ======================================================

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.20,
        random_state=42,
        stratify=y
    )

    print(
        "\nTraining samples:",
        len(X_train)
    )

    print(
        "Testing samples:",
        len(X_test)
    )

    # ======================================================
    # TF-IDF
    # ======================================================

    vectorizer = TfidfVectorizer(
    analyzer="char_wb",
    ngram_range=(3, 5),
    min_df=2,
    max_df=0.95,
    max_features=50000,
    sublinear_tf=True,
    norm="l2"
)

    print("\nCreating Sinhala TF-IDF features...")

    X_train_tfidf = (
        vectorizer.fit_transform(
            X_train
        )
    )

    X_test_tfidf = (
        vectorizer.transform(
            X_test
        )
    )

    print(
        "Vocabulary size:",
        len(
            vectorizer
            .get_feature_names_out()
        )
    )

    # ======================================================
    # MODELS
    # ======================================================

    models = {

        "Logistic Regression":
            LogisticRegression(
                C=1.5,
                max_iter=2000,
                class_weight="balanced",
                random_state=42
            ),

        "Linear SVM":
            LinearSVC(
                C=1.0,
                class_weight="balanced",
                random_state=42
            )
    }

    results = []
    trained_models = {}

    # ======================================================
    # TRAIN
    # ======================================================

    for name, model in models.items():

        print("\n" + "-" * 70)
        print("Training:", name)
        print("-" * 70)

        start = time.perf_counter()

        model.fit(
            X_train_tfidf,
            y_train
        )

        training_time = (
            time.perf_counter() - start
        )

        predictions = model.predict(
            X_test_tfidf
        )

        accuracy = accuracy_score(
            y_test,
            predictions
        )

        balanced_accuracy = (
            balanced_accuracy_score(
                y_test,
                predictions
            )
        )

        precision = precision_score(
            y_test,
            predictions,
            pos_label=1,
            zero_division=0
        )

        recall = recall_score(
            y_test,
            predictions,
            pos_label=1,
            zero_division=0
        )

        f1 = f1_score(
            y_test,
            predictions,
            pos_label=1,
            zero_division=0
        )

        cm = confusion_matrix(
            y_test,
            predictions,
            labels=[0, 1]
        )

        tn, fp, fn, tp = cm.ravel()

        print(
            f"\nAccuracy: {accuracy:.4f}"
        )

        print(
            f"Balanced Accuracy: "
            f"{balanced_accuracy:.4f}"
        )

        print(
            f"Precision: {precision:.4f}"
        )

        print(
            f"Recall: {recall:.4f}"
        )

        print(
            f"F1 Score: {f1:.4f}"
        )

        print("\nConfusion Matrix:")
        print(cm)

        print("\nClassification Report:")

        print(
            classification_report(
                y_test,
                predictions,
                target_names=[
                    "Real",
                    "Fake"
                ],
                digits=4,
                zero_division=0
            )
        )

        results.append({
            "model_name": name,
            "accuracy": accuracy,
            "balanced_accuracy":
                balanced_accuracy,
            "precision": precision,
            "recall": recall,
            "f1_score": f1,
            "training_time_sec":
                training_time,
            "tn": tn,
            "fp": fp,
            "fn": fn,
            "tp": tp
        })

        trained_models[name] = model

    # ======================================================
    # COMPARE
    # ======================================================

    results_df = pd.DataFrame(
        results
    )

    results_df = (
        results_df.sort_values(
            by=[
                "f1_score",
                "balanced_accuracy",
                "accuracy"
            ],
            ascending=False
        )
    )

    print("\n" + "=" * 70)
    print("SINHALA MODEL COMPARISON")
    print("=" * 70)

    print(
        results_df[
            [
                "model_name",
                "accuracy",
                "balanced_accuracy",
                "precision",
                "recall",
                "f1_score"
            ]
        ].to_string(index=False)
    )

    # ======================================================
    # BEST MODEL
    # ======================================================

    best_result = results_df.iloc[0]

    best_name = (
        best_result["model_name"]
    )

    best_model = trained_models[
        best_name
    ]

    print("\n" + "=" * 70)

    print(
        "BEST SINHALA MODEL:",
        best_name
    )

    print(
        "Accuracy:",
        round(
            best_result["accuracy"],
            4
        )
    )

    print(
        "F1 Score:",
        round(
            best_result["f1_score"],
            4
        )
    )

    print("=" * 70)

    # ======================================================
    # SAVE JSON ARTIFACT
    # ======================================================

    vocabulary = {
        word: int(index)
        for word, index
        in vectorizer.vocabulary_.items()
    }

    idfs = {
        word: float(
            vectorizer.idf_[index]
        )
        for word, index
        in vectorizer.vocabulary_.items()
    }

    weights = (
        best_model.coef_[0]
        .astype(float)
        .tolist()
    )

    intercept = float(
        best_model.intercept_[0]
    )

    artifact = {

        "language": "sinhala",

        "model_name": best_name,

        "dataset":
            "LIRNEasia Sinhala "
            "Misinformation Corpus",

        "vocabulary": vocabulary,

        "idfs": idfs,

        "weights": weights,

        "intercept": intercept,

        "classes": [
            "real",
            "fake"
        ],

        "metrics": {
            "accuracy":
                float(
                    best_result[
                        "accuracy"
                    ]
                ),

            "balanced_accuracy":
                float(
                    best_result[
                        "balanced_accuracy"
                    ]
                ),

            "precision":
                float(
                    best_result[
                        "precision"
                    ]
                ),

            "recall":
                float(
                    best_result[
                        "recall"
                    ]
                ),

            "f1_score":
                float(
                    best_result[
                        "f1_score"
                    ]
                )
        }
    }

    MODEL_PATH.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    with open(
        MODEL_PATH,
        "w",
        encoding="utf-8"
    ) as file:

        json.dump(
            artifact,
            file,
            ensure_ascii=False
        )

    # ======================================================
    # SAVE REPORT
    # ======================================================

    REPORT_PATH.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    results_df.to_csv(
        REPORT_PATH,
        index=False
    )

    print("\nSinhala model saved to:")

    print(MODEL_PATH)

    print("\nComparison report saved to:")

    print(REPORT_PATH)

    print("\n" + "=" * 70)
    print(
        "SINHALA MODEL TRAINING "
        "COMPLETED SUCCESSFULLY"
    )
    print("=" * 70)


if __name__ == "__main__":
    main()