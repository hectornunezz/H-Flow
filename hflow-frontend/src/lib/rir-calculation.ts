export function calculateRirDifference(targetRir: number, actualRir: number): number;
export function calculateRirDifference(targetRir: number, actualRir: null): null;
export function calculateRirDifference(
  targetRir: number,
  actualRir: number | null,
): number | null;
export function calculateRirDifference(
  targetRir: number,
  actualRir: number | null,
): number | null {
  if (actualRir === null) return null;
  return Number((actualRir - targetRir).toFixed(1));
}

export function calculateAverageRirDifference(
  reports: Array<{ targetRir: number; actualRir: number | null }>,
): number | null {
  const completedReports = reports.filter(
    (report): report is { targetRir: number; actualRir: number } =>
      report.actualRir !== null,
  );
  if (completedReports.length === 0) return null;

  const average =
    completedReports.reduce(
      (sum, report) => sum + report.actualRir - report.targetRir,
      0,
    ) / completedReports.length;
  return Number(average.toFixed(1));
}
