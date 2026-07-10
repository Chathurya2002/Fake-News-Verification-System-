import argparse
import csv
import re
import json
import collections
import math
import random
from pathlib import Path

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train baseline fake news classifier.")
    parser.add_argument("--input", required=True, help="Path to CSV with text and label columns.")
    parser.add_argument(
        "--output",
        default="../backend/app/ml/artifacts/tfidf_logreg_v1.json",
        help="Path where the trained model artifact should be saved.",
    )
    parser.add_argument(
        "--report",
        default="reports/baseline_metrics.txt",
        help="Path where evaluation metrics should be written.",
    )
    return parser.parse_args()

SINHALA_STOPWORDS = {
    "සහ", "නම්", "එම", "මෙම", "යන", "වන", "ලැබූ", "කරන", "කරන්න", "ඇත", "මඟින්", "විසින්",
    "නොව", "සඳහා", "ගැන", "වෙත", "ලෙස", "සිට", "තවද", "වෙතින්", "වැනි", "මෙන්ම", "භාවිතා",
    "කරයි", "කරනු", "කර ඇත", "කර ඇති", "ලැබේ", "පවතී", "බව", "කළ", "නැත", "තවත්", "මෙමඟින්",
    "මගින්", "කිරීම", "සඳහන්", "පිළිබඳ", "පිළිබඳව", "පමණක්", "කළේය", "විය", "නමුත්", "සමඟ",
    "වෙති", "හේතුවෙන්", "තිබේ", "තිබූ", "ලැබී", "ඇති", "කරනවා", "නිසා", "එසේ", "නැවත"
}

def tokenize(text):
    tokens = re.findall(r'[a-zA-Z\u0d80-\u0dff]+', text.lower())
    return [t for t in tokens if t not in SINHALA_STOPWORDS]

def sigmoid(z):
    z = max(-50.0, min(50.0, z))
    return 1.0 / (1.0 + math.exp(-z))

