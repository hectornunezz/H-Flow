export type ImportedAthlete = {
  name: string;
  objective: string;
  currentWeight: number;
};

export class CsvValidationError extends Error {
  constructor(
    message: string,
    public readonly details: string[] = [],
  ) {
    super(message);
    this.name = "CsvValidationError";
  }
}

function parseRecords(content: string, delimiter: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let inQuotes = false;
  let fieldClosed = false;

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];

    if (inQuotes) {
      if (character === '"') {
        if (content[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
          fieldClosed = true;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (character === delimiter) {
      record.push(field);
      field = "";
      fieldClosed = false;
      continue;
    }

    if (character === "\n" || character === "\r") {
      if (character === "\r" && content[index + 1] === "\n") index += 1;
      record.push(field);
      if (record.some((value) => value.trim())) records.push(record);
      record = [];
      field = "";
      fieldClosed = false;
      continue;
    }

    if (character === '"') {
      if (field.length !== 0 || fieldClosed) {
        throw new CsvValidationError("El CSV contiene comillas fuera de lugar.");
      }
      inQuotes = true;
      continue;
    }

    if (fieldClosed) {
      if (!/\s/.test(character)) {
        throw new CsvValidationError("El CSV contiene datos después de cerrar un campo entre comillas.");
      }
      continue;
    }
    field += character;
  }

  if (inQuotes) {
    throw new CsvValidationError("El CSV contiene un campo entre comillas sin cerrar.");
  }

  record.push(field);
  if (record.some((value) => value.trim())) records.push(record);
  return records;
}

function detectDelimiter(headerRecord: string): string {
  const candidates = [",", ";", "\t"];
  let selected = ",";
  let maxSeparators = -1;
  let inQuotes = false;

  for (let index = 0; index < headerRecord.length; index += 1) {
    const character = headerRecord[index];
    if (character === '"') {
      if (inQuotes && headerRecord[index + 1] === '"') {
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (!inQuotes && candidates.includes(character)) {
      const count = headerRecord
        .slice(0, index + 1)
        .split("")
        .filter((item) => item === character).length;
      if (count > maxSeparators) {
        selected = character;
        maxSeparators = count;
      }
    }
  }
  return selected;
}

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s_-]+/g, "");
}

export function parseAthleteCsv(csv: string): ImportedAthlete[] {
  const content = csv.replace(/^\uFEFF/, "");
  const firstLine = content.split(/\r?\n/, 1)[0] ?? "";
  if (!firstLine.trim()) {
    throw new CsvValidationError("El archivo CSV está vacío.");
  }

  const records = parseRecords(content, detectDelimiter(firstLine));
  if (records.length < 2) {
    throw new CsvValidationError("El CSV debe incluir encabezados y al menos una fila de atletas.");
  }

  const headers = records[0].map(normalizeHeader);
  const findColumn = (aliases: string[]) => headers.findIndex((header) => aliases.includes(header));
  const nameColumn = findColumn(["name", "nombre"]);
  const objectiveColumn = findColumn(["objective", "objetivo"]);
  const weightColumn = findColumn(["weight", "peso", "currentweight", "pesoactual"]);

  if (nameColumn < 0 || objectiveColumn < 0 || weightColumn < 0) {
    throw new CsvValidationError(
      "El CSV debe incluir columnas nombre/name, objetivo/objective y peso/weight.",
    );
  }
  if (new Set([nameColumn, objectiveColumn, weightColumn]).size !== 3) {
    throw new CsvValidationError("Cada dato debe tener una columna independiente.");
  }

  const athleteRecords = records.slice(1);
  if (athleteRecords.length > 1000) {
    throw new CsvValidationError("El archivo no puede contener más de 1000 atletas.");
  }

  const errors: string[] = [];
  const athletes: ImportedAthlete[] = [];

  athleteRecords.forEach((record, index) => {
    const lineNumber = index + 2;
    if (record.length !== headers.length) {
      errors.push(`Fila ${lineNumber}: se esperaban ${headers.length} columnas y se recibieron ${record.length}.`);
      return;
    }

    const name = record[nameColumn].trim();
    const objective = record[objectiveColumn].trim();
    const rawWeight = record[weightColumn].trim();
    const weightValue = rawWeight.replace(",", ".");
    const currentWeight = Number(weightValue);

    if (!name || name.length > 100) {
      errors.push(`Fila ${lineNumber}: el nombre es obligatorio y no puede superar 100 caracteres.`);
      return;
    }
    if (!objective || objective.length > 500) {
      errors.push(`Fila ${lineNumber}: el objetivo es obligatorio y no puede superar 500 caracteres.`);
      return;
    }
    if (!rawWeight || !Number.isFinite(currentWeight) || currentWeight <= 0 || currentWeight > 1000) {
      errors.push(`Fila ${lineNumber}: el peso debe ser un número mayor que 0 y como máximo 1000.`);
      return;
    }

    athletes.push({ name, objective, currentWeight });
  });

  if (errors.length > 0) {
    throw new CsvValidationError("El CSV contiene filas no válidas.", errors.slice(0, 50));
  }
  if (athletes.length === 0) {
    throw new CsvValidationError("El CSV no contiene atletas para importar.");
  }

  return athletes;
}
