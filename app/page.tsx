import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/page-shell";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  // Signed-out visitors go to /Login, which still offers "order as a guest".
  // Sending a signed-in visitor to a login form is a dead end — they already
  // have a session, so they go straight to the order form.
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const orderHref = data?.claims?.sub ? "/Order" : "/Login";

  return (
    <PageShell>
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-center py-32 px-16">
        <Image
          src="/tomato_transp_bg_cropped.png"
          alt="Stop and Grow logo text"
          width={100}
          height={100}
          className="w-auto h-auto"
          priority
        />
        <Image
          src="/wordmark.png"
          alt="Stop and Grow logo text"
          width={545}
          height={218}
          className="h-auto w-auto max-w-[300px]"
          priority
        />
        <p className="text-lg text-center font-bold pt-5">
          KC Community Produce Distribution
        </p>

        {/* items-stretch, not items-center: the buttons are inline-flex and
            would otherwise each shrink to their own label, leaving
            "Restaurant Inquiries" wider than "Community Orders". Stretching
            makes both take the container width, so they match.

            The label overrides go on each Button: the base component sets
            `whitespace-nowrap`, and size="lg" pins `h-10`, so a two-line label
            would be clipped. `min-h-10 h-auto` lets the button grow instead,
            and py-2 keeps the padding even once it does. */}
        {/* w-fit shrinks the column to its widest child ("Restaurant
            Inquiries"), and items-stretch then pulls the shorter button out to
            match it — so both are exactly as wide as the longer label needs,
            no more. max-w-full keeps that from overflowing a narrow phone.
            px-2 (8px) replaces the base px-4, for a snug fit around the text. */}
        <div className="flex w-fit max-w-full flex-col items-stretch gap-4 p-5">
          <Button size="lg" nativeButton={false}
          className="h-auto min-h-10 px-3.5 py-3 text-center whitespace-normal"
          render={<Link href={orderHref}>Community Orders</Link>}
          />
          <Button size="lg" nativeButton={false}
          className="h-auto min-h-10 px-3.5 py-3 text-center whitespace-normal"
          render={<Link href="/HowItWorks">Restaurant Inquiries</Link>}
          />
        </div>
      </main>
    </PageShell>
  );
}
