'use client';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';

export default async function ContactForm( { next }: { next:string }) {
    const [state, formAction, pending] = useActionState(sendForm, null);
}