import { PageShell } from "@/components/page-shell";

export default function HowItWorks() {
    return (
        <PageShell>
            <div className="flex flex-col items-center justify-center p-10">
                <h1 className="text-2xl font-bold mb-4">About</h1>
                <p className="mb-4">This is the about section.</p>
                <h1 className="text-2xl font-bold mb-4">How It Works</h1>
                <p className="mb-4">This is the how it works section.</p>
            </div>
        </PageShell>
    )
}