import { createAdminClient } from "@/lib/supabase/admin";
import {
  OrderEntryForm,
  type EntryTier,
  type EntryWindow,
} from "@/components/admin/order-entry-form";

/**
 * Entering an order that did not come through the website — a phone call, a
 * text, someone catching Scraps at the market.
 *
 * Windows are offered from every cycle that has them, not just the open one.
 * That is the point of this screen: a call after ordering closes still needs
 * somewhere to go, and forcing it into the closed week would be worse than
 * letting her file it into the next one.
 */

export const dynamic = "force-dynamic";

export default async function NewOrder() {
  const admin = createAdminClient();

  const [{ data: tiers }, { data: windows }] = await Promise.all([
    admin
      .from("box_tiers")
      .select("id, name, price_cents")
      .eq("active", true)
      .order("sort_order"),
    admin
      .from("delivery_windows")
      .select("id, kind, label, starts_at, distribution_cycles(title, cycle_date, status)")
      .order("starts_at"),
  ]);

  const entryWindows: EntryWindow[] = (windows ?? []).map((w) => {
    const cycle = w.distribution_cycles as unknown as {
      title: string | null;
      cycle_date: string;
      status: string;
    } | null;
    return {
      id: w.id,
      kind: w.kind as "pickup" | "delivery",
      label: w.label,
      // The cycle is named in the option because she may be filing into a week
      // that is not the open one — "which week is this?" has to be answerable
      // without leaving the form.
      cycle_title: cycle?.title ?? cycle?.cycle_date ?? "Week",
    };
  });

  return (
    <div className="py-4">
      <header className="mb-6">
        <h1 className="font-display text-3xl">New order</h1>
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">
          For orders taken by phone, text, or in person. This works whether or
          not ordering is open to the public.
        </p>
      </header>

      <OrderEntryForm tiers={(tiers ?? []) as EntryTier[]} windows={entryWindows} />
    </div>
  );
}
