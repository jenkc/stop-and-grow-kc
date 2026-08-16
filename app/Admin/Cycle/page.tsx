import { createAdminClient } from "@/lib/supabase/admin";
import { nextWednesday } from "@/lib/week";
import {
  CreateCycleForm,
  AddWindowForm,
  OpenCloseButtons,
  DeleteWindowButton,
} from "@/components/admin/cycle-controls";

/**
 * This week.
 *
 * Nothing can be ordered until a cycle exists and Scraps opens it, so this is
 * the screen the whole ordering flow depends on. Times are entered fresh every
 * week rather than templated — they genuinely vary, and a template that is
 * usually wrong is worse than a blank field.
 *
 * A week is named for its Wednesday, the day she buys the vegetables. Deliveries
 * run Thursday to Saturday and are carried by delivery_windows, which is the only
 * place that can hold three days — cycle_date is a single `date` with a unique
 * index, so it identifies the week rather than describing when anything arrives.
 */

export const dynamic = "force-dynamic";

const STATUS_COPY: Record<string, string> = {
  draft: "Not visible to customers yet.",
  open: "The order form is live.",
  closed: "No new orders. Existing ones are unaffected.",
  fulfilled: "This week is finished.",
};

export default async function Cycle() {
  const admin = createAdminClient();

  const { data: cycles } = await admin
    .from("distribution_cycles")
    .select("id, cycle_date, title, status")
    .order("cycle_date", { ascending: false })
    .limit(5);

  const list = cycles ?? [];
  const current = list[0];

  const { data: windows } = current
    ? await admin
        .from("delivery_windows")
        .select("id, kind, label, starts_at")
        .eq("cycle_id", current.id)
        .order("starts_at")
    : { data: [] };

  const { data: bookedRows } = current
    ? await admin.from("orders").select("window_id").neq("status", "cancelled")
    : { data: [] };

  const bookedCount = new Map<string, number>();
  for (const row of bookedRows ?? []) {
    if (row.window_id) {
      bookedCount.set(row.window_id, (bookedCount.get(row.window_id) ?? 0) + 1);
    }
  }

  return (
    <div className="space-y-6 py-4">
      <header>
        <h1 className="font-display text-3xl">This week</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Set the times, then open ordering.
        </p>
      </header>

      {current ? (
        <section className="rounded-lg border border-border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl">
                {current.title ?? current.cycle_date}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {current.cycle_date} ·{" "}
                <span className="font-medium text-foreground">
                  {current.status}
                </span>{" "}
                — {STATUS_COPY[current.status]}
              </p>
            </div>
            <OpenCloseButtons cycleId={current.id} status={current.status} />
          </div>

          <div className="mt-5">
            <h3 className="mb-2 font-medium">Times</h3>
            {(windows ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No times yet. Add at least one before opening ordering, or
                customers will have nothing to choose.
              </p>
            ) : (
              <ul className="divide-y divide-border rounded-md border border-border">
                {(windows ?? []).map((w) => {
                  const booked = bookedCount.get(w.id) ?? 0;
                  return (
                    <li
                      key={w.id}
                      className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
                    >
                      <span>
                        <span className="font-medium">{w.label}</span>
                        <span className="ml-2 text-sm text-muted-foreground">
                          {w.kind}
                          {booked > 0 &&
                            ` · ${booked} order${booked === 1 ? "" : "s"}`}
                        </span>
                      </span>
                      <DeleteWindowButton windowId={w.id} />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      ) : (
        <p className="rounded-lg border border-border bg-card px-6 py-8 text-center text-sm text-muted-foreground">
          No weeks yet. Create one to start taking orders.
        </p>
      )}

      {current && <AddWindowForm cycleId={current.id} />}

      {/* force-dynamic above, so this is recomputed per request rather than
          frozen at build time into a Wednesday that goes stale. */}
      <CreateCycleForm defaultCycleDate={nextWednesday()} />

      {list.length > 1 && (
        <section>
          <h2 className="mb-2 font-display text-xl">Earlier weeks</h2>
          <ul className="divide-y divide-border rounded-md border border-border">
            {list.slice(1).map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between px-3 py-2 text-sm"
              >
                <span>{c.title ?? c.cycle_date}</span>
                <span className="text-muted-foreground">{c.status}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}