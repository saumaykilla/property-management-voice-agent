"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppAccess } from "@/components/app-access-provider";
import type { Database } from "@/lib/database.types";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type ManagedUnitRow = Database["public"]["Tables"]["managed_units"]["Row"];
type TicketRow = Database["public"]["Tables"]["tickets"]["Row"];
type TicketEventRow = Database["public"]["Tables"]["ticket_events"]["Row"];

type TicketWithUnit = TicketRow & {
  managed_unit: Pick<
    ManagedUnitRow,
    "id" | "display_address" | "city" | "state" | "postal_code"
  > | null;
};

type TicketFilter = "all" | "new" | "in_progress" | "completed" | "cancelled";

const filters: Array<{ value: TicketFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatTicketTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function formatRelativeMinutes(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.round(diff / 60000));

  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours = Math.round(minutes / 60);
  return `${hours} hr${hours === 1 ? "" : "s"} ago`;
}

function isAfterHoursTicket(metadata: TicketRow["created_by_channel_metadata"]) {
  const metadataRecord = metadata as { after_hours?: unknown } | null;

  return Boolean(
    metadataRecord &&
      typeof metadataRecord === "object" &&
      !Array.isArray(metadataRecord) &&
      metadataRecord.after_hours === true,
  );
}

function getStatusLabel(status: TicketRow["status"]) {
  switch (status) {
    case "in_progress":
      return "In progress";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    default:
      return "New";
  }
}

function getPriorityLabel(priority: TicketRow["priority"]) {
  switch (priority) {
    case "urgent":
      return "Urgent";
    case "high":
      return "High";
    case "low":
      return "Low";
    default:
      return "Medium";
  }
}

function getPriorityClass(priority: TicketRow["priority"]) {
  switch (priority) {
    case "urgent":
      return "status-alert";
    case "high":
      return "status-caution";
    default:
      return "status-idle";
  }
}

function getEventLabel(eventType: string) {
  if (eventType === "ticket_created") {
    return "Ticket created";
  }

  if (eventType === "status_updated") {
    return "Status updated";
  }

  return eventType.replace(/_/g, " ");
}

