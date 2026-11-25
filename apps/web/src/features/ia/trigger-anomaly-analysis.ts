/**
 * Point d'accroche non bloquant pour l'analyse d'anomalies IA sur une inscription.
 * Squelette sûr : journalise et retourne sans bloquer le flux appelant.
 * L'implémentation complète sera ajoutée par le développeur propriétaire du bloc IA.
 */
export async function triggerAnomalyAnalysis(registrationId: string): Promise<void> {
  try {
    console.info(`[ia:hook] Analyse d'anomalies planifiée pour registrationId=${registrationId}`);
  } catch (error) {
    console.warn("[ia:hook] Erreur non bloquante:", error);
  }
}
