from datetime import date, timedelta
import numpy as np


def generate_synthetic_affluence_dataset(
    num_days: int = 90,
    seed: int = 42,
) -> tuple[np.ndarray, np.ndarray, list[dict]]:
    """
    Génère un jeu de données synthétique d'affluence journalière sur une campagne d'inscription.
    Retourne (X_features, y_registrations, raw_records).
    """
    rng = np.random.default_rng(seed)
    start_date = date(2026, 9, 1)

    features: list[list[float]] = []
    targets: list[float] = []
    records: list[dict] = []

    for day_idx in range(num_days):
        current_day = start_date + timedelta(days=day_idx)
        dow = current_day.weekday()  # 0=lundi .. 6=dimanche
        is_weekend = 1.0 if dow >= 5 else 0.0
        # Pic d'affluence au milieu de la campagne (jours 35 à 60)
        peak_factor = float(np.exp(-((day_idx - 45) ** 2) / (2 * 14**2)))

        base = 35.0 + 130.0 * peak_factor
        if is_weekend:
            base *= 0.22
        elif dow == 0:  # Lundi souvent plus chargé
            base *= 1.18

        noise = float(rng.normal(0.0, 8.0))
        count = max(5, int(round(base + noise)))

        features.append([float(dow), float(day_idx), is_weekend, peak_factor])
        targets.append(float(count))
        records.append(
            {
                "date": current_day.isoformat(),
                "day_of_week": dow,
                "day_of_campaign": day_idx,
                "is_weekend": bool(is_weekend),
                "registrations": count,
            }
        )

    return np.array(features, dtype=float), np.array(targets, dtype=float), records


def generate_synthetic_dossier_dataset(seed: int = 42) -> np.ndarray:
    """
    Génère un jeu de données synthétique de dossiers normaux pour entraîner IsolationForest.
    Colonnes : [amount_fcfa, payment_attempts, hour_of_day, docs_count].
    """
    rng = np.random.default_rng(seed)
    n_samples = 400

    amounts = np.full(n_samples, 25000.0)
    attempts = rng.choice([1.0, 2.0], size=n_samples, p=[0.85, 0.15])
    hours = rng.integers(8, 21, size=n_samples).astype(float)
    docs = rng.choice([0.0, 2.0, 4.0], size=n_samples, p=[0.2, 0.3, 0.5])

    return np.column_stack([amounts, attempts, hours, docs])
