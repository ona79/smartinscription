from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_api_key_guard(monkeypatch) -> None:
    monkeypatch.setenv("IA_API_KEY", "super-secret-ia-key")
    unauthorized = client.post("/predict/affluence", json={"days": 3})
    assert unauthorized.status_code == 401

    authorized = client.post(
        "/predict/affluence",
        json={"days": 3},
        headers={"X-API-Key": "super-secret-ia-key"},
    )
    assert authorized.status_code == 200


def test_predict_affluence_and_personnel() -> None:
    aff = client.post("/predict/affluence", json={"days": 3})
    assert aff.status_code == 200
    aff_data = aff.json()
    assert len(aff_data["forecasts"]) == 3
    assert len(aff_data["hourly_forecasts"]) == 3 * 11
    assert len(aff_data["ufr_forecasts"]) == 4

    staff = client.post("/predict/personnel", json={"days": 3, "agent_capacity": 20})
    assert staff.status_code == 200
    staff_data = staff.json()
    assert staff_data["agent_capacity"] == 20
    assert len(staff_data["daily_staffing"]) == 3
    assert len(staff_data["ufr_staffing"]) == 4


def test_analyze_dossier_and_rule_flags() -> None:
    normal = client.post(
        "/analyze/dossier",
        json={"amount_fcfa": 25000, "payment_attempts": 1, "hour_of_day": 14, "docs_count": 4},
    )
    assert normal.status_code == 200
    assert normal.json()["classification"] == "CONFORME"

    suspect = client.post(
        "/analyze/dossier",
        json={
            "amount_fcfa": 1000,
            "payment_attempts": 5,
            "hour_of_day": 2,
            "docs_count": 0,
            "rule_flags": ["Incohérence UFR/filière"],
        },
    )
    assert suspect.status_code == 200
    assert suspect.json()["classification"] == "SUSPECT"
    assert suspect.json()["is_anomaly"] is True


def test_chatbot_faq_themes_and_fallback() -> None:
    orientation = client.post(
        "/chatbot/faq",
        json={"question": "Où déposer mon dossier et quelle UFR choisir ?"},
    )
    assert orientation.status_code == 200
    assert orientation.json()["theme"] == "orientation"

    unknown = client.post("/chatbot/faq", json={"question": "zxqwert blabla inconnu"})
    assert unknown.status_code == 200
    assert unknown.json()["theme"] == "fallback"
