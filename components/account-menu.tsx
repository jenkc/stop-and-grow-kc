"use client";

import Link from "next/link";
import { UserIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
    Menu,
    MenuContent,
    MenuItem,
    MenuLinkItem,
    MenuSeparator,
    MenuTrigger,
} from "@/components/ui/menu";

/**
 * The signed-in account dropdown: a person icon beside the theme toggle,
 * holding Order / Orders / Log out.
 *
 * A Client Component because the menu needs open/close state — but the sign-out
 * itself is still the `logout` Server Action, handed down as a prop. A Client
 * Component cannot import a server action module and keep it a server action,
 * so AuthNav (a Server Component) passes the bound reference in. That keeps
 * sign-out working exactly as it did from the plain form.
 */
export function AccountMenu({ logoutAction }: { logoutAction: () => void }) {
    return (
        <Menu>
            {/* size="icon" matches ThemeToggle, so the two sit as a matched
                pair rather than one text button and one icon. */}
            <MenuTrigger
                render={
                    <Button variant="ghost" size="icon" aria-label="Account menu">
                        <UserIcon size={20} />
                    </Button>
                }
            />
            <MenuContent>
                {/* LinkItem, not Item — these are real anchors, so middle-click
                    and open-in-new-tab behave. render={<Link/>} keeps Next's
                    client-side routing. */}
                <MenuLinkItem
                    render={<Link href="/My-Account">My Account</Link>}
                />
                <MenuLinkItem render={<Link href="/Order">Order a Box</Link>} />
                <MenuSeparator />
                {/* The Server Action still runs through a form submit, so
                    sign-out is a real POST rather than a click handler. */}
                <form action={logoutAction}>
                    <MenuItem
                        render={<button type="submit">Log out</button>}
                        className="w-full"
                    />
                </form>
            </MenuContent>
        </Menu>
    );
}
