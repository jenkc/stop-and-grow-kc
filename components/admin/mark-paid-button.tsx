"use client";

import { useState, useTransition } from "react";
import { markOnePaid } from "@/app/Admin/actions";
import { Chip } from "@/components/ui/chip";
import { formatCents } from "@/lib/pricing";
import { cn } from "@/lib/utils";

/**
 * Mark a single order paid, in place.
 *
 * Used on both /Admin (the orders table) and the runsheet, because the moment
 * money changes hands is whichever screen she happens to be looking at.
 *
 * Two taps, not one. The first turns the button into "Paid $25.00?" and the
 * second commits — a confirm() dialog would be easier to write but is a modal
 * on a phone in a van, and it is the same interruption whether she meant it or
 * not. Inline confirmation keeps her thumb in the same place and makes the
 * amount visible at the moment of committing, which is the number that catches
 * a wrong row.
 *
 * One-way by design: payments is append-only. See markOnePaid().
 */
export function MarkPaidButton({
  orderId,
  totalCents,
  paymentStatus,
  className,
}: {
  orderId: string;
  totalCents: number;
  paymentStatus: string;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Optimistic-ish: the row re-renders from the server after revalidation, but
  // this keeps the button from flashing back to "Mark paid" in between.
  const [justPaid, setJustPaid] = useState(false);

  if (paymentStatus === "paid" || justPaid) {
    return <Chip status="paid">Paid</Chip>;
  }

  if (error) {
    return (
      <button
        type="button"
        onClick={() => {
          setError(null);
          setConfirming(false);
        }}
        className="text-xs font-medium text-destructive underline"
      >
        {error} — try again
      </button>
    );
  }

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await markOnePaid(orderId);
              if (result.error) setError(result.error);
              else setJustPaid(true);
            })
          }
          className={cn(
            "min-h-9 rounded-md bg-ok-tint px-2.5 text-xs font-bold",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            "disabled:opacity-60",
          )}
        >
          {pending ? "Saving…" : `Paid ${formatCents(totalCents)}?`}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setConfirming(false)}
          className="min-h-9 px-1.5 text-xs text-muted-foreground underline"
        >
          No
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      // min-h-9 not min-h-11: this sits inside a dense table row, and the
      // confirm step means a mistap costs a tap rather than a payment.
      className={cn(
        "min-h-9 rounded-md border border-line-mid px-2.5 text-xs font-medium",
        "transition-colors hover:bg-paper-2",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        className,
      )}
    >
      Mark paid
    </button>
  );
}
