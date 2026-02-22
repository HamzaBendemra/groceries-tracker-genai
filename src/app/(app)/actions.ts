"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAppContext } from "@/lib/data/context";
import { normalizeIngredientName } from "@/lib/ingredients/normalize";
import { findMergeTarget } from "@/lib/ingredients/merge";
import { toTitleCase } from "@/lib/ingredients/title-case";
import { normalizeUnit, roundQuantity, convertQuantity } from "@/lib/ingredients/units";
import { createClient } from "@/lib/supabase/server";

const ingredientDraftSchema = z.object({
  nameDisplay: z.string().min(1),
  nameNormalized: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  isOptional: z.boolean().optional(),
  notes: z.string().nullable().optional(),
});

const recipeDraftSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  sourceType: z.enum(["url", "image_meal", "image_recipe_page", "manual"]),
  sourceUrl: z.string().url().nullable().optional(),
  sourceImagePath: z.string().nullable().optional(),
  servings: z.number().positive(),
  dietaryTags: z.array(z.string()),
  confidence: z.number().nullable().optional(),
  ingredients: z.array(ingredientDraftSchema).min(1),
});

type AddItemInput = {
  householdId: string;
  userId: string;
  nameDisplay: string;
  quantity: number;
  unit: string;
  category?: string;
  sourceType?: "baseline" | "recipe";
  sourceId?: string;
  sourceLabel?: string;
  supabaseClient?: Awaited<ReturnType<typeof createClient>>;
};

export type AddRecipeToGroceriesState = {
  status: "idle" | "success" | "error";
  message: string | null;
  eventId: number;
};

