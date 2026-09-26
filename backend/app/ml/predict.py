from typing import Dict, Any, Tuple
import numpy as np
from app.ml.features import extract_features, RISK_LEVEL_NAMES
from app.ml.model_registry import model_registry
from app.ml.train import train_and_register_model

def get_or_init_model():
    model = model_registry.load_latest_model()
    if model is None:
        train_and_register_model()
        model = model_registry.load_latest_model()
    return model

def predict_risk(
    miss_distance_km: float,
    relative_velocity_kms: float,
    time_to_tca_hours: float,
    altitude_km: float = 550.0
) -> Tuple[int, str, Dict[str, float]]:
    """
    Runs ML inference on conjunction geometry parameters.
    Returns: (predicted_class_index, class_label, class_probabilities)
    """
    model = get_or_init_model()
    feat = extract_features(miss_distance_km, relative_velocity_kms, time_to_tca_hours, altitude_km)

    pred_idx = int(model.predict(feat)[0])
    label = RISK_LEVEL_NAMES[pred_idx]

    probs = model.predict_proba(feat)[0]
    prob_dict = {
        name: round(float(p), 4)
        for name, p in zip(RISK_LEVEL_NAMES, probs)
    }

    return pred_idx, label, prob_dict
