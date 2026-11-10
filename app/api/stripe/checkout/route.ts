import Stripe from 'stripe'
import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { paymentsEnabled } from '@/utils/features'

export const runtime = 'nodejs'

function getRequiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Falta configurar la variable de entorno ${name}.`)
  return value
}

export async function POST() {
  if (!paymentsEnabled()) {
    return NextResponse.json({ error: 'Payments are disabled during the closed beta.' }, { status: 503 })
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      console.error('[stripe-checkout] No se pudo verificar la sesión:', authError.message)
      return NextResponse.json({ error: 'No se pudo verificar la sesión.' }, { status: 401 })
    }
    if (!user) {
      return NextResponse.json({ error: 'Debes iniciar sesión para contratar un plan.' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, email')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      console.error('[stripe-checkout] No se pudo verificar el perfil:', profileError.message)
      return NextResponse.json({ error: 'No se pudo verificar el perfil.' }, { status: 500 })
    }
    if (!profile || profile.role !== 'coach') {
      return NextResponse.json(
        { error: 'Solo los entrenadores pueden contratar un plan.' },
        { status: 403 },
      )
    }

    const stripe = new Stripe(getRequiredEnv('STRIPE_SECRET_KEY'))
    const appUrl = new URL(getRequiredEnv('NEXT_PUBLIC_APP_URL'))
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: getRequiredEnv('STRIPE_PRICE_ID'), quantity: 1 }],
      client_reference_id: user.id,
      customer_email: user.email ?? profile.email ?? undefined,
      metadata: { user_id: user.id, coach_id: user.id },
      subscription_data: {
        metadata: { user_id: user.id, coach_id: user.id },
      },
      success_url: new URL('/?subscription=success', appUrl).toString(),
      cancel_url: new URL('/?subscription=cancelled', appUrl).toString(),
    })

    if (!session.url) {
      throw new Error('Stripe no devolvió una URL de pago.')
    }

    return NextResponse.redirect(session.url, 303)
  } catch (error) {
    console.error(
      '[stripe-checkout] No se pudo iniciar el checkout:',
      error instanceof Error ? error.message : error,
    )
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error inesperado al iniciar el pago.' },
      { status: 500 },
    )
  }
}
