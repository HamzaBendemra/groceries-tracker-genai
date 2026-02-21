export type MemberRole = "owner" | "member" | "helper";
export type RecipeSourceType = "url" | "image_meal" | "image_recipe_page" | "manual";
export type GroceryStatus = "needed" | "have";

export type IngredientDraft = {
  nameDisplay: string;
  nameNormalized: string;
  quantity: number;
  unit: string;
  isOptional?: boolean;
  notes?: string | null;
};

export type RecipeDraft = {
  title: string;
  description?: string | null;
  sourceType: RecipeSourceType;
  sourceUrl?: string | null;
  sourceImagePath?: string | null;
  servings: number;
  dietaryTags: string[];
  ingredients: IngredientDraft[];
  confidence?: number | null;
};

export type GroceryItem = {
  id: string;
  household_id: string;
  name_display: string;
  name_normalized: string;
  quantity: number;
  unit: string;
  category: string;
  status: GroceryStatus;
  checked: boolean;
  created_at: string;
  notes: string | null;
};

export type GroceryItemSource = {
  source_type: "baseline" | "recipe";
  source_id: string;
  source_label: string;
};

export type GroceryItemWithSources = GroceryItem & {
  grocery_item_sources: GroceryItemSource[];
};
