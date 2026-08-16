"use client";

import { useState, useTransition } from "react";
import { markPaid } from "@/app/Admin/actions";
import { formatCents } from "@/lib/pricing";
import { Chip } from "@/components/ui/chip";
import type { Enums } from "@/lib/supabase/database.types";

/**
 * Batch reconciliation.
 *
 * Scraps settles a stack at a desk rather than tapping "paid" at each door, so
 * the shape is: tick several, choose the method once, one submit. Marking ten
 * cash orders should be eleven taps, not thirty.
 *
 * The running total of what is selected sits next to the button because the
 * number she is reconciling against is a dollar figure, not a count.
 */

const METHODS: { value: Enums<"payment_method">; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "check", label: "Check" },
  { value: "venmo", label: "Venmo" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];

export type OwedOrder = {
  id: string;
  order_number: string;
  contact_name: string;
  total_cents: number;
  fulfillment: string;
  status: string;
};

export function BatchPay({ orders }: { orders: OwedOrder[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [method, setMethod] = useState<Enums<"payment_method">>("cash");
  const [message, setMessage] = useState<{ error?: string; ok?: string }>({});
  const [pending, startTransition] = useTransition();

  const allSelected = orders.length > 0 && selected.size === orders.length;
  const selectedTotal = orders
    .filter((o) => selected.has(o.id))
    .reduce((sum, o) => sum + o.total_cents, 0);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function submit() {
    setMessage({});
    startTransition(async () => {
      const result = await markPaid([...selected], method);
      setMessage(result);
      if (result.ok) setSelected(new Set());
    });
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card px-6 py-12 text-center">
        <h2 className="font-display text-xl">Nothing outstanding</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Every order is paid.
        </p>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() =>
          setSelected(allSelected ? new Set() : new Set(orders.map((o) => o.id)))
        }
        className="mb-3 flex min-h-11 items-center rounded-md px-2 text-sm font-medium underline-offset-4 hover:underline"
      >
        {allSelected ? "Clear selection" : `Select all ${orders.length}`}
      </button>

      <ul className="space-y-2">
        {orders.map((o) => {
          const isOn = selected.has(o.id);
          return (
            <li key={o.id}>
              {/* The whole row is the target. A 16px checkbox alone is a miss
                  waiting to happen on a touchscreen. */}
              <label
                className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 transition-colors ${
                  isOn
                    ? "border-primary bg-paper-2"
                    : "border-border bg-card hover:bg-paper-2"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isOn}
                  onChange={() => toggle(o.id)}
                  className="size-5 shrink-0 accent-[var(--primary)]"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {o.contact_name}
                  </span>
                  <span className="block font-mono text-xs text-muted-foreground">
                    {o.order_number}
                  </span>
                </span>
                <Chip status={o.fulfillment === "delivery" ? "delivery" : "pickup"}>
                  {o.fulfillment}
                </Chip>
                <span className="shrink-0 font-bold tabular-nums">
                  {formatCents(o.total_cents)}
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      {message.error && (
        <p role="alert" className="mt-3 text-sm font-medium text-destructive">
          {message.error}
        </p>
      )}
      {message.ok && (
        <p role="status" className="mt-3 text-sm font-medium text-brand-green">
          {message.ok}
        </p>
      )}

      {/* Sticky: with a long list the action must not be a scroll away. */}
      <div className="sticky bottom-0 mt-4 -mx-3 border-t border-border bg-paper/95 px-3 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center gap-3">
          <label className="sr-only" htmlFor="method">
            Payment method
          </label>
          <select
            id="method"
            value={method}
            onChange={(e) =>
              setMethod(e.target.value as Enums<"payment_method">)
            }
            className="h-11 rounded-md border border-line-mid bg-paper px-3"
          >
            {METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>

          <span className="text-sm text-muted-foreground">
            {selected.size} selected ·{" "}
            <span className="font-bold tabular-nums text-foreground">
              {formatCents(selectedTotal)}
            </span>
          </span>

          <button
            type="button"
            disabled={pending || selected.size === 0}
            onClick={submit}
            className="ml-auto flex h-11 min-w-40 items-center justify-center rounded-md bg-primary px-5 font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Mark paid"}
          </button>
        </div>
      </div>
    </div>
  );
}