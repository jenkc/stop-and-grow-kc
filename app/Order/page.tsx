import { PageShell } from "@/components/page-shell";
import { OrderForm, type BoxTier, type OrderWindow } from "@/components/order-form";
import { createClient } from "@/lib/supabase/server";
import { getOrderingCycle, closedMessage } from "@/lib/cycle";

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

    const gate = await getOrderingCycle();

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

    // Ordering closed: show why instead of a form that would only be rejected.
    // placeOrder() runs this same check, so this is presentation, not the gate.
    if (!gate.open) {
        return (
            <PageShell>
                <div className="w-full max-w-md py-16 text-center">
                    <h1 className="mb-4 text-3xl">Ordering is closed</h1>
                    <p className="text-muted-foreground">
                        {closedMessage(gate.reason)}
                    </p>
                </div>
            </PageShell>
        );
    }

    // Windows for the open cycle. RLS (delivery_windows_public_read) already
    // limits these to open cycles, so a signed-out visitor sees exactly the
    // times they are allowed to book.
    const { data: windowRows } = await supabase
        .from("delivery_windows")
        .select("id, kind, label, starts_at")
        .eq("cycle_id", gate.cycle.id)
        .order("starts_at");

    const windows: OrderWindow[] = windowRows ?? [];

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
            <OrderForm tiers={tiers} windows={windows} />
        </PageShell>
    );
}
