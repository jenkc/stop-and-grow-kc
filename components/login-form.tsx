'use client';
import Link from 'next/link';
import { useActionState } from 'react';
import { login } from '@/app/Login/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';

export function LoginForm( { next }: { next?: string }) {
  const [ state, formAction, pending ] = useActionState(login, null)

  return (
    <form action={formAction} className="w-full max-w-sm">
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
                />
            </Field>

            <Field className="mb-4">
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                    type="password"
                    id="password"
                    name="password"
                    autoComplete="current-password"
                    required
                />
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