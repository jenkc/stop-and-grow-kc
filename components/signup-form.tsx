'use client'
import Link from 'next/link'
import { useActionState } from 'react'
import { signup } from '@/app/Signup/actions'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'

export function SignupForm() {
  const [state, signupAction, pending] = useActionState(signup, null)

  return (
    <form action={signupAction} className="w-full max-w-sm">
      <h1 className="mb-6 text-3xl">Make an account</h1>

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="name">Your name</FieldLabel>
          <Input id="name" name="name" type="text" autoComplete="name" required />
        </Field>

        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>

        <Field>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          {/* new-password, not current-password — otherwise password managers
              offer a saved login instead of generating one. */}
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={6}
            required
          />
          <FieldDescription>At least 6 characters.</FieldDescription>
        </Field>

        {/* Only ever render a string — FieldError passes children straight
            through, so an object here would show up as a literal "{}". */}
        <FieldError>
          {typeof state?.error === 'string' ? state.error : null}
        </FieldError>

        <Button type="submit" size="lg" disabled={pending}>
          {pending ? 'Making your account…' : 'Sign up'}
        </Button>
      </FieldGroup>

      <p className="mt-6 text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/Login" className="underline">
          Log in
        </Link>
        .
      </p>
    </form>
  )
}
