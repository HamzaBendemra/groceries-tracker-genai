import { redirect } from "next/navigation";
import {
  addBaselineItemAction,
  addBaselineToGroceriesAction,
  addManualGroceryItemAction,
  resetGroceriesAction,
  toggleGroceryItemAction,
  updateGroceryItemAction,
} from "@/app/(app)/actions";
import { UnitDropdown } from "@/components/forms/unit-dropdown";
import { getAppContext } from "@/lib/data/context";
import { COOKING_UNITS } from "@/lib/ingredients/cooking-units";
import { toTitleCase } from "@/lib/ingredients/title-case";
import { createClient } from "@/lib/supabase/server";
import type { GroceryItemWithSources } from "@/lib/data/types";

function formatQuantity(quantity: number) {
  if (Number.isInteger(quantity)) {
    return String(quantity);
  }

  return quantity.toFixed(2).replace(/\.00$/, "").replace(/0$/, "");
}

function summarizeSourceLabels(item: GroceryItemWithSources, sourceType: "recipe" | "baseline") {
  const labels = [
    ...new Set(
      (item.grocery_item_sources ?? [])
        .filter((source) => source.source_type === sourceType)
        .map((source) => source.source_label),
    ),
  ];

  if (labels.length <= 1) {
    return labels[0] ?? null;
  }

  return `${labels[0]} + ${labels.length - 1} more`;
}

