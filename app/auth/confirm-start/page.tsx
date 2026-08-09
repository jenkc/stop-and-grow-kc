import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";

/**
 * Interstitial between the confirmation email and /auth/confirm.
 *
 * Confirmation tokens are single-use. Mail scanners, link-preview generators
 * and some security software fetch every URL in an incoming message, which
 * spends the token before the recipient ever clicks — they then land on
 * "link expired" for a link they never used.
 *
 * This page carries the token in a form instead. A scanner following the link
 * renders this page and stops; only a real click POSTs to /auth/confirm and
 * spends the token. Supabase recommends this shape for exactly that reason.
 */
export default async function ConfirmStart({
    searchParams,
}: {
    searchParams: Promise<{ token_hash?: string; type?: string; next?: string }>
}) {
    const { token_hash, type, next } = await searchParams;

    if (!token_hash || !type) {
        return (
            <PageShell className="px-6 py-16">
                <div className="w-full max-w-sm">
                    <h1 className="mb-4">Something&rsquo;s missing</h1>
                    <p className="text-muted-foreground">
                        That confirmation link looks incomplete. Try the link in your email
                        again, or sign up once more.
                    </p>
                </div>
            </PageShell>
        );
    }

    return (
        <PageShell className="px-6 py-16">
            <div className="w-full max-w-sm">
                <h1 className="mb-4">Confirm your email</h1>
                <p className="mb-6 text-muted-foreground">
                    One click and your Stop and Grow account is ready.
                </p>

                {/* GET, not POST: /auth/confirm is a GET handler, and the values
                    ride along as query params exactly as it expects. The point is
                    only that a human has to press the button. */}
                <form action="/auth/confirm" method="get">
                    <input type="hidden" name="token_hash" value={token_hash} />
                    <input type="hidden" name="type" value={type} />
                    {next && <input type="hidden" name="next" value={next} />}
                    <Button type="submit" size="lg">
                        Confirm my email
                    </Button>
                </form>
            </div>
        </PageShell>
    );
}
