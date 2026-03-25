"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppAccess } from "@/components/app-access-provider";
import type { Database } from "@/lib/database.types";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type AgencyRow = Database["public"]["Tables"]["agencies"]["Row"];
type BusinessHourRow = Database["public"]["Tables"]["agency_business_hours"]["Row"];

type AgencyFormState = {
  name: string;
  officeAddress: string;
  contactNumber: string;
  transferNumber: string;
  timezone: string;
};

type BusinessHoursDraft = {
  weekday: number;
  label: string;
  isClosed: boolean;
  startTimeLocal: string;
  endTimeLocal: string;
};

const COMMON_TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
];

const WEEKDAY_OPTIONS = [
  { label: "Mon", dbWeekday: 1 },
  { label: "Tue", dbWeekday: 2 },
  { label: "Wed", dbWeekday: 3 },
  { label: "Thu", dbWeekday: 4 },
  { label: "Fri", dbWeekday: 5 },
  { label: "Sat", dbWeekday: 6 },
  { label: "Sun", dbWeekday: 0 },
];

function buildAgencyFormState(agency: AgencyRow | null): AgencyFormState {
  return {
    name: agency?.name ?? "",
    officeAddress: agency?.office_address ?? "",
    contactNumber: agency?.contact_number ?? "",
    transferNumber: agency?.transfer_number ?? "",
    timezone: agency?.timezone ?? COMMON_TIMEZONES[0],
  };
}

function buildDefaultHours() {
  return WEEKDAY_OPTIONS.map((option) => ({
    weekday: option.dbWeekday,
    label: option.label,
    isClosed: option.dbWeekday === 0 || option.dbWeekday === 6,
    startTimeLocal: "09:00",
    endTimeLocal: "17:00",
  }));
}

function mergeBusinessHours(rows: BusinessHourRow[]): BusinessHoursDraft[] {
  const defaults = buildDefaultHours();

  return defaults.map((draft) => {
    const existing = rows.find((row) => row.weekday === draft.weekday);

    if (!existing) {
      return draft;
    }

    return {
      ...draft,
      isClosed: existing.is_closed,
      startTimeLocal: existing.start_time_local ?? draft.startTimeLocal,
      endTimeLocal: existing.end_time_local ?? draft.endTimeLocal,
    };
  });
}

function isManualPhoneSetupRequired(agency: AgencyRow | null) {
  return Boolean(
    agency &&
      agency.onboarding_status === "failed" &&
      agency.vapi_assistant_id &&
      agency.vapi_phone_number_id &&
      !agency.vapi_phone_number,
  );
}

function getProvisioningState(agency: AgencyRow | null) {
  if (agency?.onboarding_status === "ready" || agency?.vapi_phone_number) {
    return {
      label: "Assigned",
      className: "status-live",
      message: agency.vapi_phone_number
        ? `Inbound number ${agency.vapi_phone_number} is attached to this agency.`
        : "The dedicated voice line is ready.",
    };
  }

  if (isManualPhoneSetupRequired(agency)) {
    return {
      label: "Manual setup required",
      className: "status-caution",
      message:
        "Vapi created the assistant and phone resource, but the account still needs a callable "
        + "number assigned in Vapi or through a BYO phone-number provider.",
    };
  }

  if (agency?.onboarding_status === "failed") {
    return {
      label: "Needs attention",
      className: "status-alert",
      message: "Provisioning failed and should be retried once the catalog is healthy.",
    };
  }

  if (agency?.onboarding_status === "provisioning") {
    return {
      label: "In progress",
      className: "status-caution",
      message: "Assistant and phone provisioning are running now.",
    };
  }

  return {
    label: "Not ready",
    className: "status-idle",
    message: "Complete onboarding and provisioning to assign a dedicated voice line.",
  };
}

