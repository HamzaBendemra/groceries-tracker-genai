import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type HouseholdSummary = {
  id: string;
  name: string;
  role: "owner" | "member" | "helper";
};

export type AppContext = {
  userId: string;
  email: string | null;
  displayName: string;
  activeHousehold: HouseholdSummary;
};

export const getAppContext = cache(async (): Promise<AppContext | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const [{ data: profile }, { data: memberRows, error: memberError }] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name,active_household_id")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("household_members")
      .select("household_id,role,households(name)")
      .eq("user_id", user.id),
  ]);

  if (memberError || !memberRows || memberRows.length === 0) {
    return null;
  }

  const activeHouseholdId = profile?.active_household_id ?? memberRows[0].household_id;
  const currentRow =
    memberRows.find((row) => row.household_id === activeHouseholdId) ?? memberRows[0];

  if (!profile?.active_household_id || profile.active_household_id !== currentRow.household_id) {
    await supabase
      .from("profiles")
      .update({ active_household_id: currentRow.household_id })
      .eq("user_id", user.id);
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    displayName: profile?.display_name ?? user.email?.split("@")[0] ?? "Home",
    activeHousehold: {
      id: currentRow.household_id,
      name: (currentRow.households as { name?: string } | null)?.name ?? "Household",
      role: currentRow.role,
    },
  };
});
