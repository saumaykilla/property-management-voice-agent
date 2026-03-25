"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import type { Database } from "@/lib/database.types";
import { useAppAccess } from "@/components/app-access-provider";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type AgencyRow =
  Database["public"]["Tables"]["agencies"]["Row"];
type ManagedUnitRow =
  Database["public"]["Tables"]["managed_units"]["Row"];
type ServiceCatalogDocumentRow =
  Database["public"]["Tables"]["service_catalog_documents"]["Row"];

type StepNumber =

    | 1
    | 2
    | 3
    | 4
    | 5;
type FeedbackTone =

    | "error"
    | "success";
type CatalogUploadState =

    | "idle"
    | "selected"
    | "uploading"
    | "stored";
type CanonicalUnitField =

    | "property_address_line_1"
    | "property_address_line_2"
    | "city"
    | "state"
    | "postal_code"
    | "unit_number";

type WizardFeedback =
  {
    tone: FeedbackTone;
    message: string;
  };

type AgencyFormState =
  {
    name: string;
    officeAddress: string;
    contactNumber: string;
    timezone: string;
    transferNumber: string;
  };

type BusinessHoursDraft =
  {
    weekday: number;
    isClosed: boolean;
    startTimeLocal: string;
    endTimeLocal: string;
  };

type UnitFormState =
  {
    propertyAddressLine1: string;
    propertyAddressLine2: string;
    city: string;
    state: string;
    postalCode: string;
    unitNumber: string;
  };

type UnitDraftRow =
  UnitFormState & {
    clientId: string;
    errors: string[];
    isValid: boolean;
    source:
      | "csv"
      | "manual";
  };

type CatalogProcessResponse =
  {
    result: {
      document_id: string;
      chunk_count: number;
      status: string;
    };
    error?: string;
  };

type ProvisionResponse =
  {
    result: {
      assistant_id: string;
      phone_number_id: string;
      phone_number: string;
      status: string;
      mode: string;
    };
    error?: string;
  };

const STEP_LABELS: Array<{
  step: StepNumber;
  label: string;
}> =
  [
    {
      step: 1,
      label:
        "Agency profile",
    },
    {
      step: 2,
      label:
        "Hours",
    },
    {
      step: 3,
      label:
        "Units",
    },
    {
      step: 4,
      label:
        "Catalog",
    },
    {
      step: 5,
      label:
        "Review",
    },
  ];

const WEEKDAY_OPTIONS =
  [
    {
      label:
        "Mon",
      dbWeekday: 1,
    },
    {
      label:
        "Tue",
      dbWeekday: 2,
    },
    {
      label:
        "Wed",
      dbWeekday: 3,
    },
    {
      label:
        "Thu",
      dbWeekday: 4,
    },
    {
      label:
        "Fri",
      dbWeekday: 5,
    },
    {
      label:
        "Sat",
      dbWeekday: 6,
    },
    {
      label:
        "Sun",
      dbWeekday: 0,
    },
  ];

const COMMON_TIMEZONES =
  [
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "America/Phoenix",
    "America/Anchorage",
    "Pacific/Honolulu",
  ];

const STEP_RAIL: Record<
  StepNumber,
  {
    eyebrow: string;
    title: string;
    points: string[];
  }
> =
  {
    1: {
      eyebrow:
        "Agency profile",
      title:
        "Add the office details callers should hear first.",
      points:
        [
          "Name, office line, and address become the base profile for the desk.",
          "Timezone keeps transfers and business hours aligned with your team.",
        ],
    },
    2: {
      eyebrow:
        "Business hours",
      title:
        "Set the schedule the assistant should follow.",
      points:
        [
          "Transfers only happen during open hours.",
          "After-hours callers can still leave enough detail for follow-up.",
        ],
    },
    3: {
      eyebrow:
        "Managed units",
      title:
        "Load the residences your team actively manages.",
      points:
        [
          "Import a CSV or stage units manually from the same screen.",
          "Only valid staged rows move into the workspace.",
        ],
    },
    4: {
      eyebrow:
        "Service catalog",
      title:
        "Upload the catalog the assistant should search during calls.",
      points:
        [
          "The PDF is stored for your agency and prepared for search.",
          "You can only move on once the latest catalog is ready.",
        ],
    },
    5: {
      eyebrow:
        "Final review",
      title:
        "Review setup before the workspace opens.",
      points:
        [
          "Profile, hours, units, catalog, and voice-line status are checked here.",
          "If Vapi needs manual number assignment, finish that step there before launch.",
        ],
    },
  };

const UNIT_HEADER_ALIASES: Record<
  CanonicalUnitField,
  string[]
> =
  {
    property_address_line_1:
      [
        "property_address_line_1",
        "propertyaddressline1",
        "property_address",
        "street_address",
        "address_1",
        "address1",
        "addressline1",
      ],
    property_address_line_2:
      [
        "property_address_line_2",
        "propertyaddressline2",
        "address_2",
        "address2",
        "addressline2",
        "suite",
      ],
    city: [
      "city",
    ],
    state:
      [
        "state",
        "province",
      ],
    postal_code:
      [
        "postal_code",
        "postalcode",
        "zip",
        "zipcode",
        "zip_code",
      ],
    unit_number:
      [
        "unit_number",
        "unitnumber",
        "unit",
        "apartment",
        "apt",
        "suite_number",
      ],
  };

function buildBlankUnitForm(): UnitFormState {
  return {
    propertyAddressLine1:
      "",
    propertyAddressLine2:
      "",
    city: "",
    state:
      "",
    postalCode:
      "",
    unitNumber:
      "",
  };
}

function buildDefaultHours(): BusinessHoursDraft[] {
  return WEEKDAY_OPTIONS.map(
    (
      option,
    ) => ({
      weekday:
        option.dbWeekday,
      isClosed:
        option.dbWeekday ===
          0 ||
        option.dbWeekday ===
          6,
      startTimeLocal:
        "09:00",
      endTimeLocal:
        "17:00",
    }),
  );
}

function mergeBusinessHours(
  rows: Database["public"]["Tables"]["agency_business_hours"]["Row"][],
): BusinessHoursDraft[] {
  const defaults =
    buildDefaultHours();

  return defaults.map(
    (
      draft,
    ) => {
      const existing =
        rows.find(
          (
            row,
          ) =>
            row.weekday ===
            draft.weekday,
        );

      if (
        !existing
      ) {
        return draft;
      }

      return {
        weekday:
          existing.weekday,
        isClosed:
          existing.is_closed,
        startTimeLocal:
          existing.start_time_local ??
          draft.startTimeLocal,
        endTimeLocal:
          existing.end_time_local ??
          draft.endTimeLocal,
      };
    },
  );
}

function buildAgencyFormState(
  agency: AgencyRow | null,
): AgencyFormState {
  return {
    name:
      agency?.name ??
      "",
    officeAddress:
      agency?.office_address ??
      "",
    contactNumber:
      agency?.contact_number ??
      "",
    timezone:
      agency?.timezone ??
      Intl.DateTimeFormat().resolvedOptions()
        .timeZone ??
      COMMON_TIMEZONES[0],
    transferNumber:
      agency?.transfer_number ??
      "",
  };
}

function normalizeToken(
  value: string,
) {
  return value
    .toLowerCase()
    .trim()
    .replace(
      /[^a-z0-9]+/g,
      "_",
    )
    .replace(
      /^_+|_+$/g,
      "",
    );
}

function sanitizeFilename(
  filename: string,
) {
  const baseName =
    filename
      .replace(
        /\s+/g,
        "-",
      )
      .replace(
        /[^a-zA-Z0-9._-]/g,
        "",
      )
      .toLowerCase();
  return (
    baseName ||
    "service-catalog.pdf"
  );
}

function normalizePropertyKey({
  propertyAddressLine1,
  city,
  state,
  postalCode,
}: Pick<
  UnitFormState,
  | "propertyAddressLine1"
  | "city"
  | "state"
  | "postalCode"
>) {
  return [
    propertyAddressLine1,
    city,
    state,
    postalCode,
  ]
    .join(
      " ",
    )
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      " ",
    )
    .trim()
    .replace(
      /\s+/g,
      "-",
    );
}

function buildDisplayAddress(
  unit: UnitFormState,
) {
  const addressParts =
    [
      unit.propertyAddressLine1.trim(),
    ];

  if (
    unit.propertyAddressLine2.trim()
  ) {
    addressParts.push(
      unit.propertyAddressLine2.trim(),
    );
  }

  const cityState =
    [
      unit.city.trim(),
      unit.state.trim(),
    ]
      .filter(
        Boolean,
      )
      .join(
        ", ",
      );
  const locationLine =
    [
      cityState,
      unit.postalCode.trim(),
    ]
      .filter(
        Boolean,
      )
      .join(
        " ",
      );
  const unitLabel =
    unit.unitNumber.trim();

  return [
    addressParts.join(
      ", ",
    ),
    unitLabel
      ? `Unit ${unitLabel}`
      : "",
    locationLine,
  ]
    .filter(
      Boolean,
    )
    .join(
      " · ",
    );
}

