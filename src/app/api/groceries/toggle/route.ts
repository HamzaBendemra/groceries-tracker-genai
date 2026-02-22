import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  groceryItemId: z.string().uuid(),
  checked: z.boolean(),
});

export async function POST(request: Request) {
  try {
    const { groceryItemId, checked } = schema.parse(await request.json());
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("active_household_id")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile?.active_household_id) {
      return NextResponse.json({ error: "No active household found." }, { status: 400 });
    }

    const { error } = await supabase
      .from("grocery_items")
      .update({ checked })
      .eq("id", groceryItemId)
      .eq("household_id", profile.active_household_id);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to toggle grocery item.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
