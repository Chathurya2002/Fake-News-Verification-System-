
# Fake News Model Comparison Report

**Dataset:** WELFake  
**Total Samples:** 63603  
**Training Samples:** 50882  
**Testing Samples:** 12721  
**Train/Test Split:** 80/20  
**Feature Extraction:** TF-IDF  
**Models Compared:** Logistic Regression and Linear SVM  
**Best Model:** Linear SVM

---

## Model Comparison

| Model | Accuracy | Balanced Accuracy | Precision | Recall | F1 Score |
|---|---:|---:|---:|---:|---:|
| Linear SVM | 0.9596 | 0.9595 | 0.9657 | 0.9602 | 0.9630 |
| Logistic Regression | 0.9503 | 0.9505 | 0.9603 | 0.9484 | 0.9543 |


---

## Selected Final Model

The final model selected was **Linear SVM**.

The model selection was primarily based on F1-score,
with balanced accuracy and overall accuracy used as
additional evaluation criteria.

### Final Model Performance

- Accuracy: 0.9596
- Balanced Accuracy: 0.9595
- Precision: 0.9657
- Recall: 0.9602
- F1 Score: 0.9630

The trained model artifact is stored at:

`backend/app/ml/artifacts/tfidf_best_model.json`
