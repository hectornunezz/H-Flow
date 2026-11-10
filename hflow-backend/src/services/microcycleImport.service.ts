export type ImportedMicrocycleExercise = {
  exercise: string;
  sets: number;
  targetReps: string;
  targetRir: string;
  rest: string;
  intensityTechnique: string | null;
  sourceRow: number;
};

export type ImportedMicrocycle = {
  number: number;
  exercises: ImportedMicrocycleExercise[];
};

export class MicrocycleImportError extends Error {
  constructor(
    message: string,
    public readonly details: string[] = [],
  ) {
    super(message);
    this.name = "MicrocycleImportError";
  }
}

type RequiredColumn =
  | "exercise"
  | "sets"
  | "targetReps"
  | "targetRir"
  | "rest"
  | "intensityTechnique";

type ColumnMap = Partial<Record<RequiredColumn, number>> & {
  microcycle?: number;
};

const REQUIRED_HEADERS: Record<RequiredColumn, { label: string; aliases: string[] }> = {
  exercise: {
    label: "Ejercicio",
    aliases: ["ejercicio", "exercise", "movimiento"],
  },
  sets: {
    label: "Series",
    aliases: ["series", "serie", "sets", "set"],
  },
  targetReps: {
    label: "Reps objetivo",
    aliases: ["repsobjetivo", "repeticionesobjetivo", "reps", "repeticiones", "targetreps"],
  },
  targetRir: {
    label: "RIR objetivo",
    aliases: ["rirobjetivo", "rir", "rirmeta", "targetrir"],
  },
  rest: {
    label: "Descanso",
    aliases: ["descanso", "descansoobjetivo", "rest", "resto"],
  },
  intensityTechnique: {
    label: "Técnica de Intensidad",
    aliases: [
      "tecnicadeintensidad",
      "tecnicadeintensidadobjetivo",
      "tecnica",
      "intensitytechnique",
      "intensitytechniques",
    ],
  },
};

const WEEK_HEADERS = ["microciclo", "semana", "week", "microcycle"];
const MAX_INPUT_LENGTH = 1_000_000;
const MAX_ROWS = 5_000;

