from pathlib import Path
import pandas as pd

# Dataset path
INPUT_FILE = Path("ml/data/raw/WELFake_Dataset.csv")

# Cleaned dataset path
OUTPUT_FILE = Path("ml/data/processed/welfake_clean.csv")


def main():
    print("Loading WELFake dataset...")

    df = pd.read_csv(INPUT_FILE)

    print("\nOriginal shape:", df.shape)
    print("\nColumns:")
    print(df.columns.tolist())

    # Keep only useful columns
    df = df[["title", "text", "label"]].copy()

    # Remove rows with missing labels
    df = df.dropna(subset=["label"])

    # Fill missing title/text
    df["title"] = df["title"].fillna("").astype(str)
    df["text"] = df["text"].fillna("").astype(str)

    # Combine title + article text
    df["content"] = (
        df["title"].str.strip()
        + " "
        + df["text"].str.strip()
    ).str.strip()

    # Remove empty / very short records
    df = df[df["content"].str.len() >= 30].copy()

    # Normalize text for duplicate detection
    df["duplicate_key"] = (
        df["content"]
        .str.lower()
        .str.replace(r"\s+", " ", regex=True)
        .str.strip()
    )

    print("\nBefore duplicate removal:", len(df))

    # Remove exact duplicates
    duplicate_count = df.duplicated(
        subset=["duplicate_key"]
    ).sum()

    print("Exact duplicates found:", duplicate_count)

    df = df.drop_duplicates(
        subset=["duplicate_key"]
    ).copy()

    # Convert labels
    # WELFake: 0 = Fake, 1 = Real
    df["label"] = df["label"].map({
        0: "fake",
        1: "real"
    })

    # Remove invalid labels if any
    df = df.dropna(subset=["label"])

    # Keep final columns
    df = df[["content", "label"]]

    # Shuffle dataset
    df = df.sample(
        frac=1,
        random_state=42
    ).reset_index(drop=True)

    print("\nFinal dataset size:", len(df))

    print("\nClass distribution:")
    print(df["label"].value_counts())

    print("\nClass percentage:")
    print(
        df["label"]
        .value_counts(normalize=True)
        .mul(100)
        .round(2)
    )

    # Save
    OUTPUT_FILE.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    df.to_csv(
        OUTPUT_FILE,
        index=False,
        encoding="utf-8"
    )

    print("\nSaved cleaned dataset to:")
    print(OUTPUT_FILE)


if __name__ == "__main__":
    main()