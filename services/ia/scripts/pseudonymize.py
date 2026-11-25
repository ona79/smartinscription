from __future__ import annotations

import argparse
import csv
import hashlib
import os
from pathlib import Path

IDENTITY_COLUMNS = {
    "nom",
    "prenom",
    "email",
    "telephone",
    "nom_complet",
    "adresse",
    "numero_etudiant",
    "numeroetudiant",
}
SOURCE_ID_CANDIDATES = ("numero_etudiant", "numeroEtudiant", "email", "id_etudiant")


def hash_student_identifier(raw_identifier: str, salt: str) -> str:
    """Calcule un identifiant pseudonymisé irréversible avec sel secret."""
    if not salt or not salt.strip():
        raise ValueError("Le sel secret PSEUDO_SALT est obligatoire pour la pseudonymisation.")
    cleaned = raw_identifier.strip()
    if not cleaned:
        raise ValueError("Identifiant étudiant vide lors de la pseudonymisation.")
    digest = hashlib.sha256(f"{salt}:{cleaned}".encode("utf-8")).hexdigest()
    return digest[:16]


def pseudonymize_csv(input_path: Path, output_path: Path, salt: str | None = None) -> int:
    """
    Transforme un export brut contenant des identités directes en CSV pseudonymisé
    (remplace l'identifiant par student_hash et supprime nom, prénom, e-mail, etc.).
    """
    resolved_salt = salt if salt is not None else os.getenv("PSEUDO_SALT", "")
    if not resolved_salt or not resolved_salt.strip():
        raise ValueError("La variable d'environnement PSEUDO_SALT est requise.")

    with input_path.open("r", encoding="utf-8", newline="") as fin:
        reader = csv.DictReader(fin)
        if not reader.fieldnames:
            raise ValueError(f"Fichier CSV vide ou sans en-tête : {input_path}")

        source_id_col = next((c for c in SOURCE_ID_CANDIDATES if c in reader.fieldnames), None)
        if not source_id_col:
            raise ValueError(
                f"Aucune colonne d'identifiant trouvée ({', '.join(SOURCE_ID_CANDIDATES)})."
            )

        kept_columns = [
            col for col in reader.fieldnames if col.lower() not in IDENTITY_COLUMNS
        ]
        output_columns = ["student_hash", *kept_columns]

        output_path.parent.mkdir(parents=True, exist_ok=True)
        count = 0
        with output_path.open("w", encoding="utf-8", newline="") as fout:
            writer = csv.DictWriter(fout, fieldnames=output_columns)
            writer.writeheader()
            for row in reader:
                student_hash = hash_student_identifier(row[source_id_col], resolved_salt)
                out_row = {"student_hash": student_hash}
                for col in kept_columns:
                    out_row[col] = row.get(col, "")
                writer.writerow(out_row)
                count += 1

    return count


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Pseudonymise un export CSV étudiant en supprimant les colonnes d'identité."
    )
    parser.add_argument("--input", type=Path, required=True, help="CSV brut en entrée.")
    parser.add_argument("--output", type=Path, required=True, help="CSV pseudonymisé en sortie.")
    args = parser.parse_args()

    rows_count = pseudonymize_csv(args.input, args.output)
    print(f"[pseudonymize] {rows_count} ligne(s) exportée(s) vers {args.output}")


if __name__ == "__main__":
    main()
