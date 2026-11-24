from fastapi import FastAPI
from pydantic import BaseModel, Field

from app.affluence_model import affluence_model
from app.anomaly_model import anomaly_model
from app.chatbot_faq import faq_chatbot

app = FastAPI(
    title="SmartInscription IA Service",
    description="Microservice IA pour la prédiction d'affluence, les besoins en personnel, la détection d'anomalies et le chatbot FAQ.",
    version="0.3.0",
)


class AffluenceRequest(BaseModel):
    days: int = Field(default=7, ge=1, le=30)


class DossierAnalyzeRequest(BaseModel):
    amount_fcfa: int = Field(default=25000, ge=0)
    payment_attempts: int = Field(default=1, ge=1)
    hour_of_day: int = Field(default=12, ge=0, le=23)
    docs_count: int = Field(default=0, ge=0, le=10)


class ChatbotRequest(BaseModel):
    question: str = Field(min_length=1, max_length=500)


@app.get("/health")
def health_check() -> dict[str, str]:
    """Point de terminaison de vérification de santé utilisé par Docker et le monitoring."""
    return {"status": "ok", "service": "smartinscription-ia"}


@app.post("/predict/affluence")
def predict_affluence(payload: AffluenceRequest) -> dict:
    """Prédit l'affluence journalière et les besoins en personnel sur N jours."""
    return affluence_model.predict(days=payload.days)


@app.post("/analyze/dossier")
def analyze_dossier(payload: DossierAnalyzeRequest) -> dict:
    """Classifie un dossier et détecte d'éventuelles anomalies de paiement."""
    return anomaly_model.evaluate(
        amount_fcfa=payload.amount_fcfa,
        payment_attempts=payload.payment_attempts,
        hour_of_day=payload.hour_of_day,
        docs_count=payload.docs_count,
    )


@app.post("/chatbot/faq")
def chatbot_faq(payload: ChatbotRequest) -> dict:
    """Répond aux questions fréquentes des étudiants sur l'inscription."""
    return faq_chatbot.answer(payload.question)
