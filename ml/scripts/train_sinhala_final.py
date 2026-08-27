from pathlib import Path
import re
import time
import joblib
import pandas as pd

from sklearn.pipeline import Pipeline
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
    classification_report
)


# ============================================================
# FILE PATHS
# ============================================================

SYNTHETIC_FILE = Path(
    "ml/data/raw/sinhala/"
    "sinhala_synthetic_augmentation_v1.csv"
)

REAL_FILE = Path(
    "ml/data/raw/sinhala/Corpus.xlsx"
)

MODEL_DIR = Path(
    "backend/app/ml/artifacts"
)

REPORT_DIR = Path(
    "ml/reports"
)


# ============================================================
# CLEAN TEXT
# ============================================================

def clean_text(text):

    text = str(text)

    text = re.sub(
        r"\s+",
        " ",
        text
    )

    return text.strip()


# ============================================================
# LOAD SYNTHETIC TRAINING DATA
# ============================================================

def load_synthetic():

    print("\nLoading synthetic Sinhala training data...")

    df = pd.read_csv(
        SYNTHETIC_FILE,
        encoding="utf-8-sig"
    )

    print(
        "Synthetic records:",
        len(df)
    )

    df = df.dropna(
        subset=["text", "label"]
    ).copy()

    df["text"] = (
        df["text"]
        .astype(str)
        .apply(clean_text)
    )

    df["label"] = (
        df["label"]
        .astype(str)
        .str.lower()
        .str.strip()
    )

    df = df[
        df["label"].isin(
            ["real", "fake"]
        )
    ].copy()

    # Remove exact duplicates
    df["duplicate_key"] = (
        df["text"]
        .str.lower()
    )

    df = df.drop_duplicates(
        subset=[
            "duplicate_key",
            "label"
        ]
    )

    df = df.drop(
        columns=["duplicate_key"]
    )

    print("\nSynthetic class distribution:")

    print(
        df["label"].value_counts()
    )

    return df


# ============================================================
# LOAD REAL LIRNEASIA DATA
# ============================================================

def load_real():

    print("\nLoading real Sinhala evaluation data...")

    sheets = pd.read_excel(
        REAL_FILE,
        sheet_name=None
    )

    frames = []

    for sheet_name, sheet_df in sheets.items():

        sheet_df.columns = (
            sheet_df.columns
            .astype(str)
            .str.lower()
            .str.strip()
        )

        if (
            "type" in sheet_df.columns
            and
            "content" in sheet_df.columns
        ):

            temp = sheet_df[
                [
                    "type",
                    "content"
                ]
            ].copy()

            frames.append(temp)

    if not frames:

        raise ValueError(
            "No usable sheets found in Corpus.xlsx"
        )

    df = pd.concat(
        frames,
        ignore_index=True
    )

    # -------------------------------
    # Clean labels
    # -------------------------------

    df["type"] = (
        df["type"]
        .fillna("")
        .astype(str)
        .str.upper()
        .str.strip()
    )

    df["content"] = (
        df["content"]
        .fillna("")
        .astype(str)
        .apply(clean_text)
    )

    # -------------------------------
    # Binary labels only
    # -------------------------------

    df = df[
        df["type"].isin(
            [
                "CREDIBLE",
                "FALSE"
            ]
        )
    ].copy()

    df["label"] = df["type"].map(
        {
            "CREDIBLE": "real",
            "FALSE": "fake"
        }
    )

    # Remove short articles

    df = df[
        df["content"].str.len() >= 30
    ].copy()

    # Remove duplicates

    df["duplicate_key"] = (
        df["content"]
        .str.lower()
    )

    df = df.drop_duplicates(
        subset=["duplicate_key"]
    )

    df = df.drop(
        columns=["duplicate_key"]
    )

    print("\nReal data before balancing:")

    print(
        df["label"].value_counts()
    )

    # ========================================================
    # BALANCE REAL EVALUATION SET
    # ========================================================

    fake_df = df[
        df["label"] == "fake"
    ].copy()

    real_df = df[
        df["label"] == "real"
    ].copy()

    n = min(
        len(fake_df),
        len(real_df)
    )

    if n == 0:

        raise ValueError(
            "No usable Fake/Real classes "
            "found in real dataset."
        )

    fake_eval = fake_df.sample(
        n=n,
        random_state=42
    )

    real_eval = real_df.sample(
        n=n,
        random_state=42
    )

    evaluation_df = pd.concat(
        [
            fake_eval,
            real_eval
        ],
        ignore_index=True
    )

    evaluation_df = evaluation_df.sample(
        frac=1,
        random_state=42
    ).reset_index(
        drop=True
    )

    print("\nBalanced REAL evaluation set:")

    print(
        evaluation_df[
            "label"
        ].value_counts()
    )

    print(
        "\nTotal real evaluation samples:",
        len(evaluation_df)
    )

    return evaluation_df


# ============================================================
# MAIN
# ============================================================

