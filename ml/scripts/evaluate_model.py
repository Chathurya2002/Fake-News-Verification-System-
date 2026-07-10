"""Evaluate a saved fake news classifier artifact against a labeled CSV."""

from __future__ import annotations

import argparse
from pathlib import Path

import joblib
import pandas as pd
from sklearn.metrics import classification_report, confusion_matrix


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Evaluate saved fake news classifier.")
    parser.add_argument("--model", required=True, help="Path to saved joblib model artifact.")
    parser.add_argument("--input", required=True, help="Path to CSV with text and label columns.")
    parser.add_argument("--report", default="reports/evaluation_metrics.txt")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    model = joblib.load(args.model)
    df = pd.read_csv(args.input).dropna(subset=["text", "label"])

    predictions = model.predict(df["text"].astype(str))
    report = classification_report(df["label"], predictions)
    matrix = confusion_matrix(df["label"], predictions)

    report_path = Path(args.report)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(
        "Classification Report\n"
        "=====================\n\n"
        f"{report}\n\n"
        "Confusion Matrix\n"
        "================\n\n"
        f"{matrix}\n",
        encoding="utf-8",
    )

    print(f"Saved evaluation report to {report_path}")


if __name__ == "__main__":
    main()
