"use client";

import { useTransition, useState } from "react";
import { DotsThreeVertical } from "@phosphor-icons/react";
import { setOrderStatus, cancelOrder } from "@/app/Admin/actions";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuLinkItem,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/menu";

/**
 * The buttons on a stop.
 *
 * One primary action at a time: an order that is pending offers "Packed", one
 * that is packed offers "Delivered". Showing every state as a row of equal
 * buttons would mean reading four labels to find the one that applies — here
 * the next step is the only large target.
 *
 * Everything that is not that next step sits behind the ⋮ menu, matching the
 * orders table. On a doorstep, one-handed, the destructive action must not be a
 * sibling of the one she is reaching for.
 *
 * The delivery fee used to live here and has moved to the row menu on /Admin.
 * On a doorstep with an armful of boxes the only questions are "is this the
 * right stop" and "is it delivered"; deciding whether to charge for delivery is
 * desk work, and it was competing for space with the action she actually needs.
 */

const NEXT: Record<string, { status: "packed" | "fulfilled"; label: string } | undefined> = {
  pending: { status: "packed", label: "Mark packed" },
  packed: { status: "fulfilled", label: "Mark delivered" },
};

export function StopActions({
  orderId,
  status,
}: {
  orderId: string;
  status: string;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

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

        {/* Cancel moved behind a menu. It used to be a flat button next to the
            primary action, one tap from destroying a stop on a screen used
            one-handed in a van — and it opened a confirm() dialog, which on a
            phone covers the very card being asked about. */}
        {confirming ? (
          <span className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => cancelOrder(orderId))}
              className="flex min-h-11 items-center justify-center rounded-md bg-crit-tint px-3 text-sm font-bold disabled:opacity-60"
            >
              {pending ? "Cancelling…" : "Cancel it?"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirming(false)}
              className="min-h-11 px-2 text-sm text-muted-foreground underline"
            >
              Keep
            </button>
          </span>
        ) : (
          <Menu>
            <MenuTrigger
              className="flex min-h-11 items-center justify-center rounded-md px-3 text-muted-foreground transition-colors hover:bg-paper-2 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              aria-label="More actions for this stop"
            >
              <DotsThreeVertical size={20} weight="bold" aria-hidden="true" />
            </MenuTrigger>
            <MenuContent>
              <MenuLinkItem href={`/Admin/Orders/${orderId}`}>
                View order details
              </MenuLinkItem>
              <MenuSeparator />
              <MenuItem
                onClick={() => setConfirming(true)}
                className="text-destructive"
              >
                Cancel order
              </MenuItem>
            </MenuContent>
          </Menu>
        )}
      </div>

      {message && (
        <p role="alert" className="mt-2 text-sm font-medium text-destructive">
          {message}
        </p>
      )}
    </div>
  );
}