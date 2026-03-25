function getEnvironmentVariable(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getPublicSupabaseEnvironment() {
  return {
    url: getEnvironmentVariable("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: getEnvironmentVariable("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  };
}

export function getServiceSupabaseEnvironment() {
  return {
    url: getEnvironmentVariable("NEXT_PUBLIC_SUPABASE_URL"),
    serviceRoleKey: getEnvironmentVariable("SUPABASE_SERVICE_ROLE_KEY"),
  };
}

