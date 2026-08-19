"use client";

import { useActionState, useState } from "react";
import { createRestaurantOrder } from "@/app/Admin/actions";
import type { AdminActionState } from "@/app/Admin/actions";
import type { EntryWindow } from "@/components/admin/order-entry-form";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { LIMITS, formatPhoneInput } from "@/lib/validation";
import { formatCents } from "@/lib/pricing";

/**
 * A restaurant order — arbitrary lines at negotiated prices.
 *
 * The box form next door offers a tier and a quantity, because households buy
 * boxes. A restaurant buys "20 lb tomatoes" and "3 cases mixed greens" at a
 * price Scraps quoted on the phone, so the whole middle of this form is a
 * repeating line editor instead.
 *
 * Rows are local state, submitted as three parallel arrays (lineDescription,
 * lineQuantity, linePrice) — the plain-HTML way to post a variable-length list,
 * and it survives a failed submit without a client-side store.
 */

type Line = { key: number; description: string; quantity: number; price: string };

const EMPTY: AdminActionState = {};
const QUANTITIES = Array.from({ length: 20 }, (_, i) => i + 1);

const blankLine = (key: number): Line => ({
  key,
  description: "",
  quantity: 1,
  price: "",
});

/** Mirrors parseMoneyToCents on the server — display only, never the source of truth. */
function centsOf(price: string): number {
  const cleaned = price.trim().replace(/^\$/, "").replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return 0;
  return Math.round(Number(cleaned) * 100);
}

