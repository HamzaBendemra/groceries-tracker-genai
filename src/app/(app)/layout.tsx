import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getAppContext } from "@/lib/data/context";
import { AppShell } from "@/components/app/app-shell";

type AppLayoutProps = {
  children: ReactNode;
};

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: AppLayoutProps) {
  const context = await getAppContext();

  if (!context) {
    redirect("/auth");
  }

  return (
    <AppShell displayName={context.displayName} householdName={context.activeHousehold.name}>
      {children}
    </AppShell>
  );
}
