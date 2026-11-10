import type { Request, Response } from "express";
import {
  getParam,
  getTrainerId,
  isRecord,
  prisma,
  sendPlanError,
} from "./plan.controller.utils";
import { generatePlanPdf } from "../services/pdf.service";

type WorkoutPlanActor =
  | { trainerId: string; athleteId?: never }
  | { athleteId: string; trainerId?: never };

function getWorkoutPlanActor(request: Request, response: Response): WorkoutPlanActor | undefined {
  const actor = request.auth;
  if (!actor || (!actor.trainerId && !actor.athleteId)) {
    response.status(401).json({ error: { message: "Authentication is required" } });
    return undefined;
  }
  return actor;
}

function getWorkoutPlanAccessFilter(actor: WorkoutPlanActor) {
  return "trainerId" in actor && actor.trainerId
    ? { trainerId: actor.trainerId }
    : { athleteId: actor.athleteId };
}

function getWorkoutPlanId(request: Request): string | undefined {
  return getParam(request, "id") ?? getParam(request, "planId");
}

export async function createWorkoutPlan(request: Request, response: Response): Promise<void> {
  const trainerId = getTrainerId(request, response);
  if (!trainerId) return;

  const body: unknown = request.body;
  if (!isRecord(body)) {
    response.status(400).json({ error: { message: "A valid JSON object is required" } });
    return;
  }
  const { title, description, athleteId } = body;
  let scheduledAt: Date | undefined;
  if (body.scheduledAt !== undefined) {
    if (typeof body.scheduledAt !== "string" || !Number.isFinite(Date.parse(body.scheduledAt))) {
      response.status(400).json({ error: { message: "scheduledAt must be a valid date string" } });
      return;
    }
    scheduledAt = new Date(body.scheduledAt);
  }
  if (
    typeof title !== "string" ||
    !title.trim() ||
    typeof description !== "string" ||
    !description.trim() ||
    typeof athleteId !== "string" ||
    !athleteId.trim()
  ) {
    response.status(400).json({
      error: { message: "title, description, and athleteId are required" },
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

    const plan = await prisma.workoutPlan.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        athleteId: athlete.id,
        trainerId,
        ...(scheduledAt ? { scheduledAt } : {}),
      },
    });
    response.status(201).json({ data: plan });
  } catch (error) {
    sendPlanError(response, error, "Workout plan");
  }
}

export async function cloneWorkoutPlan(request: Request, response: Response): Promise<void> {
  const trainerId = getTrainerId(request, response);
  if (!trainerId) return;
  const planId = getWorkoutPlanId(request);
  if (!planId) {
    response.status(400).json({ error: { message: "id is required" } });
    return;
  }

  try {
    const sourcePlan = await prisma.workoutPlan.findFirst({
      where: { id: planId, trainerId },
    });
    if (!sourcePlan) {
      response.status(404).json({ error: { message: "Plan not found" } });
      return;
    }

    const scheduledAt = sourcePlan.scheduledAt
      ? new Date(sourcePlan.scheduledAt)
      : null;
    if (scheduledAt) {
      scheduledAt.setUTCDate(scheduledAt.getUTCDate() + 7);
    }

    const clonedPlan = await prisma.workoutPlan.create({
      data: {
        title: sourcePlan.title,
        description: sourcePlan.description,
        trainerId: sourcePlan.trainerId,
        athleteId: sourcePlan.athleteId,
        sourcePlanId: sourcePlan.id,
        scheduledAt,
      },
    });
    response.status(201).json({ data: clonedPlan });
  } catch (error) {
    sendPlanError(response, error, "Workout plan clone");
  }
}

