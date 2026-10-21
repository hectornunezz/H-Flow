import { AlertTriangle, CalendarClock } from 'lucide-react'

export type ExpiringAthleteCycle = {
  athleteId: string
  athleteName: string
  daysRemaining: number
}

type CycleExpirationAlertProps = {
  athletes: ExpiringAthleteCycle[]
}

export default function CycleExpirationAlert({
  athletes,
}: CycleExpirationAlertProps) {
  const expiringAthletes = athletes
    .filter(
      (athlete) =>
        Number.isInteger(athlete.daysRemaining) && athlete.daysRemaining < 7,
    )
    .sort((a, b) => a.daysRemaining - b.daysRemaining)

  if (expiringAthletes.length === 0) return null

  const hasExpired = expiringAthletes.some((athlete) => athlete.daysRemaining < 0)
  const title = hasExpired
    ? 'Hay microciclos que requieren renovación'
    : 'Microciclos próximos a finalizar'

  return (
    <aside
      role="status"
      aria-labelledby="cycle-expiration-title"
      className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.07] p-4 text-amber-50 shadow-lg shadow-black/10 backdrop-blur-xl sm:p-5"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/10 text-amber-300">
          {hasExpired ? (
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          ) : (
            <CalendarClock className="h-4 w-4" aria-hidden="true" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="cycle-expiration-title" className="text-sm font-bold">
            {title}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-amber-100/70">
            Revisa y renueva la planificación de estos atletas.
          </p>
          <ul className="mt-3 space-y-2">
            {expiringAthletes.map((athlete) => (
              <li
                key={athlete.athleteId}
                className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-amber-200/10 pt-2 text-xs"
              >
                <span className="font-semibold text-amber-50">{athlete.athleteName}</span>
                <span
                  className={
                    athlete.daysRemaining < 0
                      ? 'font-bold text-rose-300'
                      : 'font-bold text-amber-300'
                  }
                >
                  {athlete.daysRemaining < 0
                    ? 'Microciclo vencido'
                    : athlete.daysRemaining === 0
                      ? 'Finaliza hoy'
                      : `${athlete.daysRemaining} ${athlete.daysRemaining === 1 ? 'día' : 'días'} restantes`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  )
}
