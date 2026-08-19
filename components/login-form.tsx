'use client';
import Link from 'next/link';
import { useActionState, useState, useSyncExternalStore } from 'react';
import { login } from '@/app/Login/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/password-input';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';

/**
 * Where a remembered email is kept.
 *
 * Only the address, never the password — a password in localStorage is readable
 * by any script that ever runs on the page. Saving the password is the
 * browser's job, which is what autoComplete="current-password" asks it to do.
 */
const REMEMBERED_EMAIL = 'sgkc.email';

/**
 * localStorage read as an external store.
 *
 * useSyncExternalStore rather than useEffect + setState: it is the sanctioned
 * way to read something React does not own, and it takes a separate server
 * snapshot, so the server render and the first client render agree instead of
 * mismatching on hydration.
 *
 * Nothing else writes this key during a session, so subscribe is a no-op — the
 * value is read once and does not change underneath us.
 */
const NO_OP = () => () => {}

function useRememberedEmail(): string | null {
  return useSyncExternalStore(
    NO_OP,
    () => window.localStorage.getItem(REMEMBERED_EMAIL),
    () => null,
  )
}

export function LoginForm( { next }: { next?: string }) {
  const [ state, formAction, pending ] = useActionState(login, null)
  const saved = useRememberedEmail()

  // null means "she has not touched this field yet", so it still follows the
  // stored value. Once she types, her edit wins.
  const [emailEdit, setEmailEdit] = useState<string | null>(null)
  const [rememberEdit, setRememberEdit] = useState<boolean | null>(null)

  const email = emailEdit ?? saved ?? ''
  const remember = rememberEdit ?? saved !== null

  function onSubmit() {
    // Runs before the action. Unchecking forgets immediately, which is what
    // someone on a shared machine expects from unticking the box.
    if (remember && email.trim()) {
      window.localStorage.setItem(REMEMBERED_EMAIL, email.trim())
    } else {
      window.localStorage.removeItem(REMEMBERED_EMAIL)
    }
  }

  return (
    <form action={formAction} onSubmit={onSubmit} className="w-full max-w-sm">
        <h1 className="mb-6 text-3xl">Log in</h1>
        {/* Omitted entirely when there is no requested destination — an empty
            string would still submit the field, and the action needs to tell
            "go here" apart from "no preference". */}
        {next ? (
            <input
                type="hidden"
                name="next"
                value={next}
            />
        ) : null}
        <FieldGroup>
            <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                    type="email"
                    id="email"
                    name="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmailEdit(e.target.value)}
                />
            </Field>

            <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <PasswordInput
                    id="password"
                    name="password"
                    autoComplete="current-password"
                    required
                />
            </Field>

            <Field orientation="horizontal" className="mb-4 items-center gap-2">
                {/* Deliberately "remember my email", not "remember me": the
                    session already survives a browser restart via cookies, and
                    the password is the browser's to save. Promising more than
                    that would be a lie about where the password lives. */}
                <input
                    type="checkbox"
                    id="remember"
                    checked={remember}
                    onChange={(e) => setRememberEdit(e.target.checked)}
                    className="size-4 accent-primary"
                />
                <FieldLabel htmlFor="remember" className="mb-0! font-normal">
                    Remember my email on this device
                </FieldLabel>
            </Field>

            {/* String-only, for the same reason as the signup form. */}
            <FieldError>
              {typeof state?.error === 'string' ? state.error : null}
            </FieldError>

            <Button type="submit" size="lg" disabled={pending}>
                {pending ? 'Logging in...' : 'Log in'}
            </Button>
        </FieldGroup>

        <p className="mt-4 text-sm text-muted-foreground">
            No account yet?{' '}
            <Link href="/Signup" className="underline">
                Sign up
            </Link>
            .
        </p>
        <p className="text-sm mt-2 text-muted-foreground">
            Or, skip sign in and{' '}<Link href='/Order' className="underline">order as a guest</Link>.
        </p>
       
    </form>
  )
}