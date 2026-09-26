from typing import Dict, Any
import numpy as np
from sklearn.metrics import (
    precision_score, recall_score, f1_score, confusion_matrix, classification_report
)

def evaluate_model(model, X_test: np.ndarray, y_test: np.ndarray) -> Dict[str, Any]:
    """
    Evaluates ML classifier and returns precision, recall, F1, and confusion matrix.
    Never fabricates metrics.
    """
    y_pred = model.predict(X_test)

    prec = precision_score(y_test, y_pred, average="weighted", zero_division=0)
    rec = recall_score(y_test, y_pred, average="weighted", zero_division=0)
    f1 = f1_score(y_test, y_pred, average="weighted", zero_division=0)
    cm = confusion_matrix(y_test, y_pred).tolist()

    return {
        "precision_weighted": round(float(prec), 4),
        "recall_weighted": round(float(rec), 4),
        "f1_weighted": round(float(f1), 4),
        "confusion_matrix": cm,
        "test_sample_count": len(y_test)
    }
