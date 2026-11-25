from __future__ import annotations

import hmac
import os
from typing import Optional
from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

from app.affluence_model import DEFAULT_AGENT_CAPACITY, affluence_model
from app.anomaly_model import anomaly_model
from app.chatbot_faq import faq_chatbot

app = FastAPI(
    title="SmartInscription IA Service",
    description="Microservice IA pour la prédiction d'affluence, les besoins en personnel, la détection d'anomalies et le chatbot FAQ.",
    version="0.4.0",
)


def verify_api_key(x_api_key: Optional[str] = Header(default=None, alias="X-API-Key")) -> None:
    """Exige X-API-Key égal à IA_API_KEY (désactivé seulement si absent en dev)."""
    expected = os.getenv("IA_API_KEY")
    if not expected:
        return
    if not x_api_key or not hmac.compare_digest(x_api_key, expected):
        raise HTTPException(status_code=401, detail="Clé API IA invalide ou manquante.")


class AffluenceRequest(BaseModel):
    days: int = Field(default=7, ge=1, le=30)


class StaffingRequest(BaseModel):
    days: int = Field(default=7, ge=1, le=30)
    agent_capacity: int = Field(default=DEFAULT_AGENT_CAPACITY, ge=1, le=200)


class DossierAnalyzeRequest(BaseModel):
    amount_fcfa: int = Field(default=25000, ge=0)
    payment_attempts: int = Field(default=1, ge=1)
    hour_of_day: int = Field(default=12, ge=0, le=23)
    docs_count: int = Field(default=0, ge=0, le=10)
    login_hour: int = Field(default=12, ge=0, le=23)
    rule_flags: list[str] = Field(default_factory=list)


class ChatbotRequest(BaseModel):
    question: str = Field(min_length=1, max_length=500)


@app.get("/health")
def health_check() -> dict[str, str]:
    """Point de terminaison de vérification de santé public (Docker/Render)."""
    return {"status": "ok", "service": "smartinscription-ia"}


@app.post("/predict/affluence", dependencies=[Depends(verify_api_key)])
def predict_affluence(payload: AffluenceRequest) -> dict:
    """Prédit l'affluence par jour, par heure et par UFR."""
    return affluence_model.predict_affluence(days=payload.days)


@app.post("/predict/personnel", dependencies=[Depends(verify_api_key)])
def predict_personnel(payload: StaffingRequest) -> dict:
    """Prédit les besoins en personnel par jour, par heure et par UFR."""
    return affluence_model.predict_staffing(
        days=payload.days,
        agent_capacity=payload.agent_capacity,
    )


@app.post("/analyze/dossier", dependencies=[Depends(verify_api_key)])
def analyze_dossier(payload: DossierAnalyzeRequest) -> dict:
    """Classifie un dossier et détecte d'éventuelles anomalies."""
    return anomaly_model.evaluate(
        amount_fcfa=payload.amount_fcfa,
        payment_attempts=payload.payment_attempts,
        hour_of_day=payload.hour_of_day,
        docs_count=payload.docs_count,
        login_hour=payload.login_hour,
        rule_flags=payload.rule_flags,
    )


@app.post("/chatbot/faq", dependencies=[Depends(verify_api_key)])
def chatbot_faq(payload: ChatbotRequest) -> dict:
    """Répond aux questions fréquentes sur les 5 thèmes universitaires."""
    return faq_chatbot.answer(payload.question)
