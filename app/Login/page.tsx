import { LoginForm } from "@/components/login-form";
import { PageShell } from "@/components/page-shell";

export default async function Login({
    searchParams,   
}: {
    searchParams: Promise<{ next?: string; error?: string; signedout?: string }>
}) {
    const { next, error, signedout } = await searchParams
    return (
        <PageShell>
            {signedout && (
                <p role="status" className="mb-4 max-w-sm rounded-md border border-primary/30 bg-primary/10 px-4 py-3 text-sm">
                    You&rsquo;re signed out. See you next time.
                </p>
            )}
            {error === 'used' && (
                <p role="alert" className="mb-4 max-w-sm text-sm">
                    That confirmation link was already used, which usually means your
                    email is confirmed. Log in below.
                </p>
            )}
            {error === 'link' && (
                <p role="alert" className="mb-4 max-w-sm text-sm text-destructive">
                    The link you clicked has expired or was already used. Log in, or sign up again.
                </p>
            )}
            {/* Deliberately not defaulted. An absent `next` has to reach the
                action as absent, so it can send admins to /Admin and everyone
                else to /Order. Substituting a default here would make every
                login look like an explicit request for that path. */}
            <LoginForm next={next} />
        </PageShell>
    )
}