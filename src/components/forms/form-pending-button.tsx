"use client";

import { useFormStatus } from "react-dom";

type FormPendingButtonProps = {
  idleLabel: string;
  pendingLabel: string;
  className?: string;
};

export function FormPendingButton({ idleLabel, pendingLabel, className }: FormPendingButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}
