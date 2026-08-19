"use client";

import { useState, useTransition } from "react";
import { DotsThreeVertical } from "@phosphor-icons/react";
import {
  cancelOrder,
  markUnpaid,
  addDeliveryFee,
  removeDeliveryFee,
} from "@/app/Admin/actions";
import { DELIVERY_FEE_CENTS } from "@/lib/pricing";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuLinkItem,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/menu";

/**
 * Per-row actions on the orders table.
 *
 * Mark paid deliberately stays OUTSIDE this menu. It is the highest-frequency
 * action on the screen — she taps it down a stack while reconciling — and
 * putting a one-tap action two taps deep would cost more than the tidiness is
 * worth. What belongs here is everything occasional or destructive: the menu
 * is where an action goes when opening it should be a decision.
 *
 * Cancel keeps its own confirm step rather than firing straight from the menu.
 * Opening a menu is not consent, and a mis-tap in a dense list is exactly how
 * the wrong order gets cancelled.
 */
/** Which action is waiting on a second step. */
type Confirming = null | "cancel" | "unpay" | "fee";

/** Dollars as typed -> integer cents. Mirrors parseMoneyToCents on the server. */
function centsOf(value: string): number | null {
  const cleaned = value.trim().replace(/^\$/, "").replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Math.round(Number(cleaned) * 100);
}

export function OrderRowMenu({
  orderId,
  orderNumber,
  status,
  paymentStatus,
  fulfillment,
  hasDeliveryFee,
}: {
  orderId: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  fulfillment: string;
  /** delivery_fee_cents > 0 — drives add vs remove. */
  hasDeliveryFee: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState<Confirming>(null);
  const [error, setError] = useState<string | null>(null);
  const [justCancelled, setJustCancelled] = useState(false);
  const [justUnpaid, setJustUnpaid] = useState(false);
  // Pre-filled with the usual $5. She is confirming a number, not composing
  // one — the common case should be two taps and no typing.
  const [feeAmount, setFeeAmount] = useState(
    (DELIVERY_FEE_CENTS / 100).toFixed(2),
  );

  const cancelled = status === "cancelled" || justCancelled;
  const paid = paymentStatus === "paid" && !justUnpaid;

  if (confirming === "fee") {
    const cents = centsOf(feeAmount);
    return (
      <span className="inline-flex items-center gap-1">
        <span className="text-xs text-muted-foreground">$</span>
        <input
          type="text"
          inputMode="decimal"
          value={feeAmount}
          onChange={(e) => setFeeAmount(e.target.value)}
          aria-label="Delivery fee amount"
          autoFocus
          className="h-9 w-16 rounded-md border border-line-mid bg-paper px-2 text-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        />
        <button
          type="button"
          disabled={pending || cents === null}
          onClick={() =>
            startTransition(async () => {
              if (cents === null) return;
              const result = await addDeliveryFee(orderId, cents);
              if (result.error) setError(result.error);
              setConfirming(null);
            })
          }
          className="min-h-9 rounded-md border border-line-mid px-2.5 text-xs font-medium disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {pending ? "Adding…" : "Add"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setConfirming(null)}
          className="min-h-9 px-1.5 text-xs text-muted-foreground underline"
        >
          Cancel
        </button>
      </span>
    );
  }

  if (confirming) {
    const isCancel = confirming === "cancel";
    return (
      <span className="inline-flex items-center gap-1.5">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = isCancel
                ? await cancelOrder(orderId)
                : await markUnpaid(orderId);
              if (result.error) setError(result.error);
              else if (isCancel) setJustCancelled(true);
              else setJustUnpaid(true);
              setConfirming(null);
            })
          }
          className="min-h-9 rounded-md bg-crit-tint px-2.5 text-xs font-bold disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {pending
            ? isCancel
              ? "Cancelling…"
              : "Undoing…"
            : isCancel
              ? `Cancel ${orderNumber}?`
              : "Mark unpaid?"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setConfirming(null)}
          className="min-h-9 px-1.5 text-xs text-muted-foreground underline"
        >
          Keep
        </button>
      </span>
    );
  }

  if (error) {
    return (
      <button
        type="button"
        onClick={() => setError(null)}
        className="text-xs font-medium text-destructive underline"
      >
        {error} — try again
      </button>
    );
  }

  return (
    <Menu>
      <MenuTrigger
        className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-paper-2 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        aria-label={`Actions for order ${orderNumber}`}
      >
        <DotsThreeVertical size={18} weight="bold" aria-hidden="true" />
      </MenuTrigger>
      <MenuContent>
        <MenuLinkItem href={`/Admin/Orders/${orderId}`}>
          View order details
        </MenuLinkItem>

        {/* Moved off the runsheet: deciding to charge for delivery is desk
            work, not something done at a doorstep with an armful of boxes.
            Delivery orders only — there is nothing to charge on a pickup. */}
        {!cancelled && fulfillment === "delivery" && (
          <MenuItem
            disabled={pending}
            onClick={() => {
              // Removing needs no amount — there is only one fee line to take
              // off. Adding opens the amount prompt.
              if (hasDeliveryFee) {
                startTransition(async () => {
                  const result = await removeDeliveryFee(orderId);
                  if (result.error) setError(result.error);
                });
              } else {
                setConfirming("fee");
              }
            }}
          >
            {hasDeliveryFee ? "Remove delivery fee" : "Add delivery fee…"}
          </MenuItem>
        )}

        {/* Only offered on an order that IS paid, so the menu never presents an
            action with nothing to undo. Voids the payment rather than deleting
            it — see markUnpaid(). */}
        {paid && (
          <MenuItem onClick={() => setConfirming("unpay")}>
            Mark unpaid
          </MenuItem>
        )}

        {!cancelled && (
          <>
            <MenuSeparator />
            <MenuItem
              onClick={() => setConfirming("cancel")}
              className="text-destructive"
            >
              Cancel order
            </MenuItem>
          </>
        )}
      </MenuContent>
    </Menu>
  );
}
