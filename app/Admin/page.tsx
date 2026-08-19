import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Chip } from "@/components/ui/chip";
import { buttonVariants } from "@/components/ui/button";
import { MarkPaidButton } from "@/components/admin/mark-paid-button";
import { OrderRowMenu } from "@/components/admin/order-row-menu";
import { formatCents } from "@/lib/pricing";
import { cn } from "@/lib/utils";

/**
 * Every order for the current week, pickup and delivery together.
 *
 * The runsheet is the delivery-day tool; this is the "what is going on" view.
 * On a phone each order is a card, because a seven-column table on a 390px
 * screen is a pinch-and-scroll puzzle. The table shape appears at sm and up,
 * where it genuinely reads better.
 */

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  order_number: string;
  contact_name: string;
  contact_phone: string | null;
  fulfillment: string;
  status: string;
  payment_status: string;
  total_cents: number;
  dietary_notes: string | null;
  window_id: string | null;
  ship_street: string | null;
  ship_apt: string | null;
  ship_city: string | null;
  delivery_fee_cents: number;
};

/**
 * Street line only — no city, state or ZIP.
 *
 * This column exists to answer "which stop is this?" at a glance while scanning
 * the week. Everything is in Kansas City, so the city repeated on every row
 * would be noise, and the full address is on the runsheet where it is actually
 * used for navigating.
 */
function shortAddress(r: Row): string | null {
  if (r.fulfillment !== "delivery" || !r.ship_street) return null;
  return [r.ship_street, r.ship_apt].filter(Boolean).join(" ");
}

export default async function Admin() {
  const admin = createAdminClient();

  const { data: orders } = await admin
    .from("orders")
    .select(
      "id, order_number, contact_name, contact_phone, fulfillment, status, payment_status, total_cents, dietary_notes, window_id, ship_street, ship_apt, ship_city, delivery_fee_cents",
    )
    .order("placed_at", { ascending: false });

  const { data: windows } = await admin
    .from("delivery_windows")
    .select("id, label");

  const labelFor = new Map((windows ?? []).map((w) => [w.id, w.label]));
  const rows = (orders ?? []) as Row[];

  const live = rows.filter((r) => r.status !== "cancelled");
  const owed = live
    .filter((r) => r.payment_status !== "paid")
    .reduce((sum, r) => sum + r.total_cents, 0);

  return (
    <div className="py-4">
      {/* The button sits with the heading rather than in the tab row: taking an
          order by phone starts from looking at the week's orders. Wraps to its
          own line on a narrow phone instead of squeezing the count. */}
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Orders</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {live.length} active · {formatCents(owed)} outstanding
          </p>
        </div>
        <Link href="/Admin/New" className={buttonVariants()}>
          New order
        </Link>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-border bg-card px-6 py-12 text-center">
          <h2 className="font-display text-xl">No orders yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Orders appear here as they come in.
          </p>
          {/* Repeated from the header: on an empty week this card is the whole
              screen, and "add one yourself" is the only useful next move. */}
          <Link
            href="/Admin/New"
            className={cn(buttonVariants({ variant: "outline" }), "mt-6")}
          >
            Add one by hand
          </Link>
        </div>
      ) : (
        <>
          {/* Phone: cards. */}
          <ul className="space-y-3 sm:hidden">
            {rows.map((r) => (
              <li
                key={r.id}
                className="rounded-lg border border-border bg-card p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-bold">{r.contact_name}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {r.order_number}
                    </p>
                  </div>
                  <span className="shrink-0 font-bold tabular-nums">
                    {formatCents(r.total_cents)}
                  </span>
                </div>
                {shortAddress(r) && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {shortAddress(r)}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Chip
                    status={r.fulfillment === "delivery" ? "delivery" : "pickup"}
                  >
                    {r.fulfillment}
                  </Chip>
                  <MarkPaidButton
                    orderId={r.id}
                    totalCents={r.total_cents}
                    paymentStatus={r.payment_status}
                  />
                  <span className="text-xs text-muted-foreground">
                    {r.status}
                  </span>
                  {r.window_id && (
                    <span className="text-xs text-muted-foreground">
                      · {labelFor.get(r.window_id)}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {/* Tablet and up: the table. */}
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line-mid text-left">
                  <Th>Order</Th>
                  <Th>Name</Th>
                  <Th>Type</Th>
                  <Th>Address</Th>
                  <Th>Time</Th>
                  <Th className="text-right">Total</Th>
                  <Th>Status</Th>
                  <Th>Payment</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className={`border-b border-border ${
                      r.status === "cancelled" ? "opacity-50" : ""
                    }`}
                  >
                    <Td className="font-mono text-xs">{r.order_number}</Td>
                    <Td>
                      <span className="font-medium">{r.contact_name}</span>
                      {/* The dietary flag rides with the name rather than
                          getting a column of its own: it is rare, and an empty
                          column costs width on every row that lacks one. */}
                      {r.dietary_notes && (
                        <span
                          title={r.dietary_notes}
                          className="ml-2 rounded bg-warn-tint px-1.5 py-0.5 text-xs font-medium"
                        >
                          note
                        </span>
                      )}
                    </Td>
                    <Td>
                      <Chip
                        status={
                          r.fulfillment === "delivery" ? "delivery" : "pickup"
                        }
                      >
                        {r.fulfillment}
                      </Chip>
                    </Td>
                    <Td className="text-muted-foreground">
                      {shortAddress(r) ?? "—"}
                    </Td>
                    <Td className="text-muted-foreground">
                      {r.window_id ? labelFor.get(r.window_id) : "—"}
                    </Td>
                    <Td className="text-right font-medium tabular-nums">
                      {formatCents(r.total_cents)}
                    </Td>
                    <Td className="text-muted-foreground">{r.status}</Td>
                    <Td>
                      {/* Mark paid stays inline; everything occasional or
                          destructive is behind the menu. */}
                      <span className="inline-flex items-center gap-1">
                        <MarkPaidButton
                          orderId={r.id}
                          totalCents={r.total_cents}
                          paymentStatus={r.payment_status}
                        />
                        <OrderRowMenu
                          orderId={r.id}
                          orderNumber={r.order_number}
                          status={r.status}
                          fulfillment={r.fulfillment}
                          hasDeliveryFee={r.delivery_fee_cents > 0}
                        />
                      </span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th className={`px-2 py-2 font-medium text-muted-foreground ${className}`}>
      {children}
    </th>
  );
}

function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`px-2 py-3 ${className}`}>{children}</td>;
}