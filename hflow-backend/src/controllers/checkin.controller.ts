import { Prisma, PrismaClient } from "@prisma/client";
import type { Request, Response } from "express";
import logger from "../utils/logger";

const prisma = new PrismaClient();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

type AuthenticatedActor =
  | { trainerId: string; athleteId?: never }
  | { athleteId: string; trainerId?: never };

function getActor(request: Request, response: Response): AuthenticatedActor | undefined {
  if (!request.auth) {
    response.status(401).json({ error: { message: "Authentication is required" } });
    return undefined;
  }
  return request.auth;
}

function sendCheckInError(response: Response, error: unknown): void {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
    response.status(404).json({ error: { message: "Athlete not found" } });
    return;
  }
  logger.error("Check-in request failed", { error });
  response.status(500).json({ error: { message: "Internal server error" } });
}

export async function createCheckIn(request: Request, response: Response): Promise<void> {
  const actor = getActor(request, response);
  if (!actor) return;

  const body: unknown = request.body;
  if (!isRecord(body)) {
    response.status(400).json({ error: { message: "A valid JSON object is required" } });
    return;
  }

  const data = body;
  const athleteId = typeof data.athleteId === "string" ? data.athleteId.trim() : "";
  if (!athleteId || typeof data.weight !== "number" || !Number.isFinite(data.weight) || data.weight <= 0) {
    response.status(400).json({
      error: { message: "athleteId and a positive numeric weight are required" },
    });
    return;
  }
  if (
    data.bodyFat !== undefined &&
    (typeof data.bodyFat !== "number" ||
      !Number.isFinite(data.bodyFat) ||
      data.bodyFat < 0 ||
      data.bodyFat > 100)
  ) {
    response.status(400).json({ error: { message: "bodyFat must be a number between 0 and 100" } });
    return;
  }
  if (
    (data.notes !== undefined && (typeof data.notes !== "string" || data.notes.length > 5000)) ||
    (data.photoUrl !== undefined && (typeof data.photoUrl !== "string" || data.photoUrl.length > 2048))
  ) {
    response.status(400).json({ error: { message: "notes or photoUrl has an invalid value" } });
    return;
  }
  if (Object.keys(data).some((key) => !["athleteId", "weight", "bodyFat", "notes", "photoUrl"].includes(key))) {
    response.status(400).json({ error: { message: "Unknown check-in fields are not allowed" } });
    return;
  }

  try {
    const athlete = await prisma.athlete.findFirst({
      where: {
        id: athleteId,
        ...("trainerId" in actor ? { trainerId: actor.trainerId } : { id: actor.athleteId }),
      },
      select: { id: true },
    });
    if (!athlete) {
      response.status(404).json({ error: { message: "Athlete not found" } });
      return;
    }

    const checkIn = await prisma.checkIn.create({
      data: {
        athleteId: athlete.id,
        weight: data.weight,
        ...(typeof data.bodyFat === "number" ? { bodyFat: data.bodyFat } : {}),
        ...(typeof data.notes === "string" ? { notes: data.notes.trim() || null } : {}),
        ...(typeof data.photoUrl === "string" ? { photoUrl: data.photoUrl.trim() || null } : {}),
      },
    });
    response.status(201).json({ data: checkIn });
  } catch (error) {
    sendCheckInError(response, error);
  }
}

export async function getCheckInsByAthlete(request: Request, response: Response): Promise<void> {
  const actor = getActor(request, response);
  if (!actor) return;

  const athleteId = request.params.athleteId;
  if (typeof athleteId !== "string" || !athleteId.trim()) {
    response.status(400).json({ error: { message: "athleteId is required" } });
    return;
  }

  try {
    const athlete = await prisma.athlete.findFirst({
      where: {
        id: athleteId,
        ...("trainerId" in actor ? { trainerId: actor.trainerId } : { id: actor.athleteId }),
      },
      select: { id: true },
    });
    if (!athlete) {
      response.status(404).json({ error: { message: "Athlete not found" } });
      return;
    }

    const checkIns = await prisma.checkIn.findMany({
      where: { athleteId: athlete.id },
      orderBy: { createdAt: "desc" },
    });
    response.json({ data: checkIns });
  } catch (error) {
    sendCheckInError(response, error);
  }
}
