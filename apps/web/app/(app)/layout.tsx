import { AppAccessProvider } from "@/components/app-access-provider";
import { AuthGate } from "@/components/auth-gate";
import { AppShell } from "@/components/app-shell";

export default function ProtectedAppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <AppAccessProvider>
      <AppShell>
        <AuthGate>{children}</AuthGate>
      </AppShell>
    </AppAccessProvider>
  );
}
