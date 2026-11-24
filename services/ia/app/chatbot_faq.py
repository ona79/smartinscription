from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

FAQ_ENTRIES: list[dict[str, str]] = [
    {
        "topic": "Frais d'inscription",
        "question": "Quel est le montant des frais d'inscription universitaire ?",
        "answer": (
            "Les frais d'inscription s'élèvent à 25 000 FCFA par année académique "
            "(2026-2027). Le paiement s'effectue directement depuis votre espace étudiant."
        ),
    },
    {
        "topic": "Moyens de paiement",
        "question": "Quels moyens de paiement sont acceptés (Wave, Orange Money, Free, Wizall, carte) ?",
        "answer": (
            "Vous pouvez régler les 25 000 FCFA via Orange Money, Wave, Free Money, "
            "Wizall ou par carte bancaire depuis l'onglet « Paiement »."
        ),
    },
    {
        "topic": "Pièces justificatives",
        "question": "Quels documents et pièces justificatives dois-je déposer ?",
        "answer": (
            "Après le paiement, déposez 4 pièces dans « Documents » (PDF, JPG, PNG ou WEBP, max 5 Mo) : "
            "pièce d'identité, relevé de notes, diplôme ou attestation, et photo d'identité."
        ),
    },
    {
        "topic": "Reçu numérique et QR code",
        "question": "Comment obtenir et télécharger mon reçu PDF avec QR code ?",
        "answer": (
            "Dès que votre paiement est confirmé, votre reçu officiel et son QR code "
            "apparaissent dans « Paiement ». Vous pouvez le télécharger au format PDF."
        ),
    },
    {
        "topic": "Rendez-vous",
        "question": "Comment prendre un rendez-vous pour la validation physique ?",
        "answer": (
            "Une fois les frais réglés, ouvrez l'onglet « Rendez-vous » pour choisir "
            "un créneau de 30 minutes (jours ouvrés). Présentez-vous avec votre QR code et vos originaux."
        ),
    },
    {
        "topic": "UFR et filières",
        "question": "Quelles sont les UFR disponibles lors de la création du dossier ?",
        "answer": (
            "Lors de la complétion de votre profil dans « Mon dossier », vous choisissez "
            "votre UFR (Sciences et Technologies, Économie et Gestion, Lettres, Sciences Juridiques), "
            "votre filière et votre niveau (L1 à M2)."
        ),
    },
    {
        "topic": "Problème ou rejet de document",
        "question": "Que faire si un document est rejeté ou si mon paiement échoue ?",
        "answer": (
            "Si un document est rejeté, le motif s'affiche dans « Documents » et vous pouvez "
            "déposer un nouveau fichier. Si un paiement échoue, cliquez sur « Réessayer » dans « Paiement »."
        ),
    },
]


class UniversityFaqChatbot:
    """Chatbot FAQ basé sur TF-IDF et similarité cosinus."""

    def __init__(self) -> None:
        corpus = [f"{entry['topic']} {entry['question']} {entry['answer']}" for entry in FAQ_ENTRIES]
        self._vectorizer = TfidfVectorizer()
        self._matrix = self._vectorizer.fit_transform(corpus)

    def answer(self, query: str) -> dict:
        """Retourne la réponse FAQ la plus pertinente pour une question étudiante."""
        cleaned = query.strip()
        if not cleaned:
            return {
                "answer": "Posez-moi une question sur les frais, le paiement, les documents ou les rendez-vous.",
                "topic": "Accueil",
                "confidence": 1.0,
            }

        query_vec = self._vectorizer.transform([cleaned])
        similarities = cosine_similarity(query_vec, self._matrix)[0]
        best_idx = int(similarities.argmax())
        best_score = round(float(similarities[best_idx]), 2)

        if best_score < 0.08:
            return {
                "answer": (
                    "Je n'ai pas trouvé de réponse précise à votre question. "
                    "Vous pouvez me demander des informations sur les frais (25 000 FCFA), "
                    "les moyens de paiement, les pièces justificatives, le reçu QR ou les rendez-vous."
                ),
                "topic": "Aide générale",
                "confidence": best_score,
            }

        matched = FAQ_ENTRIES[best_idx]
        return {
            "answer": matched["answer"],
            "topic": matched["topic"],
            "confidence": best_score,
        }


faq_chatbot = UniversityFaqChatbot()
