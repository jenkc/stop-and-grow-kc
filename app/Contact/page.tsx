import { ContactForm } from "@/components/contact-form";
import { PageShell } from "@/components/page-shell";

export default async function Contact({
    searchParams,
}: {
    searchParams: Promise<{ sent?: string }>
}) {
    const { sent } = await searchParams

    // After a successful send the action redirects here with ?sent=1. Show the
    // notice instead of the form — re-submitting would only duplicate the message.
    if (sent) {
        return (
            <PageShell>
                <div className="w-full max-w-sm">
                    <h1 className="mb-6 text-3xl">Thanks — we got it</h1>
                    <p className="text-muted-foreground">
                        A real person reads these. We&rsquo;ll write back to the address you
                        gave us, usually within a day or two.
                    </p>
                </div>
            </PageShell>
        )
    }

    return (
        <PageShell>
            <ContactForm />
        </PageShell>
    )
}
