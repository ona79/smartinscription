/**
 * Catalogue UNIQUE des messages affichés à l'utilisateur (français).
 *
 * Règles :
 * - jamais de message technique, de trace, de nom de table ou de code HTTP brut ;
 * - toute nouvelle chaîne visible (toast, erreur de champ, page d'erreur) est ajoutée ici ;
 * - les Server Actions renvoient ces messages via `actionOk` / `actionError` (lib/action-result).
 */
export const MESSAGES = {
  generic: {
    unexpected: "Une erreur inattendue est survenue. Réessayez dans un instant.",
    unexpectedWithRef: (ref: string) =>
      `Une erreur inattendue est survenue. Référence à communiquer au support : ${ref}.`,
    network: "Connexion internet interrompue. Vérifiez votre réseau puis réessayez.",
    formInvalid: "Certains champs sont invalides. Corrigez-les puis réessayez.",
    rateLimited: "Trop de tentatives. Patientez une minute avant de réessayer.",
    forbidden: "Accès refusé : vous n'avez pas les droits nécessaires pour cette action.",
    notFound: "L'élément demandé est introuvable ou a été supprimé.",
    sessionExpired: "Votre session a expiré. Connectez-vous à nouveau pour continuer.",
    saved: "Modifications enregistrées.",
    cancelled: "Opération annulée.",
    unavailable: "Service momentanément indisponible. Réessayez plus tard.",
    iaUnavailable:
      "Le service d'intelligence artificielle est momentanément indisponible. Réessayez plus tard.",
  },

  errorPage: {
    title: "Une erreur est survenue",
    description:
      "Nous n'avons pas pu afficher cette page. Vous pouvez réessayer ou revenir à l'accueil.",
    retry: "Réessayer",
    back: "Retour à l'accueil",
    reference: (ref: string) => `Référence : ${ref}`,
    notFoundTitle: "Page introuvable",
    notFoundDescription: "La page que vous cherchez n'existe pas ou a été déplacée.",
    forbiddenTitle: "Accès refusé",
    forbiddenDescription: "Vous n'avez pas les droits nécessaires pour consulter cette page.",
  },

  auth: {
    loginSuccess: "Connexion réussie. Bienvenue !",
    invalidCredentials: "E-mail ou mot de passe incorrect.",
    emailAlreadyUsed: "Cette adresse e-mail est déjà utilisée. Connectez-vous ou utilisez une autre adresse.",
    registerSuccess: "Compte créé avec succès. Vous pouvez maintenant vous connecter.",
    registerFailed: "Impossible de créer le compte pour le moment. Réessayez plus tard.",
    logoutSuccess: "Vous êtes déconnecté.",
    testAccountsInvalidCode: "Code d'accès aux comptes de test incorrect.",
    forgotPasswordSent:
      "Si un compte correspond à cette adresse e-mail, un lien de réinitialisation vient d'être envoyé.",
    resetPasswordSuccess:
      "Votre mot de passe a été mis à jour. Vous pouvez maintenant vous connecter.",
    resetPasswordInvalid:
      "Ce lien de réinitialisation est invalide ou a expiré. Demandez un nouveau lien.",
    passwordMismatch: "Les deux mots de passe ne correspondent pas.",
    privacyRequired: "Vous devez accepter la politique de confidentialité pour créer un compte.",
  },

  photo: {
    success: "Photo d'identité enregistrée.",
    invalidFormat: "Format non pris en charge. Choisissez une photo JPG, PNG ou WEBP.",
    tooLarge: "La photo est trop lourde (5 Mo maximum, même après compression).",
    unreadable: "Impossible de lire cette image. Choisissez une autre photo.",
    network: "Connexion interrompue pendant l'envoi de la photo. Vérifiez votre réseau puis réessayez.",
    providerFailed: "Le service de stockage des photos a refusé l'envoi. Réessayez dans un instant.",
    cancelled: "Envoi de la photo annulé.",
    locked: "Votre dossier est validé : la photo ne peut plus être modifiée.",
  },

  documents: {
    uploadSuccess: "Pièce justificative envoyée.",
    replaceSuccess: "Pièce justificative remplacée.",
    deleteSuccess: "Pièce justificative supprimée.",
    approved: "Pièce approuvée.",
    rejected: "Pièce rejetée. L'étudiant sera notifié.",
    rejectMotifRequired: "Indiquez un motif de rejet (3 caractères minimum).",
    invalidFormat: "Format non pris en charge. Formats acceptés : PDF, JPG, PNG ou WEBP.",
    tooLarge: "Le fichier est trop lourd (5 Mo maximum pour une image).",
    pdfTooLarge: "Le PDF est trop lourd (4 Mo maximum).",
    empty: "Sélectionnez un fichier avant de l'envoyer.",
    network: "Connexion interrompue pendant l'envoi. Vérifiez votre réseau puis réessayez.",
    providerFailed: "Le service de stockage a refusé le fichier. Réessayez dans un instant.",
    verificationFailed: "Le fichier envoyé n'a pas pu être vérifié. Renvoyez-le.",
    cancelled: "Envoi annulé.",
    profileRequired: "Complétez d'abord votre dossier étudiant.",
    statusLocked: "L'envoi de pièces n'est pas possible au stade actuel de votre dossier.",
    deleteLocked: "Cette pièce ne peut plus être supprimée (déjà approuvée ou dossier validé).",
    notOwner: "Ce document ne vous appartient pas.",
    notFound: "Document introuvable.",
    registrationValidated: "Dossier validé. L'étudiant sera notifié.",
    registrationRejected: "Dossier rejeté. L'étudiant sera notifié.",
    finalizeNotReady: "Toutes les pièces doivent être approuvées avant de valider le dossier.",
  },

  dossier: {
    profileSuccess: "Dossier complété. Vous pouvez maintenant déposer vos pièces.",
    birthInfoSuccess: "Informations d'état civil mises à jour.",
    birthInfoLocked: "Dossier validé : les informations d'état civil ne sont plus modifiables.",
    filiereMismatch: "La filière choisie ne correspond pas à l'UFR sélectionnée.",
    profileNotFound: "Profil étudiant introuvable. Complétez d'abord votre dossier.",
    alreadyExists: "Votre dossier est déjà créé pour cette année académique.",
  },

  fields: {
    required: "Ce champ est obligatoire.",
    birthDateInvalid: "Indiquez une date de naissance valide.",
    birthDateFuture: "La date de naissance ne peut pas être dans le futur.",
    birthPlaceInvalid: "Indiquez votre lieu de naissance (2 caractères minimum).",
    nationalityInvalid: "Indiquez votre nationalité (2 caractères minimum).",
    emailInvalid: "Adresse e-mail invalide.",
    passwordTooShort: "Le mot de passe doit contenir au moins 8 caractères.",
    phoneInvalid:
      "Numéro sénégalais attendu : +221 suivi de 70, 75, 76, 77 ou 78 et 7 chiffres.",
  },

  payment: {
    success: "Paiement confirmé. Votre reçu est disponible.",
    failed: "Le paiement a échoué. Aucun montant n'a été débité, vous pouvez réessayer.",
    cancelled: "Paiement annulé. Vous pouvez le relancer quand vous voulez.",
    pending: "Paiement en attente de confirmation par l'opérateur. Cette page se mettra à jour.",
    initFailed: "Impossible de lancer le paiement pour le moment. Réessayez dans un instant.",
    alreadyPaid: "Votre inscription est déjà payée.",
    notReady: "Le paiement sera disponible une fois vos pièces validées.",
  },

  appointment: {
    booked: "Rendez-vous réservé. Un rappel vous sera envoyé.",
    cancelled: "Rendez-vous annulé.",
    slotTaken: "Ce créneau vient d'être réservé par quelqu'un d'autre. Choisissez-en un autre.",
    slotInvalid: "Créneau invalide ou expiré.",
    alreadyBooked: "Vous avez déjà un rendez-vous à venir.",
  },

  scan: {
    valid: "QR code valide : inscription confirmée.",
    invalid: "QR code invalide ou inconnu.",
    refused: "Inscription non valide : accès refusé.",
    tooManyAttempts: "Trop de tentatives de scan. Patientez une minute.",
    cameraDenied: "Accès à la caméra refusé. Autorisez la caméra dans les réglages du navigateur.",
    cameraUnavailable: "Aucune caméra disponible sur cet appareil.",
  },

  notifications: {
    markedRead: "Notification marquée comme lue.",
    allRead: "Toutes les notifications sont marquées comme lues.",
  },

  ia: {
    unavailable:
      "Le service d'intelligence artificielle est momentanément indisponible. Réessayez plus tard.",
    analysisDone: "Analyse terminée.",
  },

  admin: {
    saved: "Modifications enregistrées.",
  },

  bu: {
    activated: "Accès BU activé pour cette inscription.",
    deactivated: "Accès BU désactivé pour cette inscription.",
    paymentRequired:
      "Le paiement doit être confirmé avant de pouvoir activer l'accès BU.",
    notFound: "Inscription introuvable.",
  },
} as const;

export type Messages = typeof MESSAGES;
