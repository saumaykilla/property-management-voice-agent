import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type BootstrapAgencyPayload = {
  name: string;
  officeAddress: string;
  contactNumber: string;
  transferNumber?: string | null;
  timezone: string;
};

function isValidPayload(payload: unknown): payload is BootstrapAgencyPayload {
  if (typeof payload !== "object" || payload === null) {
    return false;
  }

  const candidate = payload as Record<string, unknown>;

  return (
    typeof candidate.name === "string" &&
    candidate.name.trim().length > 0 &&
    typeof candidate.officeAddress === "string" &&
    candidate.officeAddress.trim().length > 0 &&
    typeof candidate.contactNumber === "string" &&
    candidate.contactNumber.trim().length > 0 &&
    typeof candidate.timezone === "string" &&
    candidate.timezone.trim().length > 0 &&
    (candidate.transferNumber === undefined ||
      candidate.transferNumber === null ||
      typeof candidate.transferNumber === "string")
  );
}

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : null;

  if (!token) {
    return NextResponse.json({ error: "Missing bearer token." }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);

  if (!isValidPayload(payload)) {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return NextResponse.json({ error: "Unable to resolve user session." }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("bootstrap_agency", {
    p_auth_user_id: user.id,
    p_name: payload.name.trim(),
    p_office_address: payload.officeAddress.trim(),
    p_contact_number: payload.contactNumber.trim(),
    p_transfer_number: payload.transferNumber?.trim() || null,
    p_timezone: payload.timezone.trim(),
  });

  if (error) {
    const status = error.message.includes("already linked") ? 409 : 500;

    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json({ agency: data }, { status: 201 });
}

