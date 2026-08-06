"use client";

import { useActionState, useState } from "react";
import { Field, FieldLabel } from "@/components/ui/field";
import { NativeSelect } from "@/components/ui/native-select";
import { Input } from "@/components/ui/input";
import { placeOrder, type OrderState } from "@/app/Order/actions";

export type BoxTier = {
    id: string;
    name: string;
    price_cents: number;
};

const QUANTITIES = [1, 2, 3, 4, 5, 6];

export function OrderForm({ tiers }: { tiers: BoxTier[] }) {
    const [state, formAction, pending] = useActionState<OrderState, FormData>(
        placeOrder,
        {},
    );

    // The selected tier is tracked by id; the price for the running total is
    // looked up from `tiers` so the browser never gets to name its own price.
    const [boxTierId, setBoxTierId] = useState("");
    const [quantity, setQuantity] = useState(0);
    const [fulfillment, setFulfillment] = useState("");

    const selectedTier = tiers.find((t) => t.id === boxTierId);
    const totalPrice = ((selectedTier?.price_cents ?? 0) * quantity) / 100;
    const isDelivery = fulfillment === "delivery";

    return (
        <form
            action={formAction}
            className="flex flex-col pr-10 pl-10 flex-1 items-center justify-start font-sans bg-paper"
        >
            <div className="space-y-3 pt-3">
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

                {/* Customer Information Fields */}
                <Field>
                    <FieldLabel htmlFor="custName">Name</FieldLabel>
                    <Input
                        type="text"
                        id="custName"
                        name="custName"
                        required
                        placeholder="Enter your name"
                    />
                </Field>

                <Field>
                    <FieldLabel htmlFor="custEmail">Email</FieldLabel>
                    <Input
                        type="email"
                        id="custEmail"
                        name="custEmail"
                        placeholder="Enter your email"
                    />
                </Field>

                <Field>
                    <FieldLabel htmlFor="custPhone">Phone Number</FieldLabel>
                    <Input
                        type="tel"
                        id="custPhone"
                        name="custPhone"
                        placeholder="Enter your phone number"
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

                        <Field>
                            <FieldLabel htmlFor="streetAddress">Street Address</FieldLabel>
                            <Input
                                type="text"
                                id="streetAddress"
                                name="streetAddress"
                                required
                                placeholder="Enter your delivery address"
                            />
                        </Field>

                        <Field>
                            <FieldLabel htmlFor="aptSuite">Apartment, Suite, etc.</FieldLabel>
                            <Input
                                type="text"
                                id="aptSuite"
                                name="aptSuite"
                                placeholder="Apt 4B"
                            />
                        </Field>

                        <div className="flex flex-row flex-wrap">
                            <Field>
                                <FieldLabel htmlFor="city">City</FieldLabel>
                                <Input type="text" id="city" name="city" placeholder="City" />
                            </Field>

                            <Field>
                                <FieldLabel htmlFor="state">State</FieldLabel>
                                <NativeSelect id="state" name="state">
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
                                placeholder="Enter your zip code"
                            />
                        </Field>

                        <Field>
                            <FieldLabel htmlFor="timeWindow">
                                Select Delivery Time Window...
                            </FieldLabel>
                            <NativeSelect id="timeWindow" name="timeWindow">
                                <option value="">Select One...</option>
                                <option value="morning">Morning (8:00 AM - 12:00 PM)</option>
                                <option value="afternoon">Afternoon (12:00 PM - 5:00 PM)</option>
                                <option value="evening">Evening (5:00 PM - 8:00 PM)</option>
                            </NativeSelect>
                        </Field>
                    </>
                )}

                {/* Total Price Display and Submit Button */}
                <div className="mr-5 ml-5 flex flex-col items-end justify-end">
                    <label className="flex pt-1">Total Price:</label>
                    <p className="flex mt-1.25 pt-1.25 mb-3 appearance-none rounded-md py-1.5 pr-3 pl-4 outline-gray-300 focus:outline-2 focus:-outline-offset-2">
                        ${totalPrice.toFixed(2)}
                    </p>
                </div>

                <button
                    type="submit"
                    disabled={pending}
                    className="h-12 mx-auto flex items-center bg-primary justify-center mt-5 whitespace-nowrap rounded-b-md px-5 transition-colors hover:bg-[#383838] disabled:opacity-60 dark:hover:bg-[#ccc]"
                >
                    {pending ? "Placing order…" : "Go to Checkout"}
                </button>
            </div>
        </form>
    );
}
