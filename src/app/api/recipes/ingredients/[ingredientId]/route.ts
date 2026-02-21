import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { normalizeIngredientName } from "@/lib/ingredients/normalize";
import { toTitleCase } from "@/lib/ingredients/title-case";
import { normalizeUnit } from "@/lib/ingredients/units";

const updateSchema = z.object({
  recipeId: z.string().uuid(),
  name: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().min(1),
});

const deleteSchema = z.object({
  recipeId: z.string().uuid(),
});

async function getAuthorizedContext() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Unauthorized");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("active_household_id")
    .eq("user_id", user.id)
    .single();

  if (profileError || !profile?.active_household_id) {
    throw new Error("No active household found.");
  }

  return { supabase, householdId: profile.active_household_id };
}

async function ensureRecipeInHousehold(supabase: Awaited<ReturnType<typeof createClient>>, recipeId: string, householdId: string) {
  const { data: recipe, error } = await supabase
    .from("recipes")
    .select("id")
    .eq("id", recipeId)
    .eq("household_id", householdId)
    .single();

  if (error || !recipe) {
    throw new Error("Recipe not found.");
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ ingredientId: string }> },
) {
  try {
    const { ingredientId } = await params;
    const { recipeId, name, quantity, unit } = updateSchema.parse(await request.json());
    const displayName = toTitleCase(name);
    const { supabase, householdId } = await getAuthorizedContext();

    await ensureRecipeInHousehold(supabase, recipeId, householdId);

    const { error } = await supabase
      .from("recipe_ingredients")
      .update({
        name_display: displayName,
        name_normalized: normalizeIngredientName(displayName),
        quantity,
        unit: normalizeUnit(unit),
      })
      .eq("id", ingredientId)
      .eq("recipe_id", recipeId);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update ingredient.";
    const status = message === "Unauthorized" ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ ingredientId: string }> },
) {
  try {
    const { ingredientId } = await params;
    const { recipeId } = deleteSchema.parse(await request.json());
    const { supabase, householdId } = await getAuthorizedContext();

    await ensureRecipeInHousehold(supabase, recipeId, householdId);

    const { error } = await supabase
      .from("recipe_ingredients")
      .delete()
      .eq("id", ingredientId)
      .eq("recipe_id", recipeId);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete ingredient.";
    const status = message === "Unauthorized" ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