const numberFromForm = (value: FormDataEntryValue | null, fallback = 1) => {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

async function ensureRecipeAccess(supabase: Awaited<ReturnType<typeof createClient>>, recipeId: string, householdId: string) {
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

async function mergeGroceryItem(input: AddItemInput) {
  const supabase = input.supabaseClient ?? (await createClient());
  const displayName = toTitleCase(input.nameDisplay);
  const normalizedName = normalizeIngredientName(displayName);
  const normalizedUnit = normalizeUnit(input.unit);

  const { data: existingRows } = await supabase
    .from("grocery_items")
    .select("id,quantity,unit")
    .eq("household_id", input.householdId)
    .eq("name_normalized", normalizedName)
    .eq("checked", false)
    .eq("status", "needed");

  const merge = findMergeTarget(existingRows ?? [], input.quantity, normalizedUnit);

  let groceryItemId = merge.targetId;
  if (groceryItemId) {
    await supabase
      .from("grocery_items")
      .update({ quantity: merge.mergedQuantity, name_display: displayName, unit: merge.mergedUnit })
      .eq("id", groceryItemId);
  } else {
    const { data: inserted, error } = await supabase
      .from("grocery_items")
      .insert({
        household_id: input.householdId,
        created_by: input.userId,
        name_display: displayName,
        name_normalized: normalizedName,
        quantity: roundQuantity(input.quantity),
        unit: normalizedUnit,
        category: input.category ?? "general",
        status: "needed",
      })
      .select("id")
      .single();

    if (error || !inserted) {
      throw new Error(error?.message ?? "Failed to create grocery item.");
    }

    groceryItemId = inserted.id;
  }

  if (input.sourceType && input.sourceId && input.sourceLabel) {
    const contributionInItemUnit =
      merge.targetId && existingRows
        ? convertQuantity(input.quantity, normalizedUnit, (existingRows.find((row) => row.id === merge.targetId)?.unit as string) ?? normalizedUnit) ??
          input.quantity
        : input.quantity;

    const { data: existingSource } = await supabase
      .from("grocery_item_sources")
      .select("id,quantity_contributed")
      .eq("grocery_item_id", groceryItemId)
      .eq("source_type", input.sourceType)
      .eq("source_id", input.sourceId)
      .maybeSingle();

    if (existingSource?.id) {
      await supabase
        .from("grocery_item_sources")
        .update({
          quantity_contributed: roundQuantity((existingSource.quantity_contributed ?? 0) + contributionInItemUnit),
          unit: merge.mergedUnit,
        })
        .eq("id", existingSource.id);
    } else {
      await supabase.from("grocery_item_sources").insert({
        grocery_item_id: groceryItemId,
        source_type: input.sourceType,
        source_id: input.sourceId,
        source_label: input.sourceLabel,
        quantity_contributed: roundQuantity(contributionInItemUnit),
        unit: merge.mergedUnit,
      });
    }
  }
}

export async function addBaselineItemAction(formData: FormData) {
  const context = await getAppContext();
  if (!context) {
    throw new Error("Unauthorized");
  }

  const name = formData.get("name")?.toString().trim();
  if (!name) {
    throw new Error("Item name is required.");
  }

  const quantity = numberFromForm(formData.get("quantity"), 1);
  const unit = normalizeUnit(formData.get("unit")?.toString() ?? "unit");
  const displayName = toTitleCase(name);
  const normalizedName = normalizeIngredientName(displayName);

  const supabase = await createClient();
  const { error } = await supabase.from("baseline_items").upsert(
    {
      household_id: context.activeHousehold.id,
      created_by: context.userId,
      name_display: displayName,
      name_normalized: normalizedName,
      category: "baseline",
      default_quantity: quantity,
      default_unit: unit,
      is_active: true,
    },
    { onConflict: "household_id,name_normalized" },
  );

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/groceries");
}

export async function addBaselineToGroceriesAction(formData: FormData) {
  const context = await getAppContext();
  if (!context) {
    throw new Error("Unauthorized");
  }

  const baselineItemId = formData.get("baselineItemId")?.toString();
  if (!baselineItemId) {
    throw new Error("Baseline item not provided.");
  }

  const supabase = await createClient();
  const { data: baselineItem, error } = await supabase
    .from("baseline_items")
    .select("id,name_display,default_quantity,default_unit,category")
    .eq("id", baselineItemId)
    .eq("household_id", context.activeHousehold.id)
    .single();

  if (error || !baselineItem) {
    throw new Error(error?.message ?? "Unable to load baseline item.");
  }

  await mergeGroceryItem({
    householdId: context.activeHousehold.id,
    userId: context.userId,
    nameDisplay: baselineItem.name_display,
    quantity: baselineItem.default_quantity,
    unit: baselineItem.default_unit,
    category: baselineItem.category,
    sourceType: "baseline",
    sourceId: baselineItem.id,
    sourceLabel: baselineItem.name_display,
    supabaseClient: supabase,
  });

  revalidatePath("/groceries");
}

export async function addManualGroceryItemAction(formData: FormData) {
  const context = await getAppContext();
  if (!context) {
    throw new Error("Unauthorized");
  }

  const name = formData.get("name")?.toString().trim();
  if (!name) {
    throw new Error("Item name is required.");
  }

  const quantity = numberFromForm(formData.get("quantity"), 1);
  const unit = normalizeUnit(formData.get("unit")?.toString() ?? "unit");
  const displayName = toTitleCase(name);

  await mergeGroceryItem({
    householdId: context.activeHousehold.id,
    userId: context.userId,
    nameDisplay: displayName,
    quantity,
    unit,
    category: "general",
  });

  revalidatePath("/groceries");
}

export async function toggleGroceryItemAction(formData: FormData) {
  const context = await getAppContext();
  if (!context) {
    throw new Error("Unauthorized");
  }

  const groceryItemId = formData.get("groceryItemId")?.toString();
  if (!groceryItemId) {
    throw new Error("Missing grocery item id.");
  }

  const checked = formData.get("checked")?.toString() === "true";
  const supabase = await createClient();

  const { error } = await supabase
    .from("grocery_items")
    .update({ checked })
    .eq("id", groceryItemId)
    .eq("household_id", context.activeHousehold.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/groceries");
}

export async function updateGroceryItemAction(formData: FormData) {
  const context = await getAppContext();
  if (!context) {
    throw new Error("Unauthorized");
  }

  const groceryItemId = formData.get("groceryItemId")?.toString();
  const name = formData.get("name")?.toString().trim();
  if (!groceryItemId || !name) {
    throw new Error("Grocery item and name are required.");
  }

  const quantity = numberFromForm(formData.get("quantity"), 1);
  const unit = normalizeUnit(formData.get("unit")?.toString() ?? "unit");
  const displayName = toTitleCase(name);
  const normalizedName = normalizeIngredientName(displayName);

  const supabase = await createClient();
  const { error: updateError } = await supabase
    .from("grocery_items")
    .update({
      name_display: displayName,
      name_normalized: normalizedName,
      quantity,
      unit,
    })
    .eq("id", groceryItemId)
    .eq("household_id", context.activeHousehold.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  const { error: sourceUpdateError } = await supabase
    .from("grocery_item_sources")
    .update({ unit })
    .eq("grocery_item_id", groceryItemId);

  if (sourceUpdateError) {
    throw new Error(sourceUpdateError.message);
  }

  revalidatePath("/groceries");
}

export async function resetGroceriesAction(formData: FormData) {
  const context = await getAppContext();
  if (!context) {
    throw new Error("Unauthorized");
  }

  const mode = formData.get("mode")?.toString() === "baseline" ? "baseline" : "empty";
  const supabase = await createClient();

  const { error: deleteError } = await supabase
    .from("grocery_items")
    .delete()
    .eq("household_id", context.activeHousehold.id);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  if (mode === "baseline") {
    const { data: baselineItems, error: baselineError } = await supabase
      .from("baseline_items")
      .select("id,name_display,default_quantity,default_unit")
      .eq("household_id", context.activeHousehold.id)
      .eq("is_active", true);

    if (baselineError) {
      throw new Error(baselineError.message);
    }

    for (const baselineItem of baselineItems ?? []) {
      await mergeGroceryItem({
        householdId: context.activeHousehold.id,
        userId: context.userId,
        nameDisplay: baselineItem.name_display,
        quantity: baselineItem.default_quantity,
        unit: baselineItem.default_unit,
        category: "baseline",
        sourceType: "baseline",
        sourceId: baselineItem.id,
        sourceLabel: baselineItem.name_display,
        supabaseClient: supabase,
      });
    }
  }

  revalidatePath("/groceries");
}

export async function saveRecipeAction(formData: FormData) {
  const context = await getAppContext();
  if (!context) {
    throw new Error("Unauthorized");
  }

  const payload = formData.get("recipePayload")?.toString();
  if (!payload) {
    throw new Error("Recipe payload is missing.");
  }

  const draft = recipeDraftSchema.parse(JSON.parse(payload));
  const supabase = await createClient();

  const { data: recipeRow, error: recipeError } = await supabase
    .from("recipes")
    .insert({
      household_id: context.activeHousehold.id,
      created_by: context.userId,
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

  const ingredientRows = draft.ingredients.map((ingredient) => {
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
  });

  const { error: ingredientError } = await supabase.from("recipe_ingredients").insert(ingredientRows);
  if (ingredientError) {
    throw new Error(ingredientError.message);
  }

  const { error: logError } = await supabase.from("recipe_import_logs").insert({
    household_id: context.activeHousehold.id,
    created_by: context.userId,
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

  revalidatePath("/recipes");
  return { recipeId: recipeRow.id, title: recipeRow.title };
}

async function addRecipeToGroceriesInternal(formData: FormData) {
  const context = await getAppContext();
  if (!context) {
    throw new Error("Unauthorized");
  }

  const recipeId = formData.get("recipeId")?.toString();
  if (!recipeId) {
    throw new Error("Recipe id is required.");
  }

  const targetServings = numberFromForm(formData.get("targetServings"), 1);
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("add_recipe_to_groceries", {
    input_recipe_id: recipeId,
    input_target_servings: targetServings,
  });

  if (error) {
    throw new Error(error.message);
  }

  const result = (data as { recipe_title?: string; ingredients_count?: number } | null) ?? {};

  revalidatePath("/groceries");

  return {
    recipeTitle: result.recipe_title ?? "Recipe",
    ingredientsCount: result.ingredients_count ?? 0,
  };
}

export async function addRecipeToGroceriesAction(
  _prevState: AddRecipeToGroceriesState,
  formData: FormData,
): Promise<AddRecipeToGroceriesState> {
  try {
    const result = await addRecipeToGroceriesInternal(formData);
    return {
      status: "success",
      message: `Added ${result.ingredientsCount} ingredients from ${result.recipeTitle}.`,
      eventId: Date.now(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to add recipe ingredients.";
    return {
      status: "error",
      message,
      eventId: Date.now(),
    };
  }
}

export async function addRecipeIngredientAction(formData: FormData) {
  const context = await getAppContext();
  if (!context) {
    throw new Error("Unauthorized");
  }

  const recipeId = formData.get("recipeId")?.toString();
  const name = formData.get("name")?.toString().trim();
  if (!recipeId || !name) {
    throw new Error("Recipe and ingredient name are required.");
  }

  const quantity = numberFromForm(formData.get("quantity"), 1);
  const unit = normalizeUnit(formData.get("unit")?.toString() ?? "unit");
  const displayName = toTitleCase(name);
  const supabase = await createClient();

  await ensureRecipeAccess(supabase, recipeId, context.activeHousehold.id);

  const { error } = await supabase.from("recipe_ingredients").insert({
    recipe_id: recipeId,
    name_display: displayName,
    name_normalized: normalizeIngredientName(displayName),
    quantity,
    unit,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/recipes");
}

export async function updateRecipeIngredientAction(formData: FormData) {
  const context = await getAppContext();
  if (!context) {
    throw new Error("Unauthorized");
  }

  const recipeId = formData.get("recipeId")?.toString();
  const ingredientId = formData.get("ingredientId")?.toString();
  const name = formData.get("name")?.toString().trim();
  if (!recipeId || !ingredientId || !name) {
    throw new Error("Recipe, ingredient, and name are required.");
  }

  const quantity = numberFromForm(formData.get("quantity"), 1);
  const unit = normalizeUnit(formData.get("unit")?.toString() ?? "unit");
  const displayName = toTitleCase(name);
  const supabase = await createClient();

  await ensureRecipeAccess(supabase, recipeId, context.activeHousehold.id);

  const { error } = await supabase
    .from("recipe_ingredients")
    .update({
      name_display: displayName,
      name_normalized: normalizeIngredientName(displayName),
      quantity,
      unit,
    })
    .eq("id", ingredientId)
    .eq("recipe_id", recipeId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/recipes");
}

export async function deleteRecipeIngredientAction(formData: FormData) {
  const context = await getAppContext();
  if (!context) {
    throw new Error("Unauthorized");
  }

  const recipeId = formData.get("recipeId")?.toString();
  const ingredientId = formData.get("ingredientId")?.toString();
  if (!recipeId || !ingredientId) {
    throw new Error("Recipe and ingredient are required.");
  }

  const supabase = await createClient();
  await ensureRecipeAccess(supabase, recipeId, context.activeHousehold.id);

  const { error } = await supabase
    .from("recipe_ingredients")
    .delete()
    .eq("id", ingredientId)
    .eq("recipe_id", recipeId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/recipes");
}
