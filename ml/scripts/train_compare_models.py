import json
import re
import sqlite3
import time
from pathlib import Path

import pandas as pd

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.svm import LinearSVC
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    classification_report,
)
from sklearn.model_selection import train_test_split


# ============================================================
# 1. SINHALA STOP WORDS
# ============================================================

SINHALA_STOPWORDS = {
    "සහ", "නම්", "එම", "මෙම", "යන", "වන", "ලැබූ", "කරන", "කරන්න",
    "ඇත", "මඟින්", "විසින්", "නොව", "සඳහා", "ගැන", "වෙත", "ලෙස",
    "සිට", "තවද", "වෙතින්", "වැනි", "මෙන්ම", "භාවිතා", "කරයි",
    "කරනු", "කර ඇත", "කර ඇති", "ලැබේ", "පවතී", "බව", "කළ",
    "නැත", "තවත්", "මෙමඟින්", "මගින්", "කිරීම", "සඳහන්",
    "පිළිබඳ", "පිළිබඳව", "පමණක්", "කළේය", "විය", "නමුත්",
    "සමඟ", "වෙති", "හේතුවෙන්", "තිබේ", "තිබූ", "ලැබී",
    "ඇති", "කරනවා", "නිසා", "එසේ", "නැවත"
}


# ============================================================
# 2. TOKENIZER
# ============================================================

def custom_tokenizer(text: str) -> list[str]:

    # Supports English + Sinhala characters
    tokens = re.findall(
        r"[a-zA-Z\u0d80-\u0dff]+",
        str(text).lower()
    )

    # Remove Sinhala stopwords
    tokens = [
        token
        for token in tokens
        if token not in SINHALA_STOPWORDS
    ]

    return tokens


# ============================================================
# 3. LOAD WELFAKE DATASET
# ============================================================

def load_data(filepath: Path):

    print("\nLoading dataset...")

    df = pd.read_csv(filepath)

    print("Original records:", len(df))

    # Cleaned WELFake dataset contains:
    # content, label

    df = df.dropna(
        subset=["content", "label"]
    ).copy()

    # Normalize labels
    df["label"] = (
        df["label"]
        .astype(str)
        .str.strip()
        .str.lower()
    )

    # Keep valid labels only
    df = df[
        df["label"].isin(["fake", "real"])
    ].copy()

    # Convert:
    # Fake = 1
    # Real = 0

    df["target"] = df["label"].map(
        {
            "fake": 1,
            "real": 0
        }
    )

    print("\nClass Distribution:")
    print(df["label"].value_counts())

    print("\nTotal usable records:", len(df))

    texts = df["content"].astype(str).tolist()
    labels = df["target"].astype(int).tolist()

    return texts, labels


# ============================================================
# 4. MAIN TRAINING FUNCTION
# ============================================================

