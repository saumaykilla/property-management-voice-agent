import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getAuthenticatedAgencyContext } from "@/lib/server-auth";
import { callVoiceApi } from "@/lib/voice-api";

type ProcessCatalogPayload = {
  documentId: string;
};

function isValidPayload(payload: unknown): payload is ProcessCatalogPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "documentId" in payload &&
    typeof (payload as { documentId?: unknown }).documentId === "string" &&
    (payload as { documentId: string }).documentId.trim().length > 0
  );
}

export async function POST(request: Request) {
  const auth = await getAuthenticatedAgencyContext(request);

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);

  if (!isValidPayload(payload)) {
    return NextResponse.json({ error: "Invalid catalog process request." }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();
  const { data: document, error: documentError } = await supabase
    .from("service_catalog_documents")
    .select("id")
    .eq("id", payload.documentId)
    .eq("agency_id", auth.agencyId)
    .maybeSingle();

  if (documentError || !document) {
    return NextResponse.json({ error: "Catalog document not found." }, { status: 404 });
  }

  try {
    const result = await callVoiceApi<{
      document_id: string;
      chunk_count: number;
      status: string;
    }>("/catalog/process", {
      method: "POST",
      body: JSON.stringify({
        agency_id: auth.agencyId,
        document_id: payload.documentId,
      }),
    });

    return NextResponse.json({ result }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Catalog processing failed.",
      },
      { status: 500 },
    );
  }
}
