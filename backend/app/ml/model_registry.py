import os
import json
import logging
import pickle
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from sklearn.ensemble import RandomForestClassifier

logger = logging.getLogger(__name__)

MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "saved_models")
os.makedirs(MODEL_DIR, exist_ok=True)

class ModelMetadata:
    def __init__(
        self,
        model_version: str,
        algorithm: str,
        training_date: str,
        training_data_type: str,
        metrics: Dict[str, Any],
        description: str
    ):
        self.model_version = model_version
        self.algorithm = algorithm
        self.training_date = training_date
        self.training_data_type = training_data_type
        self.metrics = metrics
        self.description = description

    def to_dict(self) -> Dict[str, Any]:
        return {
            "model_version": self.model_version,
            "algorithm": self.algorithm,
            "training_date": self.training_date,
            "training_data_type": self.training_data_type,
            "metrics": self.metrics,
            "description": self.description
        }

class ModelRegistry:
    """
    Registry for managing persisted ML models and their audit metadata.
    """
    def __init__(self):
        self.active_model: Optional[RandomForestClassifier] = None
        self.active_metadata: Optional[ModelMetadata] = None

    def save_model(
        self,
        model: RandomForestClassifier,
        version: str,
        metrics: Dict[str, Any],
        description: str = "Prototype model trained on synthetic data"
    ) -> str:
        model_path = os.path.join(MODEL_DIR, f"rf_model_{version}.pkl")
        meta_path = os.path.join(MODEL_DIR, f"metadata_{version}.json")

        with open(model_path, "wb") as f:
            pickle.dump(model, f)

        meta = ModelMetadata(
            model_version=version,
            algorithm="RandomForestClassifier",
            training_date=datetime.now(timezone.utc).isoformat(),
            training_data_type="SYNTHETIC_CALIBRATION_PROTOTYPE",
            metrics=metrics,
            description=description
        )

        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(meta.to_dict(), f, indent=2)

        self.active_model = model
        self.active_metadata = meta
        logger.info(f"Saved and registered model {version} at {model_path}")
        return model_path

    def load_latest_model(self) -> Optional[RandomForestClassifier]:
        if self.active_model is not None:
            return self.active_model

        # Attempt to load from disk
        version = "v1.0.0-rf-prototype"
        model_path = os.path.join(MODEL_DIR, f"rf_model_{version}.pkl")
        meta_path = os.path.join(MODEL_DIR, f"metadata_{version}.json")

        if os.path.exists(model_path) and os.path.exists(meta_path):
            with open(model_path, "rb") as f:
                self.active_model = pickle.load(f)
            with open(meta_path, "r", encoding="utf-8") as f:
                d = json.load(f)
                self.active_metadata = ModelMetadata(**d)
            logger.info(f"Loaded registered model {version} from {model_path}")
            return self.active_model

        return None

model_registry = ModelRegistry()
