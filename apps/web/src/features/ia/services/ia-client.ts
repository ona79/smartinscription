const IA_BASE_URL =
  process.env.IA_SERVICE_URL ||
  process.env.NEXT_PUBLIC_IA_SERVICE_URL ||
  "http://localhost:8000";

const IA_TIMEOUT_MS = 10_000;

export interface AffluenceForecastItem {
  date: string;
  predicted_registrations: number;
  recommended_agents: number;
  workload_level: "NORMAL" | "ELEVE" | "CRITIQUE";
}

export interface AffluenceResponse {
  model: string;
  agent_daily_capacity: number;
  forecasts: AffluenceForecastItem[];
  peak_day: AffluenceForecastItem;
}

export interface DossierAnalysisResponse {
  classification: "CONFORME" | "A_VERIFIER" | "SUSPECT";
  anomaly_score: number;
  is_anomaly: boolean;
  reasons: string[];
}

export interface ChatbotResponse {
  answer: string;
  topic: string;
  confidence: number;
}

async function postToIa<T>(path: string, body: unknown): Promise<T | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), IA_TIMEOUT_MS);

  try {
    const res = await fetch(`${IA_BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Appelle le microservice FastAPI pour prédire l'affluence et les besoins en personnel. */
export async function fetchAffluenceAndStaffing(
  days = 7
): Promise<AffluenceResponse | null> {
  return postToIa<AffluenceResponse>("/predict/affluence", { days });
}

/** Appelle le microservice FastAPI pour classifier un dossier et détecter des anomalies. */
export async function analyzeDossierAnomaly(payload: {
  amount_fcfa: number;
  payment_attempts: number;
  hour_of_day: number;
  docs_count: number;
}): Promise<DossierAnalysisResponse | null> {
  return postToIa<DossierAnalysisResponse>("/analyze/dossier", payload);
}

/** Interroge le chatbot FAQ du microservice FastAPI. */
export async function askFaqChatbot(question: string): Promise<ChatbotResponse | null> {
  return postToIa<ChatbotResponse>("/chatbot/faq", { question });
}
