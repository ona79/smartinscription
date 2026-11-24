import numpy as np
from sklearn.ensemble import IsolationForest

from app.synthetic_data import generate_synthetic_dossier_dataset


class DossierAnomalyModel:
    """Classification des dossiers et détection d'anomalies sur les paiements."""

    def __init__(self) -> None:
        x_train = generate_synthetic_dossier_dataset()
        self._detector = IsolationForest(contamination=0.05, random_state=42)
        self._detector.fit(x_train)

    def evaluate(
        self,
        amount_fcfa: int,
        payment_attempts: int,
        hour_of_day: int,
        docs_count: int,
    ) -> dict:
        """Évalue un dossier/paiement et retourne la classification + score de risque."""
        reasons: list[str] = []
        rule_risk = 0.0

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
            [[float(amount_fcfa), float(payment_attempts), float(hour_of_day), float(docs_count)]]
        )
        raw_decision = float(self._detector.decision_function(x_obs)[0])
        # Normalise le score IsolationForest vers [0, 1]
        ml_risk = float(np.clip(0.5 - raw_decision, 0.0, 1.0))

        final_score = round(min(1.0, max(rule_risk, (rule_risk * 0.65) + (ml_risk * 0.35))), 2)
        is_anomaly = final_score >= 0.55

        if final_score >= 0.7:
            classification = "SUSPECT"
        elif final_score >= 0.4:
            classification = "A_VERIFIER"
        else:
            classification = "CONFORME"

        if not reasons and is_anomaly:
            reasons.append("Comportement statistiquement atypique détecté par le modèle.")

        return {
            "classification": classification,
            "anomaly_score": final_score,
            "is_anomaly": is_anomaly,
            "reasons": reasons,
        }


anomaly_model = DossierAnomalyModel()