export async function listWorkoutPlans(request: Request, response: Response): Promise<void> {
  const trainerId = getTrainerId(request, response);
  if (!trainerId) return;

  const athleteId = request.query.athleteId;
  if (athleteId !== undefined && (typeof athleteId !== "string" || !athleteId.trim())) {
    response.status(400).json({ error: { message: "athleteId must be a non-empty string" } });
    return;
  }

  try {
    const plans = await prisma.workoutPlan.findMany({
      where: {
        trainerId,
        ...(typeof athleteId === "string" ? { athleteId } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
    response.json({ data: plans });
  } catch (error) {
    sendPlanError(response, error, "Workout plan");
  }
}

export async function getWorkoutPlan(request: Request, response: Response): Promise<void> {
  const actor = getWorkoutPlanActor(request, response);
  if (!actor) return;
  const planId = getWorkoutPlanId(request);
  if (!planId) {
    response.status(400).json({ error: { message: "id is required" } });
    return;
  }

  try {
    const plan = await prisma.workoutPlan.findFirst({
      where: { id: planId, ...getWorkoutPlanAccessFilter(actor) },
    });
    if (!plan) {
      response.status(404).json({ error: { message: "Plan not found" } });
      return;
    }
    response.json({ data: plan });
  } catch (error) {
    sendPlanError(response, error, "Workout plan");
  }
}

export async function downloadWorkoutPlanPdf(request: Request, response: Response): Promise<void> {
  const actor = getWorkoutPlanActor(request, response);
  if (!actor) return;
  const planId = getWorkoutPlanId(request);
  if (!planId) {
    response.status(400).json({ error: { message: "id is required" } });
    return;
  }

  try {
    const plan = await prisma.workoutPlan.findFirst({
      where: { id: planId, ...getWorkoutPlanAccessFilter(actor) },
      include: {
        athlete: { select: { name: true } },
        trainer: { select: { name: true } },
      },
    });
    if (!plan) {
      response.status(404).json({ error: { message: "Plan not found" } });
      return;
    }

    const pdf = await generatePlanPdf({
      type: "workout",
      title: plan.title,
      description: plan.description,
      scheduledAt: plan.scheduledAt,
      createdAt: plan.createdAt,
      athleteName: plan.athlete.name,
      trainerName: plan.trainer.name,
    });
    response
      .status(200)
      .type("application/pdf")
      .attachment(`workout-plan-${plan.id}.pdf`)
      .send(pdf);
  } catch (error) {
    sendPlanError(response, error, "Workout plan PDF");
  }
}

export async function updateWorkoutPlan(request: Request, response: Response): Promise<void> {
  const actor = getWorkoutPlanActor(request, response);
  if (!actor) return;
  const planId = getWorkoutPlanId(request);
  if (!planId) {
    response.status(400).json({ error: { message: "id is required" } });
    return;
  }

  const body: unknown = request.body;
  if (!isRecord(body)) {
    response.status(400).json({ error: { message: "A valid JSON object is required" } });
    return;
  }
  const data: {
    title?: string;
    description?: string;
    athleteId?: string;
    scheduledAt?: Date | null;
  } = {};
  if (body.title !== undefined) {
    if (typeof body.title !== "string" || !body.title.trim()) {
      response.status(400).json({ error: { message: "title must be a non-empty string" } });
      return;
    }
    data.title = body.title.trim();
  }
  if (body.description !== undefined) {
    if (typeof body.description !== "string" || !body.description.trim()) {
      response.status(400).json({ error: { message: "description must be a non-empty string" } });
      return;
    }
    data.description = body.description.trim();
  }
  if (body.athleteId !== undefined) {
    if ("athleteId" in actor && actor.athleteId) {
      response.status(403).json({ error: { message: "Only the trainer can reassign a workout plan" } });
      return;
    }
    if (typeof body.athleteId !== "string" || !body.athleteId.trim()) {
      response.status(400).json({ error: { message: "athleteId must be a non-empty string" } });
      return;
    }
    data.athleteId = body.athleteId.trim();
  }
  if (body.scheduledAt !== undefined) {
    if (
      body.scheduledAt !== null &&
      (typeof body.scheduledAt !== "string" || !Number.isFinite(Date.parse(body.scheduledAt)))
    ) {
      response.status(400).json({
        error: { message: "scheduledAt must be a valid date string or null" },
      });
      return;
    }
    data.scheduledAt =
      typeof body.scheduledAt === "string" ? new Date(body.scheduledAt) : null;
  }
  if (Object.keys(data).length === 0) {
    response.status(400).json({ error: { message: "At least one field to update is required" } });
    return;
  }

  try {
    const plan = await prisma.workoutPlan.findFirst({
      where: { id: planId, ...getWorkoutPlanAccessFilter(actor) },
    });
    if (!plan) {
      response.status(404).json({ error: { message: "Plan not found" } });
      return;
    }
    if (data.athleteId && "trainerId" in actor && actor.trainerId) {
      const athlete = await prisma.athlete.findFirst({
        where: { id: data.athleteId, trainerId: actor.trainerId },
        select: { id: true },
      });
      if (!athlete) {
        response.status(404).json({ error: { message: "Athlete not found" } });
        return;
      }
    }

    const updateResult = await prisma.workoutPlan.updateMany({
      where: { id: planId, ...getWorkoutPlanAccessFilter(actor) },
      data,
    });
    if (updateResult.count === 0) {
      response.status(404).json({ error: { message: "Plan not found" } });
      return;
    }
    const updatedPlan = await prisma.workoutPlan.findUnique({ where: { id: planId } });
    if (!updatedPlan) {
      response.status(404).json({ error: { message: "Plan not found" } });
      return;
    }
    response.json({ data: updatedPlan });
  } catch (error) {
    sendPlanError(response, error, "Workout plan");
  }
}

export async function deleteWorkoutPlan(request: Request, response: Response): Promise<void> {
  const actor = getWorkoutPlanActor(request, response);
  if (!actor) return;
  const planId = getWorkoutPlanId(request);
  if (!planId) {
    response.status(400).json({ error: { message: "id is required" } });
    return;
  }

  try {
    const plan = await prisma.workoutPlan.deleteMany({
      where: { id: planId, ...getWorkoutPlanAccessFilter(actor) },
    });
    if (plan.count === 0) {
      response.status(404).json({ error: { message: "Plan not found" } });
      return;
    }
    response.json({ data: { id: planId, deleted: true } });
  } catch (error) {
    sendPlanError(response, error, "Workout plan");
  }
}
