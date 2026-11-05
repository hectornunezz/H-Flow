import PDFDocument from "pdfkit";

type PlanPdfMetadata = {
  athleteName?: string;
  trainerName?: string;
  createdAt?: Date | string;
};

export type WorkoutPlanPdfData = PlanPdfMetadata & {
  type: "workout";
  title: string;
  description: string;
  scheduledAt?: Date | string | null;
};

export type NutritionPlanPdfData = PlanPdfMetadata & {
  type: "nutrition";
  details: string;
  calories: number;
};

export type PlanPdfData = WorkoutPlanPdfData | NutritionPlanPdfData;

function formatDate(value: Date | string | null | undefined): string | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return new Intl.DateTimeFormat("es-ES", { dateStyle: "long" }).format(date);
}

export function generatePlanPdf(plan: PlanPdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({ size: "A4", margin: 52, bufferPages: true });
    const chunks: Buffer[] = [];

    document.on("data", (chunk: Buffer | Uint8Array) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);

    const isWorkout = plan.type === "workout";
    const heading = isWorkout ? "PLAN DE ENTRENAMIENTO" : "PLAN NUTRICIONAL";
    const title = isWorkout ? plan.title : "Plan nutricional";
    const details = isWorkout ? plan.description : plan.details;

    document.rect(0, 0, document.page.width, 138).fill("#172554");
    document.fillColor("#ffffff").font("Helvetica-Bold").fontSize(13).text("H-FLOW", 52, 38, {
      characterSpacing: 2,
    });
    document.fontSize(20).text(heading, 52, 66, { width: 490 });
    document.fillColor("#172554").font("Helvetica-Bold").fontSize(22).text(title, 52, 170, {
      width: 490,
    });

    let cursorY = document.y + 24;
    const metadata = [
      plan.athleteName ? `Atleta: ${plan.athleteName}` : undefined,
      plan.trainerName ? `Entrenador: ${plan.trainerName}` : undefined,
      isWorkout && plan.scheduledAt
        ? `Fecha programada: ${formatDate(plan.scheduledAt) ?? "No especificada"}`
        : undefined,
      `Fecha de emisión: ${formatDate(plan.createdAt ?? new Date())}`,
      !isWorkout ? `Calorías diarias: ${plan.calories} kcal` : undefined,
    ].filter((line): line is string => Boolean(line));

    document.fillColor("#526174").font("Helvetica").fontSize(10);
    for (const line of metadata) {
      document.text(line, 52, cursorY, { width: 490 });
      cursorY = document.y + 7;
    }

    cursorY += 17;
    document.moveTo(52, cursorY).lineTo(543, cursorY).strokeColor("#dbe3ef").stroke();
    document.fillColor("#172554").font("Helvetica-Bold").fontSize(12).text("DETALLES", 52, cursorY + 24);
    document.fillColor("#263449").font("Helvetica").fontSize(11).text(details, 52, cursorY + 46, {
      width: 490,
      lineGap: 5,
    });

    const pageRange = document.bufferedPageRange();
    for (let pageIndex = pageRange.start; pageIndex < pageRange.start + pageRange.count; pageIndex++) {
      document.switchToPage(pageIndex);
      const footerY = document.page.height - 42;
      document.moveTo(52, footerY - 12).lineTo(543, footerY - 12).strokeColor("#dbe3ef").stroke();
      document.fillColor("#718096").font("Helvetica").fontSize(8).text(
        "H-FLOW  |  Documento generado automáticamente",
        52,
        footerY,
        { width: 490, align: "center" },
      );
    }

    document.end();
  });
}
