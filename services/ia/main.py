from fastapi import FastAPI

app = FastAPI(
    title="SmartInscription IA Service",
    description="Skeleton AI microservice for SmartInscription (fraud detection, predictions, assistant).",
    version="0.1.0",
)


@app.get("/health")
def health_check() -> dict[str, str]:
    """Point de terminaison de vérification de santé utilisé par Docker et le monitoring."""
    return {"status": "ok", "service": "smartinscription-ia"}