export function RestaurantOrderForm({ windows }: { windows: EntryWindow[] }) {
  const [state, action, pending] = useActionState(createRestaurantOrder, EMPTY);

  const [fulfillment, setFulfillment] = useState("");
  const [phone, setPhone] = useState("");
  const [lines, setLines] = useState<Line[]>([blankLine(0)]);
  const [nextKey, setNextKey] = useState(1);

  const isDelivery = fulfillment === "delivery";
  const available = windows.filter((w) => w.kind === fulfillment);
  const total = lines.reduce((sum, l) => sum + centsOf(l.price) * l.quantity, 0);

  // Remounting on success clears every uncontrolled input, so the next order
  // starts blank rather than holding the last restaurant's address.
  const formKey = state.ok ?? "new";

  function patch(key: number, next: Partial<Line>) {
    setLines((rows) => rows.map((r) => (r.key === key ? { ...r, ...next } : r)));
  }

  function addLine() {
    setLines((rows) => [...rows, blankLine(nextKey)]);
    setNextKey((k) => k + 1);
  }

  function removeLine(key: number) {
    // Never drop to zero rows — an empty editor gives her nothing to type into.
    setLines((rows) => (rows.length === 1 ? rows : rows.filter((r) => r.key !== key)));
  }

  function onPhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    setPhone(next.length < phone.length ? next : formatPhoneInput(next));
  }

  return (
    <form key={formKey} action={action} className="max-w-2xl space-y-4">
      {state.error && (
        <p role="alert" className="rounded-md bg-crit-tint px-3 py-2 text-sm font-medium">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p role="status" className="rounded-md bg-ok-tint px-3 py-2 text-sm font-medium">
          {state.ok} Form cleared for the next one.
        </p>
      )}

      {/* ---- the line editor ---- */}
      <fieldset className="space-y-3 rounded-lg border border-border p-4">
        <legend className="px-1 text-sm font-medium">What they ordered</legend>

        {lines.map((line, i) => (
          <div
            key={line.key}
            className="grid gap-2 sm:grid-cols-[1fr_5rem_7rem_auto] sm:items-end"
          >
            <Field>
              <FieldLabel htmlFor={`d-${line.key}`}>
                {i === 0 ? "Item" : <span className="sr-only">Item</span>}
              </FieldLabel>
              <Input
                id={`d-${line.key}`}
                name="lineDescription"
                type="text"
                required
                maxLength={LIMITS.name}
                placeholder="20 lb tomatoes"
                value={line.description}
                onChange={(e) => patch(line.key, { description: e.target.value })}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor={`q-${line.key}`}>
                {i === 0 ? "Qty" : <span className="sr-only">Quantity</span>}
              </FieldLabel>
              <NativeSelect
                id={`q-${line.key}`}
                name="lineQuantity"
                value={line.quantity}
                onChange={(e) => patch(line.key, { quantity: Number(e.target.value) })}
              >
                {QUANTITIES.map((q) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <Field>
              <FieldLabel htmlFor={`p-${line.key}`}>
                {i === 0 ? "Price each" : <span className="sr-only">Price each</span>}
              </FieldLabel>
              {/* text, not number: a number input lets a stray scroll change the
                  price, and its spinners are useless for money. inputMode gets
                  the numeric keypad on a phone anyway. */}
              <Input
                id={`p-${line.key}`}
                name="linePrice"
                type="text"
                inputMode="decimal"
                required
                placeholder="45.00"
                value={line.price}
                onChange={(e) => patch(line.key, { price: e.target.value })}
              />
            </Field>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => removeLine(line.key)}
              disabled={lines.length === 1}
              aria-label={`Remove line ${i + 1}`}
              className="h-11 sm:h-9"
            >
              Remove
            </Button>
          </div>
        ))}

        <Button type="button" variant="outline" size="sm" onClick={addLine}>
          Add another line
        </Button>

        <p className="text-sm text-muted-foreground">
          Quantity caps at 20. For a bigger order put the whole amount in one line
          — “40 lb tomatoes” at the quoted price, quantity 1.
        </p>
      </fieldset>

      <p className="text-sm text-muted-foreground">
        Total{" "}
        <span className="figure text-lg font-bold text-foreground">
          {formatCents(total)}
        </span>
      </p>

      {/* ---- who and where ---- */}
      <Field>
        <FieldLabel htmlFor="custName">Restaurant</FieldLabel>
        <Input
          id="custName"
          name="custName"
          type="text"
          required
          maxLength={LIMITS.name}
          placeholder="Bluebird Bistro"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="custPhone">Phone</FieldLabel>
          <Input
            id="custPhone"
            name="custPhone"
            type="tel"
            maxLength={LIMITS.phone}
            value={phone}
            onChange={onPhoneChange}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="custEmail">Email</FieldLabel>
          <Input id="custEmail" name="custEmail" type="email" maxLength={LIMITS.email} />
        </Field>
      </div>

      <Field>
        <FieldLabel htmlFor="fulfillment">Pickup or delivery</FieldLabel>
        <NativeSelect
          id="fulfillment"
          name="fulfillment"
          value={fulfillment}
          onChange={(e) => setFulfillment(e.target.value)}
          required
        >
          <option value="">Choose…</option>
          <option value="pickup">Pickup</option>
          <option value="delivery">Delivery</option>
        </NativeSelect>
      </Field>

      {fulfillment && (
        <Field>
          <FieldLabel htmlFor="windowId">
            {isDelivery ? "Delivery time" : "Pickup time"}
          </FieldLabel>
          {available.length > 0 ? (
            <NativeSelect id="windowId" name="windowId" required>
              <option value="">Choose…</option>
              {available.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.cycle_title} · {w.label}
                </option>
              ))}
            </NativeSelect>
          ) : (
            <p className="text-sm text-muted-foreground">
              No {isDelivery ? "delivery" : "pickup"} times exist yet. Add one under{" "}
              <span className="font-medium">This week</span>.
            </p>
          )}
        </Field>
      )}

      {isDelivery && (
        <div className="space-y-4 rounded-lg border border-border p-4">
          <Field>
            <FieldLabel htmlFor="streetAddress">Street address</FieldLabel>
            <Input
              id="streetAddress"
              name="streetAddress"
              type="text"
              required
              maxLength={LIMITS.street}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="aptSuite">Suite</FieldLabel>
            <Input id="aptSuite" name="aptSuite" type="text" maxLength={LIMITS.apt} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
            <Field>
              <FieldLabel htmlFor="city">City</FieldLabel>
              <Input id="city" name="city" type="text" required maxLength={LIMITS.city} />
            </Field>
            <Field>
              <FieldLabel htmlFor="state">State</FieldLabel>
              <NativeSelect id="state" name="state" required defaultValue="MO">
                <option value="KS">KS</option>
                <option value="MO">MO</option>
                <option value="OK">OK</option>
                <option value="IA">IA</option>
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="zipCode">ZIP</FieldLabel>
              <Input id="zipCode" name="zipCode" type="text" required maxLength={10} />
            </Field>
          </div>
        </div>
      )}

      <Field>
        <FieldLabel htmlFor="dietaryNotes">Notes</FieldLabel>
        <Textarea
          id="dietaryNotes"
          name="dietaryNotes"
          rows={2}
          maxLength={LIMITS.notes}
          placeholder="Leave at the back door"
        />
      </Field>

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Adding…" : "Add restaurant order"}
      </Button>
    </form>
  );
}
