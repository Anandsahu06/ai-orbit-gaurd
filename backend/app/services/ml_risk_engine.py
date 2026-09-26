import math
import logging
from typing import Dict, Any, List, Tuple
from app.ml.predict import predict_risk
from app.ml.model_registry import model_registry

logger = logging.getLogger(__name__)

class MLRiskEngine:
    """
    Modular STM Risk Assessment Engine.
    Strictly separates:
    A. Physics / Orbital inputs
    B. Analytical baseline scoring (0-100)
    C. Machine Learning risk classification (scikit-learn Random Forest)
    
    Scientific Honesty:
    - Never presents scores as formal Probability of Collision (Pc).
    - Formal Pc is explicitly marked as "Not available in current prototype".
    - ML model is labeled as "Prototype model trained on synthetic data".
    """

    def compute_risk_score(
        self,
        miss_distance_km: float,
        relative_velocity_kms: float,
        time_to_tca_hours: float,
        altitude_km: float = 550.0
    ) -> Tuple[float, str, List[str]]:
        """
        Calculates prototype risk score (0-100), categorical risk level,
        and generates explainability factor attributions.
        """
        # 1. Base analytical formulation for smooth continuum scoring (0-100)
        # Miss distance influence: exponential decay with scale 3.2 km
        dist_factor = math.exp(-miss_distance_km / 3.2) * 55.0

        # Relative velocity influence: higher closing velocity scales up kinetic hazard
        vel_factor = min(25.0, (relative_velocity_kms / 14.0) * 25.0)

        # Time to TCA influence: closer events compress reaction timeline
        tca_factor = max(0.0, (1.0 - min(time_to_tca_hours, 48.0) / 48.0) * 20.0)

        raw_score = dist_factor + vel_factor + tca_factor
        score = max(5.0, min(98.0, round(raw_score, 1)))

        # 2. Scikit-Learn ML inference
        pred_idx, ml_label, prob_dict = predict_risk(
            miss_distance_km, relative_velocity_kms, time_to_tca_hours, altitude_km
        )

        # Categorical level mapping: combination of continuum threshold and ML classifier
        if score >= 80.0 or pred_idx == 3:
            level = "CRITICAL"
        elif score >= 60.0 or pred_idx == 2:
            level = "HIGH"
        elif score >= 35.0 or pred_idx == 1:
            level = "MEDIUM"
        else:
            level = "LOW"

        # 3. Physical explainability factor breakdown
        factors = []
        if miss_distance_km < 1.0:
            factors.append(f"Ultra-close miss distance of {miss_distance_km:.2f} km triggers emergency screening threshold.")
        elif miss_distance_km < 5.0:
            factors.append(f"Separation of {miss_distance_km:.2f} km falls within the active orbital warning zone.")
        else:
            factors.append(f"Separation of {miss_distance_km:.2f} km provides moderate geometric clearance.")

        if relative_velocity_kms > 10.0:
            factors.append(f"Hyper-velocity closing speed ({relative_velocity_kms:.2f} km/s) amplifies kinetic collision severity.")
        else:
            factors.append(f"Relative closing speed of {relative_velocity_kms:.2f} km/s.")

        if time_to_tca_hours < 24.0:
            factors.append(f"Approaching within {time_to_tca_hours:.1f} hours; decision lead time is compressed.")
        else:
            factors.append(f"TCA in {time_to_tca_hours:.1f} hours allows sufficient monitoring and planning margin.")

        return score, level, factors

    def get_full_assessment(
        self,
        conjunction_id: str,
        miss_distance_km: float,
        relative_velocity_kms: float,
        time_to_tca_hours: float,
        altitude_km: float = 550.0
    ) -> Dict[str, Any]:
        """
        Returns full structured risk assessment compliant with API requirements.
        """
        score, level, factors = self.compute_risk_score(
            miss_distance_km, relative_velocity_kms, time_to_tca_hours, altitude_km
        )
        _, ml_label, class_probs = predict_risk(
            miss_distance_km, relative_velocity_kms, time_to_tca_hours, altitude_km
        )

        meta = model_registry.active_metadata

        return {
            "conjunction_id": conjunction_id,
            "risk_score": score,
            "risk_level": level,
            "scoring_method": "ANALYTICAL_CONTINUUM_AND_RANDOM_FOREST",
            "model_version": meta.model_version if meta else "v1.0.0-rf-prototype",
            "model_type": "Prototype Random Forest classifier",
            "model_data_origin": "Prototype model trained on synthetic data",
            "formal_pc": "Formal Pc: Not available in current prototype",
            "pc_requirement_notes": "Calculation of formal Pc requires 6x6 covariance matrices and hard-body radii not published in public GP datasets.",
            "ml_probabilities": class_probs,
            "explainability_factors": factors,
            "physical_parameters": {
                "miss_distance_km": miss_distance_km,
                "relative_velocity_kms": relative_velocity_kms,
                "time_to_tca_hours": time_to_tca_hours,
                "altitude_km": altitude_km
            }
        }

ml_risk_engine = MLRiskEngine()
