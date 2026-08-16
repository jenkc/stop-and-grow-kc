import { createAdminClient } from "@/lib/supabase/admin";
import { StopCard, type Stop } from "@/components/admin/stop-card";

/**
 * Delivery day.
 *
 * Grouped by window and ordered by starts_at — never by label, which sorts
 * "11am-1pm" between "10:00-12:30pm" and "4-6pm" because it is a string.
 *
 * Read through createAdminClient(): there is no admin-write RLS in this schema
 * and the read policies are scoped to the signed-in customer, so the service
 * role is how an admin sees everyone's orders. The layout has already
 * established the caller is an admin.
 */

export const dynamic = "force-dynamic";

type WindowGroup = {
  id: string;
  label: string;
  kind: string;
  starts_at: string;
  stops: Stop[];
};

const STOP_FIELDS = `
  id, order_number, contact_name, contact_phone,
  ship_street, ship_apt, ship_city, ship_state, ship_zip,
  dietary_notes, notes, total_cents, status, payment_status,
  fulfillment, window_id,
  order_items ( description, quantity )
`;

export default async function Runsheet() {
  const admin = createAdminClient();

  const { data: cycle } = await admin
    .from("distribution_cycles")
    .select("id, cycle_date, title, status")
    .in("status", ["open", "closed"])
    .order("cycle_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!cycle) {
    return (
      <EmptyState
        title="No active week"
        body="Create this week under “This week” before the runsheet has anything to show."
      />
    );
  }

  const { data: windows } = await admin
    .from("delivery_windows")
    .select("id, label, kind, starts_at")
    .eq("cycle_id", cycle.id)
    .order("starts_at");

  // Cancelled orders are excluded: they are not stops. The rows survive in the
  // database — cancelling keeps the record, it just leaves the route.
  const { data: liveOrders } = await admin
    .from("orders")
    .select(STOP_FIELDS)
    .neq("status", "cancelled")
    .order("contact_name");

  const stops = (liveOrders ?? []) as unknown as (Stop & { window_id: string | null })[];

  const groups: WindowGroup[] = (windows ?? []).map((w) => ({
    id: w.id,
    label: w.label,
    kind: w.kind,
    starts_at: w.starts_at,
    stops: stops.filter((s) => s.window_id === w.id),
  }));

  const deliveries = groups.filter((g) => g.kind === "delivery");
  const pickups = groups.filter((g) => g.kind === "pickup");
  const unassigned = stops.filter((s) => !s.window_id);

  const total = stops.length;

  return (
    <div className="py-4">
      <header className="mb-6">
        <h1 className="font-display text-3xl">Runsheet</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {cycle.title ?? cycle.cycle_date} · {total}{" "}
          {total === 1 ? "order" : "orders"}
        </p>
      </header>

      {total === 0 ? (
        <EmptyState
          title="No orders yet"
          body="Orders will appear here as they come in."
        />
      ) : (
        <div className="space-y-10">
          <Section title="Deliveries" groups={deliveries} />
          <Section title="Pickups" groups={pickups} />

          {unassigned.length > 0 && (
            <section>
              <h2 className="mb-3 font-display text-xl">No time set</h2>
              <ul className="space-y-3">
                {unassigned.map((s) => (
                  <StopCard key={s.id} stop={s} />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, groups }: { title: string; groups: WindowGroup[] }) {
  const withStops = groups.filter((g) => g.stops.length > 0);
  if (withStops.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3 font-display text-xl">{title}</h2>
      <div className="space-y-6">
        {withStops.map((group) => (
          <div key={group.id}>
            {/* The window label is the organising fact of the page, so it gets
                a rule and weight rather than being a small caption. */}
            <div className="mb-2 flex items-baseline justify-between border-b border-line-mid pb-1">
              <h3 className="text-lg font-bold">{group.label}</h3>
              <span className="text-sm text-muted-foreground">
                {group.stops.length} {group.stops.length === 1 ? "stop" : "stops"}
              </span>
            </div>
            <ul className="space-y-3">
              {group.stops.map((stop) => (
                <StopCard key={stop.id} stop={stop} />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-6 py-12 text-center">
      <h2 className="font-display text-xl">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">{body}</p>
    </div>
  );
}