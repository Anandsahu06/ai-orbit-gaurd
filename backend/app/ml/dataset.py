import numpy as np
from typing import Tuple, Dict, Any

DATA_ORIGIN_LABEL = "SYNTHETIC_CALIBRATION_PROTOTYPE (Clearly marked as non-operational training data)"

def generate_prototype_training_data(
    seed: int = 42,
    samples_per_class: int = 250
) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """
    Generates synthetic calibration scenarios clearly labeled as prototype data.
    Features: [miss_distance_km, relative_velocity_kms, time_to_tca_hours, altitude_km]
    Target classes: 0: LOW, 1: MEDIUM, 2: HIGH, 3: CRITICAL

    Returns: (X_train, y_train, X_val, y_val, X_test, y_test)
    """
    np.random.seed(seed)
    X = []
    y = []

    # 1. CRITICAL (Class 3): Miss distance < 2.0 km, short lead time < 24h, high velocity > 8 km/s
    for _ in range(samples_per_class):
        d = np.random.uniform(0.05, 1.95)
        v = np.random.uniform(8.0, 15.5)
        t = np.random.uniform(1.0, 24.0)
        alt = np.random.uniform(350.0, 800.0)
        X.append([d, v, t, alt])
        y.append(3)

    # 2. HIGH (Class 2): 2.0 km <= Miss distance < 5.0 km, lead time 6h - 36h
    for _ in range(samples_per_class):
        d = np.random.uniform(2.0, 5.0)
        v = np.random.uniform(6.0, 14.0)
        t = np.random.uniform(6.0, 36.0)
        alt = np.random.uniform(400.0, 900.0)
        X.append([d, v, t, alt])
        y.append(2)

    # 3. MEDIUM (Class 1): 5.0 km <= Miss distance < 15.0 km
    for _ in range(samples_per_class):
        d = np.random.uniform(5.0, 15.0)
        v = np.random.uniform(4.0, 13.0)
        t = np.random.uniform(12.0, 48.0)
        alt = np.random.uniform(400.0, 1200.0)
        X.append([d, v, t, alt])
        y.append(1)

    # 4. LOW (Class 0): Miss distance >= 15.0 km or lead time > 48h
    for _ in range(samples_per_class):
        d = np.random.uniform(15.0, 50.0)
        v = np.random.uniform(2.0, 12.0)
        t = np.random.uniform(24.0, 72.0)
        alt = np.random.uniform(400.0, 1400.0)
        X.append([d, v, t, alt])
        y.append(0)

    X = np.array(X, dtype=np.float64)
    y = np.array(y, dtype=np.int64)

    # Shuffle dataset
    indices = np.arange(len(y))
    np.random.shuffle(indices)
    X = X[indices]
    y = y[indices]

    # Split: 70% Train, 15% Validation, 15% Test
    n_total = len(y)
    n_train = int(0.70 * n_total)
    n_val = int(0.15 * n_total)

    X_train, y_train = X[:n_train], y[:n_train]
    X_val, y_val = X[n_train:n_train + n_val], y[n_train:n_train + n_val]
    X_test, y_test = X[n_train + n_val:], y[n_train + n_val:]

    return X_train, y_train, X_val, y_val, X_test, y_test
