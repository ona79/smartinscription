from __future__ import annotations

import csv
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path

AFFLUENCE_REQUIRED_COLUMNS = ("date", "heure", "ufr", "nb_inscriptions")
PAYMENTS_REQUIRED_COLUMNS = (
    "student_hash",
    "ufr",
    "filiere",
    "niveau",
    "montant",
    "moyen",
    "horodatage",
    "statut",
)

VALID_PAYMENT_METHODS = {"WAVE", "ORANGE_MONEY", "FREE_MONEY", "WIZALL", "CARD"}
VALID_PAYMENT_STATUSES = {"PENDING", "SUCCESS", "FAILED"}

MIN_AFFLUENCE_ROWS = 50
MIN_PAYMENTS_ROWS = 30
MAX_AFFLUENCE_PER_HOUR = 5000
MAX_MONTANT_FCFA = 1_000_000


class DataValidationError(ValueError):
    """Erreur levée lorsqu'un fichier CSV ne respecte pas le contrat de données."""


@dataclass
class AffluenceRow:
    date_val: date
    heure: int
    ufr: str
    nb_inscriptions: int


@dataclass
class PaymentRow:
    student_hash: str
    ufr: str
    filiere: str
    niveau: str
    montant: int
    moyen: str
    horodatage: datetime
    statut: str


def _read_csv_rows(csv_path: Path, required_columns: tuple[str, ...]) -> list[dict[str, str]]:
    if not csv_path.exists():
        raise DataValidationError(f"Fichier introuvable : {csv_path}")

    with csv_path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        if not reader.fieldnames:
            raise DataValidationError(f"Fichier CSV vide ou sans en-tête : {csv_path}")

        missing = [col for col in required_columns if col not in reader.fieldnames]
        if missing:
            raise DataValidationError(
                f"Colonnes manquantes dans {csv_path.name} : {', '.join(missing)}. "
                f"Colonnes attendues : {', '.join(required_columns)}."
            )

        return [row for row in reader]


def validate_affluence_csv(csv_path: Path) -> list[AffluenceRow]:
    """Valide un CSV d'affluence agrégée (date, heure, ufr, nb_inscriptions)."""
    raw_rows = _read_csv_rows(csv_path, AFFLUENCE_REQUIRED_COLUMNS)
    if len(raw_rows) < MIN_AFFLUENCE_ROWS:
        raise DataValidationError(
            f"Jeu de données d'affluence trop petit ({len(raw_rows)} lignes) : "
            f"au moins {MIN_AFFLUENCE_ROWS} lignes sont nécessaires pour entraîner le modèle."
        )

    validated: list[AffluenceRow] = []
    seen_keys: set[tuple[str, int, str]] = set()

    for line_no, row in enumerate(raw_rows, start=2):
        raw_date = (row.get("date") or "").strip()
        try:
            parsed_date = date.fromisoformat(raw_date)
        except ValueError as exc:
            raise DataValidationError(
                f"{csv_path.name} ligne {line_no} : date invalide '{raw_date}' (format attendu AAAA-MM-JJ)."
            ) from exc

        raw_heure = (row.get("heure") or "").strip()
        try:
            heure = int(raw_heure)
        except ValueError as exc:
            raise DataValidationError(
                f"{csv_path.name} ligne {line_no} : heure invalide '{raw_heure}' (entier 0..23 attendu)."
            ) from exc
        if heure < 0 or heure > 23:
            raise DataValidationError(
                f"{csv_path.name} ligne {line_no} : heure hors plage ({heure}, attendu 0..23)."
            )

        ufr = (row.get("ufr") or "").strip()
        if not ufr:
            raise DataValidationError(f"{csv_path.name} ligne {line_no} : colonne 'ufr' vide.")

        raw_nb = (row.get("nb_inscriptions") or "").strip()
        try:
            nb = int(raw_nb)
        except ValueError as exc:
            raise DataValidationError(
                f"{csv_path.name} ligne {line_no} : nb_inscriptions invalide '{raw_nb}' (entier attendu)."
            ) from exc
        if nb < 0 or nb > MAX_AFFLUENCE_PER_HOUR:
            raise DataValidationError(
                f"{csv_path.name} ligne {line_no} : valeur aberrante pour nb_inscriptions ({nb}, attendu 0..{MAX_AFFLUENCE_PER_HOUR})."
            )

        dup_key = (raw_date, heure, ufr)
        if dup_key in seen_keys:
            raise DataValidationError(
                f"{csv_path.name} ligne {line_no} : doublon détecté pour ({raw_date}, {heure}h, {ufr})."
            )
        seen_keys.add(dup_key)

        validated.append(
            AffluenceRow(date_val=parsed_date, heure=heure, ufr=ufr, nb_inscriptions=nb)
        )

    validated.sort(key=lambda r: (r.date_val, r.heure, r.ufr))
    return validated


