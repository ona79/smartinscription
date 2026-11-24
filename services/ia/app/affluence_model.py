from __future__ import annotations

from datetime import date, timedelta
import math
import numpy as np
from sklearn.ensemble import RandomForestRegressor

from app.synthetic_data import generate_synthetic_affluence_dataset

AGENT_DAILY_CAPACITY = 25


class AffluenceAndStaffingModel:
    """Modèle de prédiction d'affluence et de besoins en personnel."""

    def __init__(self) -> None:
        x_train, y_train, self.historical_sample = generate_synthetic_affluence_dataset()
        self._model = RandomForestRegressor(n_estimators=80, random_state=42)
        self._model.fit(x_train, y_train)

    def predict(
        self,
        days: int = 7,
        start_date: date | None = None,
        campaign_day_offset: int = 45,
    ) -> dict:
        """Prédit l'affluence et le nombre d'agents recommandés sur N jours."""
        base_date = start_date or date.today()
        forecasts: list[dict] = []

        for i in range(days):
            target_day = base_date + timedelta(days=i)
            dow = target_day.weekday()
            is_weekend = 1.0 if dow >= 5 else 0.0
            day_idx = (campaign_day_offset + i) % 90
            peak_factor = float(math.exp(-((day_idx - 45) ** 2) / (2 * 14**2)))

            x_pred = np.array([[float(dow), float(day_idx), is_weekend, peak_factor]])
            predicted = max(5, int(round(float(self._model.predict(x_pred)[0]))))

            if is_weekend:
                recommended_agents = 1 if predicted >= 15 else 0
            else:
                recommended_agents = max(1, math.ceil(predicted / AGENT_DAILY_CAPACITY))

            workload = (
                "CRITIQUE"
                if predicted >= 120
                else "ELEVE"
                if predicted >= 70
                else "NORMAL"
            )

            forecasts.append(
                {
                    "date": target_day.isoformat(),
                    "predicted_registrations": predicted,
                    "recommended_agents": recommended_agents,
                    "workload_level": workload,
                }
            )

        peak_day = max(forecasts, key=lambda item: item["predicted_registrations"])
        return {
            "model": "RandomForestRegressor (jeu synthétique 90j)",
            "agent_daily_capacity": AGENT_DAILY_CAPACITY,
            "forecasts": forecasts,
            "peak_day": peak_day,
        }


affluence_model = AffluenceAndStaffingModel()