export default function SettingsPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const { access, refreshAccess } = useAppAccess();
  const [agencyForm, setAgencyForm] = useState<AgencyFormState>(buildAgencyFormState(access?.agency ?? null));
  const [businessHours, setBusinessHours] = useState<BusinessHoursDraft[]>(buildDefaultHours());
  const [initialAgencyState, setInitialAgencyState] = useState(() =>
    JSON.stringify(buildAgencyFormState(access?.agency ?? null)),
  );
  const [initialHoursState, setInitialHoursState] = useState(() =>
    JSON.stringify(buildDefaultHours()),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const agencyId = access?.agencyId ?? null;
  const provisioningState = getProvisioningState(access?.agency ?? null);

  const loadSettings = useCallback(async () => {
    if (!supabase || !agencyId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setAgencyForm(buildAgencyFormState(access?.agency ?? null));

    const { data, error } = await supabase
      .from("agency_business_hours")
      .select("*")
      .eq("agency_id", agencyId)
      .order("weekday", { ascending: true });

    if (error) {
      setFeedback("We couldn't load your office hours right now.");
      setIsLoading(false);
      return;
    }

    const nextAgencyForm = buildAgencyFormState(access?.agency ?? null);
    const nextHours = mergeBusinessHours(data ?? []);

    setAgencyForm(nextAgencyForm);
    setBusinessHours(nextHours);
    setInitialAgencyState(JSON.stringify(nextAgencyForm));
    setInitialHoursState(JSON.stringify(nextHours));
    setIsLoading(false);
  }, [access?.agency, agencyId, supabase]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const currentAgency = JSON.stringify(agencyForm);
  const currentHours = JSON.stringify(businessHours);
  const isDirty = initialAgencyState !== currentAgency || initialHoursState !== currentHours;

  async function handleSave() {
    if (!supabase || !agencyId) {
      return;
    }

    if (
      !agencyForm.name.trim() ||
      !agencyForm.officeAddress.trim() ||
      !agencyForm.contactNumber.trim() ||
      !agencyForm.timezone.trim()
    ) {
      setFeedback("Complete the agency profile fields before saving.");
      return;
    }

    const invalidHours = businessHours.some(
      (day) => !day.isClosed && (!day.startTimeLocal || !day.endTimeLocal || day.startTimeLocal >= day.endTimeLocal),
    );

    if (invalidHours) {
      setFeedback("Each open day needs a valid start and end time.");
      return;
    }

    setIsSaving(true);
    setFeedback(null);

    const [{ error: agencyError }, { error: hoursError }] = await Promise.all([
      supabase
        .from("agencies")
        .update({
          name: agencyForm.name.trim(),
          office_address: agencyForm.officeAddress.trim(),
          contact_number: agencyForm.contactNumber.trim(),
          transfer_number: agencyForm.transferNumber.trim() || null,
          timezone: agencyForm.timezone,
        })
        .eq("id", agencyId),
      supabase.from("agency_business_hours").upsert(
        businessHours.map((day) => ({
          agency_id: agencyId,
          weekday: day.weekday,
          is_closed: day.isClosed,
          start_time_local: day.isClosed ? null : day.startTimeLocal,
          end_time_local: day.isClosed ? null : day.endTimeLocal,
        })),
        { onConflict: "agency_id,weekday" },
      ),
    ]);

    if (agencyError || hoursError) {
      setFeedback("We couldn't save your settings right now.");
      setIsSaving(false);
      return;
    }

    await Promise.all([refreshAccess(), loadSettings()]);
    setInitialAgencyState(JSON.stringify(agencyForm));
    setInitialHoursState(JSON.stringify(businessHours));
    setFeedback("Settings saved.");
    setIsSaving(false);
  }

  return (
    <div className="page-grid settings-page">
      <div className="page-heading">
        <h1>Settings</h1>
        <p>Maintain the agency profile, operating hours, and voice setup without leaving the operational workspace.</p>
      </div>

      {feedback ? (
        <p className={
          feedback.includes("failed") ||
          feedback.includes("couldn't") ||
          feedback.includes("needs") ||
          feedback.includes("requires")
            ? "feedback-error"
            : "feedback-success"
        }>
          {feedback}
        </p>
      ) : null}

      {isLoading ? (
        <div className="dashboard-empty-state">
          <strong>Loading settings...</strong>
        </div>
      ) : (
        <>
          <section className="surface-card settings-card">
            <div className="panel-heading settings-card-head">
              <div>
                <h2>Agency profile</h2>
                <p className="muted-text">Keep the public-facing office details accurate for callers and staff.</p>
              </div>
              <span className="status-pill status-idle">Profile</span>
            </div>
            <div className="units-form-grid">
              <div className="field-group">
                <label htmlFor="settings-name">Agency name</label>
                <input
                  id="settings-name"
                  onChange={(event) => setAgencyForm((current) => ({ ...current, name: event.target.value }))}
                  value={agencyForm.name}
                />
              </div>
              <div className="field-group">
                <label htmlFor="settings-office-address">Office address</label>
                <input
                  id="settings-office-address"
                  onChange={(event) => setAgencyForm((current) => ({ ...current, officeAddress: event.target.value }))}
                  value={agencyForm.officeAddress}
                />
              </div>
              <div className="field-group">
                <label htmlFor="settings-contact-number">Contact number</label>
                <input
                  id="settings-contact-number"
                  onChange={(event) => setAgencyForm((current) => ({ ...current, contactNumber: event.target.value }))}
                  value={agencyForm.contactNumber}
                />
              </div>
              <div className="field-group">
                <label htmlFor="settings-timezone">Timezone</label>
                <select
                  id="settings-timezone"
                  onChange={(event) => setAgencyForm((current) => ({ ...current, timezone: event.target.value }))}
                  value={agencyForm.timezone}
                >
                  {COMMON_TIMEZONES.map((timezone) => (
                    <option key={timezone} value={timezone}>
                      {timezone}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section className="surface-card settings-card">
            <div className="panel-heading settings-card-head">
              <div>
                <h2>Business hours</h2>
                <p className="muted-text">Transfers are allowed only during open hours. Ticket creation stays available any time.</p>
              </div>
              <span className="status-pill status-caution">Transfer rules</span>
            </div>
            <div className="field-group">
              <label htmlFor="settings-transfer-number">Transfer number</label>
              <input
                id="settings-transfer-number"
                onChange={(event) => setAgencyForm((current) => ({ ...current, transferNumber: event.target.value }))}
                value={agencyForm.transferNumber}
              />
            </div>
            <div className="schedule-grid">
              {businessHours.map((day) => (
                <div key={day.weekday} className="schedule-row">
                  <div className="schedule-day">
                    <strong>{day.label}</strong>
                  </div>
                  <label className="schedule-toggle">
                    <input
                      checked={!day.isClosed}
                      onChange={(event) =>
                        setBusinessHours((current) =>
                          current.map((entry) =>
                            entry.weekday === day.weekday
                              ? { ...entry, isClosed: !event.target.checked }
                              : entry,
                          ),
                        )
                      }
                      type="checkbox"
                    />
                    <span>{day.isClosed ? "Closed" : "Open"}</span>
                  </label>
                  <input
                    disabled={day.isClosed}
                    onChange={(event) =>
                      setBusinessHours((current) =>
                        current.map((entry) =>
                          entry.weekday === day.weekday
                            ? { ...entry, startTimeLocal: event.target.value }
                            : entry,
                        ),
                      )
                    }
                    type="time"
                    value={day.startTimeLocal}
                  />
                  <input
                    disabled={day.isClosed}
                    onChange={(event) =>
                      setBusinessHours((current) =>
                        current.map((entry) =>
                          entry.weekday === day.weekday
                            ? { ...entry, endTimeLocal: event.target.value }
                            : entry,
                        ),
                      )
                    }
                    type="time"
                    value={day.endTimeLocal}
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="surface-card settings-card">
            <div className="panel-heading settings-card-head">
              <div>
                <h2>Voice setup</h2>
                <p className="muted-text">Telephony details should feel like infrastructure: visible, operational, and easy to verify.</p>
              </div>
              <span className={`status-pill ${provisioningState.className}`}>{provisioningState.label}</span>
            </div>
            <div className="settings-voice-grid">
              <div className="review-item">
                <span className="console-label">Assigned number</span>
                <strong>{access?.agency?.vapi_phone_number ?? "Not assigned yet"}</strong>
              </div>
              <div className="review-item">
                <span className="console-label">Assistant status</span>
                <strong>{provisioningState.message}</strong>
              </div>
              <div className="review-item">
                <span className="console-label">Transfer number</span>
                <strong>{agencyForm.transferNumber || "Missing transfer number"}</strong>
              </div>
              <div className="review-item">
                <span className="console-label">Last provisioning check</span>
                <strong>{access?.agency?.updated_at ? new Date(access.agency.updated_at).toLocaleString() : "Unknown"}</strong>
              </div>
            </div>
          </section>

          <section className="surface-card settings-card">
            <div className="panel-heading settings-card-head">
              <div>
                <h2>Safety and behavior</h2>
                <p className="muted-text">This pilot intentionally keeps the assistant policy visible but read-only.</p>
              </div>
              <span className="status-pill status-idle">Policy summary</span>
            </div>
            <div className="units-preview-list">
              <div className="preview-ticket">
                <strong>Low-friction unit validation</strong>
                <span>The assistant confirms the property and unit before offering guidance or creating a ticket.</span>
              </div>
              <div className="preview-ticket">
                <strong>Internal ticket creation only</strong>
                <span>Tickets are stored in Supabase and shown on the live dashboard for staff follow-up.</span>
              </div>
              <div className="preview-ticket">
                <strong>No transcript retention in v1</strong>
                <span>The pilot avoids long-lived transcript storage and focuses on operational metadata instead.</span>
              </div>
              <div className="preview-ticket">
                <strong>Transfer only on request or failed resolution</strong>
                <span>The assistant does not default to handing calls to staff unless that path is clearly needed.</span>
              </div>
            </div>
          </section>
        </>
      )}

      {isDirty ? (
        <div className="settings-save-bar">
          <span className="console-label">Unsaved changes</span>
          <div className="wizard-action-group">
            <button className="button-primary" disabled={isSaving} onClick={() => void handleSave()} type="button">
              {isSaving ? "Saving..." : "Save settings"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
