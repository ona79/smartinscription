from __future__ import annotations

from datetime import date, timedelta
import math
from pathlib import Path
import joblib
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split

from app.synthetic_data import CAMPAIGN_HOURS, UFR_CODES, generate_synthetic_affluence_dataset

ARTIFACTS_DIR = Path(__file__).resolve().parent.parent / "artifacts"
AFFLUENCE_MODEL_PATH = ARTIFACTS_DIR / "affluence_rf.joblib"
DEFAULT_AGENT_CAPACITY = 25


class AffluenceAndStaffingModel:
    """Modèle de prédiction d'affluence (jour, heure, UFR) et besoins en personnel."""

    def __init__(self) -> None:
        x_all, y_all = generate_synthetic_affluence_dataset()
        x_train, x_test, y_train, y_test = train_test_split(
            x_all, y_all, test_size=0.2, random_state=42
        )

        if AFFLUENCE_MODEL_PATH.exists():
            self._model: RandomForestRegressor = joblib.load(AFFLUENCE_MODEL_PATH)
        else:
            ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
            self._model = RandomForestRegressor(
                n_estimators=60, max_depth=12, random_state=42, n_jobs=-1
            )
            self._model.fit(x_train, y_train)
            joblib.dump(self._model, AFFLUENCE_MODEL_PATH)

        y_pred = self._model.predict(x_test)
        self.metrics = {
            "mae": round(float(mean_absolute_error(y_test, y_pred)), 3),
            "r2": round(float(r2_score(y_test, y_pred)), 3),
        }

    def predict_affluence(
        self,
        days: int = 7,
        start_date: date | None = None,
        campaign_day_offset: int = 32,
    ) -> dict:
        """Prédit l'affluence par jour, par heure et par UFR."""
        base_date = start_date or date.today()
        daily: list[dict] = []
        hourly: list[dict] = []
        by_ufr: list[dict] = []

        ufr_totals = {code: 0 for code in UFR_CODES}

        for i in range(days):
            target_day = base_date + timedelta(days=i)
            dow = target_day.weekday()
            is_weekend = 1.0 if dow >= 5 else 0.0
            day_idx = (campaign_day_offset + i) % 90
            peak_factor = math.exp(-((day_idx - 32) ** 2) / (2 * 13**2)) + 0.45 * math.exp(
                -((day_idx - 78) ** 2) / (2 * 6**2)
            )

            day_total = 0
            day_rows: list[list[float]] = []
            row_meta: list[tuple[str, int]] = []

            for ufr_idx, ufr_code in enumerate(UFR_CODES):
                for hour in CAMPAIGN_HOURS:
                    day_rows.append(
                        [
                            2.0,
                            float(day_idx),
                            float(dow),
                            float(hour),
                            float(ufr_idx),
                            is_weekend,
                            peak_factor,
                        ]
                    )
                    row_meta.append((ufr_code, hour))

            preds = self._model.predict(np.array(day_rows, dtype=float))
            hour_totals = {h: 0 for h in CAMPAIGN_HOURS}

            for (ufr_code, hour), raw_val in zip(row_meta, preds):
                val = max(0, int(round(float(raw_val))))
                day_total += val
                ufr_totals[ufr_code] += val
                hour_totals[hour] += val

            for hour, h_val in hour_totals.items():
                hourly.append(
                    {
                        "date": target_day.isoformat(),
                        "heure": hour,
                        "predicted_registrations": h_val,
                    }
                )

            daily.append(
                {
                    "date": target_day.isoformat(),
                    "predicted_registrations": day_total,
                    "recommended_agents": max(1, math.ceil(day_total / DEFAULT_AGENT_CAPACITY))
                    if not is_weekend
                    else (1 if day_total >= 15 else 0),
                    "workload_level": (
                        "CRITIQUE"
                        if day_total >= 180
                        else "ELEVE"
                        if day_total >= 100
                        else "NORMAL"
                    ),
                }
            )

        for code, total in ufr_totals.items():
            by_ufr.append({"ufr_code": code, "predicted_registrations": total})

        return {
            "model": "RandomForestRegressor (3 ans synthétiques, horaire + UFR)",
            "metrics": self.metrics,
            "forecasts": daily,
            "hourly_forecasts": hourly,
            "ufr_forecasts": by_ufr,
        }

    def predict_staffing(
        self,
        days: int = 7,
        agent_capacity: int = DEFAULT_AGENT_CAPACITY,
        start_date: date | None = None,
    ) -> dict:
        """Calcule les besoins en personnel par jour et par UFR selon la capacité."""
        affluence = self.predict_affluence(days=days, start_date=start_date)
        hourly_cap = max(1, math.ceil(agent_capacity / len(CAMPAIGN_HOURS)))

        daily_staffing = [
            {
                "date": d["date"],
                "predicted_registrations": d["predicted_registrations"],
                "recommended_agents": max(1, math.ceil(d["predicted_registrations"] / agent_capacity)),
                "workload_level": d["workload_level"],
            }
            for d in affluence["forecasts"]
        ]

        hourly_staffing = [
            {
                "date": h["date"],
                "heure": h["heure"],
                "predicted_registrations": h["predicted_registrations"],
                "recommended_agents": max(1, math.ceil(h["predicted_registrations"] / hourly_cap)),
            }
            for h in affluence["hourly_forecasts"]
        ]

        ufr_staffing = [
            {
                "ufr_code": u["ufr_code"],
                "predicted_registrations": u["predicted_registrations"],
                "recommended_agents_per_day": max(
                    1, math.ceil((u["predicted_registrations"] / max(1, days)) / agent_capacity)
                ),
            }
            for u in affluence["ufr_forecasts"]
        ]

        return {
            "agent_capacity": agent_capacity,
            "daily_staffing": daily_staffing,
            "hourly_staffing": hourly_staffing,
            "ufr_staffing": ufr_staffing,
        }


affluence_model = AffluenceAndStaffingModel()
