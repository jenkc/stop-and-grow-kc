"use client";

import { useTransition, useState } from "react";
import {
  setOrderStatus,
  cancelOrder,
  addDeliveryFee,
  removeDeliveryFee,
} from "@/app/Admin/actions";
import { DELIVERY_FEE_CENTS } from "@/lib/pricing";

/**
 * The buttons on a stop.
 *
 * One primary action at a time: an order that is pending offers "Packed", one
 * that is packed offers "Delivered". Showing every state as a row of equal
 * buttons would mean reading four labels to find the one that applies — here
 * the next step is the only large target.
 *
 * The delivery fee lives here because Scraps decides per order whether to
 * charge it, and the moment she decides is when she is looking at the order.
 */

const NEXT: Record<string, { status: "packed" | "fulfilled"; label: string } | undefined> = {
  pending: { status: "packed", label: "Mark packed" },
  packed: { status: "fulfilled", label: "Mark delivered" },
};

export function StopActions({
  orderId,
  status,
  fulfillment,
  hasDeliveryFee,
}: {
  orderId: string;
  status: string;
  fulfillment: string;
  hasDeliveryFee: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const next = NEXT[status];
  const cancelled = status === "cancelled";

  function run(fn: () => Promise<{ error?: string; ok?: string }>) {
    setMessage(null);
    startTransition(async () => {
      const result = await fn();
      if (result.error) setMessage(result.error);
    });
  }

  if (cancelled) {
    return (
      <p className="mt-3 text-sm font-medium text-destructive">Cancelled</p>
    );
  }

  return (
    <div className="mt-3 print:hidden">
      <div className="flex flex-wrap gap-2">
        {next && (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => setOrderStatus(orderId, next.status))}
            className="flex min-h-11 flex-1 items-center justify-center rounded-md bg-primary px-4 font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "Saving…" : next.label}
          </button>
        )}

        {status === "fulfilled" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => setOrderStatus(orderId, "packed"))}
            className="flex min-h-11 items-center justify-center rounded-md border border-line-mid px-4 text-sm transition-colors hover:bg-paper-2 disabled:opacity-60"
          >
            Undo
          </button>
        )}

        {fulfillment === "delivery" && (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              run(() =>
                hasDeliveryFee
                  ? removeDeliveryFee(orderId)
                  : addDeliveryFee(orderId),
              )
            }
            className="flex min-h-11 items-center justify-center rounded-md border border-line-mid px-4 text-sm transition-colors hover:bg-paper-2 disabled:opacity-60"
          >
            {hasDeliveryFee
              ? "Remove delivery fee"
              : `Add $${(DELIVERY_FEE_CENTS / 100).toFixed(2)} delivery`}
          </button>
        )}

        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (confirm("Cancel this order? It stays in the records.")) {
              run(() => cancelOrder(orderId));
            }
          }}
          className="flex min-h-11 items-center justify-center rounded-md px-3 text-sm text-muted-foreground transition-colors hover:text-destructive disabled:opacity-60"
        >
          Cancel
        </button>
      </div>

      {message && (
        <p role="alert" className="mt-2 text-sm font-medium text-destructive">
          {message}
        </p>
      )}
    </div>
  );
}