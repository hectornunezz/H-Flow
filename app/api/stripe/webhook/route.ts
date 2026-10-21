import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

function getRequiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Falta configurar la variable de entorno ${name}.`)
  return value
}

export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Falta la firma de Stripe.' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    const stripe = new Stripe(getRequiredEnv('STRIPE_SECRET_KEY'))
    const payload = await request.text()
    event = stripe.webhooks.constructEvent(
      payload,
      signature,
      getRequiredEnv('STRIPE_WEBHOOK_SECRET'),
    )
  } catch (error) {
    console.error(
      '[stripe-webhook] Firma o configuración no válida:',
      error instanceof Error ? error.message : error,
    )
    return NextResponse.json({ error: 'Webhook no válido.' }, { status: 400 })
  }

  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true })
  }

  const session = event.data.object
  if (session.mode !== 'subscription') {
    return NextResponse.json({ received: true })
  }

  const coachId = session.client_reference_id ?? session.metadata?.coach_id
  if (!coachId) {
    console.error('[stripe-webhook] La sesión no contiene el identificador del entrenador.')
    return NextResponse.json({ error: 'Falta el identificador del entrenador.' }, { status: 400 })
  }

  try {
    const supabase = createClient(
      getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
      getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
      { auth: { persistSession: false, autoRefreshToken: false } },
    )
    const { data: profile, error } = await supabase
      .from('profiles')
      .update({ is_subscribed: true })
      .eq('id', coachId)
      .eq('role', 'coach')
      .select('id')
      .maybeSingle()

    if (error) {
      throw new Error(`No se pudo actualizar la suscripción: ${error.message}`)
    }
    if (!profile) {
      throw new Error('No se encontró el perfil del entrenador de la sesión.')
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error(
      '[stripe-webhook] Error procesando checkout.session.completed:',
      error instanceof Error ? error.message : error,
    )
    return NextResponse.json({ error: 'No se pudo procesar el evento.' }, { status: 500 })
  }
}
