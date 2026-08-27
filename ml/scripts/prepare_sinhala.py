from pathlib import Path
import pandas as pd

INPUT_FILE = Path("ml/data/raw/sinhala/Corpus.xlsx")
OUTPUT_FILE = Path("ml/data/processed/sinhala_clean.csv")


def main():
    print("=" * 70)
    print("SINHALA DATASET PREPARATION - ALL EXCEL SHEETS")
    print("=" * 70)

    # --------------------------------------------------
    # 1. READ ALL SHEETS
    # --------------------------------------------------
    print("\nReading all Excel sheets...")

    sheets = pd.read_excel(
        INPUT_FILE,
        sheet_name=None
    )

    print("\nSheets found:")
    print(list(sheets.keys()))

    valid_frames = []

    for sheet_name, df in sheets.items():

        df.columns = (
            df.columns
            .astype(str)
            .str.strip()
            .str.lower()
        )

        print(
            f"\nSheet: {sheet_name} | "
            f"Rows: {len(df)}"
        )

        # Only use sheets containing label + content
        if "type" in df.columns and "content" in df.columns:

            temp = df[["type", "content"]].copy()

            temp["source_sheet"] = sheet_name

            valid_frames.append(temp)

            print("Included.")

        else:
            print("Skipped - required columns not found.")

    if not valid_frames:
        print("\nERROR: No usable sheets found.")
        return

    # --------------------------------------------------
    # 2. COMBINE SHEETS
    # --------------------------------------------------
    df = pd.concat(
        valid_frames,
        ignore_index=True
    )

    print("\nTotal combined records:")
    print(len(df))

    # --------------------------------------------------
    # 3. CLEAN LABELS
    # --------------------------------------------------
    df["type"] = (
        df["type"]
        .fillna("")
        .astype(str)
        .str.strip()
        .str.upper()
    )

    print("\nOriginal label distribution:")

    print(
        df["type"].value_counts()
    )

    # --------------------------------------------------
    # 4. CLEAN CONTENT
    # --------------------------------------------------
    df["content"] = (
        df["content"]
        .fillna("")
        .astype(str)
        .str.replace(
            r"\s+",
            " ",
            regex=True
        )
        .str.strip()
    )

    # --------------------------------------------------
    # 5. KEEP ONLY CLEAR BINARY CLASSES
    # --------------------------------------------------
    df = df[
        df["type"].isin(
            ["CREDIBLE", "FALSE"]
        )
    ].copy()

    df["label"] = df["type"].map({
        "CREDIBLE": "real",
        "FALSE": "fake"
    })

    print("\nBinary classes before cleaning:")

    print(
        df["label"].value_counts()
    )

    # --------------------------------------------------
    # 6. REMOVE EMPTY / SHORT CONTENT
    # --------------------------------------------------
    before = len(df)

    df = df[
        df["content"].str.len() >= 30
    ].copy()

    print(
        "\nEmpty/short records removed:",
        before - len(df)
    )

    # --------------------------------------------------
    # 7. DUPLICATE KEY
    # --------------------------------------------------
    df["duplicate_key"] = (
        df["content"]
        .str.lower()
        .str.replace(
            r"\s+",
            " ",
            regex=True
        )
        .str.strip()
    )

    # --------------------------------------------------
    # 8. REMOVE CONFLICTING LABELS
    # --------------------------------------------------
    conflicts = (
        df.groupby("duplicate_key")["label"]
        .nunique()
    )

    conflict_keys = (
        conflicts[
            conflicts > 1
        ].index
    )

    print(
        "Conflicting texts removed:",
        len(conflict_keys)
    )

    df = df[
        ~df["duplicate_key"].isin(
            conflict_keys
        )
    ].copy()

    # --------------------------------------------------
    # 9. REMOVE EXACT DUPLICATES
    # --------------------------------------------------
    duplicate_count = (
        df.duplicated(
            subset=["duplicate_key"]
        ).sum()
    )

    print(
        "Exact duplicates removed:",
        duplicate_count
    )

    df = df.drop_duplicates(
        subset=["duplicate_key"]
    ).copy()

    df = df.drop(
        columns=["duplicate_key"]
    )

    print("\nAfter duplicate removal:")

    print(
        df["label"].value_counts()
    )

    # --------------------------------------------------
    # 10. BALANCE DATASET
    # --------------------------------------------------
    fake_df = df[
        df["label"] == "fake"
    ].copy()

    real_df = df[
        df["label"] == "real"
    ].copy()

    # Use size of minority class
    samples_per_class = min(
        len(fake_df),
        len(real_df)
    )

    print(
        "\nSamples selected per class:",
        samples_per_class
    )

    fake_balanced = fake_df.sample(
        n=samples_per_class,
        random_state=42
    )

    real_balanced = real_df.sample(
        n=samples_per_class,
        random_state=42
    )

    final_df = pd.concat(
        [
            fake_balanced,
            real_balanced
        ],
        ignore_index=True
    )

    final_df = final_df.sample(
        frac=1,
        random_state=42
    ).reset_index(drop=True)

    # Keep only required columns
    final_df = final_df[
        ["content", "label"]
    ]

    # --------------------------------------------------
    # 11. FINAL RESULT
    # --------------------------------------------------
    print("\n" + "=" * 70)
    print("FINAL BALANCED SINHALA DATASET")
    print("=" * 70)

    print(
        "\nTotal records:",
        len(final_df)
    )

    print("\nClass distribution:")

    print(
        final_df["label"]
        .value_counts()
    )

    print("\nClass percentage:")

    print(
        final_df["label"]
        .value_counts(normalize=True)
        .mul(100)
        .round(2)
    )

    # --------------------------------------------------
    # 12. SAVE
    # --------------------------------------------------
    OUTPUT_FILE.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    final_df.to_csv(
        OUTPUT_FILE,
        index=False,
        encoding="utf-8-sig"
    )

    print("\nSaved to:")
    print(OUTPUT_FILE)

    print(
        "\nSinhala dataset preparation "
        "completed successfully!"
    )


if __name__ == "__main__":
    main()