import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

type AgencyRow = Database["public"]["Tables"]["agencies"]["Row"];

export type OnboardingChecklist = {
  hasAgencyProfile: boolean;
  hasBusinessHours: boolean;
  hasUnits: boolean;
  hasCatalog: boolean;
  hasReviewSubmission: boolean;
  isVoiceReady: boolean;
  hoursCount: number;
  unitCount: number;
  catalogCount: number;
  isComplete: boolean;
};

export type UserAgencyAccess = {
  agencyId: string | null;
  agency: AgencyRow | null;
  hasMembership: boolean;
  onboardingLocked: boolean;
  checklist: OnboardingChecklist;
};

function buildChecklist(values?: Partial<OnboardingChecklist>): OnboardingChecklist {
  return {
    hasAgencyProfile: false,
    hasBusinessHours: false,
    hasUnits: false,
    hasCatalog: false,
    hasReviewSubmission: false,
    isVoiceReady: false,
    hoursCount: 0,
    unitCount: 0,
    catalogCount: 0,
    isComplete: false,
    ...values,
  };
}

function buildEmptyAccess(): UserAgencyAccess {
  return {
    agencyId: null,
    agency: null,
    hasMembership: false,
    onboardingLocked: true,
    checklist: buildChecklist(),
  };
}

export async function fetchUserAgencyAccess(
  supabase: SupabaseClient<Database>,
): Promise<UserAgencyAccess> {
  const membershipResult = await supabase
    .from("agency_users")
    .select("agency_id")
    .limit(1)
    .maybeSingle();

  if (membershipResult.error) {
    throw membershipResult.error;
  }

  const agencyId = membershipResult.data?.agency_id;

  if (!agencyId) {
    return buildEmptyAccess();
  }

  const [agencyResult, hoursResult, unitsResult, catalogResult, readyCatalogResult] = await Promise.all([
    supabase.from("agencies").select("*").eq("id", agencyId).maybeSingle(),
    supabase
      .from("agency_business_hours")
      .select("id", { count: "exact", head: true })
      .eq("agency_id", agencyId),
    supabase.from("managed_units").select("id", { count: "exact", head: true }).eq("agency_id", agencyId),
    supabase
      .from("service_catalog_documents")
      .select("id", { count: "exact", head: true })
      .eq("agency_id", agencyId),
    supabase
      .from("service_catalog_documents")
      .select("id", { count: "exact", head: true })
      .eq("agency_id", agencyId)
      .eq("ingestion_status", "ready"),
  ]);

  if (agencyResult.error) {
    throw agencyResult.error;
  }

  if (hoursResult.error) {
    throw hoursResult.error;
  }

  if (unitsResult.error) {
    throw unitsResult.error;
  }

  if (catalogResult.error) {
    throw catalogResult.error;
  }

  if (readyCatalogResult.error) {
    throw readyCatalogResult.error;
  }

  const agency = agencyResult.data;
  const hoursCount = hoursResult.count ?? 0;
  const unitCount = unitsResult.count ?? 0;
  const catalogCount = catalogResult.count ?? 0;
  const readyCatalogCount = readyCatalogResult.count ?? 0;

  const hasAgencyProfile = Boolean(
    agency &&
      agency.name.trim().length > 0 &&
      agency.office_address.trim().length > 0 &&
      agency.contact_number.trim().length > 0 &&
      agency.timezone.trim().length > 0,
  );
  const hasBusinessHours = hoursCount >= 7;
  const hasUnits = unitCount > 0;
  const hasCatalog = readyCatalogCount > 0;
  const hasReviewSubmission = Boolean(agency && agency.onboarding_status !== "draft");
  const isVoiceReady = agency?.onboarding_status === "ready";
  const isComplete = hasAgencyProfile && hasBusinessHours && hasUnits && hasCatalog && isVoiceReady;

  return {
    agencyId,
    agency,
    hasMembership: true,
    onboardingLocked: !isComplete,
    checklist: buildChecklist({
      hasAgencyProfile,
      hasBusinessHours,
      hasUnits,
      hasCatalog,
      hasReviewSubmission,
      isVoiceReady,
      hoursCount,
      unitCount,
      catalogCount,
      isComplete,
    }),
  };
}
