'use client'

import { useState } from 'react'
import { Eye, EyeSlash } from '@phosphor-icons/react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/**
 * A password field with a reveal toggle.
 *
 * Shared by /Login and /Signup because the failure it prevents is the same in
 * both: a mistyped password you cannot see. It matters most on signup, where
 * there is no second field to catch a typo and the mistake only surfaces later
 * as a login that will not work.
 *
 * The button lives inside the field so it cannot read as a submit control, and
 * it is type="button" so it never submits one.
 */
export function PasswordInput({
  className,
  ...props
}: React.ComponentProps<typeof Input>) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? 'text' : 'password'}
        className={cn('pr-11', className)}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        // The label names the ACTION; aria-pressed carries the current state.
        // A screen reader should not have to infer that "Hide" implies visible.
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        aria-controls={props.id}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {visible ? (
          <EyeSlash size={18} weight="bold" aria-hidden="true" />
        ) : (
          <Eye size={18} weight="bold" aria-hidden="true" />
        )}
      </button>
    </div>
  )
}
