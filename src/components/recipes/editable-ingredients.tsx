"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { UnitDropdown } from "@/components/forms/unit-dropdown";
import { COOKING_UNITS } from "@/lib/ingredients/cooking-units";
import { toTitleCase } from "@/lib/ingredients/title-case";

type IngredientRow = {
  id: string;
  name_display: string;
  quantity: number;
  unit: string;
};

type EditableIngredientsProps = {
  recipeId: string;
  initialIngredients: IngredientRow[];
};

type SaveStatus = "idle" | "saving" | "saved" | "error";

function toPositiveNumber(value: string, fallback = 1) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function EditableIngredients({ recipeId, initialIngredients }: EditableIngredientsProps) {
  const [ingredients, setIngredients] = useState(initialIngredients);
  const [statuses, setStatuses] = useState<Record<string, SaveStatus>>({});
  const [error, setError] = useState<string | null>(null);
  const timersRef = useRef<Record<string, number>>({});

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      Object.values(timers).forEach((timerId) => window.clearTimeout(timerId));
    };
  }, []);

  const statusLabel = useMemo(() => {
    const values = Object.values(statuses);
    if (values.includes("saving")) {
      return "Saving changes...";
    }

    if (values.includes("error")) {
      return "Some changes failed. Please retry.";
    }

    if (values.includes("saved")) {
      return "All changes saved.";
    }

    return null;
  }, [statuses]);

  const scheduleSave = (ingredient: IngredientRow) => {
    if (ingredient.name_display.trim().length === 0) {
      setStatuses((current) => ({ ...current, [ingredient.id]: "error" }));
      return;
    }

    if (timersRef.current[ingredient.id]) {
      window.clearTimeout(timersRef.current[ingredient.id]);
    }

    setStatuses((current) => ({ ...current, [ingredient.id]: "saving" }));

    timersRef.current[ingredient.id] = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/recipes/ingredients/${ingredient.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipeId,
            name: ingredient.name_display,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
          }),
        });

        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to save ingredient changes.");
        }

        setStatuses((current) => ({ ...current, [ingredient.id]: "saved" }));
      } catch (caughtError) {
        setStatuses((current) => ({ ...current, [ingredient.id]: "error" }));
        setError(caughtError instanceof Error ? caughtError.message : "Unable to save ingredient changes.");
      }
    }, 450);
  };

  const applyIngredientUpdate = (ingredientId: string, patch: Partial<IngredientRow>) => {
    setIngredients((current) => {
      const updated = current.map((ingredient) =>
        ingredient.id === ingredientId ? { ...ingredient, ...patch } : ingredient,
      );
      const nextIngredient = updated.find((ingredient) => ingredient.id === ingredientId);
      if (nextIngredient) {
        scheduleSave(nextIngredient);
      }
      return updated;
    });
  };

  const deleteIngredient = async (ingredientId: string) => {
    if (timersRef.current[ingredientId]) {
      window.clearTimeout(timersRef.current[ingredientId]);
      delete timersRef.current[ingredientId];
    }

    const previous = ingredients;
    setIngredients((current) => current.filter((ingredient) => ingredient.id !== ingredientId));

    try {
      const response = await fetch(`/api/recipes/ingredients/${ingredientId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeId }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to delete ingredient.");
      }
    } catch (caughtError) {
      setIngredients(previous);
      setError(caughtError instanceof Error ? caughtError.message : "Unable to delete ingredient.");
    }
  };

  return (
    <div className="space-y-2">
      {ingredients.map((ingredient) => (
        <div key={ingredient.id} className="rounded-xl border border-slate-200 bg-white p-2">
          <input
            value={ingredient.name_display}
            onChange={(event) =>
              applyIngredientUpdate(ingredient.id, {
                name_display: toTitleCase(event.target.value),
              })
            }
            className="min-h-11 w-full rounded-lg border border-slate-300 bg-[#f2f6ff] px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-slate-500"
            required
          />
          <div className="mt-2 grid grid-cols-[6rem_1fr_auto] gap-2">
            <input
              value={String(ingredient.quantity)}
              inputMode="decimal"
              onChange={(event) =>
                applyIngredientUpdate(ingredient.id, {
                  quantity: toPositiveNumber(event.target.value, ingredient.quantity),
                })
              }
              className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            />
            <UnitDropdown
              value={ingredient.unit}
              onChange={(unit) => applyIngredientUpdate(ingredient.id, { unit })}
              options={COOKING_UNITS}
            />
            <button
              type="button"
              onClick={() => deleteIngredient(ingredient.id)}
              className="min-h-11 rounded-lg border border-rose-300 bg-white px-3 py-2 text-xs font-medium text-rose-700 transition hover:border-rose-400"
            >
              Delete
            </button>
          </div>
        </div>
      ))}

      {statusLabel ? <p className="text-xs text-slate-500">{statusLabel}</p> : null}
      {error ? <p className="text-xs text-rose-700">{error}</p> : null}
    </div>
  );
}