def main() -> None:
    args = parse_args()
    input_path = Path(args.input)
    output_path = Path(args.output)
    report_path = Path(args.report)

    # Load data
    texts = []
    labels = []
    with open(input_path, "r", encoding="utf-8") as f:
        reader = csv.reader(f)
        header = next(reader)
        text_col = header.index("text")
        label_col = header.index("label")
        for row in reader:
            if len(row) > max(text_col, label_col):
                texts.append(row[text_col])
                labels.append(1 if row[label_col].strip().lower() == "fake" else 0)
                
    N = len(texts)
    print(f"Loaded {N} documents.")
    
    # Tokenize and compute document frequencies
    tokenized_texts = [tokenize(t) for t in texts]
    
    doc_freq = {}
    for tokens in tokenized_texts:
        unique_tokens = set(tokens)
        for t in unique_tokens:
            doc_freq[t] = doc_freq.get(t, 0) + 1
            
    # Keep words appearing in >= 2 docs
    vocab_list = sorted([word for word, df in doc_freq.items() if df >= 2])
    vocab = {word: idx for idx, word in enumerate(vocab_list)}
    vocab_size = len(vocab)
    print(f"Vocabulary size: {vocab_size}")
    
    # Compute IDF
    idfs = {}
    for word in vocab_list:
        df = doc_freq[word]
        idfs[word] = math.log((1 + N) / (1 + df)) + 1.0
            
    # Compute TF-IDF sparse representation
    X_sparse = []
    for tokens in tokenized_texts:
        counts = collections.Counter(tokens)
        doc_vector = {}
        sq_sum = 0.0
        for word, count in counts.items():
            if word in vocab:
                idx = vocab[word]
                val = count * idfs[word]
                doc_vector[idx] = val
                sq_sum += val * val
                
        # L2 normalize
        norm = math.sqrt(sq_sum)
        if norm > 0:
            for idx in doc_vector:
                doc_vector[idx] /= norm
        X_sparse.append(doc_vector)
            
    # Train/Test Split (80/20)
    indices = list(range(N))
    random.seed(42)
    random.shuffle(indices)
    
    split = int(0.8 * N)
    train_idx = indices[:split]
    test_idx = indices[split:]
    
    # Train Logistic Regression using gradient descent
    w = [0.0] * vocab_size
    b = 0.0
    lr = 2.0
    epochs = 400
    lambda_reg = 0.005  # L2 regularization weight
    
    train_size = len(train_idx)
    for epoch in range(epochs):
        loss_sum = 0.0
        dw = [0.0] * vocab_size
        db = 0.0
        
        for idx in train_idx:
            x_i = X_sparse[idx]
            y_i = labels[idx]
            
            # Dot product
            z = sum(x_i[w_idx] * w[w_idx] for w_idx in x_i) + b
            p = sigmoid(z)
            
            # Loss calculation
            p_clip = max(1e-15, min(1.0 - 1e-15, p))
            loss_sum += -(y_i * math.log(p_clip) + (1 - y_i) * math.log(1 - p_clip))
            
            error = p - y_i
            db += error
            for w_idx, val in x_i.items():
                dw[w_idx] += error * val
                
        # Average and regularize gradients
        db /= train_size
        for j in range(vocab_size):
            dw[j] = (dw[j] / train_size) + lambda_reg * w[j]
            
        # Update
        b -= lr * db
        for j in range(vocab_size):
            w[j] -= lr * dw[j]
            
        if (epoch + 1) % 50 == 0:
            avg_loss = loss_sum / train_size
            print(f"Epoch {epoch+1}/{epochs} - Loss: {avg_loss:.4f}")
            
    # Evaluate on test set
    tp = 0
    tn = 0
    fp = 0
    fn = 0
    
    for idx in test_idx:
        x_i = X_sparse[idx]
        y_i = labels[idx]
        z = sum(x_i[w_idx] * w[w_idx] for w_idx in x_i) + b
        p = sigmoid(z)
        pred = 1 if p >= 0.5 else 0
        
        if pred == 1 and y_i == 1:
            tp += 1
        elif pred == 0 and y_i == 0:
            tn += 1
        elif pred == 1 and y_i == 0:
            fp += 1
        elif pred == 0 and y_i == 1:
            fn += 1
            
    test_size = len(test_idx)
    accuracy = (tp + tn) / test_size
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0
    
    # Save model json
    model_data = {
        "vocabulary": vocab,
        "idfs": idfs,
        "weights": w,
        "intercept": float(b),
        "classes": ["real", "fake"]
    }
    
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(model_data, f, indent=2)
        
    # Write report
    report_content = (
        "Classification Report (Pure Python Baseline)\n"
        "===========================================\n\n"
        f"Accuracy:  {accuracy:.4f}\n"
        f"Precision: {precision:.4f}\n"
        f"Recall:    {recall:.4f}\n"
        f"F1-score:  {f1:.4f}\n\n"
        "Confusion Matrix\n"
        "================\n"
        f"[[{tn} (Real correctly classified), {fp} (Real classified as Fake)],\n"
        f" [{fn} (Fake classified as Real), {tp} (Fake correctly classified)]]\n"
    )
    
    report_path.parent.mkdir(parents=True, exist_ok=True)
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(report_content)
        
    print(f"Saved model artifact to {output_path}")
    print(f"Saved metrics report to {report_path}")

    # Register model in database
    db_paths = [
        Path("backend/fake_news.db"),
        Path("../backend/fake_news.db"),
        Path("../../backend/fake_news.db"),
        Path("fake_news.db")
    ]
    db_file = None
    for p in db_paths:
        if p.exists():
            db_file = p
            break
            
    if db_file:
        import sqlite3
        try:
            conn = sqlite3.connect(db_file, timeout=10.0)
            cursor = conn.cursor()
            
            # Query the max ID in model_versions to manually handle autoincrement for BIGINT primary key in SQLite
            cursor.execute("SELECT MAX(id) FROM model_versions")
            max_id_row = cursor.fetchone()
            max_id = max_id_row[0] if max_id_row else 0
            new_id = (max_id or 0) + 1
            
            artifact_rel_path = "app/ml/artifacts/tfidf_logreg_v1.json"
            parts = str(output_path).replace("\\", "/").split("/")
            if "artifacts" in parts:
                artifact_rel_path = "app/ml/artifacts/" + output_path.name
                
            cursor.execute("""
                INSERT INTO model_versions (
                    id, model_name, algorithm, artifact_path, dataset_name, dataset_version,
                    accuracy, precision_score, recall_score, f1_score, is_active, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                new_id,
                "Bilingual EN-SI Baseline Model",
                "TF-IDF + Logistic Regression",
                artifact_rel_path,
                "Bilingual Synthetic Misinformation Corpus",
                "v2.0",
                float(accuracy),
                float(precision),
                float(recall),
                float(f1),
                False,
                "Baseline model trained on Bilingual Synthetic Misinformation Corpus."
            ))
            conn.commit()
            conn.close()
            print(f"Successfully registered trained model version #{new_id} in database {db_file}")
        except Exception as db_err:
            print(f"Could not update database model versions: {db_err}")
    else:
        print("Database file fake_news.db not found. Skipping model version database registration.")

if __name__ == "__main__":
    main()
