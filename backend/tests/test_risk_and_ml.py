import pytest
from app.services.ml_risk_engine import ml_risk_engine
from app.ml.dataset import generate_prototype_training_data, DATA_ORIGIN_LABEL
from app.ml.train import train_and_register_model
from app.ml.predict import predict_risk

def test_risk_scoring_continuum():
    # Close encounter (0.3 km, high velocity 12 km/s, close TCA 10h)
    score_high, level_high, factors = ml_risk_engine.compute_risk_score(
        miss_distance_km=0.3,
        relative_velocity_kms=12.0,
        time_to_tca_hours=10.0,
        altitude_km=550.0
    )
    assert score_high >= 70.0
    assert level_high in ["HIGH", "CRITICAL"]
    assert len(factors) > 0

    # Distant encounter (30 km, 5 km/s, 60h)
    score_low, level_low, _ = ml_risk_engine.compute_risk_score(
        miss_distance_km=30.0,
        relative_velocity_kms=5.0,
        time_to_tca_hours=60.0,
        altitude_km=550.0
    )
    assert score_low < 40.0
    assert level_low == "LOW"

def test_ml_dataset_generation():
    X_train, y_train, X_val, y_val, X_test, y_test = generate_prototype_training_data(seed=42)
    assert len(X_train) > 0
    assert len(X_val) > 0
    assert len(X_test) > 0
    assert X_train.shape[1] == 4
    assert set(y_train.tolist()) == {0, 1, 2, 3}
    assert "SYNTHETIC" in DATA_ORIGIN_LABEL

def test_ml_train_and_predict():
    res = train_and_register_model(version="v1.0.0-test-rf")
    assert res["status"] == "SUCCESS"
    assert "precision_weighted" in res["metrics"]
    assert "recall_weighted" in res["metrics"]
    assert "f1_weighted" in res["metrics"]
    assert "confusion_matrix" in res["metrics"]

    pred_idx, label, probs = predict_risk(1.2, 10.5, 12.0, 500.0)
    assert label in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    assert len(probs) == 4

def test_formal_pc_disclaimer():
    assessment = ml_risk_engine.get_full_assessment(
        conjunction_id="TEST-CONJ",
        miss_distance_km=1.5,
        relative_velocity_kms=10.0,
        time_to_tca_hours=18.0
    )
    assert "Formal Pc: Not available in current prototype" in assessment["formal_pc"]
    assert "Prototype model trained on synthetic data" in assessment["model_data_origin"]
