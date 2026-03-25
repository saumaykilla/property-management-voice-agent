import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { getServiceSupabaseEnvironment } from "@/lib/supabase/env";

export function createAdminSupabaseClient() {
  const { url, serviceRoleKey } = getServiceSupabaseEnvironment();

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

