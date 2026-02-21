"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { RecipeDraft } from "@/lib/data/types";
import { normalizeIngredientName } from "@/lib/ingredients/normalize";
import { toTitleCase } from "@/lib/ingredients/title-case";

type ImportMode = "url" | "image_meal" | "image_recipe_page";

function toNumber(value: string, fallback = 1) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function RecipeImporter() {
  const router = useRouter();
  const [mode, setMode] = useState<ImportMode>("url");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [draft, setDraft] = useState<RecipeDraft | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const tagInput = useMemo(
    () => (draft?.dietaryTags?.length ? draft.dietaryTags.join(", ") : ""),
    [draft?.dietaryTags],
  );

  const importFromUrl = async () => {
    setIsImporting(true);
    setError(null);
    setStatus(null);

    try {
      const response = await fetch("/api/recipes/extract-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Recipe URL import failed.");
      }

      setDraft(payload.draft as RecipeDraft);
      setStatus("Recipe parsed. Review and save.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Recipe URL import failed.");
    } finally {
      setIsImporting(false);
    }
  };

  const importFromImage = async () => {
    if (!file) {
      setError("Select an image to import.");
      return;
    }

    setIsImporting(true);
    setError(null);
    setStatus(null);

    try {
      const uploadForm = new FormData();
      uploadForm.set("file", file);

      const uploadResponse = await fetch("/api/recipes/upload-image", {
        method: "POST",
        body: uploadForm,
      });

      const uploadPayload = await uploadResponse.json();
      if (!uploadResponse.ok) {
        throw new Error(uploadPayload.error ?? "Image upload failed.");
      }

      const extractResponse = await fetch("/api/recipes/extract-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imagePath: uploadPayload.path,
          mimeType: uploadPayload.mimeType,
          sourceType: mode,
        }),
      });

      const extractPayload = await extractResponse.json();
      if (!extractResponse.ok) {
        throw new Error(extractPayload.error ?? "Image extraction failed.");
      }

      setDraft(extractPayload.draft as RecipeDraft);
      setStatus("Image parsed. Review and save.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Image import failed.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleImport = async () => {
    if (mode === "url") {
      await importFromUrl();
      return;
    }

    await importFromImage();
  };

  const handleSave = async () => {
    if (!draft) {
      return;
    }

    setIsSaving(true);
    setError(null);
    setStatus(null);

    try {
      const response = await fetch("/api/recipes/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Recipe save failed.");
      }

      setStatus(`Saved ${payload.title}.`);
      setDraft(null);
      setUrl("");
      setFile(null);
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Recipe save failed.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 rounded-3xl border border-white/40 bg-white/80 p-5 shadow-[0_20px_60px_-45px_rgba(24,40,78,0.45)] backdrop-blur">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Import Recipe</p>
        <h2 className="font-display text-2xl text-slate-900">From URL or photo</h2>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMode("url")}
          className={`rounded-full px-4 py-2 text-sm ${mode === "url" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}
        >
          URL
        </button>
        <button
          type="button"
          onClick={() => setMode("image_meal")}
          className={`rounded-full px-4 py-2 text-sm ${mode === "image_meal" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}
        >
          Meal Photo
        </button>
        <button
          type="button"
          onClick={() => setMode("image_recipe_page")}
          className={`rounded-full px-4 py-2 text-sm ${mode === "image_recipe_page" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}
        >
          Recipe Page Photo
        </button>
      </div>

      {mode === "url" ? (
        <input
          type="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://example.com/recipe"
          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
        />
      ) : (
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900"
        />
      )}

      <button
        type="button"
        onClick={handleImport}
        disabled={isImporting || (mode === "url" ? url.length === 0 : !file)}
        className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isImporting ? "Importing..." : "Import and parse"}
      </button>

      {draft ? (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="font-display text-xl text-slate-900">Review recipe</h3>

          <input
            value={draft.title}
            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
          />

          <textarea
            value={draft.description ?? ""}
            onChange={(event) => setDraft({ ...draft, description: event.target.value })}
            className="min-h-20 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            placeholder="Description"
          />

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-sm text-slate-700">
              Servings
              <input
                value={draft.servings}
                inputMode="decimal"
                onChange={(event) => setDraft({ ...draft, servings: toNumber(event.target.value, 1) })}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
              />
            </label>
            <label className="text-sm text-slate-700">
              Dietary tags (comma separated)
              <input
                value={tagInput}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    dietaryTags: event.target.value
                      .split(",")
                      .map((entry) => entry.trim().toLowerCase())
                      .filter(Boolean),
                  })
                }
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
              />
            </label>
          </div>

          <div className="space-y-2">
            {draft.ingredients.map((ingredient, index) => (
              <div key={`${ingredient.nameDisplay}-${index}`} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  value={ingredient.nameDisplay}
                  onChange={(event) => {
                    const next = [...draft.ingredients];
                    const displayName = toTitleCase(event.target.value);
                    next[index] = {
                      ...next[index],
                      nameDisplay: displayName,
                      nameNormalized: normalizeIngredientName(displayName),
                    };
                    setDraft({ ...draft, ingredients: next });
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-[#f2f6ff] px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-slate-500"
                />
                <div className="grid grid-cols-[6rem_1fr] gap-2 sm:w-52">
                  <input
                    value={ingredient.quantity}
                    inputMode="decimal"
                    onChange={(event) => {
                      const next = [...draft.ingredients];
                      next[index] = { ...next[index], quantity: toNumber(event.target.value, 1) };
                      setDraft({ ...draft, ingredients: next });
                    }}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                  />
                  <input
                    value={ingredient.unit}
                    onChange={(event) => {
                      const next = [...draft.ingredients];
                      next[index] = { ...next[index], unit: event.target.value };
                      setDraft({ ...draft, ingredients: next });
                    }}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      ingredients: draft.ingredients.filter((_, currentIndex) => currentIndex !== index),
                    })
                  }
                  className="rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-600 transition hover:border-slate-500 hover:text-slate-900 sm:w-20"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() =>
              setDraft({
                ...draft,
                ingredients: [
                  ...draft.ingredients,
                  {
                    nameDisplay: "",
                    nameNormalized: "",
                    quantity: 1,
                    unit: "unit",
                    isOptional: false,
                    notes: null,
                  },
                ],
              })
            }
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 transition hover:border-slate-500 hover:text-slate-900"
          >
            Add ingredient
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Saving..." : "Save recipe"}
          </button>
        </div>
      ) : null}

      {status ? <p className="text-sm text-emerald-700">{status}</p> : null}
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}