export default async function GroceriesPage() {
  const context = await getAppContext();
  if (!context) {
    redirect("/auth");
  }

  const supabase = await createClient();

  const [{ data: groceryItems }, { data: baselineItems }] = await Promise.all([
    supabase
      .from("grocery_items")
      .select(
        "id,household_id,name_display,name_normalized,quantity,unit,category,status,checked,created_at,notes,grocery_item_sources(source_type,source_id,source_label)",
      )
      .eq("household_id", context.activeHousehold.id)
      .order("checked", { ascending: true })
      .order("name_display", { ascending: true }),
    supabase
      .from("baseline_items")
      .select("id,name_display,default_quantity,default_unit,category")
      .eq("household_id", context.activeHousehold.id)
      .eq("is_active", true)
      .order("name_display", { ascending: true }),
  ]);

  const neededItems = (groceryItems ?? []).filter((item) => !item.checked) as GroceryItemWithSources[];
  const doneItems = (groceryItems ?? []).filter((item) => item.checked) as GroceryItemWithSources[];

  return (
    <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
      <section className="space-y-4 rounded-3xl border border-[#d9e7ff] bg-[#f8fbff]/95 p-5 shadow-[0_20px_60px_-45px_rgba(24,40,78,0.45)] backdrop-blur">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Current List</p>
          <h2 className="font-display text-2xl text-slate-900">Groceries to buy</h2>
        </div>

        <details className="rounded-2xl border border-[#dfe8ff] bg-[#eef5ff] p-3">
          <summary className="cursor-pointer text-sm font-medium text-slate-700">Reset groceries list</summary>
          <p className="mt-2 text-xs text-slate-600">Choose what happens after reset:</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <form action={resetGroceriesAction}>
              <input type="hidden" name="mode" value="empty" />
              <button
                type="submit"
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-500 hover:text-slate-900"
              >
                Empty list
              </button>
            </form>
            <form action={resetGroceriesAction}>
              <input type="hidden" name="mode" value="baseline" />
              <button
                type="submit"
                className="min-h-11 w-full rounded-xl bg-slate-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-slate-700"
              >
                Baseline staples only
              </button>
            </form>
          </div>
        </details>

        <form action={addManualGroceryItemAction} className="grid gap-2 rounded-2xl border border-[#dfe8ff] bg-white p-3">
          <input
            name="name"
            placeholder="Add item"
            className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            required
          />
          <div className="grid grid-cols-[7rem_1fr_auto] gap-2">
            <input
              name="quantity"
              defaultValue="1"
              inputMode="decimal"
              className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            />
            <UnitDropdown
              name="unit"
              defaultValue="unit"
              options={COOKING_UNITS}
            />
            <button
              type="submit"
              className="min-h-11 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
            >
              Add
            </button>
          </div>
        </form>

        <div className="space-y-2">
          {neededItems.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500">
              No items pending.
            </p>
          ) : (
            neededItems.map((item) => {
              const displayName = toTitleCase(item.name_display);
              const recipeSource = summarizeSourceLabels(item, "recipe");
              const baselineSource = summarizeSourceLabels(item, "baseline");

              return (
                <article key={item.id} className="rounded-2xl border border-[#dbe7ff] bg-white px-4 py-3 shadow-[0_10px_24px_-20px_rgba(15,23,42,0.4)]">
                  <form action={toggleGroceryItemAction}>
                    <input type="hidden" name="groceryItemId" value={item.id} />
                    <input type="hidden" name="checked" value="true" />
                    <button
                      type="submit"
                      aria-label={`Mark ${displayName} as complete`}
                      className="w-full rounded-xl text-left touch-manipulation"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="h-6 w-6 rounded-full border border-slate-400" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-900">{displayName}</p>
                          <p className="truncate text-xs text-slate-500">
                            {recipeSource ? (
                              <>
                                Recipe: <span className="font-semibold text-slate-700">{recipeSource}</span>
                              </>
                            ) : baselineSource ? (
                              <>Baseline: {baselineSource}</>
                            ) : (
                              "Manual"
                            )}
                          </p>
                        </div>
                        <p className="text-sm font-medium text-slate-700">
                          {formatQuantity(item.quantity)} {item.unit}
                        </p>
                      </div>
                    </button>
                  </form>

                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs font-medium text-slate-600">
                      Edit item
                    </summary>
                    <form action={updateGroceryItemAction} className="mt-2 grid gap-2 rounded-xl border border-[#e2ebff] bg-[#f5f8ff] p-2">
                      <input type="hidden" name="groceryItemId" value={item.id} />
                      <input
                        name="name"
                        defaultValue={displayName}
                        className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                        required
                      />
                      <div className="grid grid-cols-[7rem_1fr_auto] gap-2">
                        <input
                          name="quantity"
                          defaultValue={String(item.quantity)}
                          inputMode="decimal"
                          className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                        />
                        <UnitDropdown name="unit" defaultValue={item.unit} options={COOKING_UNITS} />
                        <button
                          type="submit"
                          className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-500 hover:text-slate-900"
                        >
                          Save
                        </button>
                      </div>
                    </form>
                  </details>
                </article>
              );
            })
          )}
        </div>

        {doneItems.length > 0 ? (
          <div className="space-y-2 pt-3">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Purchased</p>
            {doneItems.map((item) => {
              const displayName = toTitleCase(item.name_display);
              return (
                <form
                  key={item.id}
                  action={toggleGroceryItemAction}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-[#eef7f0] px-4 py-3"
                >
                  <input type="hidden" name="groceryItemId" value={item.id} />
                  <input type="hidden" name="checked" value="false" />
                  <button
                    type="submit"
                    className="flex w-full items-center justify-between gap-3 text-left touch-manipulation"
                    aria-label={`Mark ${displayName} as pending`}
                  >
                    <span className="grid h-5 w-5 place-items-center rounded-full border border-emerald-700 bg-emerald-600 text-[10px] font-bold text-white">
                      ✓
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-slate-500 line-through">{displayName}</p>
                    </div>
                    <p className="text-xs text-slate-500">
                      {formatQuantity(item.quantity)} {item.unit}
                    </p>
                  </button>
                </form>
              );
            })}
          </div>
        ) : null}
      </section>

      <section className="space-y-4 rounded-3xl border border-[#f4dfca] bg-[#fffaf5]/95 p-5 shadow-[0_20px_60px_-45px_rgba(24,40,78,0.45)] backdrop-blur">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Baseline Staples</p>
          <h2 className="font-display text-2xl text-slate-900">Always stocked</h2>
        </div>

        <form action={addBaselineItemAction} className="grid gap-2 rounded-2xl border border-[#f8e5d4] bg-white p-3">
          <input
            name="name"
            placeholder="Milk"
            required
            className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
          />
          <div className="grid grid-cols-[7rem_1fr_auto] gap-2">
            <input
              name="quantity"
              defaultValue="1"
              inputMode="decimal"
              className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            />
            <UnitDropdown
              name="unit"
              defaultValue="unit"
              options={COOKING_UNITS}
            />
            <button
              type="submit"
              className="min-h-11 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
            >
              Save
            </button>
          </div>
        </form>

        <div className="space-y-2">
          {(baselineItems ?? []).length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500">
              Add staples like milk, bread, and eggs.
            </p>
          ) : (
            baselineItems?.map((item) => (
              <form
                key={item.id}
                action={addBaselineToGroceriesAction}
                className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"
              >
                <input type="hidden" name="baselineItemId" value={item.id} />
                <div>
                  <p className="text-sm font-medium text-slate-900">{toTitleCase(item.name_display)}</p>
                  <p className="text-xs text-slate-500">
                    {formatQuantity(item.default_quantity)} {item.default_unit}
                  </p>
                </div>
                <button
                  type="submit"
                  className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-500 hover:text-slate-900"
                >
                  + Add
                </button>
              </form>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
