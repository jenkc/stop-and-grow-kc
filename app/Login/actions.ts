'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(_prev: unknown, formData: FormData) {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get('email') ?? ''),
    password: String(formData.get('password') ?? ''),
  })

  // Make a data pass-through to the client, so it can display a message.

  // Flat and specific enough to act on, without confirming which addresses
  // have accounts.
  if (error) return { error: 'That email and password do not match an account.' }

  // '/' with type 'layout' invalidates the root layout and everything nested
  // under it — the whole app. The session cookie just changed, so every cached
  // signed-out render has to go. No per-route call needed.
  revalidatePath('/', 'layout')
  // `next` is set by the proxy when it bounces someone off a protected route;
  // '/Order' is where they land on a plain login.
  redirect('/Order')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}