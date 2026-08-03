import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Standard page wrapper — centers content and fills the space between the
 * header and footer that layout.tsx provides.
 *
 * cn() merges, so a page with a legitimate difference can still pass its own
 * classes: <PageShell className="pt-20"> works, and a later `justify-start`
 * would override the default rather than fighting it.
 */
function PageShell({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="page-shell"
      className={cn(
        "flex flex-1 flex-col items-center justify-center",
        className
      )}
      {...props}
    />
  )
}

export { PageShell }
