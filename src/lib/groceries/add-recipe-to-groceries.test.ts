import { describe, expect, it, vi } from "vitest";
import { addRecipeToGroceriesWithFallback } from "@/lib/groceries/add-recipe-to-groceries";

describe("addRecipeToGroceriesWithFallback", () => {
  it("returns RPC result when RPC succeeds", async () => {
    const runRpc = vi.fn().mockResolvedValue({
      data: { recipe_title: "Tomato Soup", ingredients_count: 4 },
      error: null,
    });

    const loadRecipe = vi.fn();
    const loadIngredients = vi.fn();
    const mergeIngredient = vi.fn();

    const result = await addRecipeToGroceriesWithFallback({
      targetServings: 2,
      runRpc,
      loadRecipe,
      loadIngredients,
      mergeIngredient,
    });

    expect(result).toEqual({ recipeTitle: "Tomato Soup", ingredientsCount: 4 });
    expect(loadRecipe).not.toHaveBeenCalled();
    expect(loadIngredients).not.toHaveBeenCalled();
    expect(mergeIngredient).not.toHaveBeenCalled();
  });

  it("falls back to loading and merging ingredients when RPC fails", async () => {
    const runRpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "rpc failed" },
    });

    const loadRecipe = vi.fn().mockResolvedValue({
      data: { id: "r1", title: "Chicken Curry", servings: 4 },
      error: null,
    });

    const loadIngredients = vi.fn().mockResolvedValue({
      data: [
        { name_display: "Chicken Breast", quantity: 1.5, unit: "kg" },
        { name_display: "Onion", quantity: 2, unit: "unit" },
      ],
      error: null,
    });

    const mergeIngredient = vi.fn().mockResolvedValue(undefined);

    const result = await addRecipeToGroceriesWithFallback({
      targetServings: 2,
      runRpc,
      loadRecipe,
      loadIngredients,
      mergeIngredient,
    });

    expect(result).toEqual({ recipeTitle: "Chicken Curry", ingredientsCount: 2 });
    expect(mergeIngredient).toHaveBeenCalledTimes(2);
    expect(mergeIngredient).toHaveBeenNthCalledWith(1, {
      nameDisplay: "Chicken Breast",
      quantity: 0.75,
      unit: "kg",
      recipeId: "r1",
      recipeTitle: "Chicken Curry",
    });
    expect(mergeIngredient).toHaveBeenNthCalledWith(2, {
      nameDisplay: "Onion",
      quantity: 1,
      unit: "unit",
      recipeId: "r1",
      recipeTitle: "Chicken Curry",
    });
  });

  it("surfaces fallback loader error when recipe cannot be loaded", async () => {
    const runRpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "rpc failed" },
    });

    await expect(
      addRecipeToGroceriesWithFallback({
        targetServings: 2,
        runRpc,
        loadRecipe: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Recipe not found." },
        }),
        loadIngredients: vi.fn(),
        mergeIngredient: vi.fn(),
      }),
    ).rejects.toThrow("Recipe not found.");
  });
});
