import { NextResponse } from "next/server";
import { getAuthenticatedAgencyContext } from "@/lib/server-auth";
import { callVoiceApi } from "@/lib/voice-api";

type CatalogSearchPayload = {
  issueDescription: string;
  topK?: number;
};

function isValidPayload(payload: unknown): payload is CatalogSearchPayload {
  if (typeof payload !== "object" || payload === null) {
    return false;
  }

  const candidate = payload as Record<string, unknown>;

  return (
    typeof candidate.issueDescription === "string" &&
    candidate.issueDescription.trim().length >= 3 &&
    (candidate.topK === undefined || typeof candidate.topK === "number")
  );
}

export async function POST(request: Request) {
  const auth = await getAuthenticatedAgencyContext(request);

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);

  if (!isValidPayload(payload)) {
    return NextResponse.json({ error: "Invalid catalog search payload." }, { status: 400 });
  }

  try {
    const result = await callVoiceApi<{
      matched_chunks: Array<{
        document_id: string;
        chunk_index: number;
        content: string;
        metadata: Record<string, unknown>;
        similarity: number;
      }>;
      suggested_category: string;
      suggested_priority: string;
      confidence: number;
      message_for_agent: string;
    }>("/catalog/search", {
      method: "POST",
      body: JSON.stringify({
        agency_id: auth.agencyId,
        issue_description: payload.issueDescription.trim(),
        top_k: payload.topK ?? 5,
      }),
    });

    return NextResponse.json({ result }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Catalog search failed." },
      { status: 500 },
    );
  }
}
