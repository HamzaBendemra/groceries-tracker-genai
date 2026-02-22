"use client";

import { useActionState } from "react";
import {
  addRecipeToGroceriesAction,
  type AddRecipeToGroceriesState,
} from "@/app/(app)/actions";
import { FormPendingButton } from "@/components/forms/form-pending-button";

type AddToGroceriesFormProps = {
  recipeId: string;
  servings: number;
};

export function AddToGroceriesForm({ recipeId, servings }: AddToGroceriesFormProps) {
  const initialState: AddRecipeToGroceriesState = { status: "idle", message: null, eventId: 0 };
  const [state, formAction] = useActionState<AddRecipeToGroceriesState, FormData>(
    addRecipeToGroceriesAction,
    initialState,
  );

  return (
    <>
      <form action={formAction} className="mt-3 grid grid-cols-[1fr_auto] gap-2">
        <input type="hidden" name="recipeId" value={recipeId} />
        <input
          name="targetServings"
          defaultValue={servings}
          inputMode="decimal"
          className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
        />
        <FormPendingButton
          idleLabel="Add to groceries"
          pendingLabel="Adding..."
          className="min-h-11 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
        />
      </form>

      {state.status !== "idle" && state.message ? (
        <div
          key={state.eventId}
          style={{ animation: "toastSlideFade 2400ms ease forwards" }}
          className={`pointer-events-none fixed top-4 right-4 z-50 rounded-xl border px-3 py-2 text-sm shadow-xl ${
            state.status === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {state.message}
        </div>
      ) : null}
    </>
  );
}
