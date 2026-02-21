import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizeIngredientName } from "@/lib/ingredients/normalize";
import { toTitleCase } from "@/lib/ingredients/title-case";
import { createClient } from "@/lib/supabase/server";
import { normalizeUnit } from "@/lib/ingredients/units";

const ingredientSchema = z.object({
  nameDisplay: z.string().min(1),
  nameNormalized: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  isOptional: z.boolean().optional(),
  notes: z.string().nullable().optional(),
});

const recipeSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  sourceType: z.enum(["url", "image_meal", "image_recipe_page", "manual"]),
  sourceUrl: z.string().url().nullable().optional(),
  sourceImagePath: z.string().nullable().optional(),
  servings: z.number().positive(),
  dietaryTags: z.array(z.string()).default([]),
  confidence: z.number().nullable().optional(),
  ingredients: z.array(ingredientSchema).min(1),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("active_household_id")
      .eq("user_id", user.id)
      .single();

    if (!profile?.active_household_id) {
      return NextResponse.json({ error: "No active household found." }, { status: 400 });
    }

    const draft = recipeSchema.parse(await request.json());

    const { data: recipeRow, error: recipeError } = await supabase
      .from("recipes")
      .insert({
        household_id: profile.active_household_id,
        created_by: user.id,
        title: draft.title,
        description: draft.description,
        source_type: draft.sourceType,
        source_url: draft.sourceUrl,
        source_image_path: draft.sourceImagePath,
        servings: draft.servings,
        dietary_tags: draft.dietaryTags,
      })
      .select("id,title")
      .single();

    if (recipeError || !recipeRow) {
      throw new Error(recipeError?.message ?? "Unable to save recipe.");
    }

    const { error: ingredientError } = await supabase.from("recipe_ingredients").insert(
      draft.ingredients.map((ingredient) => {
        const displayName = toTitleCase(ingredient.nameDisplay);
        return {
          recipe_id: recipeRow.id,
          name_display: displayName,
          name_normalized: normalizeIngredientName(displayName),
          quantity: ingredient.quantity,
          unit: normalizeUnit(ingredient.unit),
          is_optional: ingredient.isOptional ?? false,
          notes: ingredient.notes,
        };
      }),
    );

    if (ingredientError) {
      throw new Error(ingredientError.message);
    }

    const { error: logError } = await supabase.from("recipe_import_logs").insert({
      household_id: profile.active_household_id,
      created_by: user.id,
      recipe_id: recipeRow.id,
      source_type: draft.sourceType,
      source_reference: draft.sourceUrl ?? draft.sourceImagePath,
      model_provider: process.env.AI_PROVIDER ?? "openai",
      model_name: process.env.AI_PROVIDER === "anthropic" ? "claude-3-5-sonnet-latest" : "gpt-4.1-mini",
      parsed_output: draft,
      confidence: draft.confidence,
    });

    if (logError) {
      throw new Error(logError.message);
    }

    return NextResponse.json({ recipeId: recipeRow.id, title: recipeRow.title });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save recipe.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
