import { roundQuantity } from "@/lib/ingredients/units";

export type AddRecipeToGroceriesResult = {
  recipeTitle: string;
  ingredientsCount: number;
};

type RpcResult = {
  data: { recipe_title?: string; ingredients_count?: number } | null;
  error: { message: string } | null;
};

type RecipeRow = {
  id: string;
  title: string;
  servings: number;
};

type RecipeIngredientRow = {
  name_display: string;
  quantity: number;
  unit: string;
};

type MergeRecipeIngredientInput = {
  nameDisplay: string;
  quantity: number;
  unit: string;
  recipeId: string;
  recipeTitle: string;
};

type AddRecipeToGroceriesParams = {
  targetServings: number;
  runRpc: () => Promise<RpcResult>;
  loadRecipe: () => Promise<{ data: RecipeRow | null; error: { message: string } | null }>;
  loadIngredients: () => Promise<{ data: RecipeIngredientRow[] | null; error: { message: string } | null }>;
  mergeIngredient: (input: MergeRecipeIngredientInput) => Promise<void>;
};

export async function addRecipeToGroceriesWithFallback(
  params: AddRecipeToGroceriesParams,
): Promise<AddRecipeToGroceriesResult> {
  const rpcResult = await params.runRpc();
  if (!rpcResult.error) {
    const result = rpcResult.data ?? {};
    return {
      recipeTitle: result.recipe_title ?? "Recipe",
      ingredientsCount: result.ingredients_count ?? 0,
    };
  }

  const { data: recipe, error: recipeError } = await params.loadRecipe();
  if (recipeError || !recipe) {
    throw new Error(recipeError?.message ?? rpcResult.error.message);
  }

  const { data: ingredients, error: ingredientsError } = await params.loadIngredients();
  if (ingredientsError || !ingredients) {
    throw new Error(ingredientsError?.message ?? rpcResult.error.message);
  }

  const ratio = params.targetServings / recipe.servings;
  for (const ingredient of ingredients) {
    await params.mergeIngredient({
      nameDisplay: ingredient.name_display,
      quantity: roundQuantity(ingredient.quantity * ratio),
      unit: ingredient.unit,
      recipeId: recipe.id,
      recipeTitle: recipe.title,
    });
  }

  return {
    recipeTitle: recipe.title,
    ingredientsCount: ingredients.length,
  };
}
