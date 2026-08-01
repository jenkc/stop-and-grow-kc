"use client";
import { useState } from "react";
import Image from "next/image";

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
        <form className="flex flex-col pr-10 pl-10 flex-1 items-center justify-start bg-zinc-50 font-sans">
            <div className="space-y-3 pt-3">

                {/* Form Header */}
                <h2 className="pt-3 text-base/7 font-semibold text-gray-900">Vegetable Box Order Form</h2>
                <p className="mb-3 text-sm/6 text-gray-600">
                    Please choose a dollar amount for your vegetable box and select delivery or pickup. If you choose delivery, please provide your address and preferred time window.
                </p>

                {/* Box Amount Selection */}
                <div className="sm:col-span-3 pt-1">
                    <label htmlFor="amtDollars" className="block pt-1.25 text-sm/6 font-medium text-gray-900">
                        Vegetable Box Amount - $USD
                    </label>
                    <div className="mt-2 grid grid-cols-1">
                        <select
                        value={boxAmount || ""}
                        onChange={ (event) => setBoxAmount(Number(event.target.value)) }
                        className="col-start-1 row-start-1 pt-1.25 w-full appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                        >
                            <option value="0">Select Price...</option>
                            <option value="5">$5 Box</option>
                            <option value="10">$10 Box</option>
                            <option value="15">$15 Box</option>
                            <option value="20">$20 Box</option>
                            <option value="25">$25 Box</option>
                            <option value="30">$30 Box</option>
                        </select>
                        <Image
                        src="/down-chevron.png"
                        alt=""
                        width={20}
                        height={20}
                        aria-hidden="true"
                        className="pointer-events-none col-start-1 row-start-1 mr-2 w-5 h-5 self-center justify-self-end text-gray-500 sm:w-4 sm:h-4"
                        />
                    </div>
                </div>

                {/* Quantity Selection */}
                <div className="sm:col-span-3 pt-1">
                    <label htmlFor="amtDollars" className="block pt-1.25 text-sm/6 font-medium text-gray-900">
                        Quantity
                    </label>
                    <div className="mt-2 grid grid-cols-1">
                        <select
                        value={quantity || ""}
                        onChange={ (event) => setQuantity(Number(event.target.value)) }
                        className="col-start-1 row-start-1 pt-1.25 w-full appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                        >
                            <option value="0">
                                Select Quantity...
                            </option>
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                            <option value="4">4</option>
                            <option value="5">5</option>
                            <option value="6">6</option>
                        </select>
                        <Image
                        src="/down-chevron.png"
                        alt=""
                        width={20}
                        height={20}
                        aria-hidden="true"
                        className="pointer-events-none col-start-1 row-start-1 mr-2 w-5 h-5 self-center justify-self-end text-gray-500 sm:w-4 sm:h-4"
                        />
                    </div>
                </div>

                {/* Pickup or Delivery Selection */}
                <div className="sm:col-span-3 mt-1 pt-1">
                    <label htmlFor="pickupOrDelivery" className="block pt-1.25 text-sm/6 font-medium text-gray-900">
                        Pickup or Delivery
                    </label>
                    <div className="mt-2 grid grid-cols-1">
                        <select
                        className="col-start-1 row-start-1 pt-1.25 w-full appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                        >   
                            <option value="0">Select One...</option>
                            <option value="pickup">Pickup</option>
                            <option value="delivery">Delivery</option>
                        </select>
                        <Image
                        src="/down-chevron.png"
                        alt=""
                        width={20}
                        height={20}
                        aria-hidden="true"
                        className="pointer-events-none col-start-1 row-start-1 mr-2 w-5 h-5 self-center justify-self-end text-gray-500 sm:w-4 sm:h-4"
                        />
                    </div>
                </div>
             
                {/* Delivery address input fields (only displayed if delivery is selected) */}
                <div className="sm:col-span-3 mb-2 pt-1.25">
                    <h2 className="block pt-1.25 mb-2 font-bold text-gray-900">
                        Delivery Address:
                    </h2>
                    {/* Street Address field */}
                    <div>
                        <label htmlFor="streetAddress" className="block pt-1.25 text-sm/6 font-medium text-gray-900">Street Address</label>
                        <input
                        type="text"
                        id="streetAddress"
                        name="streetAddress"
                        placeholder="Enter your delivery address"
                        className="col-start-1 row-start-1 pt-1.25 mt-2 w-full appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                        />
                    </div>

                    {/* Apartment, Suite, etc. field */}
                    <div>
                        <label htmlFor="aptSuite" className="block pt-1.25 text-sm/6 font-medium text-gray-900">Apartment, Suite, etc.</label>
                        <input
                        type="text"
                        id="aptSuite"
                        name="aptSuite"
                        placeholder="Apt 4B"
                        className="col-start-1 row-start-1 pt-1.25 w-full mt-2 appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                        />
                    </div>

                    {/* City and State fields /*/}
                    <div className="flex flex-row flex-wrap justify-between gap-2">
                        {/* City input */}
                        <div>
                            <label htmlFor="city" className="block pt-1.25 text-sm/6 font-medium text-gray-900">City</label>
                            <input 
                            type="text"
                            id="city"
                            name="city"
                            placeholder="City"
                            className="col-start-1 row-start-1 pt-1.25 justify-self-end w-full appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                            />
                        </div>

                        {/* State selection */}
                        <div className="sm:col-span-3">
                            <label htmlFor="state" className="block pt-1.25 text-sm/6 font-medium text-gray-900">
                                State
                            </label>
                            <div className="grid grid-cols-1">
                                <select className="col-start-1 row-start-1 pt-1.25 w-full appearance-none rounded-md bg-white py-1.5 pr-5 pl-5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6">
                                    <option value="0">Select...</option>
                                    <option value="KS">Kansas</option>
                                    <option value="MO">Missouri</option>
                                    <option value="OK">Oklahoma</option>
                                    <option value="IA">Iowa</option>
                                </select>
                                <Image
                                src="/down-chevron.png"
                                alt=""
                                width={20}
                                height={20}
                                aria-hidden="true"
                                className="pointer-events-none col-start-1 row-start-1 mr-2 w-5 h-5 self-center justify-self-end text-gray-500 sm:w-4 sm:h-4"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Zip Code input */}
                    <div>
                        <label htmlFor="zipCode" className="block pt-1.25 text-sm/6 font-medium text-gray-900">Zip Code</label>
                        <input
                        type="text"
                        id="custZipCode"
                        placeholder="Enter your zip code"
                        className="col-start-1 row-start-1 pt-1.25 w-full appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                        />
                    </div>
                </div>

                {/* Time window selection for delivery */}
                <div className="sm:col-span-3 pt-1.25">
                    <label htmlFor="timeWindow" className="block pt-1.25 text-sm/6 font-medium text-gray-900">
                        Select Delivery Time Window...
                    </label>
                    <div className="mt-2 grid grid-cols-1">
                        <select className="col-start-1 row-start-1 pt-1.25 w-full appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6">
                            <option value="0">Select One...</option>
                            <option value="morning">Morning (8:00 AM - 12:00 PM)</option>
                            <option value="afternoon">Afternoon (12:00 PM - 5:00 PM)</option>
                            <option value="evening">Evening (5:00 PM - 8:00 PM)</option>
                        </select>
                        <Image
                        src="/down-chevron.png"
                        alt=""
                        width={20}
                        height={20}
                        aria-hidden="true"
                        className="pointer-events-none col-start-1 row-start-1 mr-2 w-5 h-5 self-center justify-self-end text-gray-500 sm:w-4 sm:h-4"
                        />
                    </div>
                </div>

                {/* Total Price Display and Submit Button */}
                <div className="mr-5 ml-5 flex flex-col items-end justify-end">
                    <label className="flex pt-1 text-sm/6 font-medium text-gray-900">
                        Total Price:
                    </label>
                    <p className="flex mt-1.25 pt-1.25 mb-3 appearance-none rounded-md bg-white py-1.5 pr-3 pl-4 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6">
                        {totalPrice ? "$ " + totalPrice.toFixed(2) : "$0.00"}
                    </p>
                </div>

                <button type="submit" className="h-12 mx-auto flex items-center justify-center mt-5 whitespace-nowrap rounded-full bg-green-500 px-5 text-white transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]">
                    Go to Checkout
                </button>
            </div>
        </form>
    )
}