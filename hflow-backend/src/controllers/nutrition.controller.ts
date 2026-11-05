import type { Request, Response } from "express";
import {
  getParam,
  getTrainerId,
  isRecord,
  prisma,
  sendPlanError,
} from "./plan.controller.utils";

export async function createNutritionPlan(request: Request, response: Response): Promise<void> {
  const trainerId = getTrainerId(request, response);
  if (!trainerId) return;

  const body: unknown = request.body;
  if (!isRecord(body)) {
    response.status(400).json({ error: { message: "A valid JSON object is required" } });
    return;
  }
  const { details, calories, athleteId } = body;
  if (
    typeof details !== "string" ||
    !details.trim() ||
    typeof calories !== "number" ||
    !Number.isInteger(calories) ||
    calories < 0 ||
    typeof athleteId !== "string" ||
    !athleteId.trim()
  ) {
    response.status(400).json({
      error: { message: "details, non-negative integer calories, and athleteId are required" },
    });
    return;
  }

  try {
    const athlete = await prisma.athlete.findFirst({
      where: { id: athleteId, trainerId },
      select: { id: true },
    });
    if (!athlete) {
      response.status(404).json({ error: { message: "Athlete not found" } });
      return;
    }

    const plan = await prisma.nutritionPlan.create({
      data: {
        details: details.trim(),
        calories,
        athleteId: athlete.id,
        trainerId,
      },
    });
    response.status(201).json({ data: plan });
  } catch (error) {
    sendPlanError(response, error, "Nutrition plan");
  }
}

export async function listNutritionPlans(request: Request, response: Response): Promise<void> {
  const trainerId = getTrainerId(request, response);
  if (!trainerId) return;

  const athleteId = request.query.athleteId;
  if (athleteId !== undefined && (typeof athleteId !== "string" || !athleteId.trim())) {
    response.status(400).json({ error: { message: "athleteId must be a non-empty string" } });
    return;
  }

  try {
    const plans = await prisma.nutritionPlan.findMany({
      where: {
        trainerId,
        ...(typeof athleteId === "string" ? { athleteId } : {}),
      },
      orderBy: { details: "asc" },
    });
    response.json({ data: plans });
  } catch (error) {
    sendPlanError(response, error, "Nutrition plan");
  }
}

export async function getNutritionPlan(request: Request, response: Response): Promise<void> {
  const trainerId = getTrainerId(request, response);
  if (!trainerId) return;
  const planId = getParam(request, "planId");
  if (!planId) {
    response.status(400).json({ error: { message: "planId is required" } });
    return;
  }

  try {
    const plan = await prisma.nutritionPlan.findFirst({ where: { id: planId, trainerId } });
    if (!plan) {
      response.status(404).json({ error: { message: "Plan not found" } });
      return;
    }
    response.json({ data: plan });
  } catch (error) {
    sendPlanError(response, error, "Nutrition plan");
  }
}

export async function updateNutritionPlan(request: Request, response: Response): Promise<void> {
  const trainerId = getTrainerId(request, response);
  if (!trainerId) return;
  const planId = getParam(request, "planId");
  if (!planId) {
    response.status(400).json({ error: { message: "planId is required" } });
    return;
  }

  const body: unknown = request.body;
  if (!isRecord(body)) {
    response.status(400).json({ error: { message: "A valid JSON object is required" } });
    return;
  }
  const data: { details?: string; calories?: number; athleteId?: string } = {};
  if (body.details !== undefined) {
    if (typeof body.details !== "string" || !body.details.trim()) {
      response.status(400).json({ error: { message: "details must be a non-empty string" } });
      return;
    }
    data.details = body.details.trim();
  }
  if (body.calories !== undefined) {
    if (typeof body.calories !== "number" || !Number.isInteger(body.calories) || body.calories < 0) {
      response.status(400).json({ error: { message: "calories must be a non-negative integer" } });
      return;
    }
    data.calories = body.calories;
  }
  if (body.athleteId !== undefined) {
    if (typeof body.athleteId !== "string" || !body.athleteId.trim()) {
      response.status(400).json({ error: { message: "athleteId must be a non-empty string" } });
      return;
    }
    data.athleteId = body.athleteId.trim();
  }
  if (Object.keys(data).length === 0) {
    response.status(400).json({ error: { message: "At least one field to update is required" } });
    return;
  }

  try {
    const plan = await prisma.nutritionPlan.findFirst({ where: { id: planId, trainerId } });
    if (!plan) {
      response.status(404).json({ error: { message: "Plan not found" } });
      return;
    }
    if (data.athleteId) {
      const athlete = await prisma.athlete.findFirst({
        where: { id: data.athleteId, trainerId },
        select: { id: true },
      });
      if (!athlete) {
        response.status(404).json({ error: { message: "Athlete not found" } });
        return;
      }
    }

    const updatedPlan = await prisma.nutritionPlan.update({
      where: { id: planId, trainerId },
      data,
    });
    response.json({ data: updatedPlan });
  } catch (error) {
    sendPlanError(response, error, "Nutrition plan");
  }
}

export async function deleteNutritionPlan(request: Request, response: Response): Promise<void> {
  const trainerId = getTrainerId(request, response);
  if (!trainerId) return;
  const planId = getParam(request, "planId");
  if (!planId) {
    response.status(400).json({ error: { message: "planId is required" } });
    return;
  }

  try {
    const plan = await prisma.nutritionPlan.deleteMany({ where: { id: planId, trainerId } });
    if (plan.count === 0) {
      response.status(404).json({ error: { message: "Plan not found" } });
      return;
    }
    response.json({ data: { id: planId, deleted: true } });
  } catch (error) {
    sendPlanError(response, error, "Nutrition plan");
  }
}
