export type WorkoutPlanDraft = {
  type: "workout";
  title: string;
  description: string;
};

export type NutritionPlanDraft = {
  type: "nutrition";
  details: string;
  calories: number;
};

export type PlanDraft = WorkoutPlanDraft | NutritionPlanDraft;

type AthleteContext = {
  name: string;
  objective: string;
  currentWeight: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireApiKey(): string {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OpenAI plan generation is not configured");
  }
  return apiKey;
}

function parsePlanDraft(value: unknown, type: PlanDraft["type"]): PlanDraft {
  if (!isRecord(value) || value.type !== type) {
    throw new Error("OpenAI returned a plan with an invalid structure");
  }

  if (type === "workout") {
    if (
      typeof value.title !== "string" ||
      !value.title.trim() ||
      value.title.length > 120 ||
      typeof value.description !== "string" ||
      !value.description.trim() ||
      value.description.length > 8000
    ) {
      throw new Error("OpenAI returned an invalid workout plan");
    }

    return {
      type,
      title: value.title.trim(),
      description: value.description.trim(),
    };
  }

  if (
    typeof value.details !== "string" ||
    !value.details.trim() ||
    value.details.length > 8000 ||
    typeof value.calories !== "number" ||
    !Number.isInteger(value.calories) ||
    value.calories < 1200 ||
    value.calories > 6000
  ) {
    throw new Error("OpenAI returned an invalid nutrition plan");
  }

  return {
    type,
    details: value.details.trim(),
    calories: value.calories,
  };
}

export class AiPlannerService {
  async generatePlan(type: PlanDraft["type"], athlete: AthleteContext): Promise<PlanDraft> {
    const apiKey = requireApiKey();
    const isWorkout = type === "workout";
    const schema = isWorkout
      ? {
          type: "object",
          additionalProperties: false,
          required: ["type", "title", "description"],
          properties: {
            type: { type: "string", enum: ["workout"] },
            title: { type: "string" },
            description: { type: "string" },
          },
        }
      : {
          type: "object",
          additionalProperties: false,
          required: ["type", "details", "calories"],
          properties: {
            type: { type: "string", enum: ["nutrition"] },
            details: { type: "string" },
            calories: { type: "integer" },
          },
        };

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.4,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: isWorkout ? "workout_plan" : "nutrition_plan",
            strict: true,
            schema,
          },
        },
        messages: [
          {
            role: "system",
            content: isWorkout
              ? "Eres un asistente de planificación de ejercicio. Responde en español y devuelve solo el objeto JSON solicitado. Crea una rutina práctica, progresiva y conservadora a partir del objetivo y peso. Incluye calentamiento, ejercicios, series, repeticiones, descansos, frecuencia semanal y recuperación. No prescribas entrenar con dolor, no diagnostiques y no prometas resultados. Recomienda supervisión profesional cuando corresponda."
              : "Eres un asistente de planificación nutricional general. Responde en español y devuelve solo el objeto JSON solicitado. Propón un plan general equilibrado que apoye el objetivo indicado, con comidas, porciones orientativas, proteína, fibra e hidratación. El peso y objetivo no bastan para calcular necesidades individuales: usa una estimación diaria moderada, nunca prescribas menos de 1200 kcal y señala en details que es una orientación que debe personalizarse con un profesional, especialmente ante enfermedades, embarazo o antecedentes de trastornos alimentarios. No diagnostiques ni prometas resultados.",
          },
          {
            role: "user",
            content: [
              `Atleta: ${athlete.name}`,
              `Objetivo: ${athlete.objective}`,
              `Peso actual: ${athlete.currentWeight} kg`,
              isWorkout
                ? "Genera una propuesta de plan de entrenamiento."
                : "Genera una propuesta de plan de nutrición y calorías diarias orientativas.",
            ].join("\n"),
          },
        ],
      }),
    });

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500);
      throw new Error(
        `OpenAI plan generation failed (${response.status} ${response.statusText})${
          detail ? `: ${detail}` : ""
        }`,
      );
    }

    const result: unknown = await response.json();
    if (!isRecord(result) || !Array.isArray(result.choices)) {
      throw new Error("OpenAI returned an invalid plan response");
    }

    const firstChoice: unknown = result.choices[0];
    if (!isRecord(firstChoice) || !isRecord(firstChoice.message)) {
      throw new Error("OpenAI returned an invalid plan response");
    }

    const content = firstChoice.message.content;
    if (typeof content !== "string" || !content.trim()) {
      throw new Error("OpenAI returned an empty plan");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error("OpenAI returned a plan that was not valid JSON");
    }

    return parsePlanDraft(parsed, type);
  }
}

export const aiPlannerService = new AiPlannerService();
