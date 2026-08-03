import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";

async function OrdersData() {
    const supabase = await createClient();
    const { data: orders } = await supabase.from("orders").select();

    return <pre>{JSON.stringify(orders, null, 2)}</pre>;
}

export default function AdminPage() {
    return (
        <div className="flex flex-col items-center justify-center p-10">
            <h1 className="text-2xl font-bold mb-4">Admin Page</h1>
            <p className="mb-4">This page is for admin users only.</p>
        <Suspense fallback={<div>Loading...</div>}>
            <OrdersData />
        </Suspense>
        </div>
    );
}