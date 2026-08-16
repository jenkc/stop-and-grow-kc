'use client';
import { useActionState } from 'react';
import { sendForm, type ContactState } from '@/app/Contact/actions';
import { Button } from '@/components/ui/button';
import {
    Field,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { LIMITS } from '@/lib/validation';

export function ContactForm() {
    const [state, formAction, pending] = useActionState<ContactState, FormData>(
        sendForm,
        {},
    );

    return (
        <form action={formAction} className="w-full max-w-sm">
            <h1 className="mb-6 text-3xl">Get in touch</h1>

            <FieldGroup>
                {/* maxLength mirrors LIMITS, which the Server Action enforces
                    again — the attribute is a convenience, never the check. */}
                <Field>
                    <FieldLabel htmlFor="name">Your name</FieldLabel>
                    <Input
                        id="name"
                        name="name"
                        type="text"
                        autoComplete="name"
                        maxLength={LIMITS.name}
                        required
                    />
                </Field>

                <Field>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
                    <Input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        maxLength={LIMITS.email}
                        required
                    />
                    <FieldDescription>So we can write back.</FieldDescription>
                </Field>

                <Field>
                    <FieldLabel htmlFor="subject">Subject</FieldLabel>
                    <Input
                        id="subject"
                        name="subject"
                        type="text"
                        maxLength={LIMITS.subject}
                    />
                    <FieldDescription>Optional.</FieldDescription>
                </Field>

                <Field>
                    <FieldLabel htmlFor="body">Message</FieldLabel>
                    <Textarea
                        id="body"
                        name="body"
                        rows={6}
                        maxLength={LIMITS.body}
                        required
                    />
                </Field>

                {/* Honeypot. Hidden from people, filled by bots that complete every
                    input — sendForm() drops the submission when it has a value.
                    aria-hidden and tabIndex keep it out of the accessibility tree and
                    the tab order, so a screen reader never announces it. Not
                    `display: none`: some bots skip what they can tell is hidden. */}
                <div className="absolute left-[-9999px]" aria-hidden="true">
                    <label htmlFor="website">Leave this field empty</label>
                    <input
                        id="website"
                        name="website"
                        type="text"
                        tabIndex={-1}
                        autoComplete="off"
                    />
                </div>

                {/* Only ever render a string — FieldError passes children straight
                    through, so an object here would show up as a literal "{}". */}
                <FieldError>
                    {typeof state?.error === 'string' ? state.error : null}
                </FieldError>

                <Button type="submit" size="lg" disabled={pending}>
                    {pending ? 'Sending…' : 'Send message'}
                </Button>
            </FieldGroup>
        </form>
    );
}
