import math
import logging
import numpy as np
from typing import Dict, Any, List, Tuple
from sklearn.ensemble import RandomForestClassifier

logger = logging.getLogger(__name__)

class MLRiskEngine:
    def __init__(self):
        self.model = RandomForestClassifier(n_estimators=50, random_state=42)
        self._is_trained = False
        self._train_prototype_model()

    def _train_prototype_model(self):
        """
        Trains an explainable Random Forest classifier on derived physical orbital screening scenarios.
        Features: [miss_distance_km, relative_velocity_kms, time_to_tca_hours, altitude_km]
        Labels: 0: LOW, 1: MEDIUM, 2: HIGH, 3: CRITICAL
        """
        np.random.seed(42)
        X = []
        y = []

        # Synthetic/derived calibration dataset across orbital regimes
        # 1. Critical scenarios: Very close (< 2 km), short lead time (< 24h), high speed (> 8 km/s)
        for _ in range(150):
            d = np.random.uniform(0.05, 1.95)
            v = np.random.uniform(8.0, 15.0)
            t = np.random.uniform(1.0, 24.0)
            alt = np.random.uniform(350.0, 800.0)
            X.append([d, v, t, alt])
            y.append(3) # CRITICAL

        # 2. High risk scenarios: 2.0 km - 5.0 km
        for _ in range(150):
            d = np.random.uniform(2.0, 5.0)
            v = np.random.uniform(6.0, 14.0)
            t = np.random.uniform(6.0, 36.0)
            alt = np.random.uniform(400.0, 900.0)
            X.append([d, v, t, alt])
            y.append(2) # HIGH

        # 3. Medium risk scenarios: 5.0 km - 15.0 km
        for _ in range(150):
            d = np.random.uniform(5.0, 15.0)
            v = np.random.uniform(4.0, 13.0)
            t = np.random.uniform(12.0, 48.0)
            alt = np.random.uniform(400.0, 1200.0)
            X.append([d, v, t, alt])
            y.append(1) # MEDIUM

        # 4. Low risk scenarios: > 15.0 km or long lead time (> 48h)
        for _ in range(150):
            d = np.random.uniform(15.0, 50.0)
            v = np.random.uniform(2.0, 12.0)
            t = np.random.uniform(24.0, 72.0)
            alt = np.random.uniform(400.0, 1400.0)
            X.append([d, v, t, alt])
            y.append(0) # LOW

        X = np.array(X)
        y = np.array(y)
        self.model.fit(X, y)
        self._is_trained = True
        logger.info("Trained scikit-learn Random Forest orbital risk model.")

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
        # Miss distance influence: exponential decay with scale 3.0 km
        dist_factor = math.exp(-miss_distance_km / 3.2) * 55.0

        # Relative velocity influence: higher closing velocity scales up kinetic hazard
        vel_factor = min(25.0, (relative_velocity_kms / 14.0) * 25.0)

        # Time to TCA influence: closer events compress reaction timeline
        tca_factor = max(0.0, (1.0 - min(time_to_tca_hours, 48.0) / 48.0) * 20.0)

        raw_score = dist_factor + vel_factor + tca_factor
        score = max(5.0, min(98.0, round(raw_score, 1)))

        # 2. ML Prediction validation
        feat = np.array([[miss_distance_km, relative_velocity_kms, time_to_tca_hours, altitude_km]])
        pred_class = int(self.model.predict(feat)[0])
        
        # Categorical level mapping
        if score >= 80.0 or pred_class == 3:
            level = "CRITICAL"
        elif score >= 60.0 or pred_class == 2:
            level = "HIGH"
        elif score >= 40.0 or pred_class == 1:
            level = "MEDIUM"
        else:
            level = "LOW"

        # 3. Transparent factor attribution explanation
        factors = []
        if miss_distance_km < 1.0:
            factors.append(f"Critical miss distance: {miss_distance_km:.2f} km is well within the 1.0 km hard avoidance threshold.")
        elif miss_distance_km < 5.0:
            factors.append(f"Low separation: {miss_distance_km:.2f} km is inside the 5.0 km operational screening safety bubble.")
        else:
            factors.append(f"Moderate separation: {miss_distance_km:.2f} km exceeds close hazard thresholds.")

        if relative_velocity_kms > 10.0:
            factors.append(f"High relative closing velocity: {relative_velocity_kms:.2f} km/s severely compresses collision geometry.")
        elif relative_velocity_kms > 5.0:
            factors.append(f"Moderate relative closing velocity: {relative_velocity_kms:.2f} km/s.")
        else:
            factors.append(f"Low closing velocity: {relative_velocity_kms:.2f} km/s.")

        if time_to_tca_hours < 12.0:
            factors.append(f"Imminent encounter: TCA in {time_to_tca_hours:.1f} hours limits coordination and ground pass verification.")
        elif time_to_tca_hours < 24.0:
            factors.append(f"Approaching window: TCA in {time_to_tca_hours:.1f} hours provides standard maneuver planning timeline.")
        else:
            factors.append(f"Extended lead time: TCA in {time_to_tca_hours:.1f} hours enables multi-orbit monitoring.")

        factors.append(f"Orbital regime: LEO altitude at {altitude_km:.1f} km has elevated debris density.")

        return score, level, factors

ml_risk_engine = MLRiskEngine()
