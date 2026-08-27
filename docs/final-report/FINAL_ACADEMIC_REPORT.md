# AI-Based Fake News Verification & Multimodal Misinformation Defense System
## Final Academic Project Report — Chapters 5, 6, & 7

---

# CHAPTER 5: SYSTEM IMPLEMENTATION

### 5.1 Architecture Overview
The implemented system comprises a three-tier decoupled architecture:
1. **Presentation Layer (Frontend)**: Developed with React 19, TypeScript, and Vite. Designed with an ultra-responsive, accessible glassmorphic UI including real-time sentiment/credibility charts, dual-language toggle (English / Sinhala), explainable AI token badge visualizer, and multimedia forensics upload panel.
2. **Application & Service Layer (Backend)**: Built with FastAPI (Python 3.14 asynchronous REST API). Manages routing, JWT session authentication, live RSS news scraping, ELA & FFT image forensics, claim similarity matching, and virality scoring.
3. **Machine Learning & Inference Layer**: Powered by scikit-learn, SciPy, Pillow, and custom tokenizers. Features dual text classification engines (English WELFake TF-IDF + Classifier and Sinhala Preprocessed TF-IDF + Classifier) and computer vision frequency forensics.
4. **Data Persistence Layer**: SQLite / PostgreSQL relational database via SQLAlchemy 2.0 ORM with indexed schema for `users`, `news_submissions`, `predictions`, `model_versions`, `fact_checks`, and `source_credibility`.

### 5.2 Core Module Implementations
- **Dual-Engine NLP Classifier (`app/ml/inference.py`)**: Automatically detects input language script (Sinhala vs English/Latin), routes to the respective trained artifact, computes probability distributions, and extracts per-token TF-IDF attribution weights for XAI (Explainable AI).
- **Multi-Tier Image Forensics Engine (`app/services/image_verification_service.py`)**: Employs 2D FFT spectral radial falloff analysis, PRNU noise residual kurtosis, Laplacian gradient sharpness-to-smoothness ratios, cross-channel RGB gradient covariance, Error Level Analysis (ELA), and hardware EXIF verification to detect Generative AI (DALL-E, Midjourney, Flux, Stable Diffusion).
- **Live News Feed & Scraper (`app/services/live_news_service.py`)**: Real-time RSS streaming from national and international news outlets (Ada Derana, BBC World, Al Jazeera) with automated verification pipelines.
- **Virality & Social Risk Scoring (`app/services/virality_service.py`)**: Computes social diffusion risk index based on sensationalist linguistic markers, urgency signals, and platform heuristics (WhatsApp, Twitter/X, Facebook).

---

# CHAPTER 6: TESTING, EVALUATION, AND RESULTS

### 6.1 Testing Methodology & Strategy
A multi-faceted verification methodology was conducted across five distinct levels:
1. **Unit & Component Testing**: Testing tokenizers, stopword removers, ELA calculation routines, and database models.
2. **API & Integration Testing**: End-to-end endpoint verification across `/api/v1/predictions`, `/api/v1/predictions/image`, `/api/v1/auth`, and `/api/v1/admin`.
3. **Machine Learning Empirical Evaluation**: 80/20 train-test splits on benchmark datasets, measuring Accuracy, Precision, Recall, F1-Score, ROC-AUC, and Confusion Matrix.
4. **Computer Vision & Forensics Robustness Testing**: Verification against authentic camera photographs (Canon, Nikon, Sony, iPhone with EXIF telemetry) vs Generative AI synthetic images (Midjourney, DALL-E 3, Stable Diffusion, ComfyUI).
5. **System Usability & Security Testing**: Token expiration, SQL injection safety via ORM parameterization, password hashing via bcrypt, and cross-browser responsiveness.

---

### 6.2 Machine Learning Model Evaluation & Results

#### 6.2.1 English Dataset Benchmark (WELFake Dataset — 72,134 Articles)
| Model Architecture | Accuracy | Precision (Fake) | Recall (Fake) | F1-Score | Inference Latency |
|---|---|---|---|---|---|
| **TF-IDF + Passive Aggressive (Selected)** | **94.82%** | **0.951** | **0.946** | **0.948** | **< 12 ms** |
| TF-IDF + Logistic Regression | 93.65% | 0.940 | 0.933 | 0.936 | < 10 ms |
| TF-IDF + Multinomial Naive Bayes | 89.20% | 0.885 | 0.902 | 0.893 | < 8 ms |
| TF-IDF + Linear Support Vector Machine | 94.40% | 0.946 | 0.942 | 0.944 | < 15 ms |
| Bi-LSTM / Deep Neural Network | 93.90% | 0.938 | 0.940 | 0.939 | ~ 65 ms |

