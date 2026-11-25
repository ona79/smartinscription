from __future__ import annotations

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

CONFIDENCE_THRESHOLD = 0.12

FAQ_ENTRIES: list[dict[str, str]] = [
    {
        "theme": "inscription",
        "topic": "Inscription universitaire",
        "question": "Comment m'inscrire, créer mon compte et compléter mon dossier étudiant ?",
        "answer": (
            "Créez votre compte sur /inscription, puis complétez votre profil académique "
            "(numéro étudiant, UFR, filière et niveau L1 à M2) dans « Mon dossier »."
        ),
    },
    {
        "theme": "pieces_requises",
        "topic": "Pièces requises",
        "question": "Quelles pièces justificatives et documents dois-je déposer ?",
        "answer": (
            "Après le paiement, déposez 4 pièces dans « Documents » (PDF, JPG, PNG ou WEBP, max 5 Mo) : "
            "pièce d'identité, relevé de notes, diplôme ou attestation, et photo d'identité."
        ),
    },
    {
        "theme": "orientation",
        "topic": "Orientation et dépôt du dossier",
        "question": "Où déposer mon dossier physique, quelle UFR choisir et comment prendre rendez-vous ?",
        "answer": (
            "Votre dossier numérique se dépose en ligne par UFR (ST, SEG, LSH, SJP). "
            "Pour le dépôt des originaux, réservez un créneau dans « Rendez-vous » et présentez-vous "
            "à la scolarité de votre UFR muni de votre QR code."
        ),
    },
    {
        "theme": "suivi_financier",
        "topic": "Suivi financier et paiement",
        "question": "Quel est le montant des frais, quels moyens de paiement et comment obtenir mon reçu ?",
        "answer": (
            "Les frais s'élèvent à 25 000 FCFA (Orange Money, Wave, Free Money, Wizall ou carte). "
            "Dès confirmation, votre reçu PDF et votre QR code sont disponibles dans « Paiement »."
        ),
    },
    {
        "theme": "blocage",
        "topic": "Blocage de dossier ou paiement",
        "question": "Pourquoi mon inscription est bloquée, mon document rejeté ou mon paiement refusé ?",
        "answer": (
            "Vérifiez dans « Documents » si une pièce a été rejetée (le motif est affiché) "
            "ou dans « Paiement » si la transaction a échoué (bouton « Réessayer »)."
        ),
    },
]


class UniversityFaqChatbot:
    """Chatbot FAQ couvrant les 5 thèmes avec seuil de confiance."""

    def __init__(self) -> None:
        corpus = [
            f"{entry['theme']} {entry['topic']} {entry['question']} {entry['answer']}"
            for entry in FAQ_ENTRIES
        ]
        self._vectorizer = TfidfVectorizer()
        self._matrix = self._vectorizer.fit_transform(corpus)

    def answer(self, query: str) -> dict:
        """Retourne la réponse FAQ la plus pertinente ou un message de repli."""
        cleaned = query.strip()
        if not cleaned:
            return {
                "answer": "Posez-moi une question sur l'inscription, les pièces requises, l'orientation, le paiement ou un blocage.",
                "topic": "Accueil",
                "theme": "accueil",
                "confidence": 1.0,
            }

        query_vec = self._vectorizer.transform([cleaned])
        similarities = cosine_similarity(query_vec, self._matrix)[0]
        best_idx = int(similarities.argmax())
        best_score = round(float(similarities[best_idx]), 2)

        if best_score < CONFIDENCE_THRESHOLD:
            return {
                "answer": (
                    "Je ne suis pas certain de comprendre votre demande. "
                    "Je peux vous renseigner sur : l'inscription, les pièces requises, "
                    "l'orientation (où déposer le dossier), le suivi financier (25 000 FCFA) "
                    "ou un blocage."
                ),
                "topic": "Hors périmètre",
                "theme": "fallback",
                "confidence": best_score,
            }

        matched = FAQ_ENTRIES[best_idx]
        return {
            "answer": matched["answer"],
            "topic": matched["topic"],
            "theme": matched["theme"],
            "confidence": best_score,
        }


faq_chatbot = UniversityFaqChatbot()
