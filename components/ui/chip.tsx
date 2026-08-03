import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Status chip — the color-coded vocabulary from the design system.
 *
 * The visual styles live in globals.css (.chip / .chip-*) because the palette,
 * tints, and their contrast-tuned text colors are defined there. This wrapper
 * exists so status is a typed prop instead of a hand-written class: a bad
 * `status` fails at compile time, where a typo'd "chip-payed" would fail
 * silently. The admin screens render these constantly.
 */
const chipVariants = cva("chip", {
  variants: {
    status: {
      paid: "chip-paid",
      cash: "chip-cash",
      unpaid: "chip-unpaid",
      delivery: "chip-delivery",
      pickup: "chip-pickup",
    },
  },
  defaultVariants: {
    status: "unpaid",
  },
})

function Chip({
  className,
  status,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof chipVariants>) {
  return (
    <span
      data-slot="chip"
      data-status={status}
      className={cn(chipVariants({ status }), className)}
      {...props}
    />
  )
}

export { Chip, chipVariants }
