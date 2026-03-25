"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppAccess } from "@/components/app-access-provider";
import type { Database } from "@/lib/database.types";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type ManagedUnitRow = Database["public"]["Tables"]["managed_units"]["Row"];

type UnitEditorState = {
  id: string | null;
  propertyAddressLine1: string;
  propertyAddressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  unitNumber: string;
  isActive: boolean;
};

type UnitDraftRow = Omit<UnitEditorState, "id" | "isActive"> & {
  clientId: string;
  errors: string[];
  isValid: boolean;
};

type UnitFilter = "all" | "active" | "inactive";

function buildBlankEditor(): UnitEditorState {
  return {
    id: null,
    propertyAddressLine1: "",
    propertyAddressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    unitNumber: "",
    isActive: true,
  };
}

function normalizePropertyKey(address: string, city: string, state: string, postalCode: string) {
  return [address, city, state, postalCode]
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, "-");
}

function buildDisplayAddress(values: {
  propertyAddressLine1: string;
  propertyAddressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  unitNumber: string;
}) {
  const addressParts = [values.propertyAddressLine1.trim()];

  if (values.propertyAddressLine2.trim()) {
    addressParts.push(values.propertyAddressLine2.trim());
  }

  const cityState = [values.city.trim(), values.state.trim()].filter(Boolean).join(", ");
  const cityLine = [cityState, values.postalCode.trim()].filter(Boolean).join(" ");

  return [addressParts.join(", "), values.unitNumber.trim() ? `Unit ${values.unitNumber.trim()}` : "", cityLine]
    .filter(Boolean)
    .join(" · ");
}

function parseCsvRows(text: string) {
  const rows: string[][] = [];
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  let currentCell = "";
  let currentRow: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < normalized.length; index += 1) {
    const character = normalized[index];
    const nextCharacter = normalized[index + 1];

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        currentCell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === "," && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = "";
      continue;
    }

    if (character === "\n" && !inQuotes) {
      currentRow.push(currentCell.trim());
      if (currentRow.some((value) => value.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = "";
      continue;
    }

    currentCell += character;
  }

  currentRow.push(currentCell.trim());
  if (currentRow.some((value) => value.length > 0)) {
    rows.push(currentRow);
  }

  return rows;
}

function createDraft(values: Omit<UnitEditorState, "id" | "isActive">, existingKeys: Set<string>) {
  const errors: string[] = [];

  if (!values.propertyAddressLine1.trim()) {
    errors.push("Address line 1 is missing.");
  }
  if (!values.city.trim()) {
    errors.push("City is missing.");
  }
  if (!values.state.trim()) {
    errors.push("State is missing.");
  }
  if (!values.postalCode.trim()) {
    errors.push("Postal code is missing.");
  }
  if (!values.unitNumber.trim()) {
    errors.push("Unit number is missing.");
  }

  const key = `${normalizePropertyKey(
    values.propertyAddressLine1,
    values.city,
    values.state,
    values.postalCode,
  )}::${values.unitNumber.trim().toLowerCase()}`;

  if (!errors.length && existingKeys.has(key)) {
    errors.push("This unit already exists in the workspace.");
  }

  return {
    clientId: crypto.randomUUID(),
    ...values,
    errors,
    isValid: errors.length === 0,
  };
}

