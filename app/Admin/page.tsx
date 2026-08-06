import { createClient } from "@/lib/supabase/server";
import { PageShell } from "@/components/page-shell";
import { redirect } from "next/navigation";

export default async function Admin() {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("is_admin");
    if (error || !data) redirect('/')

    return (
        <PageShell>
            <div className="flex flex-col items-center justify-center p-10">
                <h1 className="text-2xl font-bold mb-4">Admin Page</h1>
                <p className="mb-4">This page is for admin users only.</p>
            </div>
        </PageShell>
    );
}