"use client";
import { useState } from "react";
import Image from "next/image";
import { Field, FieldLabel } from "@/components/ui/field";
import { NativeSelect } from "@/components/ui/native-select";
import { Input } from "@/components/ui/input";
import { PageShell } from "@/components/page-shell";

export default function Order() {
    const [boxAmount, setBoxAmount] = useState<number>(0);
    const [quantity, setQuantity] = useState<number>(0);

    const totalPrice = boxAmount * quantity;

    // const customerInfo = {
    //     custName: "",
    //     custEmail: "",
    //     custPhone: "",
    //     custStreetAddress: "",
    //     custAptSuite: "",
    //     custCity: "",
    //     custState: "",
    //     custZipCode: 0,
    // }

    // const orderPayload = {
    //     boxAmount,
    //     quantity,
    //     totalPrice,
    //     customerInfo
    // }

    return (
        <PageShell>
            <form className="flex flex-col pr-10 pl-10 flex-1 items-center justify-start font-sans bg-paper">
                <div className="space-y-3 pt-3">

                    {/* Form Header */}
                    <h1 className="pt-3 font-bold">Vegetable Box Order Form</h1>
                    <p className="mb-3">
                        Please choose a dollar amount for your vegetable box and select delivery or pickup. If you choose delivery, please provide your address and preferred time window.
                    </p>

                    {/* Customer Information Fields */}
                    <Field>
                        <FieldLabel htmlFor="custName">
                            Name
                        </FieldLabel>
                        <Input 
                        type="text"
                        id="custName"
                        name="custName"
                        placeholder="Enter your name"/>
                    </Field>

                    <Field>
                        <FieldLabel htmlFor="custEmail">
                            Email
                        </FieldLabel>
                        <Input 
                        type="email"
                        id="custEmail"
                        name="custEmail"
                        placeholder="Enter your email"/>
                    </Field>

                    <Field>
                        <FieldLabel htmlFor="custPhone">
                            Phone Number
                        </FieldLabel>
                        <Input 
                        type="tel"
                        id="custPhone"
                        name="custPhone"
                        placeholder="Enter your phone number"/>
                    </Field>

                    {/* Box Amount Selection */}
                    <Field>
                        <FieldLabel htmlFor="amtDollars">
                            Vegetable Box Amount - $USD
                        </FieldLabel>
                        <NativeSelect>
                            <option value="0">Select Price...</option>
                            <option value="5">$5 Box</option>
                            <option value="10">$10 Box</option>
                            <option value="15">$15 Box</option>
                            <option value="20">$20 Box</option>
                            <option value="25">$25 Box</option>
                            <option value="30">$30 Box</option>
                        </NativeSelect>
                    </Field>

                    {/* Quantity Selection */}
                    <Field>
                        <FieldLabel htmlFor="quantity">
                            How many boxes?
                        </FieldLabel>
                        <NativeSelect>
                            <option value="0">Select Quantity...</option>
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                            <option value="4">4</option>
                            <option value="5">5</option>
                            <option value="6">6</option>
                        </NativeSelect>
                    </Field>

                    {/* Pickup or Delivery Selection */}
                    <Field>
                        <FieldLabel htmlFor="pickupOrDelivery">
                            Pickup or Delivery
                        </FieldLabel>
                        <NativeSelect>
                            <option value="0">Select One...</option>
                            <option value="pickup">Pickup</option>
                            <option value="delivery">Delivery</option>
                        </NativeSelect>
                    </Field>

                    {/* Delivery address input fields (only displayed if delivery is selected) */}
                    <h2 className="block pt-1.25 mb-2 font-bold">
                        Delivery Address:
                    </h2>
                    {/* Street Address field */}
                    <Field>
                        <FieldLabel htmlFor="streetAddress">
                            Street Address
                        </FieldLabel>
                        <Input 
                        type="text"
                        id="streetAddress"
                        name="streetAddress"
                        placeholder="Enter your delivery address"/>
                    </Field>           

                    {/* Apartment, Suite, etc. field */}
                    <Field>
                        <FieldLabel htmlFor="aptSuite">
                            Apartment, Suite, etc.
                        </FieldLabel>
                        <Input
                        type="text"
                        id="aptSuite"
                        name="aptSuite"
                        placeholder="Apt 4B"
                        />
                    </Field>

                    {/* City and State fields /*/}
                    <div className="flex flex-row flex-wrap">
                        {/* City input */}
                        <Field>
                            <FieldLabel htmlFor="city">
                                City
                            </FieldLabel>
                            <Input 
                            type="text"
                            id="city"
                            name="city"
                            placeholder="City"
                            />
                        </Field>

                        {/* State selection */}
                        <Field>
                            <FieldLabel htmlFor="state">
                                State
                            </FieldLabel>
                            <NativeSelect>
                                <option value="0">Select...</option>
                                <option value="KS">Kansas</option>
                                <option value="MO">Missouri</option>
                                <option value="OK">Oklahoma</option>
                                <option value="IA">Iowa</option>
                            </NativeSelect>
                        </Field>
                    </div>

                    {/* Zip Code input */}
                    <Field>
                        <FieldLabel htmlFor="zipCode">
                            Zip Code
                        </FieldLabel>
                        <Input
                        type="text"
                        id="custZipCode"
                        placeholder="Enter your zip code"
                        />
                    </Field>

                    {/* Time window selection for delivery */}
                    <Field>
                        <FieldLabel htmlFor="timeWindow">
                            Select Delivery Time Window...
                        </FieldLabel>
                        <NativeSelect>
                            <option value="0">Select One...</option>
                            <option value="morning">Morning (8:00 AM - 12:00 PM)</option>
                            <option value="afternoon">Afternoon (12:00 PM - 5:00 PM)</option>
                            <option value="evening">Evening (5:00 PM - 8:00 PM)</option>
                        </NativeSelect>
                    </Field>

                    {/* Total Price Display and Submit Button */}
                    <div className="mr-5 ml-5 flex flex-col items-end justify-end">
                        <label className="flex pt-1">
                            Total Price:
                        </label>
                        <p className="flex mt-1.25 pt-1.25 mb-3 appearance-none rounded-md py-1.5 pr-3 pl-4  outline-gray-300 focus:outline-2 focus:-outline-offset-2">
                            {totalPrice ? "$ " + totalPrice.toFixed(2) : "$0.00"}
                        </p>
                    </div>

                    <button type="submit" className="h-12 mx-auto flex items-center bg-primary justify-center mt-5 whitespace-nowrap rounded-b-md px-5 transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]">
                        Go to Checkout
                    </button>
                </div>
            </form>
        </PageShell>
    )
}