def main():

    # --------------------------------------------------------
    # Dataset
    # --------------------------------------------------------

    dataset_path = Path(
        "ml/data/processed/welfake_clean.csv"
    )

    if not dataset_path.exists():

        print(
            f"ERROR: Dataset not found at:\n{dataset_path}"
        )

        return


    print("=" * 70)

    print(
        "       FAKE NEWS DETECTION - FINAL MODEL COMPARISON"
    )

    print("=" * 70)

    print("\nDataset: WELFake")


    # --------------------------------------------------------
    # Load data
    # --------------------------------------------------------

    texts, labels = load_data(dataset_path)


    # ========================================================
    # 5. TRAIN / TEST SPLIT
    # ========================================================

    print("\n" + "=" * 70)
    print("TRAIN / TEST SPLIT")
    print("=" * 70)

    X_train, X_test, y_train, y_test = train_test_split(

        texts,
        labels,

        test_size=0.20,

        random_state=42,

        stratify=labels
    )


    print(
        f"\nTraining samples: {len(X_train)}"
    )

    print(
        f"Testing samples:  {len(X_test)}"
    )

    print("\nSplit:")
    print("80% Training")
    print("20% Testing")


    # ========================================================
    # 6. TF-IDF
    # ========================================================

    print("\n" + "=" * 70)
    print("TF-IDF FEATURE EXTRACTION")
    print("=" * 70)


    vectorizer = TfidfVectorizer(

        tokenizer=custom_tokenizer,

        token_pattern=None,

        lowercase=True,

        min_df=2,

        max_df=0.95,

        max_features=50000,

        # IMPORTANT:
        # Current backend inference works with unigram tokens.
        # Therefore use unigrams for consistent live prediction.
        ngram_range=(1, 1),

        # Keep this False because current backend uses
        # raw term frequency * IDF.
        sublinear_tf=False,

        norm="l2"
    )


    print("\nFitting TF-IDF on TRAINING data only...")


    # Learn vocabulary from training data only
    X_train_tfidf = vectorizer.fit_transform(
        X_train
    )


    # Test data is transformed only
    X_test_tfidf = vectorizer.transform(
        X_test
    )


    feature_names = (
        vectorizer.get_feature_names_out()
    )


    print(
        f"TF-IDF vocabulary size: "
        f"{len(feature_names)}"
    )


    print(
        f"Training matrix shape: "
        f"{X_train_tfidf.shape}"
    )


    print(
        f"Testing matrix shape: "
        f"{X_test_tfidf.shape}"
    )


    # ========================================================
    # 7. TWO FINAL MODELS
    # ========================================================

    models = {

        # ----------------------------------------------------
        # MODEL 1
        # ----------------------------------------------------

        "Logistic Regression":

            LogisticRegression(

                C=1.5,

                max_iter=2000,

                class_weight="balanced",

                random_state=42
            ),


        # ----------------------------------------------------
        # MODEL 2
        # ----------------------------------------------------

        "Linear SVM":

            LinearSVC(

                C=1.0,

                class_weight="balanced",

                random_state=42
            )
    }


    results = []

    trained_models = {}


    # ========================================================
    # 8. TRAIN & EVALUATE
    # ========================================================

    print("\n" + "=" * 70)

    print("TRAINING AND EVALUATING MODELS")

    print("=" * 70)


    for model_name, model in models.items():

        print("\n" + "-" * 70)

        print(f"Training: {model_name}")

        print("-" * 70)


        # ----------------------------------------------------
        # Training
        # ----------------------------------------------------

        train_start = time.perf_counter()


        model.fit(

            X_train_tfidf,

            y_train
        )


        training_time = (
            time.perf_counter()
            - train_start
        )


        # ----------------------------------------------------
        # Prediction
        # ----------------------------------------------------

        predict_start = time.perf_counter()


        y_pred = model.predict(
            X_test_tfidf
        )


        prediction_time = (
            time.perf_counter()
            - predict_start
        )


        # ----------------------------------------------------
        # Evaluation Metrics
        # ----------------------------------------------------

        accuracy = accuracy_score(
            y_test,
            y_pred
        )


        balanced_accuracy = (
            balanced_accuracy_score(
                y_test,
                y_pred
            )
        )


        # Positive class = Fake = 1

        precision = precision_score(

            y_test,
            y_pred,

            pos_label=1,

            zero_division=0
        )


        recall = recall_score(

            y_test,
            y_pred,

            pos_label=1,

            zero_division=0
        )


        f1 = f1_score(

            y_test,
            y_pred,

            pos_label=1,

            zero_division=0
        )


        cm = confusion_matrix(

            y_test,
            y_pred,

            labels=[0, 1]
        )


        tn, fp, fn, tp = cm.ravel()


        # ----------------------------------------------------
        # Save results
        # ----------------------------------------------------

        model_result = {

            "model_name": model_name,

            "accuracy": float(
                accuracy
            ),

            "balanced_accuracy": float(
                balanced_accuracy
            ),

            "precision": float(
                precision
            ),

            "recall": float(
                recall
            ),

            "f1_score": float(
                f1
            ),

            "tn": int(tn),

            "fp": int(fp),

            "fn": int(fn),

            "tp": int(tp),

            "training_time_sec": round(
                training_time,
                4
            ),

            "prediction_time_sec": round(
                prediction_time,
                4
            )
        }


        results.append(
            model_result
        )


        trained_models[
            model_name
        ] = model


        # ----------------------------------------------------
        # Print results
        # ----------------------------------------------------

        print(
            f"\nAccuracy:          "
            f"{accuracy:.4f}"
        )


        print(
            f"Balanced Accuracy: "
            f"{balanced_accuracy:.4f}"
        )


        print(
            f"Precision (Fake):  "
            f"{precision:.4f}"
        )


        print(
            f"Recall (Fake):     "
            f"{recall:.4f}"
        )


        print(
            f"F1 Score (Fake):   "
            f"{f1:.4f}"
        )


        print(
            f"Training Time:     "
            f"{training_time:.2f} sec"
        )


        print("\nConfusion Matrix")

        print(
            f"True Real  (TN): {tn}"
        )

        print(
            f"False Fake (FP): {fp}"
        )

        print(
            f"False Real (FN): {fn}"
        )

        print(
            f"True Fake  (TP): {tp}"
        )


        print(
            "\nClassification Report:"
        )


        print(

            classification_report(

                y_test,

                y_pred,

                target_names=[
                    "Real",
                    "Fake"
                ],

                digits=4,

                zero_division=0
            )
        )


    # ========================================================
    # 9. MODEL COMPARISON
    # ========================================================

    print("\n" + "=" * 70)

    print("FINAL MODEL COMPARISON")

    print("=" * 70)


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


    print(

        results_df[
            [
                "model_name",
                "accuracy",
                "balanced_accuracy",
                "precision",
                "recall",
                "f1_score",
                "training_time_sec"
            ]
        ].to_string(index=False)

    )


    # ========================================================
    # 10. SELECT BEST MODEL
    # ========================================================

    best_result = results_df.iloc[0]


    best_model_name = (
        best_result["model_name"]
    )


    best_model = trained_models[
        best_model_name
    ]


    print("\n" + "=" * 70)

    print(
        f"BEST MODEL SELECTED: "
        f"{best_model_name}"
    )


    print(
        f"Accuracy: "
        f"{best_result['accuracy']:.4f}"
    )


    print(
        f"Balanced Accuracy: "
        f"{best_result['balanced_accuracy']:.4f}"
    )


    print(
        f"Precision: "
        f"{best_result['precision']:.4f}"
    )


    print(
        f"Recall: "
        f"{best_result['recall']:.4f}"
    )


    print(
        f"F1 Score: "
        f"{best_result['f1_score']:.4f}"
    )


    print("=" * 70)


    # ========================================================
    # 11. CREATE BACKEND MODEL ARTIFACT
    # ========================================================

    print(
        "\nCreating backend model artifact..."
    )


    # Vocabulary:
    # word -> feature index

    vocabulary = {

        word: int(index)

        for word, index
        in vectorizer.vocabulary_.items()
    }


    # IDF:
    # word -> IDF score

    idf_values = {

        word: float(
            vectorizer.idf_[index]
        )

        for word, index
        in vectorizer.vocabulary_.items()
    }


    # Both Logistic Regression and Linear SVM
    # have coef_ and intercept_

    weights = (
        best_model.coef_[0]
        .astype(float)
        .tolist()
    )


    intercept = float(
        best_model.intercept_[0]
    )


    artifact_data = {

        "model_name":
            best_model_name,

        "dataset":
            "WELFake",

        "training_samples":
            len(X_train),

        "testing_samples":
            len(X_test),

        "vocabulary":
            vocabulary,

        "idfs":
            idf_values,

        "weights":
            weights,

        "intercept":
            intercept,

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


    # ========================================================
    # 12. SAVE MODEL
    # ========================================================

    artifact_path = Path(
        "backend/app/ml/artifacts/"
        "tfidf_best_model.json"
    )


    artifact_path.parent.mkdir(

        parents=True,

        exist_ok=True
    )


    with open(

        artifact_path,

        "w",

        encoding="utf-8"

    ) as file:

        json.dump(

            artifact_data,

            file,

            ensure_ascii=False
        )


    print(
        f"\nSaved best model to:\n"
        f"{artifact_path}"
    )


    # ========================================================
    # 13. SAVE CSV RESULTS
    # ========================================================

    reports_folder = Path(
        "ml/reports"
    )


    reports_folder.mkdir(

        parents=True,

        exist_ok=True
    )


    csv_report_path = (

        reports_folder
        / "model_comparison_results.csv"
    )


    results_df.to_csv(

        csv_report_path,

        index=False
    )


    print(
        f"\nSaved CSV results to:\n"
        f"{csv_report_path}"
    )


    # ========================================================
    # 14. CREATE MARKDOWN REPORT
    # ========================================================

    report_path = (

        reports_folder
        / "model_comparison_report.md"
    )


    report = f"""
# Fake News Model Comparison Report

**Dataset:** WELFake  
**Total Samples:** {len(texts)}  
**Training Samples:** {len(X_train)}  
**Testing Samples:** {len(X_test)}  
**Train/Test Split:** 80/20  
**Feature Extraction:** TF-IDF  
**Models Compared:** Logistic Regression and Linear SVM  
**Best Model:** {best_model_name}

---

## Model Comparison

| Model | Accuracy | Balanced Accuracy | Precision | Recall | F1 Score |
|---|---:|---:|---:|---:|---:|
"""


    for _, result in results_df.iterrows():

        report += (

            f"| {result['model_name']} "

            f"| {result['accuracy']:.4f} "

            f"| {result['balanced_accuracy']:.4f} "

            f"| {result['precision']:.4f} "

            f"| {result['recall']:.4f} "

            f"| {result['f1_score']:.4f} |\n"
        )


    report += f"""

---

## Selected Final Model

The final model selected was **{best_model_name}**.

The model selection was primarily based on F1-score,
with balanced accuracy and overall accuracy used as
additional evaluation criteria.

### Final Model Performance

- Accuracy: {best_result['accuracy']:.4f}
- Balanced Accuracy: {best_result['balanced_accuracy']:.4f}
- Precision: {best_result['precision']:.4f}
- Recall: {best_result['recall']:.4f}
- F1 Score: {best_result['f1_score']:.4f}

The trained model artifact is stored at:

`backend/app/ml/artifacts/tfidf_best_model.json`
"""


    with open(

        report_path,

        "w",

        encoding="utf-8"

    ) as file:

        file.write(report)


    print(
        f"\nSaved model report to:\n"
        f"{report_path}"
    )


    # ========================================================
    # 15. UPDATE DATABASE
    # ========================================================

    db_paths = [

        Path(
            "backend/fake_news.db"
        ),

        Path(
            "fake_news.db"
        )
    ]


    db_file = next(

        (
            path
            for path in db_paths
            if path.exists()
        ),

        None
    )


    if db_file:

        try:

            connection = sqlite3.connect(
                db_file
            )


            cursor = (
                connection.cursor()
            )


            # Deactivate previous model
            cursor.execute(

                """
                UPDATE model_versions
                SET is_active = 0
                """
            )


            # Get next ID
            cursor.execute(

                """
                SELECT MAX(id)
                FROM model_versions
                """
            )


            max_id = (
                cursor.fetchone()[0]
                or 0
            )


            new_id = max_id + 1


            # Register new model
            cursor.execute(

                """
                INSERT INTO model_versions
                (
                    id,
                    model_name,
                    algorithm,
                    artifact_path,
                    dataset_name,
                    dataset_version,
                    accuracy,
                    precision_score,
                    recall_score,
                    f1_score,
                    is_active,
                    notes
                )
                VALUES
                (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,

                (
                    new_id,

                    f"WELFake Champion: "
                    f"{best_model_name}",

                    best_model_name,

                    "app/ml/artifacts/"
                    "tfidf_best_model.json",

                    "WELFake Fake News Dataset",

                    "WELFake-v1",

                    float(
                        best_result[
                            "accuracy"
                        ]
                    ),

                    float(
                        best_result[
                            "precision"
                        ]
                    ),

                    float(
                        best_result[
                            "recall"
                        ]
                    ),

                    float(
                        best_result[
                            "f1_score"
                        ]
                    ),

                    1,

                    (
                        "Compared Logistic Regression "
                        "and Linear SVM using an "
                        "80/20 stratified train-test "
                        "split on the cleaned "
                        "WELFake dataset."
                    )
                )
            )


            connection.commit()

            connection.close()


            print(
                "\nDatabase successfully updated."
            )


            print(
                f"Active model ID: {new_id}"
            )


        except Exception as error:

            print(
                "\nDatabase registration warning:"
            )

            print(error)


    else:

        print(
            "\nDatabase not found. "
            "Model training was still successful."
        )


    # ========================================================
    # COMPLETE
    # ========================================================

    print("\n" + "=" * 70)

    print(
        "MODEL TRAINING COMPLETED SUCCESSFULLY"
    )

    print("=" * 70)


    print(
        f"\nFinal Selected Model: "
        f"{best_model_name}"
    )


    print(
        "\nBackend artifact:"
    )


    print(
        artifact_path
    )


# ============================================================
# RUN
# ============================================================

if __name__ == "__main__":
    main()
    