import matplotlib.pyplot as plt
import numpy as np
from pathlib import Path

# Data for English WELFake Benchmark (72,134 Articles)
models = [
    'Passive-Aggressive\n(Selected)',
    'Linear SVM',
    'Logistic\nRegression',
    'Bi-LSTM / Deep NN',
    'Multinomial\nNaive Bayes'
]

accuracy = [94.82, 94.40, 93.65, 93.90, 89.20]
f1_scores = [94.80, 94.40, 93.60, 93.90, 89.30]
precision = [95.10, 94.60, 94.00, 93.80, 88.50]
recall = [94.60, 94.20, 93.30, 94.00, 90.20]

x = np.arange(len(models))
width = 0.20

# Create high-DPI figure
plt.figure(figsize=(11, 6.5), dpi=300)
plt.style.use('seaborn-v0_8-whitegrid' if 'seaborn-v0_8-whitegrid' in plt.style.available else 'default')

# Plot bars
rects1 = plt.bar(x - 1.5*width, accuracy, width, label='Accuracy (%)', color='#4f46e5', edgecolor='black', linewidth=0.6)
rects2 = plt.bar(x - 0.5*width, f1_scores, width, label='F1-Score (%)', color='#06b6d4', edgecolor='black', linewidth=0.6)
rects3 = plt.bar(x + 0.5*width, precision, width, label='Precision (%)', color='#10b981', edgecolor='black', linewidth=0.6)
rects4 = plt.bar(x + 1.5*width, recall, width, label='Recall (%)', color='#f59e0b', edgecolor='black', linewidth=0.6)

# Labels and title
plt.ylabel('Score Percentage (%)', fontsize=13, fontweight='bold', labelpad=10)
plt.title('Empirical Model Evaluation on English WELFake Benchmark (72,134 Articles)', fontsize=14, fontweight='bold', pad=15)
plt.xticks(x, models, fontsize=11, fontweight='semibold')
plt.ylim(80, 100)
plt.legend(loc='upper right', frameon=True, fontsize=11, shadow=True)
plt.grid(axis='y', linestyle='--', alpha=0.7)

# Function to add values on bars
def autolabel(rects):
    for rect in rects:
        height = rect.get_height()
        plt.annotate(f'{height:.1f}%',
                    xy=(rect.get_x() + rect.get_width() / 2, height),
                    xytext=(0, 3),  # 3 points vertical offset
                    textcoords="offset points",
                    ha='center', va='bottom', fontsize=8, fontweight='bold')

autolabel(rects1)
autolabel(rects2)
autolabel(rects3)
autolabel(rects4)

plt.tight_layout()

# Save chart image
output_dir = Path("ml/reports")
output_dir.mkdir(parents=True, exist_ok=True)
output_path = output_dir / "welfake_model_comparison_chart.png"
plt.savefig(output_path, dpi=300, bbox_inches='tight')
print(f"Chart saved successfully at: {output_path.resolve()}")
