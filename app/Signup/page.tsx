import { SignupForm } from "@/components/signup-form";
import { PageShell } from "@/components/page-shell";

export default async function Signup({
    searchParams,
}: {
    searchParams: Promise<{ check?: string }>
}) {
    const { check } = await searchParams

    // After a successful signup the action redirects here with ?check=1. Show the
    // notice instead of the form — re-submitting would only error.
    if (check) {
        return (
            <PageShell>
                <div className="w-full max-w-sm">
                    <h1 className="mb-6 text-3xl">Check your email</h1>
                    <p className="text-muted-foreground">
                        There&rsquo;s a link in it that finishes the signup. It can take a
                        minute to arrive.
                    </p>
                </div>
            </PageShell>
        )
    }

    return (
        <PageShell>
            <SignupForm />
        </PageShell>
    )
}
