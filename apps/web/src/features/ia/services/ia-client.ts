const IA_BASE_URL =
  process.env.IA_SERVICE_URL ||
  process.env.NEXT_PUBLIC_IA_SERVICE_URL ||
  "http://localhost:8000";

function getIaTimeoutMs(): number {
  const parsed = Number(process.env.IA_TIMEOUT_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 10_000;
}

export interface AffluenceForecastItem {
  date: string;
  predicted_registrations: number;
  recommended_agents: number;
  workload_level: "NORMAL" | "ELEVE" | "CRITIQUE";
}

export interface HourlyAffluenceItem {
  date: string;
  heure: number;
  predicted_registrations: number;
}

export interface UfrAffluenceItem {
  ufr_code: string;
  predicted_registrations: number;
}

export interface AffluenceResponse {
  model: string;
  metrics?: { mae: number; r2: number };
  forecasts: AffluenceForecastItem[];
  hourly_forecasts: HourlyAffluenceItem[];
  ufr_forecasts: UfrAffluenceItem[];
}

export interface StaffingResponse {
  agent_capacity: number;
  daily_staffing: AffluenceForecastItem[];
  hourly_staffing: (HourlyAffluenceItem & { recommended_agents: number })[];
  ufr_staffing: {
    ufr_code: string;
    predicted_registrations: number;
    recommended_agents_per_day: number;
  }[];
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
  theme?: string;
  confidence: number;
}

async function fetchIaOnce<T>(path: string, body: unknown, timeoutMs: number): Promise<{ data: T | null; retryable: boolean }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (process.env.IA_API_KEY) {
    headers["X-API-Key"] = process.env.IA_API_KEY;
  }

  try {
    const res = await fetch(`${IA_BASE_URL}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) {
      // 502/503/504 peuvent correspondre à un démarrage à froid (Render)
      return { data: null, retryable: res.status >= 502 && res.status <= 504 };
    }
    return { data: (await res.json()) as T, retryable: false };
  } catch {
    return { data: null, retryable: true };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function postToIa<T>(path: string, body: unknown): Promise<T | null> {
  const timeoutMs = getIaTimeoutMs();
  const first = await fetchIaOnce<T>(path, body, timeoutMs);
  if (first.data !== null || !first.retryable) {
    return first.data;
  }

  // Une seule nouvelle tentative en cas d'erreur réseau ou de démarrage à froid
  const second = await fetchIaOnce<T>(path, body, timeoutMs);
  return second.data;
}

/** Appelle /predict/affluence (jour, heure, UFR). */
export async function fetchAffluenceAndStaffing(
  days = 7
): Promise<AffluenceResponse | null> {
  return postToIa<AffluenceResponse>("/predict/affluence", { days });
}

/** Appelle /predict/personnel avec capacité configurable. */
export async function fetchStaffingForecast(
  days = 7,
  agentCapacity = 25
): Promise<StaffingResponse | null> {
  return postToIa<StaffingResponse>("/predict/personnel", {
    days,
    agent_capacity: agentCapacity,
  });
}

/** Appelle /analyze/dossier pour classifier un dossier et détecter des anomalies. */
export async function analyzeDossierAnomaly(payload: {
  amount_fcfa: number;
  payment_attempts: number;
  hour_of_day: number;
  docs_count: number;
  login_hour?: number;
  rule_flags?: string[];
}): Promise<DossierAnalysisResponse | null> {
  return postToIa<DossierAnalysisResponse>("/analyze/dossier", payload);
}

/** Interroge /chatbot/faq du microservice FastAPI. */
export async function askFaqChatbot(question: string): Promise<ChatbotResponse | null> {
  return postToIa<ChatbotResponse>("/chatbot/faq", { question });
}
