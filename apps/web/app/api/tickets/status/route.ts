import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getAuthenticatedAgencyContext } from "@/lib/server-auth";

type TicketStatus = "new" | "in_progress" | "completed" | "cancelled";

type TicketStatusPayload = {
  ticketId: string;
  status: TicketStatus;
};

const validStatuses: TicketStatus[] = ["new", "in_progress", "completed", "cancelled"];

function isValidPayload(payload: unknown): payload is TicketStatusPayload {
  if (typeof payload !== "object" || payload === null) {
    return false;
  }

  const candidate = payload as Record<string, unknown>;

  return (
    typeof candidate.ticketId === "string" &&
    candidate.ticketId.trim().length > 0 &&
    typeof candidate.status === "string" &&
    validStatuses.includes(candidate.status as TicketStatus)
  );
}

export async function POST(request: Request) {
  const auth = await getAuthenticatedAgencyContext(request);

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);

  if (!isValidPayload(payload)) {
    return NextResponse.json({ error: "Invalid ticket update payload." }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();
  const { data: ticket, error: ticketError } = await supabase
    .from("tickets")
    .select("id, agency_id, status")
    .eq("id", payload.ticketId)
    .eq("agency_id", auth.agencyId)
    .maybeSingle();

  if (ticketError || !ticket) {
    return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
  }

  const { error: updateError } = await supabase
    .from("tickets")
    .update({ status: payload.status })
    .eq("id", ticket.id)
    .eq("agency_id", auth.agencyId);

  if (updateError) {
    return NextResponse.json({ error: "Unable to update ticket status." }, { status: 500 });
  }

  const { error: eventError } = await supabase.from("ticket_events").insert({
    agency_id: auth.agencyId,
    ticket_id: ticket.id,
    event_type: "status_updated",
    event_payload: {
      previous_status: ticket.status,
      next_status: payload.status,
    },
    actor_type: "staff_user",
  });

  if (eventError) {
    return NextResponse.json({ error: "Ticket updated, but event logging failed." }, { status: 500 });
  }

  return NextResponse.json({ ticketId: ticket.id, status: payload.status }, { status: 200 });
}
