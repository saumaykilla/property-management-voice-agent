import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export type AuthenticatedAgencyContext = {
  agencyId: string;
  authUserId: string;
};

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length);
}

export async function getAuthenticatedAgencyContext(
  request: Request,
): Promise<AuthenticatedAgencyContext | null> {
  const token = getBearerToken(request);

  if (!token) {
    return null;
  }

  const supabase = createAdminSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return null;
  }

  const { data: membership, error: membershipError } = await supabase
    .from("agency_users")
    .select("agency_id")
    .eq("auth_user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (membershipError || !membership?.agency_id) {
    return null;
  }

  return {
    agencyId: membership.agency_id,
    authUserId: user.id,
  };
}
