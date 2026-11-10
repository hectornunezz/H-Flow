type ProgressCheckIn = {
  id: string;
  weight: number;
  bodyFat: number | null;
  createdAt: string;
};

type WeightProgressChartProps = {
  checkIns: ProgressCheckIn[];
};

const WIDTH = 800;
const HEIGHT = 300;
const LEFT = 58;
const RIGHT = 58;
const TOP = 24;
const BOTTOM = 42;
const PLOT_WIDTH = WIDTH - LEFT - RIGHT;
const PLOT_HEIGHT = HEIGHT - TOP - BOTTOM;

function getRange(values: number[]): [number, number] {
  if (values.length === 0) return [0, 1];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) {
    const padding = Math.max(Math.abs(min) * 0.05, 1);
    return [min - padding, max + padding];
  }
  const padding = (max - min) * 0.12;
  return [min - padding, max + padding];
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 }).format(value);
}

function formatShortDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short" }).format(date);
}

export function WeightProgressChart({ checkIns }: WeightProgressChartProps) {
  const chronological = checkIns
    .filter((checkIn) => Number.isFinite(checkIn.weight) && Number.isFinite(Date.parse(checkIn.createdAt)))
    .slice()
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));

  if (chronological.length === 0) {
    return (
      <div className="grid min-h-48 place-items-center rounded-xl border border-dashed border-line text-center">
        <div>
          <p className="text-sm font-medium">Aún no hay datos para la gráfica</p>
          <p className="mt-1 text-xs text-muted">Registra un check-in para iniciar el seguimiento.</p>
        </div>
      </div>
    );
  }

  const weights = chronological.map((checkIn) => checkIn.weight);
  const fatMeasurements = chronological.filter(
    (checkIn): checkIn is ProgressCheckIn & { bodyFat: number } =>
      typeof checkIn.bodyFat === "number" && Number.isFinite(checkIn.bodyFat),
  );
  const [minWeight, maxWeight] = getRange(weights);
  const [minFat, maxFat] = getRange(fatMeasurements.map((checkIn) => checkIn.bodyFat));
  const x = (index: number) =>
    chronological.length === 1
      ? LEFT + PLOT_WIDTH / 2
      : LEFT + (index / (chronological.length - 1)) * PLOT_WIDTH;
  const y = (value: number, min: number, max: number) =>
    TOP + ((max - value) / (max - min)) * PLOT_HEIGHT;
  const weightPath = chronological
    .map((checkIn, index) => `${index === 0 ? "M" : "L"} ${x(index)} ${y(checkIn.weight, minWeight, maxWeight)}`)
    .join(" ");
  const fatPath = fatMeasurements
    .map((checkIn, index) => {
      const sourceIndex = chronological.findIndex((item) => item.id === checkIn.id);
      return `${index === 0 ? "M" : "L"} ${x(sourceIndex)} ${y(checkIn.bodyFat, minFat, maxFat)}`;
    })
    .join(" ");
  const ticks = [0, 1, 2, 3].map((index) => index / 3);
  const dateIndices = Array.from(
    new Set([0, Math.floor((chronological.length - 1) / 2), chronological.length - 1]),
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
        <span className="inline-flex items-center gap-2 text-white">
          <span className="h-2 w-2 rounded-full bg-[#f97316] shadow-[0_0_10px_#f97316]" />
          Peso (kg)
        </span>
        <span className="inline-flex items-center gap-2 text-muted">
          <span className="h-2 w-2 rounded-full bg-orange-300 shadow-[0_0_10px_#fdba74]" />
          Grasa corporal (%)
        </span>
      </div>
      <div className="overflow-hidden rounded-xl border border-line bg-black/20 p-2 sm:p-4">
        <svg
          aria-label="Gráfica de evolución de peso y porcentaje graso"
          className="h-auto w-full overflow-visible"
          role="img"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        >
          <defs>
            <filter height="300%" id="weight-neon-glow" width="300%" x="-100%" y="-100%">
              <feGaussianBlur result="blur" stdDeviation="3" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {ticks.map((fraction) => {
            const gridY = TOP + fraction * PLOT_HEIGHT;
            const weightTick = maxWeight - fraction * (maxWeight - minWeight);
            return (
              <g key={fraction}>
                <line
                  stroke="rgba(255,255,255,0.08)"
                  strokeDasharray="3 7"
                  x1={LEFT}
                  x2={WIDTH - RIGHT}
                  y1={gridY}
                  y2={gridY}
                />
                <text fill="#8a8f9c" fontSize="12" textAnchor="end" x={LEFT - 10} y={gridY + 4}>
                  {formatNumber(weightTick)}
                </text>
                {fatMeasurements.length > 0 && (
                  <text
                    fill="#fdba74"
                    fontSize="12"
                    textAnchor="start"
                    x={WIDTH - RIGHT + 10}
                    y={gridY + 4}
                  >
                    {formatNumber(maxFat - fraction * (maxFat - minFat))}
                  </text>
                )}
              </g>
            );
          })}

          <path
            d={weightPath}
            fill="none"
            filter="url(#weight-neon-glow)"
            stroke="#f97316"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
          />
          {fatPath && (
            <path
              d={fatPath}
              fill="none"
              stroke="#fdba74"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          )}

          {chronological.map((checkIn, index) => (
            <g key={checkIn.id}>
              <circle
                cx={x(index)}
                cy={y(checkIn.weight, minWeight, maxWeight)}
                fill="#0D0F14"
                r="4.5"
                stroke="#f97316"
                strokeWidth="2.5"
              >
                <title>
                  {formatShortDate(checkIn.createdAt)} · {formatNumber(checkIn.weight)} kg
                </title>
              </circle>
              {typeof checkIn.bodyFat === "number" && Number.isFinite(checkIn.bodyFat) && (
                <circle
                  cx={x(index)}
                  cy={y(checkIn.bodyFat, minFat, maxFat)}
                  fill="#0D0F14"
                  r="3.5"
                  stroke="#fdba74"
                  strokeWidth="2"
                >
                  <title>
                    {formatShortDate(checkIn.createdAt)} · {formatNumber(checkIn.bodyFat)}% grasa
                  </title>
                </circle>
              )}
            </g>
          ))}

          {dateIndices.map((index) => (
            <text
              fill="#8a8f9c"
              fontSize="12"
              key={index}
              textAnchor={index === 0 ? "start" : index === chronological.length - 1 ? "end" : "middle"}
              x={x(index)}
              y={HEIGHT - 10}
            >
              {formatShortDate(chronological[index].createdAt)}
            </text>
          ))}
        </svg>
      </div>
      <p className="mt-2 text-xs text-muted">
        {chronological.length} {chronological.length === 1 ? "medición" : "mediciones"} ·{" "}
        <span className="text-[#f97316]">kg</span> eje izquierdo
        {fatMeasurements.length > 0 && (
          <>
            {" "}· <span className="text-orange-300">%</span> eje derecho
          </>
        )}
      </p>
    </div>
  );
}
