'use server'

import Stripe from 'stripe'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

function getRequiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Falta configurar la variable de entorno ${name}.`)
  return value
}

export async function createCheckoutSession(): Promise<void> {
  let checkoutUrl: string

  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      throw new Error(`No se pudo verificar la sesión: ${authError.message}`)
    }
    if (!user) {
      throw new Error('Debes iniciar sesión para contratar un plan.')
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, email')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      throw new Error(`No se pudo verificar el perfil: ${profileError.message}`)
    }
    if (!profile || profile.role !== 'coach') {
      throw new Error('Solo los entrenadores pueden contratar un plan.')
    }

    const stripe = new Stripe(getRequiredEnv('STRIPE_SECRET_KEY'))
    const appUrl = new URL(getRequiredEnv('NEXT_PUBLIC_APP_URL'))
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: getRequiredEnv('STRIPE_PRICE_ID'), quantity: 1 }],
      client_reference_id: user.id,
      customer_email: user.email ?? profile.email ?? undefined,
      metadata: { coach_id: user.id },
      subscription_data: { metadata: { coach_id: user.id } },
      success_url: new URL('/?subscription=success', appUrl).toString(),
      cancel_url: new URL('/?subscription=cancelled', appUrl).toString(),
    })

    if (!session.url) {
      throw new Error('Stripe no devolvió una URL de pago.')
    }

    checkoutUrl = session.url
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Error inesperado al iniciar el pago.'
    console.error('[createCheckoutSession]', message)
    throw new Error(message)
  }

  redirect(checkoutUrl)
}
