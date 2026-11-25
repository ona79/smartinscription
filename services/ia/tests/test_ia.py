from pathlib import Path
import csv
import json
import pytest
from fastapi.testclient import TestClient

from app.data_validation import DataValidationError, validate_affluence_csv, validate_payments_csv
from main import app
from scripts.pseudonymize import pseudonymize_csv
from train import METRICS_PATH, train_models

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


def test_validate_affluence_rejects_invalid_and_small_csv(tmp_path: Path) -> None:
    too_small = tmp_path / "small.csv"
    too_small.write_text("date,heure,ufr,nb_inscriptions\n2025-10-01,9,UFR-ST,5\n", encoding="utf-8")
    with pytest.raises(DataValidationError, match="trop petit"):
        validate_affluence_csv(too_small)

    bad_cols = tmp_path / "bad_cols.csv"
    bad_cols.write_text("date,heure,ufr\n2025-10-01,9,UFR-ST\n", encoding="utf-8")
    with pytest.raises(DataValidationError, match="Colonnes manquantes"):
        validate_affluence_csv(bad_cols)

    dup_csv = tmp_path / "dup.csv"
    with dup_csv.open("w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["date", "heure", "ufr", "nb_inscriptions"])
        for i in range(50):
            w.writerow(["2025-10-01", 9, "UFR-ST", 3] if i < 2 else ["2025-10-02", i % 24, f"UFR-{i}", 2])
    with pytest.raises(DataValidationError, match="doublon"):
        validate_affluence_csv(dup_csv)


def test_pseudonymize_csv_removes_identity_and_hashes(tmp_path: Path) -> None:
    raw = tmp_path / "raw.csv"
    out = tmp_path / "anon.csv"
    raw.write_text(
        "numero_etudiant,nom,prenom,email,ufr,filiere,niveau,montant,moyen,horodatage,statut\n"
        "SN-2025-001,Diop,Aminata,aminata@univ.sn,UFR-ST,Info,L1,25000,WAVE,2025-10-14T10:00:00,SUCCESS\n",
        encoding="utf-8",
    )

    with pytest.raises(ValueError, match="PSEUDO_SALT"):
        pseudonymize_csv(raw, out, salt="")

    count = pseudonymize_csv(raw, out, salt="secret-salt-2026")
    assert count == 1
    content = out.read_text(encoding="utf-8")
    assert "Aminata" not in content
    assert "aminata@univ.sn" not in content
    assert "SN-2025-001" not in content
    assert "student_hash" in content

    # Vérifie que le CSV produit passe la validation (avec >= 30 lignes)
    many_rows = tmp_path / "anon_many.csv"
    with many_rows.open("w", encoding="utf-8", newline="") as f:
        lines = content.splitlines()
        f.write(lines[0] + "\n")
        for i in range(30):
            f.write(lines[1].replace("10:00:00", f"10:{i:02d}:00") + "\n")
    validated = validate_payments_csv(many_rows)
    assert len(validated) == 30


def test_train_synthetic_writes_metrics_report() -> None:
    report = train_models(source="synthetic")
    assert report["source"] == "synthetic"
    assert report["split_strategy"] == "chronological_80_20"
    assert "mae" in report["affluence"]
    assert "confusion_matrix" in report["anomalies"]
    assert METRICS_PATH.exists()
    parsed = json.loads(METRICS_PATH.read_text(encoding="utf-8"))
    assert parsed["affluence"]["train_size"] > 0