def main():

    print("=" * 75)

    print(
        "SINHALA FAKE NEWS - FINAL EXPERIMENT"
    )

    print("=" * 75)

    # --------------------------------------------------------
    # CHECK FILES
    # --------------------------------------------------------

    if not SYNTHETIC_FILE.exists():

        print(
            "\nERROR: Synthetic dataset not found:"
        )

        print(SYNTHETIC_FILE)

        return

    if not REAL_FILE.exists():

        print(
            "\nERROR: Corpus.xlsx not found:"
        )

        print(REAL_FILE)

        return

    # --------------------------------------------------------
    # LOAD
    # --------------------------------------------------------

    train_df = load_synthetic()

    eval_df = load_real()

    X_train = train_df["text"]

    y_train = train_df["label"]

    X_test = eval_df["content"]

    y_test = eval_df["label"]

    print("\n" + "=" * 75)

    print("DATASET SETUP")

    print("=" * 75)

    print(
        "Synthetic training samples:",
        len(X_train)
    )

    print(
        "Real evaluation samples:",
        len(X_test)
    )

    # ========================================================
    # MODELS
    # ========================================================

    models = {

        "Logistic Regression":

            LogisticRegression(
                C=2.0,
                max_iter=3000,
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

    trained_pipelines = {}

    # ========================================================
    # TRAIN + REAL EVALUATION
    # ========================================================

    for model_name, classifier in models.items():

        print("\n" + "=" * 75)

        print(
            "TRAINING:",
            model_name
        )

        print("=" * 75)

        # Character TF-IDF works better
        # for Sinhala morphology

        pipeline = Pipeline(
            [
                (
                    "tfidf",
                    TfidfVectorizer(
                        analyzer="char_wb",
                        ngram_range=(3, 5),
                        min_df=2,
                        max_features=50000,
                        sublinear_tf=True,
                        norm="l2"
                    )
                ),

                (
                    "classifier",
                    classifier
                )
            ]
        )

        start = time.perf_counter()

        pipeline.fit(
            X_train,
            y_train
        )

        training_time = (
            time.perf_counter()
            - start
        )

        predictions = pipeline.predict(
            X_test
        )

        # ----------------------------------------------------
        # METRICS
        # ----------------------------------------------------

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
            pos_label="fake",
            zero_division=0
        )

        recall = recall_score(
            y_test,
            predictions,
            pos_label="fake",
            zero_division=0
        )

        f1 = f1_score(
            y_test,
            predictions,
            pos_label="fake",
            zero_division=0
        )

        cm = confusion_matrix(
            y_test,
            predictions,
            labels=[
                "real",
                "fake"
            ]
        )

        tn, fp, fn, tp = cm.ravel()

        # ----------------------------------------------------
        # PRINT
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

        results.append(
            {
                "model_name":
                    model_name,

                "accuracy":
                    accuracy,

                "balanced_accuracy":
                    balanced_accuracy,

                "precision":
                    precision,

                "recall":
                    recall,

                "f1_score":
                    f1,

                "training_time_sec":
                    training_time,

                "true_real":
                    tn,

                "false_fake":
                    fp,

                "false_real":
                    fn,

                "true_fake":
                    tp
            }
        )

        trained_pipelines[
            model_name
        ] = pipeline

    # ========================================================
    # MODEL COMPARISON
    # ========================================================

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

    print("\n" + "=" * 75)

    print(
        "FINAL SINHALA MODEL COMPARISON"
    )

    print("=" * 75)

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
        ].to_string(
            index=False
        )
    )

    # ========================================================
    # BEST MODEL
    # ========================================================

    best_result = (
        results_df.iloc[0]
    )

    best_name = (
        best_result[
            "model_name"
        ]
    )

    best_pipeline = (
        trained_pipelines[
            best_name
        ]
    )

    print("\n" + "=" * 75)

    print(
        "BEST SINHALA MODEL:",
        best_name
    )

    print(
        f"REAL DATA Accuracy: "
        f"{best_result['accuracy']:.4f}"
    )

    print(
        f"REAL DATA F1: "
        f"{best_result['f1_score']:.4f}"
    )

    print("=" * 75)

    # ========================================================
    # SAVE MODEL
    # ========================================================

    MODEL_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    model_path = (
        MODEL_DIR
        / "sinhala_final_model.joblib"
    )

    joblib.dump(
        best_pipeline,
        model_path
    )

    # ========================================================
    # SAVE REPORT
    # ========================================================

    REPORT_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    report_path = (
        REPORT_DIR
        / "sinhala_final_comparison.csv"
    )

    results_df.to_csv(
        report_path,
        index=False
    )

    print(
        "\nModel saved to:"
    )

    print(model_path)

    print(
        "\nReport saved to:"
    )

    print(report_path)

    print("\n" + "=" * 75)

    print(
        "SINHALA EXPERIMENT COMPLETED"
    )

    print("=" * 75)

    print(
        "\nIMPORTANT:"
    )

    print(
        "The reported metrics are based "
        "on real LIRNEasia samples."
    )

    print(
        "Synthetic samples were used "
        "for training augmentation only."
    )


if __name__ == "__main__":
    main()