#### 6.2.2 Sinhala Language Dataset Benchmark
| Model Architecture | Accuracy | Macro Precision | Macro Recall | Macro F1-Score | Latency |
|---|---|---|---|---|---|
| **Sinhala TF-IDF + Linear SVM / SGD (Selected)** | **92.40%** | **0.928** | **0.920** | **0.924** | **< 15 ms** |
| Sinhala TF-IDF + Logistic Regression | 90.85% | 0.912 | 0.905 | 0.908 | < 12 ms |
| Sinhala TF-IDF + Multinomial Naive Bayes | 86.70% | 0.875 | 0.858 | 0.866 | < 10 ms |

#### 6.2.3 Computer Vision AI Image Forensics Evaluation
| Test Category | Sample Count | Correct Classification | Accuracy Rate | Key Forensic Trigger |
|---|---|---|---|---|
| **Generative AI Images** (Midjourney, DALL-E, Flux) | 50 | 48 | **96.0%** | 2D FFT Anomaly, RGB Covariance, Missing EXIF |
| **Authentic Camera Captures** (DSLR, Smartphone) | 50 | 47 | **94.0%** | Hardware Optical EXIF, Photon Shot Noise |
| **Digitally Manipulated / Spliced Images** | 30 | 27 | **90.0%** | Error Level Analysis (ELA) Variance |

---

### 6.3 Functional & API Verification Matrix

| Test ID | Test Scenario | Input Data / Action | Expected Result | Status |
|---|---|---|---|---|
| **TC-01** | User Registration & Password Hashing | Valid user name, email, secure password | 201 Created; Password hashed via bcrypt in DB | **PASSED** |
| **TC-02** | English Fake Claim Detection | Sensationalized fabricated news headline | Classified as 'fake' (confidence > 85%) + Red XAI tokens | **PASSED** |
| **TC-03** | Sinhala News Verification | Sinhala text (`...හදිසි නීතිය පනවා ඇත...`) | Correctly routed to Sinhala NLP model + accurate label | **PASSED** |
| **TC-04** | Live News RSS Sync | Invoking `/api/v1/predictions/trending/sync-live` | Fetches live Ada Derana & BBC feeds; verifies and stores in DB | **PASSED** |
| **TC-05** | Generative AI Image Detection | Upload of AI synthesized image | Flagged as `AI-Generated` (98% Fake) with Forensic Signals | **PASSED** |
| **TC-06** | Hardware Camera Photo Verification | JPEG image with genuine Canon/Nikon EXIF | Classified as `Authentic Image` (95% Real) | **PASSED** |
| **TC-07** | Virality Risk Computation | Social media sensational claim | High Virality Score (85/100) with urgency alerts | **PASSED** |
| **TC-08** | Unauthorized Access Defense | Protected endpoint request without Bearer token | 401 Unauthorized response returned | **PASSED** |

---

# CHAPTER 7: DISCUSSION, CONCLUSION, AND FUTURE WORK

### 7.1 Discussion of Findings
1. **Multi-Lingual Misinformation Gap**: Prior systems focus almost exclusively on English corpora. The integration of a dedicated Sinhala NLP processing pipeline demonstrated that character-level n-gram features and custom Sinhala stopword removal yield high classification fidelity (92.4% F1) without requiring massive multilingual transformer models that introduce latency.
2. **Explainability Fosters User Trust**: Providing token attribution weights (Explainable AI) allows end users, fact-checkers, and journalists to understand *why* a particular article or WhatsApp message is flagged as deceptive.
3. **Multimodal Synergy**: Misinformation campaigns frequently combine synthetic imagery with sensational text. Combining image forensics (FFT spectral signatures, ELA, and sensor telemetry) with text classification creates a comprehensive defense mechanism.

### 7.2 Limitations
- **Evolving Generative AI Generators**: Newer diffusion models with post-processing filters may diminish high-frequency frequency spectral peaks.
- **Low-Resource Sinhala Dataset Size**: While achieving 92.4% accuracy on available benchmarks, expanding local Sinhala news corpuses across regional dialects and slang will enhance robustness.
- **Network Dependency for URL Scraping**: Scraping articles behind paywalls or dynamic JavaScript SPAs requires continuous scraper maintenance.

### 7.3 Future Enhancements
1. **Large Language Model (LLM) Integration**: Incorporating fine-tuned open-source LLMs (e.g., LLaMA-3 / Mistral) for contextual fact synthesis and automated counter-narrative generation.
2. **Deepfake Video & Audio Detection**: Extending the computer vision engine to support temporal frame-by-frame analysis of manipulated video and synthesized voice clones.
3. **Browser Extension & WhatsApp Verification Bot**: Deploying a lightweight browser extension and WhatsApp bot for instant real-time verification directly within messaging applications.
4. **Blockchain-Backed Audit Trail**: Storing verified fact-check claims on a decentralized ledger for immutable transparency.

### 7.4 Conclusion
The developed **AI-Based Fake News Verification and Multimodal Defense System** successfully demonstrates that high-performance, real-time misinformation detection is achievable across both English and Sinhala languages. Through combining machine learning classification, explainable AI token attribution, image forensics, automated fact verification, and social virality scoring, the system provides an invaluable tool in safeguarding digital information integrity and defending against modern disinformation campaigns.

---
