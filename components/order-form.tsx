"use client";

import { useActionState, useState } from "react";
import { Field, FieldLabel } from "@/components/ui/field";
import { NativeSelect } from "@/components/ui/native-select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    placeOrder,
    type OrderState,
    type OrderValues,
} from "@/app/Order/actions";
import type { OrderPrefill } from "@/lib/order-prefill-types";
import { formatCents } from "@/lib/pricing";
import { LIMITS, formatPhoneInput } from "@/lib/validation";

export type BoxTier = {
    id: string;
    name: string;
    price_cents: number;
};

export type OrderWindow = {
    id: string;
    kind: "pickup" | "delivery";
    label: string;
    starts_at: string;
};

// Schema allows 20. A church ordering 12 should not be stopped by a dropdown.
const QUANTITIES = Array.from({ length: 20 }, (_, i) => i + 1);

export function OrderForm({
    tiers,
    windows,
    prefill,
}: {
    tiers: BoxTier[];
    windows: OrderWindow[];
    /** Null for a signed-out visitor. See lib/order-prefill.ts. */
    prefill?: OrderPrefill | null;
}) {
    const [state, formAction, pending] = useActionState<OrderState, FormData>(
        placeOrder,
        {},
    );

    /**
     * What a field should show: what they just submitted, else what we knew
     * about them, else empty.
     *
     * Order matters. If prefill won, a customer who cleared a stale apartment
     * number and hit Place order would watch it come back on the validation
     * re-render — the same class of bug as the form clearing itself. `??` not
     * `||`, so a deliberately emptied field stays empty.
     */
    const initial = (field: keyof OrderValues) =>
        state?.values?.[field] ??
        // dietaryNotes is in OrderValues but deliberately NOT in OrderPrefill:
        // it is echoed back on a rejected submit, but never carried over from a
        // previous order. Last week's "no beets" is not a standing instruction,
        // and prefilling it would put words in their mouth.
        (field in (prefill ?? {})
            ? prefill?.[field as keyof OrderPrefill]
            : undefined) ??
        "";

    // The selected tier is tracked by id; the price for the running total is
    // looked up from `tiers` so the browser never gets to name its own price.
    const [boxTierId, setBoxTierId] = useState("");
    const [quantity, setQuantity] = useState(0);
    const [entrySource, setEntrySource] = useState("");
    const [fulfillment, setFulfillment] = useState("");
    // Controlled, so unlike the others it cannot use defaultValue — the initial
    // value has to be seeded into state. A lazy initialiser, so a re-render
    // never resets what they are mid-way through typing.
    const [phone, setPhone] = useState(() => initial("custPhone"));

    // Reformat as they type, except while deleting. Without the delete check,
    // backspacing "(816) " to "(816" re-adds the ")" the formatter just removed
    // and the caret can never get past it.
    function onPhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
        const next = e.target.value;
        const deleting = next.length < phone.length;
        setPhone(deleting ? next : formatPhoneInput(next));
    }

    const selectedTier = tiers.find((t) => t.id === boxTierId);
    const totalCents = (selectedTier?.price_cents ?? 0) * quantity;
    const isDelivery = fulfillment === "delivery";

    // Pickup and delivery have different times on the same day, so the list has
    // to follow the choice above it rather than showing everything.
    const availableWindows = windows.filter((w) => w.kind === fulfillment);

    // w-full + max-w-xl keeps the form inside the viewport on a phone and stops
    // it sprawling on a wide monitor. Horizontal padding is responsive rather
    // than a flat pr-10/pl-10: 40px a side is most of a 375px screen.
    return (
        <form
            action={formAction}
            className="flex w-full max-w-xl flex-1 flex-col items-center justify-start bg-paper px-4 font-sans sm:px-10"
        >
            <div className="w-full space-y-3 pt-3">
                {/* Form Header */}
                <h1 className="pt-3 font-bold">Vegetable Box Order Form</h1>
                <p className="mb-3">
                    Please choose a dollar amount for your vegetable box and select
                    delivery or pickup. If you choose delivery, please provide your
                    address and preferred time window.
                </p>

                {state.error && (
                    <p role="alert" className="text-sm font-medium text-destructive">
                        {state.error}
                    </p>
                )}
                <h2>Customer Information</h2>
                <Field>
                    <FieldLabel htmlFor="entrySource">
                       Please tell us how you heard about Stop and Grow KC! (optional)
                    </FieldLabel>
                    <Input
                        type="text"
                        id="entrySource"
                        name="entrySource"
                        value={entrySource}
                        onChange={(e) => setEntrySource(e.target.value)}
                        maxLength={LIMITS.name}
                        placeholder="A friend, farmers market, Instagram…"
                    />
                </Field>
                {/* Honeypot. Hidden from people, filled by bots that complete every
                    input — placeOrder() drops the submission when it has a value.
                    Matches the /Contact implementation: positioned off-screen rather
                    than `display: none`, since some bots skip what they can tell is
                    hidden, and aria-hidden + tabIndex keep it away from screen
                    readers and the tab order. autoComplete="off" stops a password
                    manager filling it and flagging a real customer as a bot. */}
                <div className="absolute left-[-9999px]" aria-hidden="true">
                    <label htmlFor="website">Leave this field empty</label>
                    <input
                        id="website"
                        name="website"
                        type="text"
                        tabIndex={-1}
                        autoComplete="off"
                    />
                </div>

                {/* Customer Information Fields */}
                <Field>
                    <FieldLabel htmlFor="custName">Name</FieldLabel>
                    <Input
                        type="text"
                        id="custName"
                        name="custName"
                        required
                        maxLength={LIMITS.name}
                        autoComplete="name"
                        placeholder="Enter your name"
                        defaultValue={initial("custName")}
                    />
                </Field>

                <Field>
                    <FieldLabel htmlFor="custEmail">Email</FieldLabel>
                    <Input
                        type="email"
                        id="custEmail"
                        name="custEmail"
                        maxLength={LIMITS.email}
                        autoComplete="email"
                        placeholder="Enter your email"
                        defaultValue={initial("custEmail")}
                    />
                </Field>

                <Field>
                    <FieldLabel htmlFor="custPhone">Phone Number</FieldLabel>
                    <Input
                        type="tel"
                        id="custPhone"
                        name="custPhone"
                        value={phone}
                        onChange={onPhoneChange}
                        maxLength={LIMITS.phone}
                        autoComplete="tel"
                        inputMode="tel"
                        placeholder="(816) 555-0142"
                    />
                </Field>

                {/* Box Amount Selection — options come from box_tiers */}
                <Field>
                    <FieldLabel htmlFor="boxTierId">
                        Vegetable Box Amount - $USD
                    </FieldLabel>
                    <NativeSelect
                        id="boxTierId"
                        name="boxTierId"
                        value={boxTierId}
                        onChange={(e) => setBoxTierId(e.target.value)}
                        required
                    >
                        <option value="">Select Price...</option>
                        {tiers.map((tier) => (
                            <option key={tier.id} value={tier.id}>
                                {tier.name} — ${(tier.price_cents / 100).toFixed(2)}
                            </option>
                        ))}
                    </NativeSelect>
                </Field>

                {/* Quantity Selection */}
                <Field>
                    <FieldLabel htmlFor="quantity">How many boxes?</FieldLabel>
                    <NativeSelect
                        id="quantity"
                        name="quantity"
                        value={quantity || ""}
                        onChange={(e) => setQuantity(Number(e.target.value))}
                        required
                    >
                        <option value="">Select Quantity...</option>
                        {QUANTITIES.map((q) => (
                            <option key={q} value={q}>
                                {q}
                            </option>
                        ))}
                    </NativeSelect>
                </Field>

                {/* Pickup or Delivery Selection */}
                <Field>
                    <FieldLabel htmlFor="fulfillment">Pickup or Delivery</FieldLabel>
                    <NativeSelect
                        id="fulfillment"
                        name="fulfillment"
                        value={fulfillment}
                        onChange={(e) => setFulfillment(e.target.value)}
                        required
                    >
                        <option value="">Select One...</option>
                        <option value="pickup">Pickup</option>
                        <option value="delivery">Delivery</option>
                    </NativeSelect>
                </Field>

                {/* Delivery fields — only rendered when delivery is selected */}
                {isDelivery && (
                    <>
                        <h2 className="block pt-1.25 mb-2 font-bold">Delivery Address:</h2>

                        {/* city / state / zip are `required` because the database
                            constraint orders_delivery_needs_address demands all
                            of them for a delivery. Without these attributes the
                            first sign of a missing city was a failed insert
                            reported as "Could not place that order." */}
                        <Field>
                            <FieldLabel htmlFor="streetAddress">Street Address</FieldLabel>
                            <Input
                                type="text"
                                id="streetAddress"
                                name="streetAddress"
                                required
                                maxLength={LIMITS.street}
                                autoComplete="address-line1"
                                placeholder="Enter your delivery address"
                                defaultValue={initial("streetAddress")}
                            />
                        </Field>

                        <Field>
                            <FieldLabel htmlFor="aptSuite">Apartment, Suite, etc.</FieldLabel>
                            <Input
                                type="text"
                                id="aptSuite"
                                name="aptSuite"
                                maxLength={LIMITS.apt}
                                autoComplete="address-line2"
                                placeholder="Apt 4B"
                                defaultValue={initial("aptSuite")}
                            />
                        </Field>

                        {/* Grid rather than flex-wrap: the three fields have no
                            width basis of their own, so wrapping left them
                            squeezed at narrow widths. Stacks on a phone. */}
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <Field>
                                <FieldLabel htmlFor="city">City</FieldLabel>
                                <Input
                                    type="text"
                                    id="city"
                                    name="city"
                                    required
                                    maxLength={LIMITS.city}
                                    autoComplete="address-level2"
                                    placeholder="City"
                                    defaultValue={initial("city")}
                                />
                            </Field>

                            <Field>
                                <FieldLabel htmlFor="state">State</FieldLabel>
                                <NativeSelect
                                    id="state"
                                    name="state"
                                    required
                                    defaultValue={initial("state")}
                                >
                                    <option value="">Select...</option>
                                    <option value="KS">Kansas</option>
                                    <option value="MO">Missouri</option>
                                    <option value="OK">Oklahoma</option>
                                    <option value="IA">Iowa</option>
                                </NativeSelect>
                            </Field>
                        </div>

                        <Field>
                            <FieldLabel htmlFor="zipCode">Zip Code</FieldLabel>
                            <Input
                                type="text"
                                id="zipCode"
                                name="zipCode"
                                required
                                inputMode="numeric"
                                maxLength={10}
                                autoComplete="postal-code"
                                placeholder="64111"
                                defaultValue={initial("zipCode")}
                            />
                        </Field>
                    </>
                )}

                {/* Times come from delivery_windows for the open cycle, so they
                    are whatever Scraps set this week. Shown for pickup as well
                    as delivery — both have times, and they differ. */}
                {fulfillment && (
                    <Field>
                        <FieldLabel htmlFor="windowId">
                            {isDelivery ? "Delivery time" : "Pickup time"}
                        </FieldLabel>
                        {availableWindows.length > 0 ? (
                            <NativeSelect id="windowId" name="windowId" required>
                                <option value="">Select a time…</option>
                                {availableWindows.map((w) => (
                                    <option key={w.id} value={w.id}>
                                        {w.label}
                                    </option>
                                ))}
                            </NativeSelect>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                No {isDelivery ? "delivery" : "pickup"} times are available
                                this week. Try the other option.
                            </p>
                        )}
                    </Field>
                )}

                <Field>
                    <FieldLabel htmlFor="dietaryNotes">
                        Anything you don&rsquo;t eat?
                    </FieldLabel>
                    <Textarea
                        id="dietaryNotes"
                        name="dietaryNotes"
                        rows={2}
                        maxLength={LIMITS.notes}
                        placeholder="No celery or beets"
                        defaultValue={initial("dietaryNotes")}
                    />
                </Field>

                {/* Spacer so the sticky bar never covers the last field. */}
                <div aria-hidden className="h-24" />
            </div>

            {/* The total and the submit travel together at the bottom of the
                viewport. Previously the total sat mid-page and scrolled out of
                sight on a phone, so the amount was invisible at the moment of
                deciding — which is the one moment it matters. */}
            <div className="sticky bottom-0 z-10 -mx-4 mt-auto w-[calc(100%+2rem)] border-t border-border bg-paper/95 px-4 py-3 backdrop-blur sm:-mx-10 sm:w-[calc(100%+5rem)] sm:px-10">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <p className="text-sm text-muted-foreground">Total</p>
                        <p aria-live="polite" className="text-2xl font-bold tabular-nums">
                            {formatCents(totalCents)}
                        </p>
                    </div>
                    <button
                        type="submit"
                        disabled={pending}
                        className="flex h-12 min-w-40 items-center justify-center whitespace-nowrap rounded-md bg-primary px-5 text-primary-foreground transition-colors hover:bg-[#383838] disabled:opacity-60 dark:hover:bg-[#ccc]"
                    >
                        {pending ? "Placing order…" : "Place order"}
                    </button>
                </div>
            </div>
        </form>
    );
}
