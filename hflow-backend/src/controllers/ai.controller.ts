import { PrismaClient } from "@prisma/client";
import type { Request, Response } from "express";
import { aiPlannerService, type PlanDraft } from "../services/aiPlanner.service";
import logger from "../utils/logger";

const prisma = new PrismaClient();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function generatePlanDraft(request: Request, response: Response): Promise<void> {
  const trainerId = request.auth?.trainerId;
  if (!trainerId) {
    response.status(401).json({ error: { message: "Trainer authentication is required" } });
    return;
  }

  const body: unknown = request.body;
  if (!isRecord(body)) {
    response.status(400).json({ error: { message: "A valid JSON object is required" } });
    return;
  }

  if (
    typeof body.athleteId !== "string" ||
    !body.athleteId.trim() ||
    (body.type !== "workout" && body.type !== "nutrition") ||
    Object.keys(body).some((key) => key !== "athleteId" && key !== "type")
  ) {
    response.status(400).json({
      error: { message: "athleteId and a valid type (workout or nutrition) are required" },
    });
    return;
  }

  try {
    const athlete = await prisma.athlete.findFirst({
      where: { id: body.athleteId.trim(), trainerId },
      select: { name: true, objective: true, currentWeight: true },
    });
    if (!athlete) {
      response.status(404).json({ error: { message: "Athlete not found" } });
      return;
    }

    const plan = await aiPlannerService.generatePlan(body.type as PlanDraft["type"], athlete);
    response.json({ data: plan });
  } catch (error) {
    logger.error("AI plan generation failed", {
      trainerId,
      athleteId: body.athleteId,
      planType: body.type,
      error,
    });
    if (error instanceof Error && error.message === "OpenAI plan generation is not configured") {
      response.status(503).json({ error: { message: error.message } });
      return;
    }
    response.status(502).json({ error: { message: "Unable to generate a plan with AI" } });
  }
}
