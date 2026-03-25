import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getAuthenticatedAgencyContext } from "@/lib/server-auth";

export async function GET(request: Request) {
  const auth = await getAuthenticatedAgencyContext(request);

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = createAdminSupabaseClient();
  const { data: latestDocument, error: latestDocumentError } = await supabase
    .from("service_catalog_documents")
    .select("*")
    .eq("agency_id", auth.agencyId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestDocumentError) {
    return NextResponse.json({ error: "Unable to load catalog summary." }, { status: 500 });
  }

  if (!latestDocument) {
    return NextResponse.json({ latestDocument: null, chunkCount: 0 }, { status: 200 });
  }

  const { count, error: chunkError } = await supabase
    .from("service_catalog_chunks")
    .select("id", { count: "exact", head: true })
    .eq("agency_id", auth.agencyId)
    .eq("document_id", latestDocument.id);

  if (chunkError) {
    return NextResponse.json({ error: "Unable to count catalog chunks." }, { status: 500 });
  }

  return NextResponse.json(
    {
      latestDocument,
      chunkCount: count ?? 0,
    },
    { status: 200 },
  );
}
