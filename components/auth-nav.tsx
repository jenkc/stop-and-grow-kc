import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/Login/actions";
import { AccountMenu } from "@/components/account-menu";

/**
 * The signed-in/signed-out half of the header nav.
 *
 * Separate from the root layout on purpose: reading auth means reading
 * cookies(), and awaiting that at the top of the layout would hold {children}
 * — every page on the site — behind a cookie read plus a JWT verification.
 * Isolated here behind the layout's <Suspense>, the rest of the shell renders
 * without waiting on Supabase.
 *
 * This does NOT keep pages statically prerendered: that needs
 * `cacheComponents: true` in next.config.ts, which we do not set. Any route
 * rendering this is dynamic. The win is streaming order and locality.
 *
 * Staleness is handled by the callers: login() and logout() both
 * revalidatePath('/', 'layout'), which invalidates this subtree, so the nav
 * never shows a signed-out state to someone who just signed in.
 */
export async function AuthNav() {
    const supabase = await createClient();

    // getClaims(), like everywhere else in this codebase — it verifies the JWT
    // signature locally instead of a round trip to /auth/v1/user. This is
    // cosmetic nav only; the proxy is what actually guards /My-Account and
    // /Admin.
    const { data } = await supabase.auth.getClaims();
    const signedIn = Boolean(data?.claims?.sub);

    // Signed out, the menu would hold a single item, so skip it and show the
    // one link directly — one fewer click to reach the login form.
    if (!signedIn) {
        return (
            <Button
                variant="ghost"
                size="sm"
                nativeButton={false}
                render={<Link href="/Login">Log in</Link>}
            />
        );
    }

    // `logout` is passed down rather than imported by AccountMenu: that file is
    // a Client Component (the dropdown needs open/close state), and importing a
    // server action there would not keep it a server action. Handing over the
    // reference preserves the real form-submit sign-out.
    return <AccountMenu logoutAction={logout} />;
}

/**
 * Holds the header's height while the claims read resolves, so the row does
 * not jump when the Suspense boundary fills in. Deliberately blank rather than
 * a skeleton shimmer — this resolves in milliseconds and a pulse would be more
 * distracting than empty space.
 *
 * size-9 matches the icon Button the resolved menu trigger renders.
 */
export function AuthNavFallback() {
    return <div aria-hidden="true" className="size-9" />;
}
