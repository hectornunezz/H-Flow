import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import logger from "../utils/logger";
import { generatePlanPdf } from "../services/pdf.service";

const prisma = new PrismaClient();
const PORTAL_TOKEN_LIFETIME_SECONDS = 7 * 24 * 60 * 60;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || Buffer.byteLength(secret, "utf8") < 32) {
    throw new Error("JWT_SECRET must be configured with at least 32 bytes");
  }
  return secret;
}

function getAthleteId(request: Request, response: Response): string | undefined {
  const athleteId = request.auth?.athleteId;
  if (!athleteId) {
    response.status(401).json({ error: { message: "Athlete portal authentication is required" } });
    return undefined;
  }
  return athleteId;
}

export async function createAthletePortalAccess(
  request: Request,
  response: Response,
): Promise<void> {
  const trainerId = request.auth?.trainerId;
  if (!trainerId) {
    response.status(401).json({ error: { message: "Trainer authentication is required" } });
    return;
  }

  const body: unknown = request.body;
  if (!isRecord(body) || typeof body.athleteId !== "string" || !body.athleteId.trim()) {
    response.status(400).json({ error: { message: "athleteId is required" } });
    return;
  }
  const athleteId = body.athleteId.trim();

  try {
    const athlete = await prisma.athlete.findFirst({
      where: { id: athleteId, trainerId },
      select: { id: true },
    });
    if (!athlete) {
      response.status(404).json({ error: { message: "Athlete not found" } });
      return;
    }

    const token = jwt.sign(
      { athleteId: athlete.id, purpose: "athlete-portal", jti: randomUUID() },
      getJwtSecret(),
      { algorithm: "HS256", expiresIn: PORTAL_TOKEN_LIFETIME_SECONDS },
    );
    const configuredFrontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3001";
    const frontendUrl = new URL(configuredFrontendUrl);
    if (
      !["http:", "https:"].includes(frontendUrl.protocol) ||
      frontendUrl.username ||
      frontendUrl.password
    ) {
      throw new Error("FRONTEND_URL must be an HTTP(S) URL without credentials");
    }

    response.status(201).json({
      data: {
        token,
        url: new URL(`/portal/${encodeURIComponent(token)}`, frontendUrl.origin).toString(),
        expiresAt: new Date(Date.now() + PORTAL_TOKEN_LIFETIME_SECONDS * 1000).toISOString(),
      },
    });
  } catch (error) {
    logger.error("Athlete portal access creation failed", { trainerId, athleteId, error });
    response.status(500).json({ error: { message: "Unable to create athlete portal access" } });
  }
}

export async function getAthletePortal(request: Request, response: Response): Promise<void> {
  const athleteId = getAthleteId(request, response);
  if (!athleteId) return;

  try {
    const athlete = await prisma.athlete.findUnique({
      where: { id: athleteId },
      select: {
        id: true,
        name: true,
        objective: true,
        currentWeight: true,
        workoutPlans: {
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 1,
          select: { id: true, title: true, description: true, scheduledAt: true, createdAt: true },
        },
        nutritionPlans: {
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 1,
          select: { id: true, details: true, calories: true, createdAt: true },
        },
        checkIns: {
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 100,
          select: { id: true, weight: true, bodyFat: true, createdAt: true },
        },
      },
    });

    if (!athlete) {
      response.status(404).json({ error: { message: "Athlete not found" } });
      return;
    }

    response.json({
      data: {
        id: athlete.id,
        name: athlete.name,
        objective: athlete.objective,
        currentWeight: athlete.currentWeight,
        workoutPlan: athlete.workoutPlans[0] ?? null,
        nutritionPlan: athlete.nutritionPlans[0] ?? null,
        checkIns: athlete.checkIns.reverse(),
      },
    });
  } catch (error) {
    logger.error("Athlete portal lookup failed", { athleteId, error });
    response.status(500).json({ error: { message: "Unable to load athlete portal" } });
  }
}

