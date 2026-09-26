import logging
from typing import Dict, Any
from sklearn.ensemble import RandomForestClassifier
from app.ml.dataset import generate_prototype_training_data
from app.ml.evaluate import evaluate_model
from app.ml.model_registry import model_registry

logger = logging.getLogger(__name__)

def train_and_register_model(
    version: str = "v1.0.0-rf-prototype",
    seed: int = 42
) -> Dict[str, Any]:
    """
    Trains the scikit-learn Random Forest model on labeled synthetic prototype data,
    evaluates it against an independent test set, and registers it.
    """
    logger.info("Generating synthetic calibration dataset for ML risk engine prototype...")
    X_train, y_train, X_val, y_val, X_test, y_test = generate_prototype_training_data(seed=seed)

    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=8,
        min_samples_split=4,
        random_state=seed
    )

    logger.info("Fitting Random Forest classifier...")
    model.fit(X_train, y_train)

    logger.info("Evaluating model performance on test split...")
    metrics = evaluate_model(model, X_test, y_test)

    model_registry.save_model(
        model=model,
        version=version,
        metrics=metrics,
        description="Prototype model trained on synthetic data for categorical risk tier classification."
    )

    return {
        "status": "SUCCESS",
        "version": version,
        "metrics": metrics
    }
