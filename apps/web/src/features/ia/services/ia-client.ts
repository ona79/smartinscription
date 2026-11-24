const IA_BASE_URL =
  process.env.IA_SERVICE_URL ||
  process.env.NEXT_PUBLIC_IA_SERVICE_URL ||
  "http://localhost:8000";

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

/** Appelle le microservice FastAPI pour prédire l'affluence et les besoins en personnel. */
export async function fetchAffluenceAndStaffing(
  days = 7
): Promise<AffluenceResponse | null> {
  try {
    const res = await fetch(`${IA_BASE_URL}/predict/affluence`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ days }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as AffluenceResponse;
  } catch {
    return null;
  }
}

/** Appelle le microservice FastAPI pour classifier un dossier et détecter des anomalies. */
export async function analyzeDossierAnomaly(payload: {
  amount_fcfa: number;
  payment_attempts: number;
  hour_of_day: number;
  docs_count: number;
}): Promise<DossierAnalysisResponse | null> {
  try {
    const res = await fetch(`${IA_BASE_URL}/analyze/dossier`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as DossierAnalysisResponse;
  } catch {
    return null;
  }
}

/** Interroge le chatbot FAQ du microservice FastAPI. */
export async function askFaqChatbot(question: string): Promise<ChatbotResponse | null> {
  try {
    const res = await fetch(`${IA_BASE_URL}/chatbot/faq`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as ChatbotResponse;
  } catch {
    return null;
  }
}
