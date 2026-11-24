from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_predict_affluence_and_staffing() -> None:
    response = client.post("/predict/affluence", json={"days": 5})
    assert response.status_code == 200
    data = response.json()
    assert len(data["forecasts"]) == 5
    for item in data["forecasts"]:
        assert item["predicted_registrations"] >= 5
        assert item["recommended_agents"] >= 0
        assert item["workload_level"] in {"NORMAL", "ELEVE", "CRITIQUE"}


def test_analyze_dossier_normal_vs_suspect() -> None:
    normal = client.post(
        "/analyze/dossier",
        json={"amount_fcfa": 25000, "payment_attempts": 1, "hour_of_day": 14, "docs_count": 4},
    )
    assert normal.status_code == 200
    assert normal.json()["classification"] == "CONFORME"
    assert normal.json()["is_anomaly"] is False

    suspect = client.post(
        "/analyze/dossier",
        json={"amount_fcfa": 1000, "payment_attempts": 6, "hour_of_day": 2, "docs_count": 0},
    )
    assert suspect.status_code == 200
    assert suspect.json()["classification"] == "SUSPECT"
    assert suspect.json()["is_anomaly"] is True
    assert len(suspect.json()["reasons"]) >= 2


def test_chatbot_faq() -> None:
    response = client.post("/chatbot/faq", json={"question": "Combien coûtent les frais avec Wave ?"})
    assert response.status_code == 200
    data = response.json()
    assert "25 000" in data["answer"] or "Wave" in data["answer"]
