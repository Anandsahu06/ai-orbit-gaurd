import numpy as np
from typing import List, Dict, Any

FEATURE_NAMES: List[str] = [
    "miss_distance_km",
    "relative_velocity_kms",
    "time_to_tca_hours",
    "altitude_km"
]

RISK_LEVEL_NAMES: List[str] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]

def extract_features(
    miss_distance_km: float,
    relative_velocity_kms: float,
    time_to_tca_hours: float,
    altitude_km: float = 550.0
) -> np.ndarray:
    """
    Extracts and formats feature vector for ML risk model inference.
    """
    return np.array([[
        float(miss_distance_km),
        float(relative_velocity_kms),
        float(time_to_tca_hours),
        float(altitude_km)
    ]], dtype=np.float64)
