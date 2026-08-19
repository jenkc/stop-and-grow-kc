import { Chip } from "@/components/ui/chip";
import { formatCents } from "@/lib/pricing";
import { StopActions } from "@/components/admin/stop-actions";
import { MarkPaidButton } from "@/components/admin/mark-paid-button";

/**
 * One stop on the runsheet.
 *
 * Designed for a phone held in one hand in a van, not for a desk. That drives
 * every decision here:
 *
 *   - The name is the biggest thing on the card. It is what she is looking for.
 *   - Address and phone are links, not text. Tapping should start navigation or
 *     a call, because the alternative is retyping an address while driving.
 *   - Dietary notes are inline and visually loud. They are the thing that ruins
 *     an order if missed, and hiding them behind a tap defeats the purpose.
 *   - Every target clears 44px.
 */

export type Stop = {
  id: string;
  order_number: string;
  contact_name: string;
  contact_phone: string | null;
  ship_street: string | null;
  ship_apt: string | null;
  ship_city: string | null;
  ship_state: string | null;
  ship_zip: string | null;
  dietary_notes: string | null;
  notes: string | null;
  total_cents: number;
  status: string;
  payment_status: string;
  fulfillment: string;
  order_items: { description: string; quantity: number }[];
};

function formatAddress(stop: Stop): string | null {
  if (!stop.ship_street) return null;
  const street = [stop.ship_street, stop.ship_apt].filter(Boolean).join(" ");
  const city = [stop.ship_city, stop.ship_state].filter(Boolean).join(", ");
  return [street, city, stop.ship_zip].filter(Boolean).join(", ");
}

function boxSummary(stop: Stop): string {
  const boxes = stop.order_items.filter((i) => i.description !== "Delivery");
  const count = boxes.reduce((sum, i) => sum + i.quantity, 0);
  if (count === 0) return "No boxes";
  const kinds = boxes.map((i) => `${i.quantity}× ${i.description}`).join(", ");
  return kinds;
}

export function StopCard({ stop }: { stop: Stop }) {
  const address = formatAddress(stop);
  const isDone = stop.status === "fulfilled";
  const paid = stop.payment_status === "paid";

  return (
    <li
      // Fulfilled stops recede rather than disappear: she still needs to see
      // them to know the window is finished, but they should not compete with
      // what is left to do.
      className={`rounded-lg border border-border bg-card p-4 transition-opacity ${
        isDone ? "opacity-55" : ""
      } print:break-inside-avoid print:border-line-strong print:opacity-100`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-xl font-bold leading-tight">
            {stop.contact_name}
          </h3>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">
            {stop.order_number}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-lg font-bold tabular-nums">
            {formatCents(stop.total_cents)}
          </span>
          {/* Taking payment at the door is the other half of this screen, so the
              control lives where the amount is. print:hidden — a paper runsheet
              has nothing to tap, and the chip below carries the state instead. */}
          <span className="print:hidden">
            <MarkPaidButton
              orderId={stop.id}
              totalCents={stop.total_cents}
              paymentStatus={stop.payment_status}
            />
          </span>
          <span className="hidden print:inline">
            <Chip status={paid ? "paid" : "unpaid"}>
              {paid ? "Paid" : "Unpaid"}
            </Chip>
          </span>
        </div>
      </div>

      <p className="mt-2 text-sm">{boxSummary(stop)}</p>

      {/* Dietary notes get a tinted band rather than a line of small print.
          This is the detail she honors by hand and the one that cannot be
          missed at a glance. */}
      {stop.dietary_notes && (
        <p className="mt-3 rounded-md bg-warn-tint px-3 py-2 text-sm font-medium">
          <span className="font-bold">Note:</span> {stop.dietary_notes}
        </p>
      )}

      {(address || stop.contact_phone) && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          {address && (
            <a
              // maps: is understood by iOS and Android; both fall back to the
              // installed default rather than forcing a browser.
              href={`https://maps.google.com/?q=${encodeURIComponent(address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-11 flex-1 items-center rounded-md border border-line-mid px-3 text-sm transition-colors hover:bg-paper-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none print:border-0 print:px-0"
            >
              {address}
            </a>
          )}
          {stop.contact_phone && (
            <a
              href={`tel:${stop.contact_phone.replace(/[^0-9+]/g, "")}`}
              className="flex min-h-11 items-center justify-center rounded-md border border-line-mid px-4 text-sm font-medium transition-colors hover:bg-paper-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none print:border-0 print:px-0"
            >
              {stop.contact_phone}
            </a>
          )}
        </div>
      )}

      <StopActions
        orderId={stop.id}
        status={stop.status}
        fulfillment={stop.fulfillment}
        hasDeliveryFee={stop.order_items.some((i) => i.description === "Delivery")}
      />
    </li>
  );
}