function normalize(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function parseDelimitedLine(line: string, delimiter: string, lineNumber: number): string[] {
  const cells: string[] = [];
  let cell = "";
  let inQuotes = false;
  let quoteClosed = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (inQuotes) {
      if (character === '"') {
        if (line[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          inQuotes = false;
          quoteClosed = true;
        }
      } else {
        cell += character;
      }
      continue;
    }

    if (character === delimiter) {
      cells.push(cell.trim());
      cell = "";
      quoteClosed = false;
      continue;
    }
    if (character === '"' && !cell.trim() && !quoteClosed) {
      inQuotes = true;
      continue;
    }
    if (quoteClosed && !/\s/.test(character)) {
      throw new MicrocycleImportError("El importador encontró comillas mal formadas.", [
        `Fila ${lineNumber}: hay contenido después de cerrar un campo entre comillas.`,
      ]);
    }
    cell += character;
  }

  if (inQuotes) {
    throw new MicrocycleImportError("El importador encontró comillas sin cerrar.", [
      `Fila ${lineNumber}: el campo entre comillas no se cerró.`,
    ]);
  }
  cells.push(cell.trim());
  return cells;
}

function chooseDelimiter(lines: string[]): string {
  const tableLines = lines.filter(
    (line) => line.trim() && !/^\s*\|?[\s:|-]+\|?\s*$/.test(line),
  );
  const candidates = ["\t", ";", ",", "|"];
  return candidates.reduce((selected, candidate) => {
    const count = tableLines.reduce(
      (total, line) => total + line.split(candidate).length - 1,
      0,
    );
    const selectedCount = tableLines.reduce(
      (total, line) => total + line.split(selected).length - 1,
      0,
    );
    return count > selectedCount ? candidate : selected;
  }, "\t");
}

function parseInput(input: string): { rows: { cells: string[]; lineNumber: number }[] } {
  if (typeof input !== "string" || !input.trim()) {
    throw new MicrocycleImportError("Pega la tabla de microciclos que quieres importar.");
  }
  if (input.length > MAX_INPUT_LENGTH) {
    throw new MicrocycleImportError("El contenido supera el límite de 1 MB.");
  }

  const lines = input.replace(/^\uFEFF/, "").split(/\r\n?|\n/);
  const delimiter = chooseDelimiter(lines);
  const rows: { cells: string[]; lineNumber: number }[] = [];

  lines.forEach((line, index) => {
    if (!line.trim() || /^\s*\|?[\s:|-]+\|?\s*$/.test(line)) return;
    const row = parseDelimitedLine(line, delimiter, index + 1);
    if (delimiter === "|" && row[0] === "") row.shift();
    if (delimiter === "|" && row[row.length - 1] === "") row.pop();
    if (row.some((cell) => cell.trim())) {
      rows.push({ cells: row.map((cell) => cell.trim()), lineNumber: index + 1 });
    }
  });

  if (rows.length > MAX_ROWS + 100) {
    throw new MicrocycleImportError(`El importador admite un máximo de ${MAX_ROWS} filas de datos.`);
  }
  return { rows };
}

function findMicrocycleMarker(row: string[]): { number: number; column: number } | undefined {
  for (let column = 0; column < row.length; column += 1) {
    const normalized = normalize(row[column]);
    const match = normalized.match(/^(?:microciclo|microcycle|semana|week)(\d+)$/);
    if (match) return { number: Number(match[1]), column };
  }
  return undefined;
}

function createColumnMap(row: string[]): { columns: ColumnMap; missing: string[] } | undefined {
  const normalizedHeaders = row.map(normalize);
  const columns: ColumnMap = {};
  const duplicates: string[] = [];
  let requiredHeaderFound = false;

  for (const [key, definition] of Object.entries(REQUIRED_HEADERS) as [
    RequiredColumn,
    (typeof REQUIRED_HEADERS)[RequiredColumn],
  ][]) {
    if (normalizedHeaders.some((header) => definition.aliases.includes(header))) {
      requiredHeaderFound = true;
    }
    const matches = normalizedHeaders
      .map((header, index) => (definition.aliases.includes(header) ? index : -1))
      .filter((index) => index >= 0);
    if (matches.length > 1) duplicates.push(definition.label);
    else if (matches.length === 1) columns[key] = matches[0];
  }

  const weekColumns = normalizedHeaders
    .map((header, index) => (WEEK_HEADERS.includes(header) ? index : -1))
    .filter((index) => index >= 0);
  if (weekColumns.length > 1) duplicates.push("Microciclo");
  if (weekColumns.length === 1) columns.microcycle = weekColumns[0];
  if (!requiredHeaderFound) return undefined;

  const missing = (Object.keys(REQUIRED_HEADERS) as RequiredColumn[])
    .filter((key) => columns[key] === undefined)
    .map((key) => REQUIRED_HEADERS[key].label);

  if (duplicates.length) {
    return { columns, missing: [`Cabeceras duplicadas: ${duplicates.join(", ")}`] };
  }
  if (missing.length === 0) return { columns, missing };
  if (Object.keys(columns).length > 0) return { columns, missing };
  return undefined;
}

function parseWeekValue(value: string): number | undefined {
  const normalized = normalize(value);
  const match = normalized.match(/^(?:(?:microciclo|microcycle|semana|week))?([1-6])$/);
  return match ? Number(match[1]) : undefined;
}

function parseExercise(
  row: string[],
  columns: ColumnMap,
  sourceRow: number,
  week: number,
): { exercise?: ImportedMicrocycleExercise; errors: string[] } {
  const cell = (column: keyof ColumnMap) => {
    const index = columns[column];
    return index === undefined ? "" : (row[index] ?? "").trim();
  };
  const errors: string[] = [];
  const exercise = cell("exercise");
  const rawSets = cell("sets");
  const sets = Number(rawSets);
  const targetReps = cell("targetReps");
  const targetRir = cell("targetRir");
  const rest = cell("rest");
  const rawTechnique = cell("intensityTechnique");

  if (!exercise) errors.push("Ejercicio es obligatorio.");
  if (!/^[1-9]\d*$/.test(rawSets) || !Number.isSafeInteger(sets) || sets > 50) {
    errors.push("Series debe ser un entero entre 1 y 50.");
  }
  if (!targetReps || targetReps.length > 40) {
    errors.push("Reps objetivo es obligatorio y no puede superar 40 caracteres.");
  }
  if (!targetRir || !/^\d+(?:[.,]\d+)?(?:\s*-\s*\d+(?:[.,]\d+)?)?$/.test(targetRir)) {
    errors.push("RIR objetivo debe ser un número o un rango numérico (por ejemplo, 2 o 2-3).");
  }
  if (!rest || rest.length > 40) {
    errors.push("Descanso es obligatorio y no puede superar 40 caracteres.");
  }
  if (rawTechnique.length > 80) {
    errors.push("Técnica de Intensidad no puede superar 80 caracteres.");
  }

  if (errors.length) {
    return {
      errors: errors.map((error) => `Microciclo ${week}, fila ${sourceRow}: ${error}`),
    };
  }

  const noTechnique = ["", "-", "—", "ninguna", "ninguno", "normal", "n/a", "na"];
  return {
    exercise: {
      exercise,
      sets,
      targetReps,
      targetRir,
      rest,
      intensityTechnique: noTechnique.includes(normalize(rawTechnique))
        ? null
        : rawTechnique,
      sourceRow,
    },
    errors: [],
  };
}

/**
 * Parses pasted CSV, TSV, semicolon-delimited, or Markdown tables grouped by
 * "Microciclo 1" through "Microciclo 6". Required headers can be localized
 * or use the documented English aliases.
 */
export function parseMicrocycleImport(input: string): ImportedMicrocycle[] {
  const { rows } = parseInput(input);
  const headerErrors: string[] = [];
  const dataErrors: string[] = [];
  const cycles = new Map<number, ImportedMicrocycle>();
  let currentWeek: number | undefined;
  let columns: ColumnMap | undefined;
  let rowsWithHeaders = 0;
  let rowsWithData = 0;

  for (const { cells: row, lineNumber } of rows) {
    const marker = findMicrocycleMarker(row);
    const isWeekColumnData =
      marker !== undefined &&
      columns?.microcycle === marker.column &&
      row.some((value, index) => index !== marker.column && value.trim());
    if (marker && !isWeekColumnData) {
      if (marker.number < 1 || marker.number > 6) {
        headerErrors.push(`Fila con “Microciclo ${marker.number}”: solo se admiten microciclos del 1 al 6.`);
        currentWeek = undefined;
      } else {
        currentWeek = marker.number;
        if (!cycles.has(currentWeek)) {
          cycles.set(currentWeek, { number: currentWeek, exercises: [] });
        }
      }
      const remainingCells = row.filter((_cell, index) => index !== marker.column);
      const sameRowHeader = createColumnMap(remainingCells);
      if (sameRowHeader && !sameRowHeader.missing.length) {
        columns = sameRowHeader.columns;
        rowsWithHeaders += 1;
      } else {
        columns = undefined;
      }
      continue;
    }

    const possibleHeader = createColumnMap(row);
    if (possibleHeader) {
      if (possibleHeader.missing.length) {
        headerErrors.push(
          `Fila ${lineNumber}: faltan cabeceras obligatorias: ${possibleHeader.missing.join(", ")}.`,
        );
        columns = undefined;
      } else {
        columns = possibleHeader.columns;
        rowsWithHeaders += 1;
      }
      continue;
    }

    if (columns?.microcycle !== undefined) {
      const rowWeek = parseWeekValue(row[columns.microcycle] ?? "");
      if (rowWeek) currentWeek = rowWeek;
    }

    if (!columns || currentWeek === undefined) continue;
    if (row.every((value) => !value.trim())) continue;

    if (!cycles.has(currentWeek)) {
      cycles.set(currentWeek, { number: currentWeek, exercises: [] });
    }
    rowsWithData += 1;
    const parsed = parseExercise(row, columns, lineNumber, currentWeek);
    if (parsed.exercise) cycles.get(currentWeek)?.exercises.push(parsed.exercise);
    dataErrors.push(...parsed.errors);
  }

  if (rowsWithHeaders === 0) {
    const mandatory = Object.values(REQUIRED_HEADERS)
      .map((header) => header.label)
      .join(", ");
    throw new MicrocycleImportError(
      "No se encontró una cabecera válida para importar microciclos.",
      [`Incluye las columnas obligatorias: ${mandatory}.`],
    );
  }
  if (headerErrors.length) {
    throw new MicrocycleImportError("Hay cabeceras de microciclo no válidas.", headerErrors.slice(0, 50));
  }
  if (dataErrors.length) {
    throw new MicrocycleImportError("Hay filas de microciclo no válidas.", dataErrors.slice(0, 50));
  }

  const result = Array.from(cycles.values())
    .filter((cycle) => cycle.exercises.length > 0)
    .sort((left, right) => left.number - right.number);
  if (!result.length || rowsWithData === 0) {
    throw new MicrocycleImportError(
      "No se encontraron ejercicios dentro de los bloques Microciclo 1 al 6.",
      ["Añade al menos una fila de ejercicio bajo cada bloque o indica el microciclo en una columna."],
    );
  }
  return result;
}
