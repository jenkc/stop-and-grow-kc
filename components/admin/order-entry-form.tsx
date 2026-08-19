"use client";

import { useActionState, useState } from "react";
import { createOrder } from "@/app/Admin/actions";
import type { AdminActionState } from "@/app/Admin/actions";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { LIMITS, formatPhoneInput } from "@/lib/validation";
import { formatCents } from "@/lib/pricing";
import { weekdayOf } from "@/lib/window-times";

/**
 * Taking an order over the phone.
 *
 * Field order follows the conversation, not the database: what they want, how
 * they're getting it, where it goes, who they are. Scraps is typing while
 * someone talks, so the form should never make her scroll back up.
 *
 * Unlike the public form there is no contribution framing and no sticky total
 * bar — she is quoting the price out loud, so the running total sits inline
 * where she can read it off.
 */

export type EntryTier = { id: string; name: string; price_cents: number };
export type EntryWindow = {
  id: string;
  kind: "pickup" | "delivery";
  label: string;
  cycle_title: string;
  /** Source of the weekday shown in the picker — the label is free text. */
  starts_at: string;
};

const QUANTITIES = Array.from({ length: 20 }, (_, i) => i + 1);
const EMPTY: AdminActionState = {};

export function OrderEntryForm({
  tiers,
  windows,
}: {
  tiers: EntryTier[];
  windows: EntryWindow[];
}) {
  const [state, action, pending] = useActionState(createOrder, EMPTY);

  const [fulfillment, setFulfillment] = useState("");
  const [boxTierId, setBoxTierId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [phone, setPhone] = useState("");

  const isDelivery = fulfillment === "delivery";
  const tier = tiers.find((t) => t.id === boxTierId);
  const total = (tier?.price_cents ?? 0) * quantity;
  const available = windows.filter((w) => w.kind === fulfillment);

  // Remounting on success clears every uncontrolled input, so the next call
  // starts from a blank form rather than the last customer's address.
  const formKey = state.ok ?? "new";

  function onPhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    setPhone(next.length < phone.length ? next : formatPhoneInput(next));
  }

  return (
    <form key={formKey} action={action} className="max-w-xl space-y-4">
      {state.error && (
        <p
          role="alert"
          className="rounded-md bg-crit-tint px-3 py-2 text-sm font-medium"
        >
          {state.error}
        </p>
      )}
      {state.ok && (
        <p
          role="status"
          className="rounded-md bg-ok-tint px-3 py-2 text-sm font-medium"
        >
          {state.ok} Form cleared for the next one.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="boxTierId">Box</FieldLabel>
          <NativeSelect
            id="boxTierId"
            name="boxTierId"
            value={boxTierId}
            onChange={(e) => setBoxTierId(e.target.value)}
            required
          >
            <option value="">Choose…</option>
            {tiers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} — {formatCents(t.price_cents)}
              </option>
            ))}
          </NativeSelect>
        </Field>

        <Field>
          <FieldLabel htmlFor="quantity">How many</FieldLabel>
          <NativeSelect
            id="quantity"
            name="quantity"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            required
          >
            {QUANTITIES.map((q) => (
              <option key={q} value={q}>
                {q}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>

      <p className="text-sm text-muted-foreground">
        Total{" "}
        <span className="text-lg font-bold tabular-nums text-foreground">
          {formatCents(total)}
        </span>
        {isDelivery && " — add the delivery fee from the runsheet if it applies"}
      </p>

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
                  {w.cycle_title} · {weekdayOf(w.starts_at, "short")} · {w.label}
                </option>
              ))}
            </NativeSelect>
          ) : (
            <p className="text-sm text-muted-foreground">
              No {isDelivery ? "delivery" : "pickup"} times exist yet. Add one
              under <span className="font-medium">This week</span>.
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
            <FieldLabel htmlFor="aptSuite">Apt / suite</FieldLabel>
            <Input id="aptSuite" name="aptSuite" type="text" maxLength={LIMITS.apt} />
          </Field>

          <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
            <Field>
              <FieldLabel htmlFor="city">City</FieldLabel>
              <Input id="city" name="city" type="text" required maxLength={LIMITS.city} />
            </Field>
            <Field>
              <FieldLabel htmlFor="state">State</FieldLabel>
              <NativeSelect id="state" name="state" required>
                <option value="">…</option>
                <option value="KS">KS</option>
                <option value="MO">MO</option>
                <option value="OK">OK</option>
                <option value="IA">IA</option>
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="zipCode">ZIP</FieldLabel>
              <Input
                id="zipCode"
                name="zipCode"
                type="text"
                required
                inputMode="numeric"
                maxLength={10}
                placeholder="64111"
              />
            </Field>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="custName">Name</FieldLabel>
          <Input
            id="custName"
            name="custName"
            type="text"
            required
            maxLength={LIMITS.name}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="custPhone">Phone</FieldLabel>
          <Input
            id="custPhone"
            name="custPhone"
            type="tel"
            value={phone}
            onChange={onPhoneChange}
            maxLength={LIMITS.phone}
            inputMode="tel"
            placeholder="(816) 555-0142"
          />
        </Field>
      </div>

      <Field>
        <FieldLabel htmlFor="custEmail">Email</FieldLabel>
        <Input
          id="custEmail"
          name="custEmail"
          type="email"
          maxLength={LIMITS.email}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="dietaryNotes">Anything they don&rsquo;t eat?</FieldLabel>
        <Textarea
          id="dietaryNotes"
          name="dietaryNotes"
          rows={2}
          maxLength={LIMITS.notes}
          placeholder="No celery or beets"
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="entrySource">How did they hear about us?</FieldLabel>
        <Input
          id="entrySource"
          name="entrySource"
          type="text"
          maxLength={LIMITS.name}
          placeholder="A friend, farmers market, Instagram…"
        />
      </Field>

      <button
        type="submit"
        disabled={pending}
        className="flex h-12 w-full items-center justify-center rounded-md bg-primary px-5 font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60 sm:w-auto sm:min-w-48"
      >
        {pending ? "Adding…" : "Add order"}
      </button>
    </form>
  );
}
