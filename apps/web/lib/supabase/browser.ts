import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

type BrowserSupabaseClient = ReturnType<typeof createClient<Database>>;

let browserClient: BrowserSupabaseClient | undefined;

function getBrowserSupabaseEnvironment() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return { url, anonKey };
}

export function createBrowserSupabaseClient(): BrowserSupabaseClient | null {
  if (browserClient) {
    return browserClient;
  }

  const environment = getBrowserSupabaseEnvironment();

  if (!environment) {
    return null;
  }

  browserClient = createClient<Database>(environment.url, environment.anonKey);
  return browserClient;
}
