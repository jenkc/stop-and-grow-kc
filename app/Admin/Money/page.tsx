import { createAdminClient } from "@/lib/supabase/admin";
import { BatchPay, type OwedOrder } from "@/components/admin/batch-pay";
import { formatCents } from "@/lib/pricing";

/**
 * Money owed — BUILD-PLAN dashboard #3.
 *
 * Cancelled orders are excluded: nobody owes for an order that was called off.
 * Everything else that is not paid appears, delivered or not, because Scraps
 * collects at the door as often as after.
 */

export const dynamic = "force-dynamic";

export default async function Money() {
  const admin = createAdminClient();

  const { data } = await admin
    .from("orders")
    .select("id, order_number, contact_name, total_cents, fulfillment, status")
    .neq("payment_status", "paid")
    .neq("status", "cancelled")
    .order("placed_at", { ascending: true });

  const orders = (data ?? []) as OwedOrder[];
  const total = orders.reduce((sum, o) => sum + o.total_cents, 0);

  return (
    <div className="py-4">
      <header className="mb-6">
        <h1 className="font-display text-3xl">Money owed</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {orders.length} unpaid ·{" "}
          <span className="font-bold text-foreground">{formatCents(total)}</span>{" "}
          outstanding
        </p>
      </header>

      <BatchPay orders={orders} />
    </div>
  );
}