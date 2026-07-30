"use client"
import Image from "next/image";
import { useState } from "react";

export default function Order() {
    const [boxAmount, setBoxAmount] = useState<number>(0);
    const [quantityBoxes, setQuantityBoxes] = useState<number>(0);

    const totalPrice = boxAmount * quantityBoxes;

    return (
        <div className="flex flex-col flex-1 items-center justify-start bg-zinc-50 font-sans dark:bg-black">
            <form>
                <div className="space-y-12">
                    <div className="border-b border-gray-900/10 p-10">
                        <h2 className="text-base/7 font-semibold text-gray-900">Vegetable Box Order Form</h2>
                        <p className="mt-1 text-sm/6 text-gray-600">
                        Please choose a dollar amount for your vegetable box and select delivery or pickup. If you choose delivery, please provide your address and preferred time window.
                        </p>

                        <div className="sm:col-span-3 mt-1.5 pt-1.25">
                            <label htmlFor="country" className="block pt-1.25 text-sm/6 font-medium text-gray-900">
                                Vegetable Box Amount -  $USD
                            </label>
                            <div className="mt-2 grid grid-cols-1">
                                <select
                                value={boxAmount || ""}
                                onChange={(event) => setBoxAmount(Number(event.target.value))}
                                className="col-start-1 row-start-1 pt-1.25 w-full appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                                >   
                                    <option value="0">
                                        Select Price...
                                    </option>
                                    <option value="5">
                                        $5 Box
                                    </option>
                                    <option value="10">
                                        $10 Box
                                    </option>
                                    <option value="15">
                                        $15 Box
                                    </option>
                                    <option value="20">
                                        $20 Box
                                    </option>
                                    <option value="25">
                                        $25 Box
                                    </option>
                                    <option value="30">
                                        $30 Box
                                    </option>

                                </select>
                                <Image
                                src="/down-chevron.png"
                                alt=""
                                width={20}
                                height={20}
                                aria-hidden="true"
                                className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-500 sm:size-4"
                                />
                            </div>
                        </div>

                        <div className="sm:col-span-3 pt-1.25">
                            <label htmlFor="country" className="block pt-1.25 text-sm/6 font-medium text-gray-900">
                                Quantity
                            </label>
                            <div className="mt-2 grid grid-cols-1">
                                <select
                                value={quantityBoxes || ""}
                                onChange={(event) => setQuantityBoxes(Number(event.target.value))}
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
                                className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-500 sm:size-4"
                                />
                            </div>
                        </div>

                        <div className="sm:col-span-3 pt-1.25">
                            <label htmlFor="country" className="block pt-1.25 text-sm/6 font-medium text-gray-900">
                                Pickup or Delivery
                            </label>
                            <div className="mt-2 grid grid-cols-1">
                                <select
                                className="col-start-1 row-start-1 pt-1.25 w-full appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                                >   
                                    <option value="0">
                                        Select One...
                                    </option>
                                    <option value="pickup">Pickup</option>
                                    <option value="delivery">Delivery</option>
                                </select>
                                <Image
                                src="/down-chevron.png"
                                alt=""
                                width={20}
                                height={20}
                                aria-hidden="true"
                                className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-500 sm:size-4"
                                />
                            </div>
                        </div>

                        <div className="pr-5 pt-1.25">
                            <label className="flex justify-end pt-3.75 text-sm/6 font-medium text-gray-900">
                                Total Amount:
                            </label>
                            <div
                            className="flex mt-1.25 pt-1.25 justify-self-end appearance-none rounded-md bg-white py-1.5 pr-3 pl-4 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                            >
                                <p className="text-base text-gray-900">
                                    {totalPrice ? "$ " + totalPrice.toFixed(2) : "$0.00"}
                                </p>
                            </div>
                            <button className="flex mt-10 h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[#15aab8] px-5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc] md:w-[158px]">
                                Submit
                            </button>
                        </div>


                    </div>
                </div>   
            </form>
        </div>
    )
}