export default function DashboardPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const { access, refreshAccess, session } = useAppAccess();
  const [tickets, setTickets] = useState<TicketWithUnit[]>([]);
  const [events, setEvents] = useState<TicketEventRow[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<TicketFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [connectionState, setConnectionState] = useState<"live" | "offline">("offline");
  const [feedback, setFeedback] = useState<string | null>(null);

  const agencyId = access?.agencyId ?? null;

  async function callInternalApi<TResponse>(path: string, init?: RequestInit): Promise<TResponse> {
    const accessToken = session?.access_token;

    if (!accessToken) {
      throw new Error("We couldn't verify your session. Sign in again and retry.");
    }

    const response = await fetch(path, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        ...(init?.headers ?? {}),
      },
    });

    const payload = (await response.json().catch(() => null)) as TResponse & { error?: string } | null;

    if (!response.ok) {
      throw new Error(payload?.error ?? "The request could not be completed.");
    }

    return payload as TResponse;
  }

  const loadTickets = useCallback(async () => {
    if (!supabase || !agencyId) {
      setTickets([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const { data, error } = await supabase
      .from("tickets")
      .select(
        "id, agency_id, managed_unit_id, source, status, priority, category, issue_summary, issue_details, caller_name, caller_phone, created_by_channel_metadata, created_at, updated_at, managed_unit:managed_units(id, display_address, city, state, postal_code)",
      )
      .eq("agency_id", agencyId)
      .order("created_at", { ascending: false });

    if (error) {
      setFeedback("We couldn't load the live ticket board right now.");
      setIsLoading(false);
      return;
    }

    const nextTickets = (data ?? []) as unknown as TicketWithUnit[];
    setTickets(nextTickets);
    setSelectedTicketId((current) => current ?? nextTickets[0]?.id ?? null);
    setIsLoading(false);
  }, [agencyId, supabase]);

  const loadEvents = useCallback(async (ticketId: string | null) => {
    if (!supabase || !ticketId) {
      setEvents([]);
      return;
    }

    setDetailLoading(true);
    const { data, error } = await supabase
      .from("ticket_events")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: false });

    if (error) {
      setFeedback("We couldn't load the ticket timeline right now.");
      setDetailLoading(false);
      return;
    }

    setEvents(data ?? []);
    setDetailLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    void loadEvents(selectedTicketId);
  }, [loadEvents, selectedTicketId]);

  useEffect(() => {
    if (!supabase || !agencyId) {
      return;
    }

    const channel = supabase
      .channel(`tickets:${agencyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tickets",
          filter: `agency_id=eq.${agencyId}`,
        },
        () => {
          void loadTickets();
          if (selectedTicketId) {
            void loadEvents(selectedTicketId);
          }
        },
      )
      .subscribe((status) => {
        setConnectionState(status === "SUBSCRIBED" ? "live" : "offline");
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [agencyId, loadEvents, loadTickets, selectedTicketId, supabase]);

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      if (filter !== "all" && ticket.status !== filter) {
        return false;
      }

      if (!query.trim()) {
        return true;
      }

      const haystack = [
        ticket.issue_summary,
        ticket.issue_details,
        ticket.caller_name,
        ticket.caller_phone,
        ticket.managed_unit?.display_address ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query.trim().toLowerCase());
    });
  }, [filter, query, tickets]);

  const selectedTicket = useMemo(
    () => filteredTickets.find((ticket) => ticket.id === selectedTicketId) ?? tickets.find((ticket) => ticket.id === selectedTicketId) ?? null,
    [filteredTickets, selectedTicketId, tickets],
  );

  const today = startOfToday();
  const newTodayCount = tickets.filter(
    (ticket) => ticket.status === "new" && new Date(ticket.created_at) >= today,
  ).length;
  const inProgressCount = tickets.filter((ticket) => ticket.status === "in_progress").length;
  const completedTodayCount = tickets.filter(
    (ticket) => ticket.status === "completed" && new Date(ticket.updated_at) >= today,
  ).length;
  const afterHoursCount = tickets.filter((ticket) => isAfterHoursTicket(ticket.created_by_channel_metadata))
    .length;

  const groupedTickets = useMemo(() => {
    const now = Date.now();
    const groups = {
      newNow: [] as TicketWithUnit[],
      earlierToday: [] as TicketWithUnit[],
      inProgress: [] as TicketWithUnit[],
    };

    filteredTickets.forEach((ticket) => {
      if (ticket.status === "in_progress") {
        groups.inProgress.push(ticket);
        return;
      }

      if (ticket.status !== "new") {
        return;
      }

      const ageMinutes = (now - new Date(ticket.created_at).getTime()) / 60000;

      if (ageMinutes <= 120) {
        groups.newNow.push(ticket);
      } else {
        groups.earlierToday.push(ticket);
      }
    });

    return groups;
  }, [filteredTickets]);

  async function updateTicketStatus(nextStatus: TicketRow["status"]) {
    if (!selectedTicket) {
      return;
    }

    setIsSaving(true);
    setFeedback(null);

    try {
      await callInternalApi("/api/tickets/status", {
        method: "POST",
        body: JSON.stringify({
          ticketId: selectedTicket.id,
          status: nextStatus,
        }),
      });

      await Promise.all([loadTickets(), loadEvents(selectedTicket.id), refreshAccess()]);
      setFeedback(`Ticket marked ${getStatusLabel(nextStatus).toLowerCase()}.`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to update the ticket right now.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="page-grid dashboard-page">
      <div className="app-header">
        <div className="page-heading">
          <h1>Dashboard</h1>
          <p>Watch voice tickets land, review urgency, and move work forward without losing context.</p>
        </div>
        <div className="dashboard-utility-pills">
          <span className={`status-pill ${connectionState === "live" ? "status-live" : "status-alert"}`}>
            {connectionState === "live" ? "Live now" : "Realtime offline"}
          </span>
          <span className="status-pill status-idle">
            {access?.agency?.vapi_phone_number ?? "Voice number pending"}
          </span>
          <Link className="button-ghost dashboard-settings-link" href="/settings">
            View settings
          </Link>
        </div>
      </div>

      <div className="summary-strip">
        <div className="metric-card">
          <strong>New today</strong>
          <h2>{newTodayCount}</h2>
          <p className="muted-text">Fresh voice-created issues from today&apos;s queue.</p>
        </div>
        <div className="metric-card">
          <strong>In progress</strong>
          <h2>{inProgressCount}</h2>
          <p className="muted-text">Active tickets currently being worked by the team.</p>
        </div>
        <div className="metric-card">
          <strong>Completed today</strong>
          <h2>{completedTodayCount}</h2>
          <p className="muted-text">Closed work items and completed handoffs.</p>
        </div>
        <div className="metric-card">
          <strong>After-hours</strong>
          <h2>{afterHoursCount}</h2>
          <p className="muted-text">Tickets logged outside configured office hours.</p>
        </div>
      </div>

      {feedback ? <p className="feedback-success">{feedback}</p> : null}

      <div className="split-panel dashboard-workspace">
        <section className="ticket-list dashboard-ticket-list">
          <div className="panel-heading dashboard-panel-head">
            <div>
              <h2>Live ticket board</h2>
              <p className="muted-text">Filter the queue, then open one ticket at a time in the detail pane.</p>
            </div>
          </div>

          <div className="dashboard-search-row">
            <input
              className="dashboard-search-input"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search address, caller, or issue"
              value={query}
            />
            <div className="dashboard-filter-strip">
              {filters.map((item) => (
                <button
                  key={item.value}
                  className={`dashboard-filter-chip${filter === item.value ? " active" : ""}`}
                  onClick={() => setFilter(item.value)}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="dashboard-empty-state">
              <strong>Loading the live desk...</strong>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="dashboard-empty-state">
              <strong>No tickets match this view yet</strong>
              <p className="muted-text">New voice-created issues will stream into this desk automatically.</p>
            </div>
          ) : (
            <div className="dashboard-ticket-groups">
              {groupedTickets.newNow.length > 0 ? (
                <div className="ticket-group">
                  <span className="console-label">New now</span>
                  <div className="ticket-row-stack">
                    {groupedTickets.newNow.map((ticket) => (
                      <button
                        key={ticket.id}
                        className={`ticket-board-row${ticket.id === selectedTicketId ? " active" : ""}`}
                        onClick={() => setSelectedTicketId(ticket.id)}
                        type="button"
                      >
                        <div className="ticket-board-meta">
                          <span className="status-pill status-live">{getStatusLabel(ticket.status)}</span>
                          <span className={`status-pill ${getPriorityClass(ticket.priority)}`}>
                            {getPriorityLabel(ticket.priority)}
                          </span>
                        </div>
                        <strong>{ticket.managed_unit?.display_address ?? "Managed unit missing"}</strong>
                        <p>{ticket.issue_summary}</p>
                        <div className="ticket-board-foot">
                          <span>Caller: {ticket.caller_name}</span>
                          <span>{formatRelativeMinutes(ticket.created_at)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {groupedTickets.earlierToday.length > 0 ? (
                <div className="ticket-group">
                  <span className="console-label">Earlier today</span>
                  <div className="ticket-row-stack">
                    {groupedTickets.earlierToday.map((ticket) => (
                      <button
                        key={ticket.id}
                        className={`ticket-board-row${ticket.id === selectedTicketId ? " active" : ""}`}
                        onClick={() => setSelectedTicketId(ticket.id)}
                        type="button"
                      >
                        <div className="ticket-board-meta">
                          <span className="status-pill status-idle">{getStatusLabel(ticket.status)}</span>
                          <span className={`status-pill ${getPriorityClass(ticket.priority)}`}>
                            {getPriorityLabel(ticket.priority)}
                          </span>
                        </div>
                        <strong>{ticket.managed_unit?.display_address ?? "Managed unit missing"}</strong>
                        <p>{ticket.issue_summary}</p>
                        <div className="ticket-board-foot">
                          <span>Caller: {ticket.caller_name}</span>
                          <span>{formatTicketTime(ticket.created_at)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {groupedTickets.inProgress.length > 0 ? (
                <div className="ticket-group">
                  <span className="console-label">In progress</span>
                  <div className="ticket-row-stack">
                    {groupedTickets.inProgress.map((ticket) => (
                      <button
                        key={ticket.id}
                        className={`ticket-board-row${ticket.id === selectedTicketId ? " active" : ""}`}
                        onClick={() => setSelectedTicketId(ticket.id)}
                        type="button"
                      >
                        <div className="ticket-board-meta">
                          <span className="status-pill status-caution">{getStatusLabel(ticket.status)}</span>
                          <span className={`status-pill ${getPriorityClass(ticket.priority)}`}>
                            {getPriorityLabel(ticket.priority)}
                          </span>
                        </div>
                        <strong>{ticket.managed_unit?.display_address ?? "Managed unit missing"}</strong>
                        <p>{ticket.issue_summary}</p>
                        <div className="ticket-board-foot">
                          <span>Caller: {ticket.caller_name}</span>
                          <span>{formatTicketTime(ticket.updated_at)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </section>

        <aside className="ticket-panel dashboard-detail-panel">
          {!selectedTicket ? (
            <div className="dashboard-empty-state detail">
              <strong>No ticket selected</strong>
              <p className="muted-text">
                Keep the board open. New voice-created tickets will appear here and can be opened without
                leaving the queue.
              </p>
            </div>
          ) : (
            <div className="dashboard-detail-stack">
              <div className="dashboard-detail-header">
                <div>
                  <span className="console-label">Ticket</span>
                  <h2>{selectedTicket.managed_unit?.display_address ?? "Managed unit missing"}</h2>
                </div>
                <div className="dashboard-detail-status">
                  <span className={`status-pill ${selectedTicket.status === "in_progress" ? "status-caution" : selectedTicket.status === "completed" ? "status-live" : selectedTicket.status === "cancelled" ? "status-alert" : "status-idle"}`}>
                    {getStatusLabel(selectedTicket.status)}
                  </span>
                  <span className={`status-pill ${getPriorityClass(selectedTicket.priority)}`}>
                    {getPriorityLabel(selectedTicket.priority)}
                  </span>
                </div>
              </div>

              <div className="dashboard-detail-grid">
                <div className="dashboard-detail-card">
                  <span className="console-label">Caller</span>
                  <strong>{selectedTicket.caller_name}</strong>
                  <p>{selectedTicket.caller_phone}</p>
                </div>
                <div className="dashboard-detail-card">
                  <span className="console-label">Logged</span>
                  <strong>{formatTicketTime(selectedTicket.created_at)}</strong>
                  <p>{selectedTicket.category ?? "General maintenance"}</p>
                </div>
              </div>

              <div className="dashboard-detail-card">
                <span className="console-label">Summary</span>
                <strong>{selectedTicket.issue_summary}</strong>
                <p>{selectedTicket.issue_details}</p>
              </div>

              <div className="dashboard-action-strip">
                <button
                  className="button-secondary"
                  disabled={isSaving || selectedTicket.status === "in_progress"}
                  onClick={() => void updateTicketStatus("in_progress")}
                  type="button"
                >
                  Mark in progress
                </button>
                <button
                  className="button-primary"
                  disabled={isSaving || selectedTicket.status === "completed"}
                  onClick={() => void updateTicketStatus("completed")}
                  type="button"
                >
                  Mark completed
                </button>
                <button
                  className="button-ghost"
                  disabled={isSaving || selectedTicket.status === "cancelled"}
                  onClick={() => void updateTicketStatus("cancelled")}
                  type="button"
                >
                  Cancel
                </button>
              </div>

              <div className="dashboard-timeline-card">
                <div className="panel-heading">
                  <h2>Event timeline</h2>
                </div>
                {detailLoading ? (
                  <p className="muted-text">Loading the ticket timeline...</p>
                ) : events.length === 0 ? (
                  <p className="muted-text">No ticket events have been recorded yet.</p>
                ) : (
                  <div className="dashboard-event-list">
                    {events.map((event) => (
                      <div key={event.id} className="dashboard-event-row">
                        <div>
                          <strong>{getEventLabel(event.event_type)}</strong>
                          <p>{formatTicketTime(event.created_at)}</p>
                        </div>
                        <span className="status-pill status-idle">{event.actor_type.replace(/_/g, " ")}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
