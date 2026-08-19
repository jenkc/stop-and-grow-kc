"use client";

import { useState } from "react";
import {
  OrderEntryForm,
  type EntryTier,
  type EntryWindow,
} from "@/components/admin/order-entry-form";
import { RestaurantOrderForm } from "@/components/admin/restaurant-order-form";
import { cn } from "@/lib/utils";

/**
 * Two ways to enter an order, on one screen.
 *
 * A household buys a box at a set price; a restaurant buys arbitrary goods at a
 * price Scraps quoted. Those are different enough that one form serving both
 * would be mostly hidden fields — but they are the same task ("enter an order
 * that did not come through the site"), so they belong on the same route.
 *
 * Switching is local state rather than two routes: a half-typed order survives
 * a mis-tap, and a phone call does not get interrupted by a page load.
 */
export function NewOrderTabs({
  tiers,
  windows,
}: {
  tiers: EntryTier[];
  windows: EntryWindow[];
}) {
  const [tab, setTab] = useState<"box" | "restaurant">("box");

  return (
    <div>
      <div role="tablist" aria-label="Order type" className="mb-5 flex gap-2">
        <TabButton selected={tab === "box"} onSelect={() => setTab("box")} controls="panel-box">
          Box order
        </TabButton>
        <TabButton
          selected={tab === "restaurant"}
          onSelect={() => setTab("restaurant")}
          controls="panel-restaurant"
        >
          Restaurant order
        </TabButton>
      </div>

      {/* Both panels stay mounted — hidden, not unmounted — so switching tabs
          mid-call does not throw away what she has already typed. */}
      <div id="panel-box" role="tabpanel" hidden={tab !== "box"}>
        <OrderEntryForm tiers={tiers} windows={windows} />
      </div>
      <div id="panel-restaurant" role="tabpanel" hidden={tab !== "restaurant"}>
        <RestaurantOrderForm windows={windows} />
      </div>
    </div>
  );
}

function TabButton({
  selected,
  onSelect,
  controls,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  controls: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      aria-controls={controls}
      onClick={onSelect}
      className={cn(
        "min-h-11 px-4 text-sm font-medium transition-colors",
        "border-b-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        selected
          ? "border-primary text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
