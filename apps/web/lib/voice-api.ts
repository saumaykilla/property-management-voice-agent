export class VoiceApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "VoiceApiError";
    this.status = status;
    this.code = code;
  }
}

function getVoiceApiBaseUrl() {
  const baseUrl = process.env.VOICE_API_BASE_URL ?? process.env.VAPI_WEBHOOK_BASE_URL;

  if (!baseUrl) {
    throw new Error(
      "Missing required environment variable: VOICE_API_BASE_URL. "
        + "VAPI_WEBHOOK_BASE_URL is only supported as a legacy fallback.",
    );
  }

  return baseUrl.replace(/\/+$/, "");
}

export async function callVoiceApi<TResponse>(
  path: string,
  init?: RequestInit,
): Promise<TResponse> {
  const baseUrl = getVoiceApiBaseUrl();
  let response: Response;

  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
  } catch (error) {
    const detail =
      error instanceof Error && error.message
        ? error.message
        : "The voice API could not be reached.";
    const nextStep = process.env.VERCEL
      ? "Check VOICE_API_BASE_URL in the web deployment and confirm the backend Vercel project is live."
      : "Start services/voice-api locally or point VOICE_API_BASE_URL at your deployed backend.";

    throw new Error(
      `Voice API is unreachable at ${baseUrl}. ${nextStep} ${detail}`,
    );
  }

  const payload = (await response.json().catch(() => null)) as
    | TResponse
    | { detail?: string; code?: string }
    | null;

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "detail" in payload && payload.detail
        ? payload.detail
        : "Voice API request failed.";

    const code =
      payload && typeof payload === "object" && "code" in payload ? payload.code : undefined;

    throw new VoiceApiError(message, response.status, code);
  }

  return payload as TResponse;
}