export default function UnitsPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const { access } = useAppAccess();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [units, setUnits] = useState<ManagedUnitRow[]>([]);
  const [editor, setEditor] = useState<UnitEditorState>(buildBlankEditor());
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<UnitFilter>("all");
  const [draftRows, setDraftRows] = useState<UnitDraftRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const agencyId = access?.agencyId ?? null;

  const existingKeys = useMemo(
    () =>
      new Set(
        units.map(
          (unit) => `${unit.normalized_property_key}::${unit.unit_number.trim().toLowerCase()}`,
        ),
      ),
    [units],
  );

  const loadUnits = useCallback(async () => {
    if (!supabase || !agencyId) {
      setUnits([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase
      .from("managed_units")
      .select("*")
      .eq("agency_id", agencyId)
      .order("property_address_line_1", { ascending: true })
      .order("unit_number", { ascending: true });

    if (error) {
      setFeedback("We couldn't load the managed-unit roster right now.");
      setIsLoading(false);
      return;
    }

    setUnits(data ?? []);
    if (data?.[0]) {
      const first = data[0];
      setEditor((current) =>
        current.id
          ? current
          : {
              id: first.id,
              propertyAddressLine1: first.property_address_line_1,
              propertyAddressLine2: first.property_address_line_2 ?? "",
              city: first.city,
              state: first.state,
              postalCode: first.postal_code,
              unitNumber: first.unit_number,
              isActive: first.is_active,
            },
      );
    }
    setIsLoading(false);
  }, [agencyId, supabase]);

  useEffect(() => {
    void loadUnits();
  }, [loadUnits]);

  const filteredUnits = useMemo(() => {
    return units.filter((unit) => {
      if (filter === "active" && !unit.is_active) {
        return false;
      }
      if (filter === "inactive" && unit.is_active) {
        return false;
      }

      if (!query.trim()) {
        return true;
      }

      const haystack = [
        unit.display_address,
        unit.property_address_line_1,
        unit.city,
        unit.state,
        unit.unit_number,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query.trim().toLowerCase());
    });
  }, [filter, query, units]);

  const groupedUnits = useMemo(() => {
    const groups = new Map<string, ManagedUnitRow[]>();

    filteredUnits.forEach((unit) => {
      const key = unit.normalized_property_key;
      const next = groups.get(key) ?? [];
      next.push(unit);
      groups.set(key, next);
    });

    return Array.from(groups.entries());
  }, [filteredUnits]);

  const activeProperties = useMemo(
    () => new Set(units.filter((unit) => unit.is_active).map((unit) => unit.normalized_property_key)).size,
    [units],
  );
  const recentImportCount = useMemo(
    () =>
      units.filter(
        (unit) => Date.now() - new Date(unit.created_at).getTime() <= 7 * 24 * 60 * 60 * 1000,
      ).length,
    [units],
  );

  async function handleSaveEditor() {
    if (!supabase || !agencyId) {
      return;
    }

    if (
      !editor.propertyAddressLine1.trim() ||
      !editor.city.trim() ||
      !editor.state.trim() ||
      !editor.postalCode.trim() ||
      !editor.unitNumber.trim()
    ) {
      setFeedback("Add the address, city, state, postal code, and unit number before saving.");
      return;
    }

    setIsSaving(true);
    const payload = {
      agency_id: agencyId,
      property_address_line_1: editor.propertyAddressLine1.trim(),
      property_address_line_2: editor.propertyAddressLine2.trim() || null,
      city: editor.city.trim(),
      state: editor.state.trim(),
      postal_code: editor.postalCode.trim(),
      unit_number: editor.unitNumber.trim(),
      normalized_property_key: normalizePropertyKey(
        editor.propertyAddressLine1,
        editor.city,
        editor.state,
        editor.postalCode,
      ),
      display_address: buildDisplayAddress(editor),
      is_active: editor.isActive,
    };

    const response = editor.id
      ? await supabase.from("managed_units").update(payload).eq("id", editor.id).eq("agency_id", agencyId)
      : await supabase.from("managed_units").insert(payload);

    if (response.error) {
      setFeedback("We couldn't save this unit right now. Check for duplicates and try again.");
      setIsSaving(false);
      return;
    }

    await loadUnits();
    setFeedback(editor.id ? "Unit details saved." : "Unit added to the workspace.");
    setIsSaving(false);
  }

  async function importDraftRows() {
    if (!supabase || !agencyId) {
      return;
    }

    const validRows = draftRows.filter((row) => row.isValid);

    if (validRows.length === 0) {
      setFeedback("Stage at least one valid row before importing.");
      return;
    }

    setIsSaving(true);

    const { error } = await supabase.from("managed_units").insert(
      validRows.map((row) => ({
        agency_id: agencyId,
        property_address_line_1: row.propertyAddressLine1.trim(),
        property_address_line_2: row.propertyAddressLine2.trim() || null,
        city: row.city.trim(),
        state: row.state.trim(),
        postal_code: row.postalCode.trim(),
        unit_number: row.unitNumber.trim(),
        normalized_property_key: normalizePropertyKey(
          row.propertyAddressLine1,
          row.city,
          row.state,
          row.postalCode,
        ),
        display_address: buildDisplayAddress(row),
        is_active: true,
      })),
    );

    if (error) {
      setFeedback("The staged import couldn't be saved. Check for duplicates and try again.");
      setIsSaving(false);
      return;
    }

    setDraftRows([]);
    await loadUnits();
    setFeedback("Staged CSV rows imported successfully.");
    setIsSaving(false);
  }

  function handleCsvSelect(file: File) {
    void file.text().then((text) => {
      const [headerRow, ...dataRows] = parseCsvRows(text);

      if (!headerRow || dataRows.length === 0) {
        setFeedback("The CSV needs a header row and at least one unit row.");
        return;
      }

      const normalizedHeaders = headerRow.map((value) =>
        value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_"),
      );

      const headerIndex = {
        propertyAddressLine1: normalizedHeaders.indexOf("property_address_line_1"),
        propertyAddressLine2: normalizedHeaders.indexOf("property_address_line_2"),
        city: normalizedHeaders.indexOf("city"),
        state: normalizedHeaders.indexOf("state"),
        postalCode: normalizedHeaders.findIndex((value) => ["postal_code", "zip", "zip_code"].includes(value)),
        unitNumber: normalizedHeaders.findIndex((value) => ["unit_number", "unit", "apartment"].includes(value)),
      };

      if (
        headerIndex.propertyAddressLine1 === -1 ||
        headerIndex.city === -1 ||
        headerIndex.state === -1 ||
        headerIndex.postalCode === -1 ||
        headerIndex.unitNumber === -1
      ) {
        setFeedback(
          "Accepted columns are property_address_line_1, property_address_line_2, city, state, postal_code, unit_number.",
        );
        return;
      }

      const stagedRows = dataRows.map((row) =>
        createDraft(
          {
            propertyAddressLine1: row[headerIndex.propertyAddressLine1] ?? "",
            propertyAddressLine2:
              headerIndex.propertyAddressLine2 === -1 ? "" : (row[headerIndex.propertyAddressLine2] ?? ""),
            city: row[headerIndex.city] ?? "",
            state: row[headerIndex.state] ?? "",
            postalCode: row[headerIndex.postalCode] ?? "",
            unitNumber: row[headerIndex.unitNumber] ?? "",
          },
          existingKeys,
        ),
      );

      setDraftRows(stagedRows);
      setFeedback(`Loaded ${stagedRows.length} staged row${stagedRows.length === 1 ? "" : "s"} for review.`);
    });
  }

  return (
    <div className="page-grid units-page">
      <div className="app-header units-toolbar">
        <div className="page-heading">
          <h1>Managed units</h1>
          <p>Inspect, search, correct, and expand the validation source your assistant relies on during calls.</p>
        </div>
        <div className="units-toolbar-actions">
          <button className="button-secondary" onClick={() => fileInputRef.current?.click()} type="button">
            Import CSV
          </button>
          <button
            className="button-primary"
            onClick={() => {
              setEditor(buildBlankEditor());
              setFeedback(null);
            }}
            type="button"
          >
            Add unit
          </button>
          <input
            accept=".csv,text/csv"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                handleCsvSelect(file);
              }
              event.target.value = "";
            }}
            ref={fileInputRef}
            type="file"
          />
        </div>
      </div>

      <div className="summary-strip">
        <div className="metric-card">
          <strong>Total units</strong>
          <h2>{units.length}</h2>
          <p className="muted-text">The full set of residences available for caller validation.</p>
        </div>
        <div className="metric-card">
          <strong>Active properties</strong>
          <h2>{activeProperties}</h2>
          <p className="muted-text">Distinct active addresses grouped under management.</p>
        </div>
        <div className="metric-card">
          <strong>Recent import</strong>
          <h2>{recentImportCount}</h2>
          <p className="muted-text">Units added or staged within the last seven days.</p>
        </div>
        <div className="metric-card">
          <strong>Needs attention</strong>
          <h2>{draftRows.filter((row) => !row.isValid).length}</h2>
          <p className="muted-text">CSV rows that still need cleanup before import.</p>
        </div>
      </div>

      {feedback ? (
        <p className={feedback.includes("couldn't") || feedback.includes("missing") ? "feedback-error" : "feedback-success"}>
          {feedback}
        </p>
      ) : null}

      <div className="units-topbar">
        <input
          className="dashboard-search-input"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by address, city, or unit"
          value={query}
        />
        <select
          className="units-filter-select"
          onChange={(event) => setFilter(event.target.value as UnitFilter)}
          value={filter}
        >
          <option value="all">All records</option>
          <option value="active">Active only</option>
          <option value="inactive">Inactive only</option>
        </select>
      </div>

      {draftRows.length > 0 ? (
        <div className="units-import-panel">
          <div className="surface-card">
            <strong>Import audit</strong>
            <div className="audit-grid">
              <div className="audit-metric">
                <span className="console-label">Rows uploaded</span>
                <strong>{draftRows.length}</strong>
              </div>
              <div className="audit-metric">
                <span className="console-label">Valid rows</span>
                <strong>{draftRows.filter((row) => row.isValid).length}</strong>
              </div>
              <div className="audit-metric">
                <span className="console-label">Needs fixes</span>
                <strong>{draftRows.filter((row) => !row.isValid).length}</strong>
              </div>
            </div>
          </div>
          <div className="surface-card staged-units-card">
            <strong>Staged import preview</strong>
            <div className="units-preview-list">
              {draftRows.map((row) => (
                <div key={row.clientId} className={`preview-ticket${row.isValid ? "" : " preview-ticket-alert"}`}>
                  <strong>{buildDisplayAddress(row)}</strong>
                  <span>{row.isValid ? "Ready to import" : "Needs fixes before import"}</span>
                  {row.errors.length > 0 ? (
                    <ul className="unit-error-list">
                      {row.errors.map((error) => (
                        <li key={error}>{error}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="units-inline-bar">
              <button className="button-primary" disabled={isSaving} onClick={() => void importDraftRows()} type="button">
                Import staged rows
              </button>
              <button className="button-ghost" onClick={() => setDraftRows([])} type="button">
                Clear staging
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="units-workspace">
        <section className="surface-card units-list-shell">
          <div className="panel-heading">
            <h2>Grouped unit roster</h2>
          </div>
          {isLoading ? (
            <p className="muted-text">Loading the unit roster...</p>
          ) : groupedUnits.length === 0 ? (
            <div className="dashboard-empty-state">
              <strong>No units match this view</strong>
              <p className="muted-text">Managed unit records power the assistant&apos;s caller validation flow.</p>
            </div>
          ) : (
            <div className="unit-group-list">
              {groupedUnits.map(([groupKey, group]) => {
                const header = group[0];
                return (
                  <div key={groupKey} className="unit-group-card">
                    <div className="unit-group-head">
                      <strong>{header.property_address_line_1}</strong>
                      <span>
                        {header.city}, {header.state} {header.postal_code}
                      </span>
                    </div>
                    <div className="unit-row-stack">
                      {group.map((unit) => (
                        <button
                          key={unit.id}
                          className={`unit-list-row${editor.id === unit.id ? " active" : ""}`}
                          onClick={() =>
                            setEditor({
                              id: unit.id,
                              propertyAddressLine1: unit.property_address_line_1,
                              propertyAddressLine2: unit.property_address_line_2 ?? "",
                              city: unit.city,
                              state: unit.state,
                              postalCode: unit.postal_code,
                              unitNumber: unit.unit_number,
                              isActive: unit.is_active,
                            })
                          }
                          type="button"
                        >
                          <div>
                            <strong>Unit {unit.unit_number}</strong>
                            <span>{new Date(unit.updated_at).toLocaleDateString()}</span>
                          </div>
                          <span className={`status-pill ${unit.is_active ? "status-live" : "status-idle"}`}>
                            {unit.is_active ? "Active" : "Inactive"}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <aside className="surface-card units-editor-shell">
          <div className="panel-heading">
            <div>
              <h2>{editor.id ? "Unit details" : "Add a unit"}</h2>
              <p className="muted-text">Keep the validation record clean and up to date.</p>
            </div>
          </div>
          <div className="unit-editor-grid">
            <div className="field-group">
              <label htmlFor="unit-address-line-1">Address line 1</label>
              <input
                id="unit-address-line-1"
                onChange={(event) => setEditor((current) => ({ ...current, propertyAddressLine1: event.target.value }))}
                value={editor.propertyAddressLine1}
              />
            </div>
            <div className="field-group">
              <label htmlFor="unit-address-line-2">Address line 2</label>
              <input
                id="unit-address-line-2"
                onChange={(event) => setEditor((current) => ({ ...current, propertyAddressLine2: event.target.value }))}
                value={editor.propertyAddressLine2}
              />
            </div>
            <div className="field-group">
              <label htmlFor="unit-city">City</label>
              <input
                id="unit-city"
                onChange={(event) => setEditor((current) => ({ ...current, city: event.target.value }))}
                value={editor.city}
              />
            </div>
            <div className="field-group">
              <label htmlFor="unit-state">State</label>
              <input
                id="unit-state"
                onChange={(event) => setEditor((current) => ({ ...current, state: event.target.value }))}
                value={editor.state}
              />
            </div>
            <div className="field-group">
              <label htmlFor="unit-postal-code">Postal code</label>
              <input
                id="unit-postal-code"
                onChange={(event) => setEditor((current) => ({ ...current, postalCode: event.target.value }))}
                value={editor.postalCode}
              />
            </div>
            <div className="field-group">
              <label htmlFor="unit-number">Unit number</label>
              <input
                id="unit-number"
                onChange={(event) => setEditor((current) => ({ ...current, unitNumber: event.target.value }))}
                value={editor.unitNumber}
              />
            </div>
          </div>

          <label className="schedule-toggle">
            <input
              checked={editor.isActive}
              onChange={(event) => setEditor((current) => ({ ...current, isActive: event.target.checked }))}
              type="checkbox"
            />
            <span>{editor.isActive ? "Active in caller validation" : "Inactive"}</span>
          </label>

          <div className="preview-ticket">
            <strong>{editor.propertyAddressLine1.trim() || "Preview address"}</strong>
            <span>{buildDisplayAddress(editor)}</span>
          </div>

          <div className="units-inline-bar">
            <button className="button-primary" disabled={isSaving} onClick={() => void handleSaveEditor()} type="button">
              {editor.id ? "Save changes" : "Create unit"}
            </button>
            <button className="button-ghost" onClick={() => setEditor(buildBlankEditor())} type="button">
              Reset
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