function buildUnitKey(
  unit: UnitFormState,
) {
  return `${normalizePropertyKey(unit)}::${unit.unitNumber.trim().toLowerCase()}`;
}

function getWeekdayLabel(
  weekday: number,
) {
  return (
    WEEKDAY_OPTIONS.find(
      (
        option,
      ) =>
        option.dbWeekday ===
        weekday,
    )
      ?.label ??
    `Day ${weekday}`
  );
}

function parseCsvRows(
  text: string,
) {
  const rows: string[][] =
    [];
  const normalized =
    text
      .replace(
        /\r\n/g,
        "\n",
      )
      .replace(
        /\r/g,
        "\n",
      );
  let currentCell =
    "";
  let currentRow: string[] =
    [];
  let inQuotes = false;

  for (
    let index = 0;
    index <
    normalized.length;
    index += 1
  ) {
    const character =
      normalized[
        index
      ];
    const nextCharacter =
      normalized[
        index +
          1
      ];

    if (
      character ===
      '"'
    ) {
      if (
        inQuotes &&
        nextCharacter ===
          '"'
      ) {
        currentCell +=
          '"';
        index += 1;
      } else {
        inQuotes =
          !inQuotes;
      }
      continue;
    }

    if (
      character ===
        "," &&
      !inQuotes
    ) {
      currentRow.push(
        currentCell.trim(),
      );
      currentCell =
        "";
      continue;
    }

    if (
      character ===
        "\n" &&
      !inQuotes
    ) {
      currentRow.push(
        currentCell.trim(),
      );
      if (
        currentRow.some(
          (
            value,
          ) =>
            value.length >
            0,
        )
      ) {
        rows.push(
          currentRow,
        );
      }
      currentRow =
        [];
      currentCell =
        "";
      continue;
    }

    currentCell +=
      character;
  }

  currentRow.push(
    currentCell.trim(),
  );
  if (
    currentRow.some(
      (
        value,
      ) =>
        value.length >
        0,
    )
  ) {
    rows.push(
      currentRow,
    );
  }

  return rows;
}

function mapCsvHeaders(
  headers: string[],
) {
  const mappedHeaders: Partial<
    Record<
      CanonicalUnitField,
      number
    >
  > =
    {};

  headers.forEach(
    (
      header,
      index,
    ) => {
      const token =
        normalizeToken(
          header,
        );

      (
        Object.keys(
          UNIT_HEADER_ALIASES,
        ) as CanonicalUnitField[]
      ).forEach(
        (
          field,
        ) => {
          if (
            UNIT_HEADER_ALIASES[
              field
            ].includes(
              token,
            )
          ) {
            mappedHeaders[
              field
            ] =
              index;
          }
        },
      );
    },
  );

  return mappedHeaders;
}

function createUnitDraft(
  values: UnitFormState,
  source: UnitDraftRow["source"],
  existingKeys: Set<string>,
  stagedKeys: Set<string>,
) {
  const cleanedValues: UnitFormState =
    {
      propertyAddressLine1:
        values.propertyAddressLine1.trim(),
      propertyAddressLine2:
        values.propertyAddressLine2.trim(),
      city: values.city.trim(),
      state:
        values.state.trim(),
      postalCode:
        values.postalCode.trim(),
      unitNumber:
        values.unitNumber.trim(),
    };

  const errors: string[] =
    [];

  if (
    !cleanedValues.propertyAddressLine1
  ) {
    errors.push(
      "Address line 1 is missing.",
    );
  }

  if (
    !cleanedValues.city
  ) {
    errors.push(
      "City is missing.",
    );
  }

  if (
    !cleanedValues.state
  ) {
    errors.push(
      "State is missing.",
    );
  }

  if (
    !cleanedValues.postalCode
  ) {
    errors.push(
      "Postal code is missing.",
    );
  }

  if (
    !cleanedValues.unitNumber
  ) {
    errors.push(
      "Unit number is missing.",
    );
  }

  const unitKey =
    errors.length ===
    0
      ? `${normalizePropertyKey(cleanedValues)}::${cleanedValues.unitNumber.toLowerCase()}`
      : "";

  if (
    unitKey &&
    existingKeys.has(
      unitKey,
    )
  ) {
    errors.push(
      "This unit already exists in your workspace.",
    );
  }

  if (
    unitKey &&
    stagedKeys.has(
      unitKey,
    )
  ) {
    errors.push(
      "This unit appears more than once in the staged import.",
    );
  }

  if (
    unitKey
  ) {
    stagedKeys.add(
      unitKey,
    );
  }

  return {
    clientId:
      crypto.randomUUID(),
    source,
    errors,
    isValid:
      errors.length ===
      0,
    ...cleanedValues,
  };
}

function buildCatalogStatusCopy(
  status:
    | ServiceCatalogDocumentRow["ingestion_status"]
    | null,
) {
  if (
    status ===
    "ready"
  ) {
    return {
      label:
        "Searchable",
      className:
        "status-live",
      message:
        "The assistant can search this catalog during calls.",
    };
  }

  if (
    status ===
    "processing"
  ) {
    return {
      label:
        "Preparing",
      className:
        "status-caution",
      message:
        "The catalog is being processed into searchable knowledge.",
    };
  }

  if (
    status ===
    "failed"
  ) {
    return {
      label:
        "Needs attention",
      className:
        "status-alert",
      message:
        "The upload is stored, but catalog preparation needs another pass.",
    };
  }

  return {
    label:
      "Queued",
    className:
      "status-caution",
    message:
      "The catalog is stored and waiting to become searchable.",
  };
}

function isManualPhoneSetupRequired(
  agency: AgencyRow | null,
) {
  return Boolean(
    agency &&
    agency.onboarding_status ===
      "failed" &&
    agency.vapi_assistant_id &&
    agency.vapi_phone_number_id &&
    !agency.vapi_phone_number,
  );
}

function buildProvisioningCopy(
  agency: AgencyRow | null,
) {
  if (
    agency?.onboarding_status ===
      "ready" ||
    agency?.vapi_phone_number
  ) {
    return {
      label:
        "Assigned",
      className:
        "status-live",
      message:
        agency.vapi_phone_number
          ? `Your voice line is live at ${agency.vapi_phone_number}.`
          : "Your voice line is ready.",
    };
  }

  if (
    isManualPhoneSetupRequired(
      agency,
    )
  ) {
    return {
      label:
        "Manual setup required",
      className:
        "status-caution",
      message:
        "The Vapi assistant is created, but a callable number still needs to be assigned in " +
        "Vapi before this desk can go live.",
    };
  }

  if (
    agency?.onboarding_status ===
    "failed"
  ) {
    return {
      label:
        "Needs attention",
      className:
        "status-alert",
      message:
        "Setup hit an issue and should be reviewed before callers are routed in.",
    };
  }

  if (
    agency?.onboarding_status ===
    "provisioning"
  ) {
    return {
      label:
        "In progress",
      className:
        "status-caution",
      message:
        "Phone and assistant assignment are in motion.",
    };
  }

  if (
    agency?.onboarding_status ===
    "catalog_processing"
  ) {
    return {
      label:
        "Waiting on catalog",
      className:
        "status-caution",
      message:
        "Voice-line setup will advance once the uploaded catalog is prepared.",
    };
  }

  return {
    label:
      "Not submitted",
    className:
      "status-idle",
    message:
      "Submit the review step to move setup into the next stage.",
  };
}

function getRecommendedStep(
  access: ReturnType<
    typeof useAppAccess
  >["access"],
): StepNumber {
  if (
    !access?.hasMembership
  ) {
    return 1;
  }

  if (
    !access
      .checklist
      .hasAgencyProfile
  ) {
    return 1;
  }

  if (
    !access
      .checklist
      .hasBusinessHours
  ) {
    return 2;
  }

  if (
    !access
      .checklist
      .hasUnits
  ) {
    return 3;
  }

  if (
    !access
      .checklist
      .hasCatalog
  ) {
    return 4;
  }

  return 5;
}

