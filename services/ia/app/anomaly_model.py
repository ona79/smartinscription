from __future__ import annotations

from pathlib import Path
import joblib
import numpy as np
from sklearn.ensemble import IsolationForest

from app.synthetic_data import generate_synthetic_dossier_dataset

ARTIFACTS_DIR = Path(__file__).resolve().parent.parent / "artifacts"
ANOMALY_MODEL_PATH = ARTIFACTS_DIR / "anomaly_iforest.joblib"


class DossierAnomalyModel:
    """Classification des dossiers et détection d'anomalies (règles + IsolationForest)."""

    def __init__(self) -> None:
        if ANOMALY_MODEL_PATH.exists():
            self._detector: IsolationForest = joblib.load(ANOMALY_MODEL_PATH)
        else:
            ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
            x_train = generate_synthetic_dossier_dataset()
            self._detector = IsolationForest(contamination=0.05, random_state=42)
            self._detector.fit(x_train)
            joblib.dump(self._detector, ANOMALY_MODEL_PATH)

    def evaluate(
        self,
        amount_fcfa: int,
        payment_attempts: int,
        hour_of_day: int,
        docs_count: int,
        login_hour: int = 12,
        rule_flags: list[str] | None = None,
    ) -> dict:
        """Évalue un dossier et retourne classification, score [0..1] et motifs."""
        reasons: list[str] = list(rule_flags or [])
        rule_risk = 0.0

        if reasons:
            rule_risk += min(0.85, 0.45 * len(reasons))

        if amount_fcfa != 25000:
            rule_risk += 0.5
            reasons.append(f"Montant inhabituel ({amount_fcfa} FCFA au lieu de 25 000 FCFA).")

        if payment_attempts >= 4:
            rule_risk += 0.35
            reasons.append(f"Tentatives de paiement répétées ({payment_attempts} essais).")

        if hour_of_day < 6 or hour_of_day > 23:
            rule_risk += 0.15
            reasons.append(f"Horaire de transaction atypique ({hour_of_day}h).")

        x_obs = np.array(
            [
                [
                    float(amount_fcfa),
                    float(payment_attempts),
                    float(hour_of_day),
                    float(docs_count),
                    float(login_hour),
                ]
            ]
        )
        raw_decision = float(self._detector.decision_function(x_obs)[0])
        ml_risk = float(np.clip(0.5 - raw_decision, 0.0, 1.0))

        final_score = round(
            min(1.0, max(rule_risk, (rule_risk * 0.65) + (ml_risk * 0.35))), 2
        )
        is_anomaly = final_score >= 0.55

        if final_score >= 0.7:
            classification = "SUSPECT"
        elif final_score >= 0.4:
            classification = "A_VERIFIER"
        else:
            classification = "CONFORME"

        if not reasons and is_anomaly:
            reasons.append("Comportement statistiquement atypique détecté par IsolationForest.")

        return {
            "classification": classification,
            "anomaly_score": final_score,
            "is_anomaly": is_anomaly,
            "reasons": reasons,
        }


anomaly_model = DossierAnomalyModel()
