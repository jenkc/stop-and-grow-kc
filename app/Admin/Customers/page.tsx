import { createAdminClient } from "@/lib/supabase/admin";
import { Chip } from "@/components/ui/chip";
import { formatCents } from "@/lib/pricing";

/**
 * Who orders from Stop and Grow.
 *
 * Read-only on purpose. Everything here is either set by the customer at signup
 * or written back from their orders, so an edit form would be a second way for
 * the same field to change — and the one that goes stale. If an address is
 * wrong, the fix is their next order.
 *
 * Guests are included. Most orders are placed without an account, so a list of
 * only registered customers would answer "who has signed up", which is not the
 * question Scraps is asking when she looks someone up. Guest rows are grouped
 * by the contact details on the order itself.
 */

export const dynamic = "force-dynamic";

type Person = {
  key: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  hasAccount: boolean;
  isAdmin: boolean;
  orderCount: number;
  lifetimeCents: number;
  lastOrderAt: string | null;
};

function addressOf(r: {
  ship_street: string | null;
  ship_apt: string | null;
  ship_city: string | null;
}): string | null {
  const street = [r.ship_street, r.ship_apt].filter(Boolean).join(" ");
  return [street, r.ship_city].filter(Boolean).join(", ") || null;
}

export default async function Customers() {
  const admin = createAdminClient();

  const [{ data: customerRows }, { data: orderRows }] = await Promise.all([
    admin
      .from("customers")
      .select(
        "id, name, email, phone, is_admin, created_at, ship_street, ship_apt, ship_city",
      )
      .order("created_at", { ascending: false }),
    admin
      .from("orders")
      .select(
        "customer_id, contact_name, contact_email, contact_phone, total_cents, status, placed_at, ship_street, ship_apt, ship_city",
      )
      .neq("status", "cancelled")
      .order("placed_at", { ascending: false }),
  ]);

  const orders = orderRows ?? [];
  const people = new Map<string, Person>();

  // Account holders first, so a guest order that shares an email folds into the
  // account rather than creating a second entry for the same person.
  for (const c of customerRows ?? []) {
    people.set(c.id, {
      key: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      address: addressOf(c),
      hasAccount: true,
      isAdmin: c.is_admin,
      orderCount: 0,
      lifetimeCents: 0,
      lastOrderAt: null,
    });
  }

  const byEmail = new Map<string, string>();
  for (const p of people.values()) {
    if (p.email) byEmail.set(p.email.toLowerCase(), p.key);
  }

  for (const o of orders) {
    // An order knows its customer directly, or is matched by email, or stands
    // alone as a guest keyed by name. Name is the weakest key and the last
    // resort — two different Chrises would merge, which is why it is only used
    // when there is nothing better.
    const emailKey = o.contact_email?.toLowerCase();
    const key =
      o.customer_id ??
      (emailKey && byEmail.get(emailKey)) ??
      (emailKey ? `email:${emailKey}` : `name:${o.contact_name.toLowerCase()}`);

    let person = people.get(key);
    if (!person) {
      person = {
        key,
        name: o.contact_name,
        email: o.contact_email,
        phone: o.contact_phone,
        address: addressOf(o),
        hasAccount: false,
        isAdmin: false,
        orderCount: 0,
        lifetimeCents: 0,
        lastOrderAt: null,
      };
      people.set(key, person);
      if (emailKey) byEmail.set(emailKey, key);
    }

    person.orderCount += 1;
    person.lifetimeCents += o.total_cents;
    // Orders arrive newest-first, so the first one seen is the most recent.
    if (!person.lastOrderAt) {
      person.lastOrderAt = o.placed_at;
      // Backfill contact details a signup never collected.
      person.phone ||= o.contact_phone;
      person.address ||= addressOf(o);
    }
  }

  // Most orders first: the people she deals with most are the ones she looks up.
  const list = [...people.values()].sort(
    (a, b) => b.orderCount - a.orderCount || a.name.localeCompare(b.name),
  );

  const withOrders = list.filter((p) => p.orderCount > 0).length;

  return (
    <div className="py-4">
      <header className="mb-6">
        <h1 className="font-display text-3xl">Customers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {list.length} {list.length === 1 ? "person" : "people"} · {withOrders}{" "}
          {withOrders === 1 ? "has" : "have"} ordered
        </p>
      </header>

      {list.length === 0 ? (
        <div className="rounded-lg border border-border bg-card px-6 py-12 text-center">
          <h2 className="font-display text-xl">Nobody yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Customers appear here when they sign up or place an order.
          </p>
        </div>
      ) : (
        <>
          {/* Phone: cards, same reasoning as the orders screen. */}
          <ul className="space-y-3 sm:hidden">
            {list.map((p) => (
              <li
                key={p.key}
                className="rounded-lg border border-border bg-card p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-bold">{p.name}</p>
                    {p.email && (
                      <p className="truncate text-xs text-muted-foreground">
                        {p.email}
                      </p>
                    )}
                  </div>
                  <span className="figure shrink-0 font-bold">
                    {formatCents(p.lifetimeCents)}
                  </span>
                </div>
                {p.phone && (
                  <a
                    href={`tel:${p.phone}`}
                    className="mt-1 inline-block text-sm underline"
                  >
                    {p.phone}
                  </a>
                )}
                {p.address && (
                  <p className="mt-1 text-xs text-muted-foreground">{p.address}</p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <span>
                    {p.orderCount} {p.orderCount === 1 ? "order" : "orders"}
                  </span>
                  {p.isAdmin && <Chip status="pickup">Admin</Chip>}
                  {!p.hasAccount && <span>· guest</span>}
                </div>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line-mid text-left">
                  <Th>Name</Th>
                  <Th>Contact</Th>
                  <Th>Address</Th>
                  <Th className="text-right">Orders</Th>
                  <Th className="text-right">Lifetime</Th>
                </tr>
              </thead>
              <tbody>
                {list.map((p) => (
                  <tr key={p.key} className="border-b border-border">
                    <Td>
                      <span className="font-medium">{p.name}</span>
                      {p.isAdmin && (
                        <span className="ml-2 rounded bg-pickup-tint px-1.5 py-0.5 text-xs font-medium">
                          admin
                        </span>
                      )}
                      {!p.hasAccount && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          guest
                        </span>
                      )}
                    </Td>
                    <Td className="text-muted-foreground">
                      {p.email && <div className="truncate">{p.email}</div>}
                      {p.phone && <div>{p.phone}</div>}
                      {!p.email && !p.phone && "—"}
                    </Td>
                    <Td className="text-muted-foreground">{p.address ?? "—"}</Td>
                    <Td className="figure text-right">{p.orderCount}</Td>
                    <Td className="figure text-right font-medium">
                      {formatCents(p.lifetimeCents)}
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
