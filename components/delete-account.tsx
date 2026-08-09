'use client';

import { useActionState, useState } from 'react';
import { deleteAccount } from '@/app/My-Account/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';

/**
 * Danger zone: permanent account deletion, gated behind typing the account's
 * own email address.
 *
 * Two steps on purpose. The button alone only reveals the form; nothing is
 * destroyed until the address is typed exactly and the second button is
 * pressed. The server re-checks that value against the session email, so this
 * is a usability guard rather than the security boundary.
 */
export function DeleteAccount({ email }: { email: string }) {
    const [confirming, setConfirming] = useState(false);
    const [state, formAction, pending] = useActionState(deleteAccount, null);

    return (
        <section className="mt-12 border-t border-destructive/30 pt-6">
            <h2 className="text-destructive">Danger zone</h2>
            <p className="mt-1 mb-4 text-sm text-muted-foreground">
                Deleting your account removes your sign-in and clears your
                personal details. Your past orders stay in our records for
                accounting, but are no longer linked to you. This cannot be
                undone.
            </p>

            {!confirming ? (
                <Button
                    variant="destructive"
                    size="lg"
                    onClick={() => setConfirming(true)}
                >
                    Delete my account
                </Button>
            ) : (
                <form action={formAction} className="w-full max-w-sm">
                    <Field>
                        <FieldLabel htmlFor="confirmEmail">
                            Type <span className="font-medium">{email}</span> to
                            confirm
                        </FieldLabel>
                        <Input
                            type="email"
                            id="confirmEmail"
                            name="confirmEmail"
                            autoComplete="off"
                            required
                        />
                    </Field>

                    {/* String-only, same as the login and signup forms. */}
                    <FieldError>
                        {typeof state?.error === 'string' ? state.error : null}
                    </FieldError>

                    <div className="mt-4 flex flex-wrap gap-3">
                        <Button
                            type="submit"
                            variant="destructive"
                            size="lg"
                            disabled={pending}
                        >
                            {pending ? 'Deleting...' : 'Permanently delete'}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="lg"
                            disabled={pending}
                            onClick={() => setConfirming(false)}
                        >
                            Cancel
                        </Button>
                    </div>
                </form>
            )}
        </section>
    );
}
