import { NextResponse } from "next/server";
import { getAuthenticatedAgencyContext } from "@/lib/server-auth";
import { callVoiceApi, VoiceApiError } from "@/lib/voice-api";

export async function POST(request: Request) {
  const auth = await getAuthenticatedAgencyContext(request);

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await callVoiceApi<{
      assistant_id: string;
      phone_number_id: string;
      phone_number: string;
      status: string;
      mode: string;
    }>("/provisioning/provision", {
      method: "POST",
      body: JSON.stringify({
        agency_id: auth.agencyId,
      }),
    });

    return NextResponse.json({ result }, { status: 200 });
  } catch (error) {
    if (error instanceof VoiceApiError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
        },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Provisioning failed." },
      { status: 500 },
    );
  }
}
