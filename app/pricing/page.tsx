import Link from 'next/link'
import { redirect } from 'next/navigation'
import { paymentsEnabled } from '@/utils/features'

export default function PricingPage() {
  if (!paymentsEnabled()) redirect('/login')

  return (
    <div className="min-h-screen bg-[#030712] text-white flex flex-col items-center justify-center p-6">
      <h1 className="text-3xl font-bold mb-4">Planes y Suscripción H-Flow</h1>
      <p className="text-slate-400 mb-6">La pasarela de pagos estará disponible próximamente.</p>
      <Link href="/" className="px-6 py-3 bg-gradient-to-r from-[#f97316] to-[#ea580c] text-[#030712] font-bold rounded-xl">
        Volver al Inicio
      </Link>
    </div>
  )
}
