import urllib.request
import csv
import io
import sys
from pathlib import Path

# URLs for LIRNEasia Misinformation Corpus CSV on GitHub
URL_MAIN = "https://raw.githubusercontent.com/LIRNEasia/MisinformationCorpusSinhala/main/Corpus.csv"
URL_MASTER = "https://raw.githubusercontent.com/LIRNEasia/MisinformationCorpusSinhala/master/Corpus.csv"

def download_data():
    print("Attempting to download LIRNEasia Misinformation Corpus from GitHub...", flush=True)
    response = None
    
    # Try main branch first
    try:
        req = urllib.request.Request(URL_MAIN, headers={'User-Agent': 'Mozilla/5.0'})
        response = urllib.request.urlopen(req, timeout=15)
        print("Successfully connected to main branch.", flush=True)
    except Exception as e:
        print(f"Failed to connect to main branch: {e}. Retrying with master branch...", flush=True)
        
    # Try master branch if main failed
    if response is None:
        try:
            req = urllib.request.Request(URL_MASTER, headers={'User-Agent': 'Mozilla/5.0'})
            response = urllib.request.urlopen(req, timeout=15)
            print("Successfully connected to master branch.", flush=True)
        except Exception as e:
            print(f"Error connecting to dataset repository: {e}", flush=True)
            sys.exit(1)
            
    # Read the response in chunks
    chunk_size = 512 * 1024  # 512 KB
    chunks = []
    bytes_downloaded = 0
    while True:
        try:
            chunk = response.read(chunk_size)
            if not chunk:
                break
            chunks.append(chunk)
            bytes_downloaded += len(chunk)
            print(f"Downloaded {bytes_downloaded / (1024 * 1024):.2f} MB...", flush=True)
        except Exception as e:
            print(f"Error during download chunk read: {e}", flush=True)
            sys.exit(1)
            
    data = b"".join(chunks)
    print(f"Total downloaded: {len(data)} bytes.", flush=True)
    return data

def preprocess_and_save(raw_data):
    # LIRNEasia CSV is UTF-8 encoded, might contain UTF-8-sig BOM
    text_stream = io.StringIO(raw_data.decode("utf-8-sig", errors="ignore"))
    reader = csv.reader(text_stream)
    
    try:
        header = next(reader)
    except StopIteration:
        print("Error: The downloaded CSV is empty.", flush=True)
        sys.exit(1)
        
    print(f"CSV Headers found: {header}", flush=True)
    
    # Identify indices of Content and Classification columns
    header_lower = [h.strip().lower() for h in header]
    print(f"Normalized headers: {header_lower}", flush=True)
    
    try:
        content_idx = header_lower.index("content")
    except ValueError:
        print("Error: Could not find 'content' column in CSV.", flush=True)
        sys.exit(1)
        
    try:
        # It looks like the classification column is called 'type'
        class_idx = header_lower.index("type")
    except ValueError:
        try:
            class_idx = header_lower.index("classification")
        except ValueError:
            print("Error: Could not find 'type' or 'classification' column in CSV.", flush=True)
            sys.exit(1)
            
    print(f"Selected content_idx={content_idx}, class_idx={class_idx}", flush=True)
            
    processed_rows = []
    skipped_count = 0
    real_count = 0
    fake_count = 0
    
    # Print the first 5 rows for verification
    first_rows = []
    
    for row_num, row in enumerate(reader, start=2):
        if len(row) <= max(content_idx, class_idx):
            continue
            
        content = row[content_idx].strip()
        classification = row[class_idx].strip().upper()
        
        if row_num <= 7:
            first_rows.append((classification, content[:100] + "..."))
            
        if not content:
            continue
            
        # Label mapping (Let's check if the values are CREDIBLE, FALSE, PARTIAL, etc.)
        if classification in ("CREDIBLE", "TRUE", "REAL"):
            label = "real"
            real_count += 1
        elif classification in ("FALSE", "PARTIAL", "FAKE", "MISLEADING"):
            label = "fake"
            fake_count += 1
        else:
            skipped_count += 1
            continue
            
        processed_rows.append([content, label])
        
    print("First 5 rows labels and content preview:", flush=True)
    for idx, (cls, preview) in enumerate(first_rows, 1):
        print(f"  Row {idx}: Class='{cls}' | Content preview: {preview}", flush=True)
        
    print(f"Finished parsing. Found {real_count} real, {fake_count} fake, and skipped {skipped_count} other/uncertain rows.", flush=True)
    
    # Save to ml/data/processed/news_dataset.csv
    output_path = Path("ml/data/processed/news_dataset.csv")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["text", "label"])
        writer.writerows(processed_rows)
        
    print(f"Successfully saved {len(processed_rows)} preprocessed rows to {output_path}", flush=True)

def main():
    raw_data = download_data()
    preprocess_and_save(raw_data)

if __name__ == "__main__":
    main()