def validate_payments_csv(csv_path: Path) -> list[PaymentRow]:
    """Valide un CSV de paiements pseudonymisés."""
    raw_rows = _read_csv_rows(csv_path, PAYMENTS_REQUIRED_COLUMNS)
    if len(raw_rows) < MIN_PAYMENTS_ROWS:
        raise DataValidationError(
            f"Jeu de données de paiements trop petit ({len(raw_rows)} lignes) : "
            f"au moins {MIN_PAYMENTS_ROWS} lignes sont nécessaires pour entraîner le modèle."
        )

    validated: list[PaymentRow] = []
    seen_keys: set[tuple[str, str, int, str]] = set()

    for line_no, row in enumerate(raw_rows, start=2):
        student_hash = (row.get("student_hash") or "").strip()
        if not student_hash or "@" in student_hash:
            raise DataValidationError(
                f"{csv_path.name} ligne {line_no} : student_hash invalide (doit être un identifiant haché non vide, jamais un e-mail)."
            )

        ufr = (row.get("ufr") or "").strip()
        filiere = (row.get("filiere") or "").strip()
        niveau = (row.get("niveau") or "").strip()
        if not ufr or not filiere or not niveau:
            raise DataValidationError(
                f"{csv_path.name} ligne {line_no} : ufr, filiere et niveau sont obligatoires."
            )

        raw_montant = (row.get("montant") or "").strip()
        try:
            montant = int(raw_montant)
        except ValueError as exc:
            raise DataValidationError(
                f"{csv_path.name} ligne {line_no} : montant invalide '{raw_montant}' (entier attendu)."
            ) from exc
        if montant <= 0 or montant > MAX_MONTANT_FCFA:
            raise DataValidationError(
                f"{csv_path.name} ligne {line_no} : montant aberrant ({montant} FCFA, attendu 1..{MAX_MONTANT_FCFA})."
            )

        moyen = (row.get("moyen") or "").strip().upper()
        if moyen not in VALID_PAYMENT_METHODS:
            raise DataValidationError(
                f"{csv_path.name} ligne {line_no} : moyen '{moyen}' invalide (attendu : {', '.join(sorted(VALID_PAYMENT_METHODS))})."
            )

        raw_ts = (row.get("horodatage") or "").strip()
        try:
            horodatage = datetime.fromisoformat(raw_ts.replace("Z", "+00:00"))
        except ValueError as exc:
            raise DataValidationError(
                f"{csv_path.name} ligne {line_no} : horodatage invalide '{raw_ts}' (format ISO-8601 attendu)."
            ) from exc

        statut = (row.get("statut") or "").strip().upper()
        if statut not in VALID_PAYMENT_STATUSES:
            raise DataValidationError(
                f"{csv_path.name} ligne {line_no} : statut '{statut}' invalide (attendu : {', '.join(sorted(VALID_PAYMENT_STATUSES))})."
            )

        dup_key = (student_hash, raw_ts, montant, moyen)
        if dup_key in seen_keys:
            raise DataValidationError(
                f"{csv_path.name} ligne {line_no} : doublon de transaction détecté pour {student_hash} à {raw_ts}."
            )
        seen_keys.add(dup_key)

        validated.append(
            PaymentRow(
                student_hash=student_hash,
                ufr=ufr,
                filiere=filiere,
                niveau=niveau,
                montant=montant,
                moyen=moyen,
                horodatage=horodatage,
                statut=statut,
            )
        )

    validated.sort(key=lambda r: r.horodatage)
    return validated
