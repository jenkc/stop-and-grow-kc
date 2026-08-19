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

/**
 * `priceMode` is per line, not per form. One order can mix "$4.50 a pound, 12
 * pounds" with "the whole crate, $50" — that is how the prices actually arrive
 * over the phone, and forcing one convention would make her do arithmetic while
 * someone is talking.
 */
type PriceMode = "each" | "total";

type Line = {
  key: number;
  description: string;
  quantity: number;
  price: string;
  priceMode: PriceMode;
};

const EMPTY: AdminActionState = {};
const QUANTITIES = Array.from({ length: 20 }, (_, i) => i + 1);

const blankLine = (key: number): Line => ({
  key,
  description: "",
  quantity: 1,
  price: "",
  priceMode: "each",
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

  // Mirrors the server: a "total" line contributes what she typed, an "each"
  // line contributes price * quantity.
  const lineTotal = (l: Line) =>
    l.priceMode === "total" ? centsOf(l.price) : centsOf(l.price) * l.quantity;
  const total = lines.reduce((sum, l) => sum + lineTotal(l), 0);

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
          // Each line is its own bordered block: the product name gets a full
          // row, and the numbers sit underneath. Cramming all four into one
          // row left the description too narrow to read back what she typed,
          // which is the field she checks against what the caller just said.
          <div
            key={line.key}
            className="space-y-2 rounded-md border border-border bg-paper-2/40 p-3"
          >
            <div className="flex items-end gap-2">
              <Field className="flex-1">
                <FieldLabel htmlFor={`d-${line.key}`}>Item {i + 1}</FieldLabel>
                <Input
                  id={`d-${line.key}`}
                  name="lineDescription"
                  type="text"
                  required
                  maxLength={LIMITS.name}
                  placeholder="Tomatoes, heirloom"
                  value={line.description}
                  onChange={(e) => patch(line.key, { description: e.target.value })}
                />
              </Field>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => removeLine(line.key)}
                disabled={lines.length === 1}
                aria-label={`Remove item ${i + 1}`}
                className="h-9 shrink-0"
              >
                Remove
              </Button>
            </div>

            <div className="grid gap-2 sm:grid-cols-[5rem_1fr_auto] sm:items-end">
              <Field>
                <FieldLabel htmlFor={`q-${line.key}`}>Qty</FieldLabel>
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
                  {line.priceMode === "total" ? "Total for the line" : "Price each"}
                </FieldLabel>
                {/* text, not number: a number input lets a stray scroll change
                    the price, and its spinners are useless for money. inputMode
                    still gets the numeric keypad on a phone. */}
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

              {/* Submitted per line so the server knows which figure was typed.
                  A select rather than a checkbox: the two options name
                  themselves, where a checkbox would need a label explaining
                  what unticking means. */}
              <Field>
                <FieldLabel htmlFor={`m-${line.key}`}>Price is</FieldLabel>
                <NativeSelect
                  id={`m-${line.key}`}
                  name="linePriceMode"
                  value={line.priceMode}
                  onChange={(e) =>
                    patch(line.key, { priceMode: e.target.value as PriceMode })
                  }
                >
                  <option value="each">Each</option>
                  <option value="total">Line total</option>
                </NativeSelect>
              </Field>
            </div>

            {/* Only worth showing when the two figures differ — on a quantity of
                1, or an empty price, it would just restate the field above. */}
            {line.quantity > 1 && centsOf(line.price) > 0 && (
              <p className="figure text-xs text-muted-foreground">
                {line.priceMode === "total"
                  ? `${formatCents(centsOf(line.price))} total · about ${formatCents(
                      Math.round(centsOf(line.price) / line.quantity),
                    )} each`
                  : `${formatCents(centsOf(line.price))} each · ${formatCents(
                      centsOf(line.price) * line.quantity,
                    )} for ${line.quantity}`}
              </p>
            )}
          </div>
        ))}

        <Button type="button" variant="outline" size="sm" onClick={addLine}>
          Add another line
        </Button>

        <p className="text-sm text-muted-foreground">
          Use <span className="font-medium">Each</span> when you know the per-unit
          price, or <span className="font-medium">Line total</span> when all you
          have is the figure you quoted. Quantity caps at 20 — for more than that,
          put the amount in the item name (“40 lb tomatoes”), set quantity to 1,
          and enter the line total.
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
