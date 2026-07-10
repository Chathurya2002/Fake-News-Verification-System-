# ML Workspace

This folder is for dataset preparation, model training, evaluation, and artifact export.

## Expected Dataset Format

The baseline scripts assume a CSV file with:

- `text`: news article, headline, or claim text.
- `label`: target class such as `fake` or `real`.

Update the scripts after the official proposal confirms the dataset.

## Planned Workflow

1. Place raw datasets in `data/raw/`.
2. Clean and normalize data into `data/processed/`.
3. Train baseline model with `scripts/train_baseline.py`.
4. Save model artifact to `../backend/app/ml/artifacts/`.
5. Record metrics in `reports/`.
