from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
import math
from pathlib import Path
import joblib
import numpy as np
from sklearn.ensemble import IsolationForest, RandomForestRegressor
from sklearn.metrics import confusion_matrix, mean_absolute_error, r2_score

from app.affluence_model import AFFLUENCE_MODEL_PATH, ARTIFACTS_DIR
from app.anomaly_model import ANOMALY_MODEL_PATH
from app.data_validation import (
    AffluenceRow,
    DataValidationError,
    PaymentRow,
    validate_affluence_csv,
    validate_payments_csv,
)
from app.synthetic_data import (
    UFR_CODES,
    generate_synthetic_affluence_dataset,
    generate_synthetic_dossier_dataset,
)

METRICS_PATH = ARTIFACTS_DIR / "metrics.json"


def _build_affluence_arrays_from_csv(rows: list[AffluenceRow]) -> tuple[np.ndarray, np.ndarray]:
    ufr_map = {code: idx for idx, code in enumerate(UFR_CODES)}
    start_date = rows[0].date_val
    features: list[list[float]] = []
    targets: list[float] = []

    for row in rows:
        day_idx = max(0, (row.date_val - start_date).days) % 90
        dow = row.date_val.weekday()
        is_weekend = 1.0 if dow >= 5 else 0.0
        peak_factor = math.exp(-((day_idx - 32) ** 2) / (2 * 13**2)) + 0.45 * math.exp(
            -((day_idx - 78) ** 2) / (2 * 6**2)
        )
        ufr_idx = ufr_map.get(row.ufr, hash(row.ufr) % 4)
        features.append(
            [
                float(row.date_val.year - start_date.year),
                float(day_idx),
                float(dow),
                float(row.heure),
                float(ufr_idx),
                is_weekend,
                peak_factor,
            ]
        )
        targets.append(float(row.nb_inscriptions))

    return np.array(features, dtype=float), np.array(targets, dtype=float)


def _build_payment_arrays_from_csv(rows: list[PaymentRow]) -> tuple[np.ndarray, np.ndarray]:
    attempts_by_student: dict[str, int] = {}
    features: list[list[float]] = []
    labels: list[int] = []

    for row in rows:
        attempts_by_student[row.student_hash] = attempts_by_student.get(row.student_hash, 0) + 1
        attempts = attempts_by_student[row.student_hash]
        hour = row.horodatage.hour
        docs_count = 4 if row.statut == "SUCCESS" else 1
        features.append(
            [
                float(row.montant),
                float(attempts),
                float(hour),
                float(docs_count),
                float(hour),
            ]
        )
        is_anomalous = int(row.montant != 25000 or attempts >= 4 or hour < 6 or hour > 23)
        labels.append(is_anomalous)

    return np.array(features, dtype=float), np.array(labels, dtype=int)


def train_models(
    source: str = "synthetic",
    affluence_csv: Path | None = None,
    payments_csv: Path | None = None,
) -> dict:
    """Entraîne les modèles ML et enregistre artifacts/*.joblib + artifacts/metrics.json."""
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

    if source == "csv":
        if not affluence_csv or not payments_csv:
            raise DataValidationError(
                "En mode --source csv, les arguments --affluence et --payments sont obligatoires."
            )
        aff_rows = validate_affluence_csv(affluence_csv)
        pay_rows = validate_payments_csv(payments_csv)
        x_aff, y_aff = _build_affluence_arrays_from_csv(aff_rows)
        x_pay, y_pay_true = _build_payment_arrays_from_csv(pay_rows)
    else:
        x_aff, y_aff = generate_synthetic_affluence_dataset()
        x_pay_normal = generate_synthetic_dossier_dataset()
        rng = np.random.default_rng(42)
        n_anom = 40
        x_pay_anom = np.column_stack(
            [
                rng.choice([15000, 50000], size=n_anom),
                rng.integers(4, 8, size=n_anom),
                rng.choice([1, 2, 3], size=n_anom),
                rng.integers(0, 2, size=n_anom),
                rng.choice([2, 3], size=n_anom),
            ]
        )
        x_pay = np.vstack([x_pay_normal, x_pay_anom])
        y_pay_true = np.concatenate(
            [np.zeros(len(x_pay_normal), dtype=int), np.ones(n_anom, dtype=int)]
        )

    # Découpage chronologique 80% train / 20% test
    aff_split = max(1, int(len(x_aff) * 0.8))
    x_aff_train, x_aff_test = x_aff[:aff_split], x_aff[aff_split:]
    y_aff_train, y_aff_test = y_aff[:aff_split], y_aff[aff_split:]

    rf = RandomForestRegressor(n_estimators=60, max_depth=12, random_state=42, n_jobs=-1)
    rf.fit(x_aff_train, y_aff_train)
    joblib.dump(rf, AFFLUENCE_MODEL_PATH)

    y_aff_pred = rf.predict(x_aff_test)
    aff_mae = round(float(mean_absolute_error(y_aff_test, y_aff_pred)), 3)
    aff_r2 = round(float(r2_score(y_aff_test, y_aff_pred)), 3) if len(y_aff_test) > 1 else 0.0

    # Modèle d'anomalies (IsolationForest)
    pay_split = max(1, int(len(x_pay) * 0.8))
    x_pay_train, x_pay_test = x_pay[:pay_split], x_pay[pay_split:]
    y_pay_test = y_pay_true[pay_split:]

    iforest = IsolationForest(contamination=0.05, random_state=42)
    iforest.fit(x_pay_train)
    joblib.dump(iforest, ANOMALY_MODEL_PATH)

    raw_preds = iforest.predict(x_pay_test)
    y_pay_pred = (raw_preds == -1).astype(int)
    tn, fp, fn, tp = confusion_matrix(y_pay_test, y_pay_pred, labels=[0, 1]).ravel()

    report = {
        "source": source,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "split_strategy": "chronological_80_20",
        "affluence": {
            "train_size": int(len(x_aff_train)),
            "test_size": int(len(x_aff_test)),
            "mae": aff_mae,
            "r2": aff_r2,
        },
        "anomalies": {
            "train_size": int(len(x_pay_train)),
            "test_size": int(len(x_pay_test)),
            "confusion_matrix": {
                "tn": int(tn),
                "fp": int(fp),
                "fn": int(fn),
                "tp": int(tp),
            },
        },
    }

    METRICS_PATH.write_text(json.dumps(report, indent=2), encoding="utf-8")
    return report


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Entraînement des modèles IA (données synthétiques ou CSV réels)."
    )
    parser.add_argument(
        "--source",
        choices=["synthetic", "csv"],
        default="synthetic",
        help="Source des données d'entraînement (défaut: synthetic).",
    )
    parser.add_argument("--affluence", type=Path, default=None, help="Chemin du CSV d'affluence.")
    parser.add_argument("--payments", type=Path, default=None, help="Chemin du CSV de paiements.")
    args = parser.parse_args()

    report = train_models(
        source=args.source,
        affluence_csv=args.affluence,
        payments_csv=args.payments,
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
