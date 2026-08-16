import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminEmail } from "@/lib/access";

/**
 * Admin chrome.
 *
 * The gate lives here rather than in each page: one check, and a new admin
 * screen is protected by existing. Note this protects RENDERING only — every
 * Server Action in app/Admin/actions.ts re-checks for itself, because an action
 * is a public POST endpoint that never passes through this layout.
 */

/**
 * /Admin/New is deliberately absent: it is reached from the "New order" button
 * on the Orders page, not from here. Taking an order by phone starts from
 * looking at the week's orders, and the tab row is for the screens she moves
 * between during a delivery day.
 */
const TABS = [
  { href: "/Admin", label: "Orders" },
  { href: "/Admin/Runsheet", label: "Runsheet" },
  { href: "/Admin/Money", label: "Money" },
  { href: "/Admin/Cycle", label: "This week" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const email = await getAdminEmail();
  if (!email) redirect("/");

  return (
    <div className="flex w-full flex-1 flex-col">
      {/* Sticky so the tabs stay reachable while scrolling a long runsheet on a
          phone. print:hidden — a printed sheet needs the stops, not navigation. */}
      <header className="sticky top-0 z-20 border-b border-border bg-paper/95 backdrop-blur print:hidden">
        <nav className="mx-auto flex w-full max-w-5xl gap-1 overflow-x-auto px-3 py-2">
          {TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex min-h-11 items-center whitespace-nowrap rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-paper-2 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-3 pb-16">
        {children}
      </main>

      <p className="mx-auto w-full max-w-5xl px-3 pb-6 text-xs text-muted-foreground print:hidden">
        Signed in as {email}
      </p>
    </div>
  );
}