export async function createAthletePortalCheckIn(
  request: Request,
  response: Response,
): Promise<void> {
  const athleteId = getAthleteId(request, response);
  if (!athleteId) return;

  const body: unknown = request.body;
  if (!isRecord(body)) {
    response.status(400).json({ error: { message: "A valid JSON object is required" } });
    return;
  }

  if (
    typeof body.weight !== "number" ||
    !Number.isFinite(body.weight) ||
    body.weight <= 0 ||
    body.weight > 1000
  ) {
    response.status(400).json({ error: { message: "weight must be a positive number no greater than 1000" } });
    return;
  }
  if (body.notes !== undefined && (typeof body.notes !== "string" || body.notes.length > 5000)) {
    response.status(400).json({ error: { message: "notes must be a string of at most 5000 characters" } });
    return;
  }
  if (Object.keys(body).some((key) => key !== "weight" && key !== "notes")) {
    response.status(400).json({ error: { message: "Unknown check-in fields are not allowed" } });
    return;
  }
  const weight = body.weight;
  const notes = body.notes;

  try {
    const checkIn = await prisma.$transaction(async (transaction) => {
      const created = await transaction.checkIn.create({
        data: {
          athleteId,
          weight,
          notes: typeof notes === "string" ? notes.trim() || null : null,
        },
      });
      await transaction.athlete.update({
        where: { id: athleteId },
        data: { currentWeight: weight },
      });
      return created;
    });
    response.status(201).json({ data: checkIn });
  } catch (error) {
    logger.error("Athlete portal check-in creation failed", { athleteId, error });
    response.status(500).json({ error: { message: "Unable to save check-in" } });
  }
}

export async function downloadAthletePortalWorkoutPdf(
  request: Request,
  response: Response,
): Promise<void> {
  const athleteId = getAthleteId(request, response);
  if (!athleteId) return;
  const planId = request.params.planId;
  if (typeof planId !== "string" || !planId.trim()) {
    response.status(400).json({ error: { message: "planId is required" } });
    return;
  }

  try {
    const plan = await prisma.workoutPlan.findFirst({
      where: { id: planId, athleteId },
      include: {
        athlete: { select: { name: true } },
        trainer: { select: { name: true } },
      },
    });
    if (!plan) {
      response.status(404).json({ error: { message: "Workout plan not found" } });
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
    response.status(200).type("application/pdf").attachment(`workout-plan-${plan.id}.pdf`).send(pdf);
  } catch (error) {
    logger.error("Athlete portal workout PDF request failed", { athleteId, planId, error });
    response.status(500).json({ error: { message: "Unable to generate workout plan PDF" } });
  }
}

export async function downloadAthletePortalNutritionPdf(
  request: Request,
  response: Response,
): Promise<void> {
  const athleteId = getAthleteId(request, response);
  if (!athleteId) return;
  const planId = request.params.planId;
  if (typeof planId !== "string" || !planId.trim()) {
    response.status(400).json({ error: { message: "planId is required" } });
    return;
  }

  try {
    const plan = await prisma.nutritionPlan.findFirst({
      where: { id: planId, athleteId },
      include: {
        athlete: { select: { name: true } },
        trainer: { select: { name: true } },
      },
    });
    if (!plan) {
      response.status(404).json({ error: { message: "Nutrition plan not found" } });
      return;
    }

    const pdf = await generatePlanPdf({
      type: "nutrition",
      details: plan.details,
      calories: plan.calories,
      athleteName: plan.athlete.name,
      trainerName: plan.trainer.name,
    });
    response.status(200).type("application/pdf").attachment(`nutrition-plan-${plan.id}.pdf`).send(pdf);
  } catch (error) {
    logger.error("Athlete portal nutrition PDF request failed", { athleteId, planId, error });
    response.status(500).json({ error: { message: "Unable to generate nutrition plan PDF" } });
  }
}
