"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { SunIcon, MoonIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

/** No-op subscribe: the value never changes after hydration. */
const emptySubscribe = () => () => {};

export function ThemeToggle() {
    const { resolvedTheme, setTheme } = useTheme();

    // false on the server and during hydration, true once mounted on the client.
    // useSyncExternalStore is built for exactly this server/client split, so it
    // avoids the cascading render that setState-in-an-effect causes.
    const mounted = useSyncExternalStore(
        emptySubscribe,
        () => true,
        () => false
    );

    const isDark = resolvedTheme === "dark";

    return (
        <Button
            variant="ghost"
            size="icon"
            aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
            onClick={() => setTheme(isDark ? "light" : "dark")}
        >
            {mounted && (isDark ? <SunIcon size={20} /> : <MoonIcon size={20} />)}
        </Button>
    );
}