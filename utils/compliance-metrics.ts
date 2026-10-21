export interface CoachMetrics {
  complianceRate: number
  totalAthletes: number
  pendingReviews: number
}

export function calculateCoachMetrics(
  athleteIds: readonly string[],
  reportAthleteIds: Iterable<string>,
): CoachMetrics {
  const athletes = new Set(athleteIds)
  const totalAthletes = athletes.size
  const athletesWithReports = new Set(
    [...reportAthleteIds].filter((athleteId) => athletes.has(athleteId)),
  )
  const completedReports = athletesWithReports.size

  return {
    complianceRate:
      totalAthletes === 0 ? 0 : Math.round((completedReports / totalAthletes) * 100),
    totalAthletes,
    pendingReviews: totalAthletes - completedReports,
  }
}
