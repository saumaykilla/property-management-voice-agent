"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { fetchUserAgencyAccess, type UserAgencyAccess } from "@/lib/app-access";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type AppAccessContextValue = {
  environmentReady: boolean;
  isLoading: boolean;
  session: Session | null;
  access: UserAgencyAccess | null;
  error: string | null;
  refreshAccess: () => Promise<void>;
};

const AppAccessContext = createContext<AppAccessContextValue | null>(null);

export function AppAccessProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const mountedRef = useRef(true);
  const [environmentReady, setEnvironmentReady] = useState(Boolean(supabase));
  const [isLoading, setIsLoading] = useState(Boolean(supabase));
  const [session, setSession] = useState<Session | null>(null);
  const [access, setAccess] = useState<UserAgencyAccess | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshAccess = useCallback(
    async (nextSession?: Session | null) => {
      if (!supabase) {
        if (!mountedRef.current) {
          return;
        }

        setEnvironmentReady(false);
        setSession(null);
        setAccess(null);
        setError(null);
        setIsLoading(false);
        return;
      }

      if (mountedRef.current) {
        setEnvironmentReady(true);
        setIsLoading(true);
      }

      const resolvedSession =
        nextSession ?? (await supabase.auth.getSession()).data.session ?? null;

      if (!mountedRef.current) {
        return;
      }

      setSession(resolvedSession);

      if (!resolvedSession) {
        setAccess(null);
        setError(null);
        setIsLoading(false);
        return;
      }

      try {
        const nextAccess = await fetchUserAgencyAccess(supabase);

        if (!mountedRef.current) {
          return;
        }

        setAccess(nextAccess);
        setError(null);
      } catch (accessError) {
        if (!mountedRef.current) {
          return;
        }

        setAccess(null);
        setError(accessError instanceof Error ? accessError.message : "Unable to load workspace.");
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
    },
    [supabase],
  );

  useEffect(() => {
    mountedRef.current = true;

    if (!supabase) {
      setEnvironmentReady(false);
      setIsLoading(false);
      return () => {
        mountedRef.current = false;
      };
    }

    void refreshAccess();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void refreshAccess(nextSession);
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [refreshAccess, supabase]);

  return (
    <AppAccessContext.Provider
      value={{
        environmentReady,
        isLoading,
        session,
        access,
        error,
        refreshAccess: () => refreshAccess(),
      }}
    >
      {children}
    </AppAccessContext.Provider>
  );
}

export function useAppAccess() {
  const context = useContext(AppAccessContext);

  if (!context) {
    throw new Error("useAppAccess must be used within AppAccessProvider.");
  }

  return context;
}
