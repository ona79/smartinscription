from __future__ import annotations

from datetime import date, timedelta
import math
import numpy as np

UFR_CODES = ["UFR-ST", "UFR-SEG", "UFR-LSH", "UFR-SJP"]
UFR_WEIGHTS = {
    "UFR-ST": 1.30,
    "UFR-SEG": 1.15,
    "UFR-LSH": 0.90,
    "UFR-SJP": 0.85,
}
CAMPAIGN_HOURS = list(range(8, 19))  # 08h à 18h


def generate_synthetic_affluence_dataset(
    years: int = 3,
    days_per_year: int = 90,
    seed: int = 42,
) -> tuple[np.ndarray, np.ndarray]:
    """
    Génère un jeu de données synthétique sur 3 années, à granularité horaire et par UFR.
    Colonnes X : [year_idx, day_idx, dow, hour, ufr_idx, is_weekend, peak_factor].
    """
    rng = np.random.default_rng(seed)
    features: list[list[float]] = []
    targets: list[float] = []

    for year_idx in range(years):
        start_date = date(2024 + year_idx, 9, 1)
        for day_idx in range(days_per_year):
            current_day = start_date + timedelta(days=day_idx)
            dow = current_day.weekday()
            is_weekend = 1.0 if dow >= 5 else 0.0
            # Pic de rentrée (j~30) + léger rebond fin de période (j~78)
            rentree_peak = math.exp(-((day_idx - 32) ** 2) / (2 * 13**2))
            closing_peak = 0.45 * math.exp(-((day_idx - 78) ** 2) / (2 * 6**2))
            peak_factor = rentree_peak + closing_peak

            for ufr_idx, ufr_code in enumerate(UFR_CODES):
                ufr_weight = UFR_WEIGHTS[ufr_code]
                for hour in CAMPAIGN_HOURS:
                    # Pic matinal (9h-11h) surtout le lundi, creux 13h, reprise 15h
                    morning_boost = 1.35 if 9 <= hour <= 11 else 0.75 if hour == 13 else 1.0
                    monday_boost = 1.25 if (dow == 0 and 8 <= hour <= 12) else 1.0

                    base = (2.5 + 8.5 * peak_factor) * ufr_weight * morning_boost * monday_boost
                    if is_weekend:
                        base *= 0.18

                    noise = float(rng.normal(0.0, 0.9))
                    hourly_count = max(0, int(round(base + noise)))

                    features.append(
                        [
                            float(year_idx),
                            float(day_idx),
                            float(dow),
                            float(hour),
                            float(ufr_idx),
                            is_weekend,
                            peak_factor,
                        ]
                    )
                    targets.append(float(hourly_count))

    return np.array(features, dtype=float), np.array(targets, dtype=float)


def generate_synthetic_dossier_dataset(seed: int = 42) -> np.ndarray:
    """
    Génère 600 dossiers normaux synthétiques pour entraîner IsolationForest.
    Colonnes : [amount_fcfa, payment_attempts, hour_of_day, docs_count, login_hour].
    """
    rng = np.random.default_rng(seed)
    n_samples = 600

    amounts = np.full(n_samples, 25000.0)
    attempts = rng.choice([1.0, 2.0], size=n_samples, p=[0.85, 0.15])
    hours = rng.integers(8, 21, size=n_samples).astype(float)
    docs = rng.choice([0.0, 2.0, 4.0], size=n_samples, p=[0.15, 0.30, 0.55])
    login_hours = rng.integers(7, 22, size=n_samples).astype(float)

    return np.column_stack([amounts, attempts, hours, docs, login_hours])
