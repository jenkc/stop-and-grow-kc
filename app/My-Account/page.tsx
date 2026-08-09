import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/Login/actions";
import { DeleteAccount } from "@/components/delete-account";

/** Cents to "$12.50". Prices are stored as integers to avoid float drift. */
function money(cents: number) {
    return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
}

/** "August 2026" — a join date does not need the day. */
function formatMonthYear(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
    });
}

const STATUS_LABEL: Record<string, string> = {
    pending: "Pending",
    confirmed: "Confirmed",
    packed: "Packed",
    fulfilled: "Fulfilled",
    cancelled: "Cancelled",
};

const PAYMENT_LABEL: Record<string, string> = {
    unpaid: "Unpaid",
    partial: "Partly paid",
    paid: "Paid",
    refunded: "Refunded",
};

const TIME_WINDOW_LABEL: Record<string, string> = {
    morning: "morning (8am–12pm)",
    afternoon: "afternoon (12–5pm)",
    evening: "evening (5–8pm)",
};

export default async function MyAccount() {
    const supabase = await createClient();

    // The proxy already bounces signed-out visitors (PROTECTED_PREFIXES), so
    // reaching here means there is a session. Identity comes from that session,
    // never from the URL — and RLS scopes every row below to this user
    // regardless of what the query asks for.
    const { data: claims } = await supabase.auth.getClaims();
    const email = claims?.claims?.email as string | undefined;

    // No .eq() needed: customers_select_own restricts this to the caller's own
    // row (auth_id = auth.uid()), so an unfiltered select returns exactly one.
    // maybeSingle() rather than single() — a customers row is created by the
    // auth trigger, but a missing one should render a degraded page, not throw.
    const { data: customer } = await supabase
        .from("customers")
        .select("name, email, phone, created_at")
        .maybeSingle();

    // One query, not one-per-order: order_items comes back nested via the FK.
    const { data: orders, error } = await supabase
        .from("orders")
        .select(
            `id, order_number, placed_at, total_cents, status, payment_status,
       fulfillment, time_window, ship_street, ship_apt, ship_city, ship_state, ship_zip,
       order_items ( id, description, quantity, unit_price_cents, line_total_cents )`,
        )
        .order("placed_at", { ascending: false });

    // The session email is the authoritative one — customers.email is a
    // profile field and can drift from the address they actually log in with.
    const displayEmail = email ?? customer?.email ?? undefined;

    return (
        <PageShell className="w-full justify-start px-6 py-12">
            <div className="w-full max-w-2xl">
                <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1>My account</h1>
                        {customer?.name && (
                            <p className="mt-1 text-muted-foreground">{customer.name}</p>
                        )}
                    </div>

                    {/* A Server Action in a form — no client JS needed to sign out. */}
                    <form action={logout}>
                        <Button type="submit" variant="outline" size="lg">
                            Log out
                        </Button>
                    </form>
                </div>

                {/* Read-only for now: customers_update_own grants UPDATE on
                    (name, email, phone), so an edit form is a later addition
                    rather than a schema change. */}
                <dl className="mb-10 grid gap-x-6 gap-y-3 rounded-md border border-border px-4 py-4 text-sm sm:grid-cols-[auto_1fr]">
                    <dt className="text-muted-foreground">Email</dt>
                    <dd>{displayEmail ?? "—"}</dd>

                    <dt className="text-muted-foreground">Phone</dt>
                    <dd>{customer?.phone || "—"}</dd>

                    {customer?.created_at && (
                        <>
                            <dt className="text-muted-foreground">Member since</dt>
                            <dd>{formatMonthYear(customer.created_at)}</dd>
                        </>
                    )}
                </dl>

                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h2>Your orders</h2>
                    {/* Only worth showing alongside an existing list — the empty
                        state below carries its own call to action. */}
                    {!error && orders && orders.length > 0 && (
                        <Button variant="outline" size="sm" nativeButton={false}
                            render={<Link href="/Order">Order a box</Link>}
                        />
                    )}
                </div>

                {error && (
                    <p role="alert" className="text-sm text-destructive">
                        We couldn&rsquo;t load your orders just now. Please try again.
                    </p>
                )}

                {!error && (!orders || orders.length === 0) && (
                    <div className="rounded-md border border-border px-4 py-8 text-center">
                        <p className="mb-4 text-muted-foreground">
                            You haven&rsquo;t placed an order yet.
                        </p>
                        <Button size="lg" nativeButton={false}
                            render={<Link href="/Order">Order a box</Link>}
                        />
                    </div>
                )}

                <ul className="flex flex-col gap-4">
                    {orders?.map((order) => (
                        <li
                            key={order.id}
                            className="rounded-md border border-border px-4 py-4"
                        >
                            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                                <div>
                                    <p className="font-semibold">{order.order_number}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {formatDate(order.placed_at)}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold">{money(order.total_cents)}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {STATUS_LABEL[order.status] ?? order.status}
                                        {" · "}
                                        {PAYMENT_LABEL[order.payment_status] ?? order.payment_status}
                                    </p>
                                </div>
                            </div>

                            {order.order_items?.length > 0 && (
                                <ul className="mb-3 flex flex-col gap-1 text-sm">
                                    {order.order_items.map((item) => (
                                        <li key={item.id} className="flex justify-between gap-4">
                                            <span>
                                                {item.quantity} × {item.description}
                                            </span>
                                            <span className="text-muted-foreground">
                                                {money(item.line_total_cents)}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}

                            <p className="text-sm text-muted-foreground">
                                {order.fulfillment === "delivery" ? (
                                    <>
                                        Delivery
                                        {order.ship_street && (
                                            <>
                                                {" to "}
                                                {[order.ship_street, order.ship_apt, order.ship_city, order.ship_state, order.ship_zip]
                                                    .filter(Boolean)
                                                    .join(", ")}
                                            </>
                                        )}
                                        {order.time_window && (
                                            <>{`, ${TIME_WINDOW_LABEL[order.time_window] ?? order.time_window}`}</>
                                        )}
                                    </>
                                ) : (
                                    "Pickup"
                                )}
                            </p>
                        </li>
                    ))}
                </ul>

                {/* Needs the address to compare the typed confirmation against.
                    Hidden entirely if we somehow have no email — there would be
                    nothing to type. */}
                {displayEmail && <DeleteAccount email={displayEmail} />}
            </div>
        </PageShell>
    );
}
