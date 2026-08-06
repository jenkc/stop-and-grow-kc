import { PageShell } from "@/components/page-shell";
import { OrderForm, type BoxTier } from "@/components/order-form";
import { createClient } from "@/lib/supabase/server";

export default async function Order({
    searchParams,
}: {
    searchParams: Promise<{ confirmed?: string; placed?: string }>
}) {
    const { confirmed, placed } = await searchParams;

    // Catalog is read server-side so the price list is never client-authored.
    const supabase = await createClient();
    const { data } = await supabase
        .from("box_tiers")
        .select("id, name, price_cents")
        .eq("active", true)
        .order("sort_order");

    const tiers: BoxTier[] = data ?? [];

    // After placeOrder() succeeds it redirects back here with the order number.
    if (placed) {
        return (
            <PageShell>
                <div className="w-full max-w-sm py-16">
                    <h1 className="mb-6 text-3xl">Order placed</h1>
                    <p className="text-muted-foreground">
                        Your order number is <strong>{placed}</strong>. We&rsquo;ll be in
                        touch to confirm the details.
                    </p>
                </div>
            </PageShell>
        );
    }

    return (
        <PageShell>
            {confirmed && (
                <div
                    role="status"
                    className="mb-6 max-w-md border border-primary/30 bg-primary/10 px-4 py-3 text-center"
                >
                    <p className="font-semibold">Your email is confirmed.</p>
                    <p className="text-sm text-muted-foreground">
                        You&rsquo;re signed in and ready to order.
                    </p>
                </div>
            )}
            <OrderForm tiers={tiers} />
        </PageShell>
    );
}
