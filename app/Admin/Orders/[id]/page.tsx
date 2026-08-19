import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { Chip } from "@/components/ui/chip";
import { MarkPaidButton } from "@/components/admin/mark-paid-button";
import { formatCents } from "@/lib/pricing";

/**
 * Everything about one order, on one screen.
 *
 * The orders table answers "what is going on this week" and has to stay
 * scannable, so it cannot show dietary notes, a full address, line items and a
 * payment history at once. This is where those live — reached from the row menu
 * when a specific order needs looking into, usually because someone called
 * about it.
 *
 * Read-only apart from Mark paid. Editing an order is a bigger question than
 * this page: the money is denormalised across orders and order_items, and a
 * half-built editor that updates one and not the other is worse than none.
 */

export const dynamic = "force-dynamic";

export default async function OrderDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select(
      `id, order_number, contact_name, contact_email, contact_phone,
       fulfillment, status, payment_status, placed_at, fulfilled_at,
       subtotal_cents, delivery_fee_cents, total_cents, amount_paid_cents,
       dietary_notes, notes, entry_source, checkout_method, customer_id,
       ship_street, ship_apt, ship_city, ship_state, ship_zip,
       window_id,
       order_items ( id, description, quantity, unit_price_cents, line_total_cents, pricing_mode )`,
    )
    .eq("id", id)
    .maybeSingle();

  // An id that does not resolve is a stale link or a typed URL, not an error
  // worth a stack trace.
  if (!order) notFound();

  const [{ data: windowRow }, { data: payments }, { data: customer }] =
    await Promise.all([
      order.window_id
        ? admin
            .from("delivery_windows")
            .select("label, starts_at, kind")
            .eq("id", order.window_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      admin
        .from("payments")
        .select("id, method, amount_cents, status, received_at")
        .eq("order_id", id)
        .order("received_at", { ascending: false }),
      order.customer_id
        ? admin
            .from("customers")
            .select("id, name, email")
            .eq("id", order.customer_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  const address = [
    [order.ship_street, order.ship_apt].filter(Boolean).join(" "),
    [order.ship_city, order.ship_state].filter(Boolean).join(", "),
    order.ship_zip,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div className="py-4">
      <Link
        href="/Admin"
        className="text-sm text-muted-foreground underline print:hidden"
      >
        ← All orders
      </Link>

      <header className="mt-3 mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">{order.order_number}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {new Date(order.placed_at).toLocaleString("en-US", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
            {" · "}
            {order.checkout_method === "account" ? "account" : "guest"} checkout
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Chip status={order.fulfillment === "delivery" ? "delivery" : "pickup"}>
            {order.fulfillment}
          </Chip>
          <MarkPaidButton
            orderId={order.id}
            totalCents={order.total_cents}
            paymentStatus={order.payment_status}
          />
        </div>
      </header>

      {/* The note is the one field that changes what physically goes in the
          box, so it leads rather than sitting in a definition list. */}
      {order.dietary_notes && (
        <p className="mb-6 rounded-md bg-warn-tint px-3 py-2 text-sm font-medium">
          <span className="font-bold">Do not include:</span> {order.dietary_notes}
        </p>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <Section title="Customer">
          <Row label="Name" value={order.contact_name} />
          {order.contact_phone && (
            <Row
              label="Phone"
              value={
                <a href={`tel:${order.contact_phone}`} className="underline">
                  {order.contact_phone}
                </a>
              }
            />
          )}
          {order.contact_email && (
            <Row
              label="Email"
              value={
                <a href={`mailto:${order.contact_email}`} className="underline">
                  {order.contact_email}
                </a>
              }
            />
          )}
          {customer && <Row label="Account" value={customer.name} />}
          {order.entry_source && (
            <Row label="Heard about us" value={order.entry_source} />
          )}
        </Section>

        <Section title={order.fulfillment === "delivery" ? "Delivery" : "Pickup"}>
          <Row
            label="Time"
            value={windowRow?.label ?? "No time set"}
          />
          {address && (
            <Row
              label="Address"
              value={<span className="whitespace-pre-line">{address}</span>}
            />
          )}
          <Row label="Status" value={order.status} />
          {order.fulfilled_at && (
            <Row
              label="Delivered"
              value={new Date(order.fulfilled_at).toLocaleString("en-US", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            />
          )}
        </Section>
      </div>

      <Section title="Items" className="mt-6">
        <ul className="space-y-1 text-sm">
          {(order.order_items ?? []).map((item) => (
            <li key={item.id} className="flex justify-between gap-4">
              <span>
                {item.quantity} × {item.description}
                {/* Only worth saying when it changes how to read the numbers:
                    a lump-sum line's unit price is derived, not quoted. */}
                {item.pricing_mode === "total" && item.quantity > 1 && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    priced as a line total
                  </span>
                )}
              </span>
              <span className="figure">{formatCents(item.line_total_cents)}</span>
            </li>
          ))}
        </ul>

        <dl className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
          <SumRow label="Subtotal" cents={order.subtotal_cents} />
          {order.delivery_fee_cents > 0 && (
            <SumRow label="Delivery" cents={order.delivery_fee_cents} />
          )}
          <SumRow label="Total" cents={order.total_cents} bold />
          {order.amount_paid_cents > 0 && (
            <SumRow label="Paid" cents={order.amount_paid_cents} />
          )}
        </dl>
      </Section>

      <Section title="Payments" className="mt-6">
        {(payments ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing recorded yet.
          </p>
        ) : (
          <ul className="space-y-1 text-sm">
            {(payments ?? []).map((p) => {
              // A voided row is a correction, not a payment. It stays visible —
              // that is the point of voiding rather than deleting — but must
              // never read as money still counted.
              const voided = p.status === "voided";
              return (
                <li
                  key={p.id}
                  className={`flex justify-between gap-4 ${
                    voided ? "text-muted-foreground" : ""
                  }`}
                >
                  <span>
                    {p.method}
                    {voided && (
                      <span className="ml-2 rounded bg-crit-tint px-1.5 py-0.5 text-xs font-medium">
                        voided
                      </span>
                    )}
                    {p.received_at && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {new Date(p.received_at).toLocaleDateString("en-US", {
                          dateStyle: "medium",
                        })}
                      </span>
                    )}
                  </span>
                  <span className={`figure ${voided ? "line-through" : ""}`}>
                    {formatCents(p.amount_cents)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-lg border border-border bg-card p-4 ${className}`}>
      <h2 className="mb-3 font-display text-lg">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

function SumRow({
  label,
  cents,
  bold,
}: {
  label: string;
  cents: number;
  bold?: boolean;
}) {
  return (
    <div className={`flex justify-between gap-4 ${bold ? "font-bold" : ""}`}>
      <dt>{label}</dt>
      <dd className="figure">{formatCents(cents)}</dd>
    </div>
  );
}
