"use client";

import { useActionState } from "react";
import {
  addRecipeToGroceriesAction,
  deleteRecipeAction,
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
      <div className="mt-3 grid grid-cols-[4.5rem_minmax(0,1fr)_minmax(0,1fr)] items-stretch gap-2">
        <form action={formAction} className="contents">
          <input type="hidden" name="recipeId" value={recipeId} />
          <input
            name="targetServings"
            defaultValue={servings}
            inputMode="decimal"
            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
          />
          <FormPendingButton
            idleLabel="Add to groceries"
            pendingLabel="Adding..."
            className="h-11 w-full min-w-0 rounded-xl border border-emerald-400 bg-white px-1.5 py-2 text-[11px] font-medium leading-tight text-emerald-700 transition hover:border-emerald-600 hover:text-emerald-800 disabled:cursor-not-allowed disabled:opacity-70"
          />
        </form>
        <form
          className="min-w-0"
          action={deleteRecipeAction}
          onSubmit={(event) => {
            if (!window.confirm("Delete this recipe? This cannot be undone.")) {
              event.preventDefault();
            }
          }}
        >
          <input type="hidden" name="recipeId" value={recipeId} />
          <FormPendingButton
            idleLabel="Delete recipe"
            pendingLabel="Deleting..."
            className="h-11 w-full min-w-0 rounded-xl border border-red-300 bg-white px-1.5 py-2 text-[11px] font-medium leading-tight text-red-600 transition hover:border-red-500 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-70"
          />
        </form>
      </div>

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