function getMaxAvailableStep(
  access: ReturnType<
    typeof useAppAccess
  >["access"],
): StepNumber {
  if (
    !access?.hasMembership
  ) {
    return 1;
  }

  if (
    !access
      .checklist
      .hasAgencyProfile
  ) {
    return 1;
  }

  if (
    !access
      .checklist
      .hasBusinessHours
  ) {
    return 2;
  }

  if (
    !access
      .checklist
      .hasUnits
  ) {
    return 3;
  }

  if (
    !access
      .checklist
      .hasCatalog
  ) {
    return 4;
  }

  return 5;
}

function StepProgress({
  currentStep,
  isSaving,
  maxAvailableStep,
  onSelect,
}: {
  currentStep: StepNumber;
  isSaving: boolean;
  maxAvailableStep: StepNumber;
  onSelect: (
    step: StepNumber,
  ) => void;
}) {
  return (
    <div
      className="wizard-progress"
      aria-label="Onboarding progress"
    >
      <div className="wizard-progress-header">
        <span className="eyebrow">
          Step{" "}
          {
            currentStep
          }{" "}
          of
          5
        </span>
      </div>
      <div className="wizard-progress-strip">
        {STEP_LABELS.map(
          (
            item,
          ) => {
            const isActive =
              item.step ===
              currentStep;
            const isUnlocked =
              item.step <=
              maxAvailableStep;

            return (
              <button
                key={
                  item.step
                }
                className={`wizard-step-pill${isActive ? " active" : ""}`}
                disabled={
                  !isUnlocked ||
                  isSaving
                }
                onClick={() =>
                  onSelect(
                    item.step,
                  )
                }
                type="button"
              >
                <span>
                  {
                    item.label
                  }
                </span>
              </button>
            );
          },
        )}
      </div>
    </div>
  );
}

function ContextRail({
  step,
}: {
  step: StepNumber;
}) {
  const rail =
    STEP_RAIL[
      step
    ];

  return (
    <aside className="wizard-rail">
      <div className="surface-card wizard-rail-card">
        <span className="eyebrow">
          {
            rail.eyebrow
          }
        </span>
        <div className="section-heading">
          <h2>
            {
              rail.title
            }
          </h2>
        </div>
        <ul className="wizard-rail-list">
          {rail.points.map(
            (
              point,
            ) => (
              <li
                key={
                  point
                }
              >
                {
                  point
                }
              </li>
            ),
          )}
        </ul>
      </div>
    </aside>
  );
}

function StickyActionBar({
  currentStep,
  isSaving,
  isContinueDisabled,
  onBack,
  onSaveDraft,
  onContinue,
  showSaveDraft,
  continueLabel,
}: {
  currentStep: StepNumber;
  isSaving: boolean;
  isContinueDisabled: boolean;
  onBack: () => void;
  onSaveDraft: () => void;
  onContinue: () => void;
  showSaveDraft: boolean;
  continueLabel: string;
}) {
  return (
    <div className="wizard-action-bar">
      <button
        className="button-ghost wizard-action-back"
        disabled={
          currentStep ===
            1 ||
          isSaving
        }
        onClick={
          onBack
        }
        type="button"
      >
        Back
      </button>
      <div className="wizard-action-group">
        {showSaveDraft ? (
          <button
            className="button-secondary"
            disabled={
              isSaving
            }
            onClick={
              onSaveDraft
            }
            type="button"
          >
            {isSaving
              ? "Saving..."
              : "Save draft"}
          </button>
        ) : null}
        <button
          className="button-primary"
          disabled={
            isSaving ||
            isContinueDisabled
          }
          onClick={
            onContinue
          }
          type="button"
        >
          {isSaving
            ? "Working..."
            : continueLabel}
        </button>
      </div>
    </div>
  );
}

