import { redirect } from "next/navigation";
import { addRecipeToGroceriesAction } from "@/app/(app)/actions";
import { getAppContext } from "@/lib/data/context";
import { createClient } from "@/lib/supabase/server";
import { RecipeImporter } from "@/components/recipes/recipe-importer";

type RecipeListRow = {
  id: string;
  title: string;
  description: string | null;
  servings: number;
  dietary_tags: string[] | null;
  source_type: string;
  created_at: string;
  recipe_ingredients: Array<{ id: string; name_display: string; quantity: number; unit: string }>;
};

export default async function RecipesPage() {
  const context = await getAppContext();
  if (!context) {
    redirect("/auth");
  }

  const supabase = await createClient();

  const { data: recipesRaw } = await supabase
    .from("recipes")
    .select("id,title,description,servings,dietary_tags,source_type,created_at,recipe_ingredients(id,name_display,quantity,unit)")
    .eq("household_id", context.activeHousehold.id)
    .order("created_at", { ascending: false });

  const recipes = (recipesRaw ?? []) as RecipeListRow[];

  return (
    <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
      <RecipeImporter />

      <section className="space-y-4 rounded-3xl border border-white/40 bg-white/80 p-5 shadow-[0_20px_60px_-45px_rgba(24,40,78,0.45)] backdrop-blur">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Saved Recipes</p>
          <h2 className="font-display text-2xl text-slate-900">Cook and add ingredients</h2>
        </div>

        {(recipes ?? []).length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500">
            No recipes yet. Import from URL or photo.
          </p>
        ) : (
          <div className="space-y-3">
            {recipes?.map((recipe) => (
              <article key={recipe.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{recipe.source_type.replaceAll("_", " ")}</p>
                <h3 className="mt-1 font-display text-xl text-slate-900">{recipe.title}</h3>
                {recipe.description ? <p className="mt-1 text-sm text-slate-600">{recipe.description}</p> : null}

                <div className="mt-3 flex flex-wrap gap-1">
                  {(recipe.dietary_tags ?? []).map((tag: string) => (
                    <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                      {tag}
                    </span>
                  ))}
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-800">
                    {recipe.recipe_ingredients.length} ingredients
                  </span>
                </div>

                <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  Base servings: <span className="font-medium text-slate-800">{recipe.servings}</span>
                </div>

                <form action={addRecipeToGroceriesAction} className="mt-3 grid grid-cols-[1fr_auto] gap-2">
                  <input type="hidden" name="recipeId" value={recipe.id} />
                  <input
                    name="targetServings"
                    defaultValue={recipe.servings}
                    inputMode="decimal"
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
                  >
                    Add to groceries
                  </button>
                </form>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
