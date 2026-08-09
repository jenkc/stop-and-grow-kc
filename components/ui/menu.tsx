"use client"

import * as React from "react"
import { Menu as MenuPrimitive } from "@base-ui/react/menu"

import { cn } from "@/lib/utils"

/**
 * Dropdown menu over @base-ui/react/menu.
 *
 * Hand-written rather than pulled from the shadcn registry: the registry does
 * not serve a `base-luma` menu, so the styling here follows the conventions
 * already established in card.tsx and button.tsx instead — bg-card for the
 * surface, `ring-1 ring-foreground/5` + shadow-md for the edge, and the same
 * `hover:bg-muted` treatment the ghost Button uses for rows.
 *
 * Note the theme sets `--radius: 0` (globals.css) — square is deliberate here,
 * so the popup takes no rounding. rounded-4xl in this codebase is reserved for
 * buttons and cards, which opt into it explicitly.
 */

function Menu(props: React.ComponentProps<typeof MenuPrimitive.Root>) {
  return <MenuPrimitive.Root data-slot="menu" {...props} />
}

function MenuTrigger(props: React.ComponentProps<typeof MenuPrimitive.Trigger>) {
  return <MenuPrimitive.Trigger data-slot="menu-trigger" {...props} />
}

/**
 * Positioner + Popup in one component, since every call site wants both and
 * the two-element dance is pure boilerplate.
 *
 * `sideOffset={6}` clears the trigger without floating loose. The popup is
 * portaled, so it escapes the header's overflow and stacking context.
 */
function MenuContent({
  className,
  side = "bottom",
  align = "end",
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.Popup> & {
  side?: React.ComponentProps<typeof MenuPrimitive.Positioner>["side"]
  align?: React.ComponentProps<typeof MenuPrimitive.Positioner>["align"]
  sideOffset?: number
}) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        className="z-50"
      >
        <MenuPrimitive.Popup
          data-slot="menu-content"
          className={cn(
            "min-w-40 origin-(--transform-origin) bg-card p-1 text-sm text-card-foreground shadow-md ring-1 ring-foreground/5 outline-none dark:ring-foreground/10",
            // Base UI drives these from transitionStatus, so the popup fades
            // instead of snapping in. Kept short — this is a 3-item nav menu,
            // not a reveal.
            "transition-[opacity,transform] duration-150 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0",
            className
          )}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  )
}

/** A row that performs an action. For navigation use MenuLinkItem instead. */
function MenuItem({
  className,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.Item>) {
  return (
    <MenuPrimitive.Item
      data-slot="menu-item"
      className={cn(
        "flex w-full cursor-default items-center gap-2 px-3 py-2 text-left outline-none select-none data-[highlighted]:bg-muted data-[highlighted]:text-foreground [&_svg]:size-4 [&_svg]:shrink-0",
        className
      )}
      {...props}
    />
  )
}

/**
 * A row that navigates. Renders a real anchor, so middle-click and
 * open-in-new-tab work — which a MenuItem with an onClick would silently
 * break. Pass `render={<Link href="..." />}` to keep Next's client-side
 * routing.
 */
function MenuLinkItem({
  className,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.LinkItem>) {
  return (
    <MenuPrimitive.LinkItem
      data-slot="menu-link-item"
      className={cn(
        "flex w-full cursor-default items-center gap-2 px-3 py-2 text-left no-underline outline-none select-none data-[highlighted]:bg-muted data-[highlighted]:text-foreground [&_svg]:size-4 [&_svg]:shrink-0",
        className
      )}
      {...props}
    />
  )
}

function MenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.Separator>) {
  return (
    <MenuPrimitive.Separator
      data-slot="menu-separator"
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  )
}

export { Menu, MenuTrigger, MenuContent, MenuItem, MenuLinkItem, MenuSeparator }