export function OnboardingWizard() {
  const router =
    useRouter();
  const supabase =
    useMemo(
      () =>
        createBrowserSupabaseClient(),
      [],
    );
  const {
    access,
    error,
    isLoading,
    refreshAccess,
    session,
  } =
    useAppAccess();
  const [
    currentStep,
    setCurrentStep,
  ] =
    useState<StepNumber>(
      1,
    );
  const [
    didInitializeStep,
    setDidInitializeStep,
  ] =
    useState(
      false,
    );
  const [
    isSaving,
    setIsSaving,
  ] =
    useState(
      false,
    );
  const [
    detailsLoading,
    setDetailsLoading,
  ] =
    useState(
      false,
    );
  const [
    feedback,
    setFeedback,
  ] =
    useState<WizardFeedback | null>(
      null,
    );
  const [
    agencyForm,
    setAgencyForm,
  ] =
    useState<AgencyFormState>(
      buildAgencyFormState(
        null,
      ),
    );
  const [
    businessHours,
    setBusinessHours,
  ] =
    useState<
      BusinessHoursDraft[]
    >(
      buildDefaultHours(),
    );
  const [
    existingUnits,
    setExistingUnits,
  ] =
    useState<
      ManagedUnitRow[]
    >(
      [],
    );
  const [
    unitDrafts,
    setUnitDrafts,
  ] =
    useState<
      UnitDraftRow[]
    >(
      [],
    );
  const [
    manualUnit,
    setManualUnit,
  ] =
    useState<UnitFormState>(
      buildBlankUnitForm(),
    );
  const [
    catalogDocuments,
    setCatalogDocuments,
  ] =
    useState<
      ServiceCatalogDocumentRow[]
    >(
      [],
    );
  const [
    selectedCatalogFile,
    setSelectedCatalogFile,
  ] =
    useState<File | null>(
      null,
    );
  const [
    catalogUploadState,
    setCatalogUploadState,
  ] =
    useState<CatalogUploadState>(
      "idle",
    );

  const agency =
    access?.agency ??
    null;
  const agencyId =
    access?.agencyId ??
    null;
  const recommendedStep =
    getRecommendedStep(
      access,
    );
  const maxAvailableStep =
    getMaxAvailableStep(
      access,
    );
  const existingUnitKeys =
    useMemo(
      () =>
        new Set(
          existingUnits.map(
            (
              unit,
            ) =>
              `${unit.normalized_property_key}::${unit.unit_number.trim().toLowerCase()}`,
          ),
        ),
      [
        existingUnits,
      ],
    );
  const validDraftUnits =
    useMemo(
      () =>
        unitDrafts.filter(
          (
            row,
          ) =>
            row.isValid,
        ),
      [
        unitDrafts,
      ],
    );
  const invalidDraftUnits =
    useMemo(
      () =>
        unitDrafts.filter(
          (
            row,
          ) =>
            !row.isValid,
        ),
      [
        unitDrafts,
      ],
    );
  const latestDocument =
    catalogDocuments[0] ??
    null;
  const catalogState =
    buildCatalogStatusCopy(
      latestDocument?.ingestion_status ??
        null,
    );
  const provisioningState =
    buildProvisioningCopy(
      agency,
    );

  async function callAuthedRoute<
    TResponse,
  >(
    path: string,
    init?: RequestInit,
  ): Promise<TResponse> {
    const accessToken =
      session?.access_token;

    if (
      !accessToken
    ) {
      throw new Error(
        "We couldn't verify your session. Sign in again and retry.",
      );
    }

    const response =
      await fetch(
        path,
        {
          ...init,
          headers:
            {
              "Content-Type":
                "application/json",
              Authorization: `Bearer ${accessToken}`,
              ...(init?.headers ??
                {}),
            },
        },
      );

    const payload =
      (await response
        .json()
        .catch(
          () =>
            null,
        )) as
        | (TResponse & {
            error?: string;
          })
        | null;

    if (
      !response.ok
    ) {
      throw new Error(
        payload?.error ??
          "The request could not be completed.",
      );
    }

    return payload as TResponse;
  }

  const loadOnboardingDetails =
    useCallback(async () => {
      if (
        !supabase
      ) {
        return;
      }

      setAgencyForm(
        buildAgencyFormState(
          agency,
        ),
      );

      if (
        !agencyId
      ) {
        setBusinessHours(
          buildDefaultHours(),
        );
        setExistingUnits(
          [],
        );
        setCatalogDocuments(
          [],
        );
        setDetailsLoading(
          false,
        );
        return;
      }

      setDetailsLoading(
        true,
      );

      const [
        hoursResult,
        unitsResult,
        documentsResult,
      ] =
        await Promise.all(
          [
            supabase
              .from(
                "agency_business_hours",
              )
              .select(
                "*",
              )
              .eq(
                "agency_id",
                agencyId,
              )
              .order(
                "weekday",
                {
                  ascending: true,
                },
              ),
            supabase
              .from(
                "managed_units",
              )
              .select(
                "*",
              )
              .eq(
                "agency_id",
                agencyId,
              )
              .order(
                "created_at",
                {
                  ascending: false,
                },
              ),
            supabase
              .from(
                "service_catalog_documents",
              )
              .select(
                "*",
              )
              .eq(
                "agency_id",
                agencyId,
              )
              .order(
                "created_at",
                {
                  ascending: false,
                },
              ),
          ],
        );

      if (
        hoursResult.error ||
        unitsResult.error ||
        documentsResult.error
      ) {
        setFeedback(
          {
            tone: "error",
            message:
              "We couldn't load every onboarding detail. Try refreshing the page.",
          },
        );
        setDetailsLoading(
          false,
        );
        return;
      }

      setBusinessHours(
        mergeBusinessHours(
          hoursResult.data,
        ),
      );
      setExistingUnits(
        unitsResult.data,
      );
      setCatalogDocuments(
        documentsResult.data,
      );
      setDetailsLoading(
        false,
      );
    }, [
      agency,
      agencyId,
      supabase,
    ]);

  useEffect(() => {
    setAgencyForm(
      buildAgencyFormState(
        agency,
      ),
    );
  }, [
    agency,
  ]);

  useEffect(() => {
    void loadOnboardingDetails();
  }, [
    loadOnboardingDetails,
  ]);

  useEffect(() => {
    if (
      !didInitializeStep &&
      !isLoading
    ) {
      setCurrentStep(
        recommendedStep,
      );
      setDidInitializeStep(
        true,
      );
    }
  }, [
    didInitializeStep,
    isLoading,
    recommendedStep,
  ]);

  useEffect(() => {
    if (
      didInitializeStep &&
      currentStep >
        maxAvailableStep
    ) {
      setCurrentStep(
        maxAvailableStep,
      );
    }
  }, [
    currentStep,
    didInitializeStep,
    maxAvailableStep,
  ]);

  useEffect(() => {
    setFeedback(
      null,
    );
  }, [
    currentStep,
  ]);

  useEffect(() => {
    if (
      !selectedCatalogFile &&
      catalogDocuments.length ===
        0
    ) {
      setCatalogUploadState(
        "idle",
      );
      return;
    }

    if (
      selectedCatalogFile
    ) {
      setCatalogUploadState(
        "selected",
      );
    }
  }, [
    catalogDocuments.length,
    selectedCatalogFile,
  ]);

  async function refreshWizardState(
    nextStep?: StepNumber,
  ) {
    await refreshAccess();
    await loadOnboardingDetails();

    if (
      nextStep
    ) {
      setCurrentStep(
        nextStep,
      );
      setDidInitializeStep(
        true,
      );
    }
  }

  async function handleAgencySave(
    advance: boolean,
  ) {
    if (
      !supabase
    ) {
      setFeedback(
        {
          tone: "error",
          message:
            "The setup service is not ready yet.",
        },
      );
      return;
    }

    if (
      !agencyForm.name.trim() ||
      !agencyForm.officeAddress.trim() ||
      !agencyForm.contactNumber.trim()
    ) {
      setFeedback(
        {
          tone: "error",
          message:
            "Add your agency name, office address, contact number, and timezone before continuing.",
        },
      );
      return;
    }

    setIsSaving(
      true,
    );

    if (
      !agencyId ||
      !agency
    ) {
      const accessToken =
        session?.access_token;

      if (
        !accessToken
      ) {
        setFeedback(
          {
            tone: "error",
            message:
              "We couldn't verify your session. Sign in again and retry.",
          },
        );
        setIsSaving(
          false,
        );
        return;
      }

      const response =
        await fetch(
          "/api/bootstrap/agency",
          {
            method:
              "POST",
            headers:
              {
                "Content-Type":
                  "application/json",
                Authorization: `Bearer ${accessToken}`,
              },
            body: JSON.stringify(
              {
                name: agencyForm.name.trim(),
                officeAddress:
                  agencyForm.officeAddress.trim(),
                contactNumber:
                  agencyForm.contactNumber.trim(),
                transferNumber:
                  agencyForm.transferNumber.trim() ||
                  null,
                timezone:
                  agencyForm.timezone,
              },
            ),
          },
        );

      const payload =
        (await response
          .json()
          .catch(
            () =>
              null,
          )) as {
          error?: string;
        } | null;

      if (
        !response.ok
      ) {
        setFeedback(
          {
            tone: "error",
            message:
              payload?.error ??
              "We couldn't create your agency profile right now.",
          },
        );
        setIsSaving(
          false,
        );
        return;
      }

      await refreshWizardState(
        advance
          ? 2
          : 1,
      );
      setFeedback(
        {
          tone: "success",
          message:
            "Your agency profile is saved.",
        },
      );
      setIsSaving(
        false,
      );
      return;
    }

    const {
      error:
        agencyError,
    } =
      await supabase
        .from(
          "agencies",
        )
        .update(
          {
            name: agencyForm.name.trim(),
            office_address:
              agencyForm.officeAddress.trim(),
            contact_number:
              agencyForm.contactNumber.trim(),
            timezone:
              agencyForm.timezone,
            transfer_number:
              agencyForm.transferNumber.trim() ||
              null,
          },
        )
        .eq(
          "id",
          agencyId,
        );

    if (
      agencyError
    ) {
      setFeedback(
        {
          tone: "error",
          message:
            "We couldn't save your agency profile right now.",
        },
      );
      setIsSaving(
        false,
      );
      return;
    }

    await refreshWizardState(
      advance
        ? 2
        : 1,
    );
    setFeedback(
      {
        tone: "success",
        message:
          "Your agency profile is saved.",
      },
    );
    setIsSaving(
      false,
    );
  }

  async function handleBusinessHoursSave(
    advance: boolean,
  ) {
    if (
      !supabase ||
      !agencyId
    ) {
      setFeedback(
        {
          tone: "error",
          message:
            "Save your agency profile first.",
        },
      );
      return;
    }

    const invalidHours =
      businessHours.some(
        (
          day,
        ) =>
          !day.isClosed &&
          (!day.startTimeLocal ||
            !day.endTimeLocal ||
            day.startTimeLocal >=
              day.endTimeLocal),
      );

    if (
      invalidHours
    ) {
      setFeedback(
        {
          tone: "error",
          message:
            "Each open day needs a valid start and end time before you continue.",
        },
      );
      return;
    }

    setIsSaving(
      true,
    );

    const {
      error:
        agencyError,
    } =
      await supabase
        .from(
          "agencies",
        )
        .update(
          {
            transfer_number:
              agencyForm.transferNumber.trim() ||
              null,
          },
        )
        .eq(
          "id",
          agencyId,
        );

    if (
      agencyError
    ) {
      setFeedback(
        {
          tone: "error",
          message:
            "We couldn't save the transfer number right now.",
        },
      );
      setIsSaving(
        false,
      );
      return;
    }

    const rows =
      businessHours.map(
        (
          day,
        ) => ({
          agency_id:
            agencyId,
          weekday:
            day.weekday,
          is_closed:
            day.isClosed,
          start_time_local:
            day.isClosed
              ? null
              : day.startTimeLocal,
          end_time_local:
            day.isClosed
              ? null
              : day.endTimeLocal,
        }),
      );

    const {
      error:
        hoursError,
    } =
      await supabase
        .from(
          "agency_business_hours",
        )
        .upsert(
          rows,
          {
            onConflict:
              "agency_id,weekday",
          },
        );

    if (
      hoursError
    ) {
      setFeedback(
        {
          tone: "error",
          message:
            "We couldn't save your office hours right now.",
        },
      );
      setIsSaving(
        false,
      );
      return;
    }

    await refreshWizardState(
      advance
        ? 3
        : 2,
    );
    setFeedback(
      {
        tone: "success",
        message:
          "Business hours are saved.",
      },
    );
    setIsSaving(
      false,
    );
  }

  async function handleUnitsSave(
    advance: boolean,
  ) {
    if (
      !supabase ||
      !agencyId
    ) {
      setFeedback(
        {
          tone: "error",
          message:
            "Save your agency profile first.",
        },
      );
      return;
    }

    if (
      unitDrafts.length ===
        0 &&
      existingUnits.length ===
        0
    ) {
      setFeedback(
        {
          tone: "error",
          message:
            "Add at least one managed unit by CSV or manual entry before you continue.",
        },
      );
      return;
    }

    if (
      invalidDraftUnits.length >
      0
    ) {
      setFeedback(
        {
          tone: "error",
          message:
            "Fix the staged unit rows that still need attention before importing them.",
        },
      );
      return;
    }

    if (
      validDraftUnits.length ===
      0
    ) {
      if (
        advance
      ) {
        setCurrentStep(
          4,
        );
      }
      setFeedback(
        {
          tone: "success",
          message:
            "Your managed units are already in place.",
        },
      );
      return;
    }

    setIsSaving(
      true,
    );

    const rows =
      validDraftUnits.map(
        (
          unit,
        ) => ({
          agency_id:
            agencyId,
          property_address_line_1:
            unit.propertyAddressLine1,
          property_address_line_2:
            unit.propertyAddressLine2 ||
            null,
          city: unit.city,
          state:
            unit.state,
          postal_code:
            unit.postalCode,
          unit_number:
            unit.unitNumber,
          display_address:
            buildDisplayAddress(
              unit,
            ),
          normalized_property_key:
            normalizePropertyKey(
              unit,
            ),
          is_active: true,
        }),
      );

    const {
      error:
        unitsError,
    } =
      await supabase
        .from(
          "managed_units",
        )
        .insert(
          rows,
        );

    if (
      unitsError
    ) {
      setFeedback(
        {
          tone: "error",
          message:
            "We couldn't import those units right now. Check for duplicates and try again.",
        },
      );
      setIsSaving(
        false,
      );
      return;
    }

    setUnitDrafts(
      [],
    );
    setManualUnit(
      buildBlankUnitForm(),
    );
    await refreshWizardState(
      advance
        ? 4
        : 3,
    );
    setFeedback(
      {
        tone: "success",
        message:
          "Managed units imported successfully.",
      },
    );
    setIsSaving(
      false,
    );
  }

  async function handleCatalogSave(
    advance: boolean,
  ) {
    if (
      !supabase ||
      !agencyId
    ) {
      setFeedback(
        {
          tone: "error",
          message:
            "Save your agency profile first.",
        },
      );
      return;
    }

    if (
      !selectedCatalogFile &&
      catalogDocuments.length ===
        0
    ) {
      setFeedback(
        {
          tone: "error",
          message:
            "Upload a service catalog PDF before you continue.",
        },
      );
      return;
    }

    if (
      !selectedCatalogFile
    ) {
      if (
        !latestDocument
      ) {
        setFeedback(
          {
            tone: "error",
            message:
              "Upload a service catalog PDF before you continue.",
          },
        );
        return;
      }

      if (
        latestDocument.ingestion_status ===
        "ready"
      ) {
        if (
          advance
        ) {
          setCurrentStep(
            5,
          );
        }
        setFeedback(
          {
            tone: "success",
            message:
              "Your service catalog is already searchable.",
          },
        );
        return;
      }

      setIsSaving(
        true,
      );

      try {
        const payload =
          await callAuthedRoute<CatalogProcessResponse>(
            "/api/catalog/process",
            {
              method:
                "POST",
              body: JSON.stringify(
                {
                  documentId:
                    latestDocument.id,
                },
              ),
            },
          );

        await refreshWizardState(
          advance
            ? 5
            : 4,
        );
        setFeedback(
          {
            tone: "success",
            message: `Catalog preparation completed with ${payload.result.chunk_count} searchable sections.`,
          },
        );
      } catch (error) {
        setFeedback(
          {
            tone: "error",
            message:
              error instanceof
              Error
                ? error.message
                : "We couldn't prepare the existing catalog right now.",
          },
        );
      } finally {
        setIsSaving(
          false,
        );
      }

      return;
    }

    if (
      selectedCatalogFile.type &&
      selectedCatalogFile.type !==
        "application/pdf"
    ) {
      setFeedback(
        {
          tone: "error",
          message:
            "Upload a PDF so the catalog can be prepared correctly.",
        },
      );
      return;
    }

    setIsSaving(
      true,
    );
    setCatalogUploadState(
      "uploading",
    );

    const documentId =
      crypto.randomUUID();
    const safeName =
      sanitizeFilename(
        selectedCatalogFile.name,
      );
    const storagePath = `${agencyId}/${documentId}/${safeName}`;

    const {
      error:
        uploadError,
    } =
      await supabase.storage
        .from(
          "service-catalogs",
        )
        .upload(
          storagePath,
          selectedCatalogFile,
          {
            upsert: false,
            contentType:
              selectedCatalogFile.type ||
              "application/pdf",
          },
        );

    if (
      uploadError
    ) {
      setFeedback(
        {
          tone: "error",
          message:
            "We couldn't store the catalog file right now. Try uploading it again.",
        },
      );
      setCatalogUploadState(
        "idle",
      );
      setIsSaving(
        false,
      );
      return;
    }

    const {
      error:
        documentError,
    } =
      await supabase
        .from(
          "service_catalog_documents",
        )
        .insert(
          {
            id: documentId,
            agency_id:
              agencyId,
            storage_bucket:
              "service-catalogs",
            storage_path:
              storagePath,
            original_filename:
              selectedCatalogFile.name,
            mime_type:
              selectedCatalogFile.type ||
              "application/pdf",
            byte_size:
              selectedCatalogFile.size,
            file_hash:
              null,
            ingestion_status:
              "pending",
          },
        );

    if (
      documentError
    ) {
      setFeedback(
        {
          tone: "error",
          message:
            "The file uploaded, but we couldn't register it for search preparation.",
        },
      );
      setCatalogUploadState(
        "stored",
      );
      setIsSaving(
        false,
      );
      return;
    }

    setSelectedCatalogFile(
      null,
    );
    setCatalogUploadState(
      "stored",
    );

    try {
      const payload =
        await callAuthedRoute<CatalogProcessResponse>(
          "/api/catalog/process",
          {
            method:
              "POST",
            body: JSON.stringify(
              {
                documentId,
              },
            ),
          },
        );

      await refreshWizardState(
        advance
          ? 5
          : 4,
      );
      setFeedback(
        {
          tone: "success",
          message: `The catalog PDF is stored and now searchable across ${payload.result.chunk_count} sections.`,
        },
      );
    } catch (error) {
      await refreshWizardState(
        4,
      );
      setFeedback(
        {
          tone: "error",
          message:
            error instanceof
            Error
              ? error.message
              : "The file uploaded, but catalog preparation needs another pass.",
        },
      );
    } finally {
      setIsSaving(
        false,
      );
    }
  }

  async function handleReviewSubmit() {
    if (
      !supabase ||
      !agencyId ||
      !agency
    ) {
      setFeedback(
        {
          tone: "error",
          message:
            "Finish the earlier setup steps before submitting review.",
        },
      );
      return;
    }

    if (
      !access
        ?.checklist
        .hasAgencyProfile ||
      !access
        .checklist
        .hasBusinessHours ||
      !access
        .checklist
        .hasUnits ||
      !access
        .checklist
        .hasCatalog
    ) {
      setFeedback(
        {
          tone: "error",
          message:
            "Finish the profile, hours, units, and catalog steps before submitting review.",
        },
      );
      return;
    }

    if (
      isManualPhoneSetupRequired(
        agency,
      )
    ) {
      setFeedback(
        {
          tone: "error",
          message:
            "Finish assigning the callable number in Vapi before you continue.",
        },
      );
      return;
    }

    if (
      agency.onboarding_status ===
      "ready"
    ) {
      router.replace(
        "/dashboard",
      );
      return;
    }

    if (
      latestDocument?.ingestion_status !==
      "ready"
    ) {
      setFeedback(
        {
          tone: "error",
          message:
            "Finish catalog preparation before you provision the voice line.",
        },
      );
      return;
    }

    setIsSaving(
      true,
    );

    try {
      const payload =
        await callAuthedRoute<ProvisionResponse>(
          "/api/provision",
          {
            method:
              "POST",
          },
        );

      await refreshWizardState(
        5,
      );
      setFeedback(
        {
          tone: "success",
          message: `Voice line assigned at ${payload.result.phone_number}. Opening your dashboard now.`,
        },
      );
      router.replace(
        "/dashboard",
      );
    } catch (error) {
      await refreshWizardState(
        5,
      );
      setFeedback(
        {
          tone: "error",
          message:
            error instanceof
            Error
              ? error.message
              : "We couldn't complete voice-line provisioning right now.",
        },
      );
    } finally {
      setIsSaving(
        false,
      );
    }
  }

  async function handleSaveDraft() {
    if (
      currentStep ===
      1
    ) {
      await handleAgencySave(
        false,
      );
      return;
    }

    if (
      currentStep ===
      2
    ) {
      await handleBusinessHoursSave(
        false,
      );
      return;
    }

    if (
      currentStep ===
      3
    ) {
      await handleUnitsSave(
        false,
      );
      return;
    }

    if (
      currentStep ===
      4
    ) {
      await handleCatalogSave(
        false,
      );
    }
  }

  async function handleContinue() {
    if (
      currentStep ===
      1
    ) {
      await handleAgencySave(
        true,
      );
      return;
    }

    if (
      currentStep ===
      2
    ) {
      await handleBusinessHoursSave(
        true,
      );
      return;
    }

    if (
      currentStep ===
      3
    ) {
      await handleUnitsSave(
        true,
      );
      return;
    }

    if (
      currentStep ===
      4
    ) {
      await handleCatalogSave(
        true,
      );
      return;
    }

    await handleReviewSubmit();
  }

  function handleCsvImport(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event
        .target
        .files?.[0];

    if (
      !file
    ) {
      return;
    }

    void file
      .text()
      .then(
        (
          text,
        ) => {
          const parsedRows =
            parseCsvRows(
              text,
            );

          if (
            parsedRows.length <
            2
          ) {
            setFeedback(
              {
                tone: "error",
                message:
                  "The CSV needs a header row and at least one unit row.",
              },
            );
            return;
          }

          const [
            headerRow,
            ...dataRows
          ] =
            parsedRows;
          const headerMap =
            mapCsvHeaders(
              headerRow,
            );
          const requiredFields: CanonicalUnitField[] =
            [
              "property_address_line_1",
              "city",
              "state",
              "postal_code",
              "unit_number",
            ];

          const missingFields =
            requiredFields.filter(
              (
                field,
              ) =>
                headerMap[
                  field
                ] ===
                undefined,
            );

          if (
            missingFields.length >
            0
          ) {
            setFeedback(
              {
                tone: "error",
                message:
                  "The CSV is missing one or more required columns: property_address_line_1, city, state, postal_code, unit_number.",
              },
            );
            return;
          }

          const stagedKeys =
            new Set<string>();
          const drafts =
            dataRows.map(
              (
                row,
              ) =>
                createUnitDraft(
                  {
                    propertyAddressLine1:
                      row[
                        headerMap.property_address_line_1 ??
                          -1
                      ] ??
                      "",
                    propertyAddressLine2:
                      row[
                        headerMap.property_address_line_2 ??
                          -1
                      ] ??
                      "",
                    city:
                      row[
                        headerMap.city ??
                          -1
                      ] ??
                      "",
                    state:
                      row[
                        headerMap.state ??
                          -1
                      ] ??
                      "",
                    postalCode:
                      row[
                        headerMap.postal_code ??
                          -1
                      ] ??
                      "",
                    unitNumber:
                      row[
                        headerMap.unit_number ??
                          -1
                      ] ??
                      "",
                  },
                  "csv",
                  existingUnitKeys,
                  stagedKeys,
                ),
            );

          setUnitDrafts(
            drafts,
          );
          setFeedback(
            {
              tone: "success",
              message: `Loaded ${drafts.length} staged unit row${drafts.length === 1 ? "" : "s"} for review.`,
            },
          );
        },
      );
  }

  function handleManualUnitStage() {
    const stagedKeys =
      new Set<string>(
        unitDrafts
          .filter(
            (
              draft,
            ) =>
              draft.isValid,
          )
          .map(
            (
              draft,
            ) =>
              `${normalizePropertyKey(draft)}::${draft.unitNumber.toLowerCase()}`,
          ),
      );

    const nextDraft =
      createUnitDraft(
        manualUnit,
        "manual",
        existingUnitKeys,
        stagedKeys,
      );

    setUnitDrafts(
      (
        currentRows,
      ) => [
        nextDraft,
        ...currentRows,
      ],
    );
    setManualUnit(
      buildBlankUnitForm(),
    );
    setFeedback(
      {
        tone: nextDraft.isValid
          ? "success"
          : "error",
        message:
          nextDraft.isValid
            ? "Manual unit staged for import."
            : "The manual unit was staged, but it still needs attention before import.",
      },
    );
  }

  function removeDraftUnit(
    clientId: string,
  ) {
    setUnitDrafts(
      (
        currentRows,
      ) =>
        currentRows.filter(
          (
            row,
          ) =>
            row.clientId !==
            clientId,
        ),
    );
  }

  function renderCurrentStep() {
    if (
      currentStep ===
      1
    ) {
      return (
        <section className="step-card onboarding-step-card">
          <div className="panel-heading">
            <span className="eyebrow">
              Agency
              profile
            </span>
            <h2>
              Set
              the
              office
              identity
              callers
              should
              hear
              first.
            </h2>
          </div>
          <div className="onboarding-form-grid">
            <div className="field-stack">
              <div className="field-group">
                <label htmlFor="agency-name">
                  Agency
                  name
                </label>
                <input
                  id="agency-name"
                  onChange={(
                    event,
                  ) =>
                    setAgencyForm(
                      (
                        current,
                      ) => ({
                        ...current,
                        name: event
                          .target
                          .value,
                      }),
                    )
                  }
                  placeholder="North Harbor Property Management"
                  value={
                    agencyForm.name
                  }
                />
              </div>
              <div className="field-group">
                <label htmlFor="agency-address">
                  Office
                  address
                </label>
                <input
                  id="agency-address"
                  onChange={(
                    event,
                  ) =>
                    setAgencyForm(
                      (
                        current,
                      ) => ({
                        ...current,
                        officeAddress:
                          event
                            .target
                            .value,
                      }),
                    )
                  }
                  placeholder="125 East Main Street, Suite 300"
                  value={
                    agencyForm.officeAddress
                  }
                />
              </div>
              <div className="field-group">
                <label htmlFor="agency-phone">
                  Contact
                  number
                </label>
                <input
                  id="agency-phone"
                  onChange={(
                    event,
                  ) =>
                    setAgencyForm(
                      (
                        current,
                      ) => ({
                        ...current,
                        contactNumber:
                          event
                            .target
                            .value,
                      }),
                    )
                  }
                  placeholder="(555) 014-2020"
                  value={
                    agencyForm.contactNumber
                  }
                />
              </div>
              <div className="field-group">
                <label htmlFor="agency-timezone">
                  Timezone
                </label>
                <select
                  id="agency-timezone"
                  onChange={(
                    event,
                  ) =>
                    setAgencyForm(
                      (
                        current,
                      ) => ({
                        ...current,
                        timezone:
                          event
                            .target
                            .value,
                      }),
                    )
                  }
                  value={
                    agencyForm.timezone
                  }
                >
                  {COMMON_TIMEZONES.map(
                    (
                      timezone,
                    ) => (
                      <option
                        key={
                          timezone
                        }
                        value={
                          timezone
                        }
                      >
                        {
                          timezone
                        }
                      </option>
                    ),
                  )}
                </select>
              </div>
            </div>

            <div className="preview-surface onboarding-preview-card">
              <span className="console-label">
                How
                callers
                will
                hear
                you
              </span>
              <div className="preview-ticket">
                <strong>
                  {agencyForm.name.trim() ||
                    "Your agency name"}
                </strong>
                <span>
                  “Thanks
                  for
                  calling{" "}
                  {agencyForm.name.trim() ||
                    "your agency"}
                  .
                  I
                  can
                  help
                  log
                  maintenance
                  issues,
                  check
                  service
                  guidance,
                  or
                  connect
                  you
                  to
                  the
                  office
                  during
                  open
                  hours.”
                </span>
              </div>
              <div className="preview-line">
                <span className="preview-dot" />
                <span>
                  {agencyForm.contactNumber.trim() ||
                    "Office contact number will appear here."}
                </span>
              </div>
            </div>
          </div>
        </section>
      );
    }

    if (
      currentStep ===
      2
    ) {
      return (
        <section className="step-card onboarding-step-card">
          <div className="panel-heading">
            <span className="eyebrow">
              Business
              hours
              and
              transfer
              setup
            </span>
            <h2>
              Define
              when
              the
              office
              is
              open
              and
              where
              live
              calls
              should
              land.
            </h2>
          </div>
          <div className="field-group">
            <label htmlFor="transfer-number">
              Transfer
              number
            </label>
            <input
              id="transfer-number"
              onChange={(
                event,
              ) =>
                setAgencyForm(
                  (
                    current,
                  ) => ({
                    ...current,
                    transferNumber:
                      event
                        .target
                        .value,
                  }),
                )
              }
              placeholder="(555) 014-3030"
              value={
                agencyForm.transferNumber
              }
            />
          </div>
          <div className="schedule-grid">
            {businessHours.map(
              (
                day,
              ) => (
                <div
                  key={
                    day.weekday
                  }
                  className="schedule-row"
                >
                  <div className="schedule-day">
                    <strong>
                      {getWeekdayLabel(
                        day.weekday,
                      )}
                    </strong>
                  </div>
                  <label className="schedule-toggle">
                    <input
                      checked={
                        !day.isClosed
                      }
                      onChange={(
                        event,
                      ) =>
                        setBusinessHours(
                          (
                            currentHours,
                          ) =>
                            currentHours.map(
                              (
                                entry,
                              ) =>
                                entry.weekday ===
                                day.weekday
                                  ? {
                                      ...entry,
                                      isClosed:
                                        !event
                                          .target
                                          .checked,
                                    }
                                  : entry,
                            ),
                        )
                      }
                      type="checkbox"
                    />
                    <span>
                      {day.isClosed
                        ? "Closed"
                        : "Open"}
                    </span>
                  </label>
                  <input
                    disabled={
                      day.isClosed
                    }
                    onChange={(
                      event,
                    ) =>
                      setBusinessHours(
                        (
                          currentHours,
                        ) =>
                          currentHours.map(
                            (
                              entry,
                            ) =>
                              entry.weekday ===
                              day.weekday
                                ? {
                                    ...entry,
                                    startTimeLocal:
                                      event
                                        .target
                                        .value,
                                  }
                                : entry,
                          ),
                      )
                    }
                    type="time"
                    value={
                      day.startTimeLocal
                    }
                  />
                  <input
                    disabled={
                      day.isClosed
                    }
                    onChange={(
                      event,
                    ) =>
                      setBusinessHours(
                        (
                          currentHours,
                        ) =>
                          currentHours.map(
                            (
                              entry,
                            ) =>
                              entry.weekday ===
                              day.weekday
                                ? {
                                    ...entry,
                                    endTimeLocal:
                                      event
                                        .target
                                        .value,
                                  }
                                : entry,
                          ),
                      )
                    }
                    type="time"
                    value={
                      day.endTimeLocal
                    }
                  />
                </div>
              ),
            )}
          </div>
        </section>
      );
    }

    if (
      currentStep ===
      3
    ) {
      return (
        <section className="step-card onboarding-step-card">
          <div className="panel-heading">
            <span className="eyebrow">
              Managed
              units
              import
            </span>
            <h2>
              Load
              the
              residences
              your
              team
              actively
              supports.
            </h2>
          </div>
          <div className="units-grid">
            <div className="surface-card units-upload-card">
              <strong>
                Upload
                CSV
              </strong>
              <p className="muted-text">
                Accepted
                columns:
                property_address_line_1,
                property_address_line_2,
                city,
                state,
                postal_code,
                unit_number.
              </p>
              <input
                accept=".csv,text/csv"
                onChange={
                  handleCsvImport
                }
                type="file"
              />
            </div>
            <div className="surface-card units-audit-card">
              <strong>
                Import
                audit
              </strong>
              <div className="audit-grid">
                <div className="audit-metric">
                  <span className="console-label">
                    Rows
                    uploaded
                  </span>
                  <strong>
                    {
                      unitDrafts.length
                    }
                  </strong>
                </div>
                <div className="audit-metric">
                  <span className="console-label">
                    Valid
                    rows
                  </span>
                  <strong>
                    {
                      validDraftUnits.length
                    }
                  </strong>
                </div>
                <div className="audit-metric">
                  <span className="console-label">
                    Needs
                    attention
                  </span>
                  <strong>
                    {
                      invalidDraftUnits.length
                    }
                  </strong>
                </div>
              </div>
            </div>
          </div>

          <div className="surface-card manual-unit-card">
            <div className="panel-heading">
              <h2>
                Manual
                add
              </h2>
            </div>
            <div className="units-form-grid">
              <div className="field-group">
                <label htmlFor="unit-address-1">
                  Address
                  line
                  1
                </label>
                <input
                  id="unit-address-1"
                  onChange={(
                    event,
                  ) =>
                    setManualUnit(
                      (
                        current,
                      ) => ({
                        ...current,
                        propertyAddressLine1:
                          event
                            .target
                            .value,
                      }),
                    )
                  }
                  placeholder="401 Lakeview Avenue"
                  value={
                    manualUnit.propertyAddressLine1
                  }
                />
              </div>
              <div className="field-group">
                <label htmlFor="unit-address-2">
                  Address
                  line
                  2
                </label>
                <input
                  id="unit-address-2"
                  onChange={(
                    event,
                  ) =>
                    setManualUnit(
                      (
                        current,
                      ) => ({
                        ...current,
                        propertyAddressLine2:
                          event
                            .target
                            .value,
                      }),
                    )
                  }
                  placeholder="Building B"
                  value={
                    manualUnit.propertyAddressLine2
                  }
                />
              </div>
              <div className="field-group">
                <label htmlFor="unit-city">
                  City
                </label>
                <input
                  id="unit-city"
                  onChange={(
                    event,
                  ) =>
                    setManualUnit(
                      (
                        current,
                      ) => ({
                        ...current,
                        city: event
                          .target
                          .value,
                      }),
                    )
                  }
                  placeholder="Raleigh"
                  value={
                    manualUnit.city
                  }
                />
              </div>
              <div className="field-group">
                <label htmlFor="unit-state">
                  State
                </label>
                <input
                  id="unit-state"
                  onChange={(
                    event,
                  ) =>
                    setManualUnit(
                      (
                        current,
                      ) => ({
                        ...current,
                        state:
                          event
                            .target
                            .value,
                      }),
                    )
                  }
                  placeholder="NC"
                  value={
                    manualUnit.state
                  }
                />
              </div>
              <div className="field-group">
                <label htmlFor="unit-postal">
                  Postal
                  code
                </label>
                <input
                  id="unit-postal"
                  onChange={(
                    event,
                  ) =>
                    setManualUnit(
                      (
                        current,
                      ) => ({
                        ...current,
                        postalCode:
                          event
                            .target
                            .value,
                      }),
                    )
                  }
                  placeholder="27601"
                  value={
                    manualUnit.postalCode
                  }
                />
              </div>
              <div className="field-group">
                <label htmlFor="unit-number">
                  Unit
                  number
                </label>
                <input
                  id="unit-number"
                  onChange={(
                    event,
                  ) =>
                    setManualUnit(
                      (
                        current,
                      ) => ({
                        ...current,
                        unitNumber:
                          event
                            .target
                            .value,
                      }),
                    )
                  }
                  placeholder="3A"
                  value={
                    manualUnit.unitNumber
                  }
                />
              </div>
            </div>
            <button
              className="button-secondary"
              onClick={
                handleManualUnitStage
              }
              type="button"
            >
              Stage
              unit
            </button>
          </div>

          <div className="surface-card staged-units-card">
            <div className="panel-heading">
              <h2>
                Preview
                table
              </h2>
            </div>
            <div className="units-preview-list">
              {unitDrafts.length ===
              0 ? (
                <p className="muted-text">
                  No
                  staged
                  units
                  yet.
                  Upload
                  a
                  CSV
                  or
                  add
                  one
                  manually.
                </p>
              ) : (
                unitDrafts.map(
                  (
                    unit,
                  ) => (
                    <div
                      key={
                        unit.clientId
                      }
                      className={`preview-ticket${unit.isValid ? "" : " preview-ticket-alert"}`}
                    >
                      <strong>
                        {buildDisplayAddress(
                          unit,
                        )}
                      </strong>
                      <span>
                        {unit.source ===
                        "csv"
                          ? "Staged from CSV"
                          : "Staged manually"}
                      </span>
                      {unit
                        .errors
                        .length >
                      0 ? (
                        <ul className="unit-error-list">
                          {unit.errors.map(
                            (
                              errorMessage,
                            ) => (
                              <li
                                key={
                                  errorMessage
                                }
                              >
                                {
                                  errorMessage
                                }
                              </li>
                            ),
                          )}
                        </ul>
                      ) : null}
                      <button
                        className="button-ghost inline-action"
                        onClick={() =>
                          removeDraftUnit(
                            unit.clientId,
                          )
                        }
                        type="button"
                      >
                        Remove
                      </button>
                    </div>
                  ),
                )
              )}
            </div>
          </div>

          <div className="surface-card existing-units-card">
            <strong>
              Existing
              units
              in
              workspace
            </strong>
            <div className="units-preview-list">
              {existingUnits.length ===
              0 ? (
                <p className="muted-text">
                  No
                  units
                  imported
                  yet.
                </p>
              ) : (
                existingUnits
                  .slice(
                    0,
                    6,
                  )
                  .map(
                    (
                      unit,
                    ) => (
                      <div
                        key={
                          unit.id
                        }
                        className="preview-ticket"
                      >
                        <strong>
                          {
                            unit.display_address
                          }
                        </strong>
                        <span>
                          {
                            unit.city
                          }
                          ,{" "}
                          {
                            unit.state
                          }{" "}
                          {
                            unit.postal_code
                          }
                        </span>
                      </div>
                    ),
                  )
              )}
            </div>
          </div>
        </section>
      );
    }

    if (
      currentStep ===
      4
    ) {
      return (
        <section className="step-card onboarding-step-card">
          <div className="panel-heading">
            <span className="eyebrow">
              Service
              catalog
              upload
            </span>
            <h2>
              Store
              the
              service
              guidance
              your
              assistant
              will
              search
              during
              a
              call.
            </h2>
          </div>
          <div className="catalog-grid">
            <div className="surface-card catalog-upload-card">
              <strong>
                Upload
                service
                catalog
                PDF
              </strong>
              <p className="muted-text">
                Store
                the
                PDF
                your
                staff
                uses
                for
                approved
                vendors,
                policies,
                and
                repair
                guidance.
              </p>
              <input
                accept="application/pdf,.pdf"
                onChange={(
                  event,
                ) =>
                  setSelectedCatalogFile(
                    event
                      .target
                      .files?.[0] ??
                      null,
                  )
                }
                type="file"
              />
              {selectedCatalogFile ? (
                <div className="preview-ticket">
                  <strong>
                    {
                      selectedCatalogFile.name
                    }
                  </strong>
                  <span>
                    {Math.round(
                      selectedCatalogFile.size /
                        1024,
                    )}{" "}
                    KB
                    ready
                    to
                    upload
                  </span>
                </div>
              ) : null}
            </div>
            <div className="surface-card catalog-status-card">
              <strong>
                Knowledge
                prep
              </strong>
              <div className="wizard-status-list">
                <div className="wizard-status-item">
                  <span
                    className={`status-pill ${catalogUploadState === "uploading" ? "status-caution" : "status-idle"}`}
                  >
                    {catalogUploadState ===
                    "uploading"
                      ? "Uploading"
                      : catalogUploadState ===
                          "stored"
                        ? "Stored"
                        : catalogUploadState ===
                            "selected"
                          ? "Ready to upload"
                          : "Waiting for file"}
                  </span>
                  <p>
                    {catalogUploadState ===
                    "uploading"
                      ? "The PDF is moving into secure storage now."
                      : catalogUploadState ===
                          "stored"
                        ? "The latest file is stored and tracked in your workspace."
                        : catalogUploadState ===
                            "selected"
                          ? "The selected PDF will be stored when you continue."
                          : "Add a PDF to queue service knowledge for this agency."}
                  </p>
                </div>
                <div className="wizard-status-item">
                  <span
                    className={`status-pill ${catalogState.className}`}
                  >
                    {
                      catalogState.label
                    }
                  </span>
                  <p>
                    {
                      catalogState.message
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="surface-card catalog-history-card">
            <strong>
              Uploaded
              catalog
              files
            </strong>
            <div className="units-preview-list">
              {catalogDocuments.length ===
              0 ? (
                <p className="muted-text">
                  No
                  service
                  catalog
                  is
                  stored
                  yet.
                </p>
              ) : (
                catalogDocuments.map(
                  (
                    document,
                  ) => {
                    const status =
                      buildCatalogStatusCopy(
                        document.ingestion_status,
                      );
                    return (
                      <div
                        key={
                          document.id
                        }
                        className="preview-ticket"
                      >
                        <strong>
                          {
                            document.original_filename
                          }
                        </strong>
                        <span>
                          {document.byte_size
                            ? `${Math.round(document.byte_size / 1024)} KB`
                            : "Stored"}{" "}
                          ·{" "}
                          {new Date(
                            document.created_at,
                          ).toLocaleDateString()}
                        </span>
                        <em>
                          {
                            status.label
                          }
                        </em>
                      </div>
                    );
                  },
                )
              )}
            </div>
          </div>
        </section>
      );
    }

    return (
      <section className="step-card onboarding-step-card">
        <div className="panel-heading">
          <span className="eyebrow">
            Review
            and
            provisioning
          </span>
          <h2>
            Confirm
            the
            setup
            before
            the
            desk
            opens
            beyond
            onboarding.
          </h2>
        </div>
        <div className="review-grid">
          <div className="surface-card review-summary-card">
            <strong>
              Agency
              summary
            </strong>
            <div className="review-list">
              <div className="review-item">
                <span className="console-label">
                  Office
                </span>
                <strong>
                  {agency?.name ??
                    "Not saved yet"}
                </strong>
              </div>
              <div className="review-item">
                <span className="console-label">
                  Contact
                </span>
                <strong>
                  {agency?.contact_number ??
                    "Not saved yet"}
                </strong>
              </div>
              <div className="review-item">
                <span className="console-label">
                  Timezone
                </span>
                <strong>
                  {agency?.timezone ??
                    "Not saved yet"}
                </strong>
              </div>
            </div>
          </div>

          <div className="surface-card review-summary-card">
            <strong>
              Hours
              summary
            </strong>
            <div className="review-list">
              {businessHours.map(
                (
                  day,
                ) => (
                  <div
                    key={
                      day.weekday
                    }
                    className="review-item compact"
                  >
                    <span className="console-label">
                      {getWeekdayLabel(
                        day.weekday,
                      )}
                    </span>
                    <strong>
                      {day.isClosed
                        ? "Closed"
                        : `${day.startTimeLocal} - ${day.endTimeLocal}`}
                    </strong>
                  </div>
                ),
              )}
            </div>
          </div>

          <div className="surface-card review-summary-card">
            <strong>
              Units
              imported
            </strong>
            <div className="review-metric">
              <span className="console-label">
                Managed
                units
              </span>
              <strong>
                {access
                  ?.checklist
                  .unitCount ??
                  0}
              </strong>
            </div>
            <p className="muted-text">
              {access
                ?.checklist
                .unitCount
                ? "Your caller validation set is in place."
                : "Units still need to be imported before setup can be submitted."}
            </p>
          </div>

          <div className="surface-card review-summary-card">
            <strong>
              Catalog
              status
            </strong>
            <span
              className={`status-pill ${catalogState.className}`}
            >
              {
                catalogState.label
              }
            </span>
            <p className="muted-text">
              {
                catalogState.message
              }
            </p>
          </div>

          <div className="surface-card review-summary-card">
            <strong>
              Voice
              line
              status
            </strong>
            <span
              className={`status-pill ${provisioningState.className}`}
            >
              {
                provisioningState.label
              }
            </span>
            <p className="muted-text">
              {
                provisioningState.message
              }
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (
    isLoading ||
    detailsLoading
  ) {
    return (
      <div className="auth-loading">
        Loading
        your
        onboarding
        workspace...
      </div>
    );
  }

  if (
    error
  ) {
    return (
      <div className="auth-loading">
        We
        couldn&apos;t
        load
        onboarding
        right
        now.
      </div>
    );
  }

  const continueLabel =
    currentStep ===
    1
      ? agencyId
        ? "Save and continue"
        : "Create agency"
      : currentStep ===
          2
        ? "Save and continue"
        : currentStep ===
            3
          ? validDraftUnits.length >
            0
            ? "Import and continue"
            : "Continue"
          : currentStep ===
              4
            ? selectedCatalogFile
              ? "Store, prepare, and continue"
              : "Continue"
            : isManualPhoneSetupRequired(
                agency,
              )
              ? "Finish number setup in Vapi"
            : agency?.onboarding_status ===
                "ready"
              ? "Open dashboard"
              : "Provision voice line";

  const isContinueDisabled =
    currentStep ===
      5 &&
    isManualPhoneSetupRequired(
      agency,
    );

  return (
    <div className="page-grid onboarding-page">
      <StepProgress
        currentStep={
          currentStep
        }
        isSaving={
          isSaving
        }
        maxAvailableStep={
          maxAvailableStep
        }
        onSelect={(
          step,
        ) => {
          if (
            !isSaving &&
            step <=
              maxAvailableStep
          ) {
            setCurrentStep(
              step,
            );
          }
        }}
      />

      <div className="onboarding-layout">
        <div className="onboarding-main">
          {feedback ? (
            <p
              className={
                feedback.tone ===
                "error"
                  ? "feedback-error"
                  : "feedback-success"
              }
            >
              {
                feedback.message
              }
            </p>
          ) : null}
          {renderCurrentStep()}
        </div>
        <ContextRail
          step={
            currentStep
          }
        />
      </div>

      <StickyActionBar
        continueLabel={
          continueLabel
        }
        currentStep={
          currentStep
        }
        isContinueDisabled={
          isContinueDisabled
        }
        isSaving={
          isSaving
        }
        onBack={() =>
          setCurrentStep(
            (
              current,
            ) =>
              Math.max(
                1,
                current -
                  1,
              ) as StepNumber,
          )
        }
        onContinue={() => {
          void handleContinue();
        }}
        onSaveDraft={() => {
          void handleSaveDraft();
        }}
        showSaveDraft={
          currentStep <
          5
        }
      />
    </div>
  );
}
