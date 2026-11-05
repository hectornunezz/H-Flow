import { Prisma, PrismaClient } from "@prisma/client";
import type { Request, Response } from "express";
import { readFile, unlink } from "node:fs/promises";
import path from "node:path";
import logger from "../utils/logger";
import { uploadDirectory } from "../middlewares/upload.middleware";
import { CsvValidationError, parseAthleteCsv } from "../services/athleteCsv.service";

const prisma = new PrismaClient();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getRouteParam(request: Request, name: string): string | undefined {
  const value = request.params[name];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function getAuthenticatedTrainerId(request: Request, response: Response): string | undefined {
  const trainerId = request.auth?.trainerId;
  if (!trainerId) {
    response.status(401).json({ error: { message: "Authentication is required" } });
    return undefined;
  }
  return trainerId;
}

function isAdministrator(trainerId: string): boolean {
  const administratorIds = process.env.ADMIN_TRAINER_IDS?.split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  return administratorIds?.includes(trainerId) ?? false;
}

function getAthleteAccessFilter(trainerId: string): { trainerId?: string } {
  return isAdministrator(trainerId) ? {} : { trainerId };
}

function getImageType(buffer: Buffer): "image/jpeg" | "image/png" | undefined {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return "image/png";
  }
  return undefined;
}

async function removeUploadedFile(filePath: string): Promise<void> {
  try {
    await unlink(filePath);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
      return;
    }
    throw error;
  }
}

function getStoredAvatarPath(avatarUrl: string | null): string | undefined {
  if (!avatarUrl?.startsWith("/uploads/")) return undefined;
  const filename = path.basename(avatarUrl);
  if (!filename || filename !== avatarUrl.slice("/uploads/".length)) return undefined;
  const filePath = path.resolve(uploadDirectory, filename);
  return filePath.startsWith(`${uploadDirectory}${path.sep}`) ? filePath : undefined;
}

function sendError(response: Response, error: unknown): void {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") {
      response.status(404).json({ error: { message: "Athlete not found" } });
      return;
    }

    if (error.code === "P2003") {
      response.status(400).json({ error: { message: "Trainer not found" } });
      return;
    }
  }

  logger.error("Athlete request failed", { error });
  response.status(500).json({ error: { message: "Internal server error" } });
}

export async function uploadAthleteAvatar(request: Request, response: Response): Promise<void> {
  const trainerId = getAuthenticatedTrainerId(request, response);
  if (!trainerId) return;

  const athleteId = getRouteParam(request, "id");
  if (!athleteId) {
    if (request.file) await removeUploadedFile(request.file.path);
    response.status(400).json({ error: { message: "id is required" } });
    return;
  }
  if (!request.file) {
    response.status(400).json({ error: { message: "An avatar image is required in the avatar field" } });
    return;
  }

  let detectedType: "image/jpeg" | "image/png" | undefined;
  try {
    const signature = await readFile(request.file.path);
    detectedType = getImageType(signature);
  } catch (error) {
    await removeUploadedFile(request.file.path);
    logger.error("Uploaded athlete avatar could not be read", { athleteId, error });
    response.status(500).json({ error: { message: "Unable to process avatar image" } });
    return;
  }

  if (!detectedType || detectedType !== request.file.mimetype) {
    await removeUploadedFile(request.file.path);
    response.status(400).json({ error: { message: "Uploaded file is not a valid JPEG or PNG image" } });
    return;
  }

  try {
    const athlete = await prisma.athlete.findFirst({
      where: { id: athleteId, ...getAthleteAccessFilter(trainerId) },
      select: { id: true, avatarUrl: true },
    });
    if (!athlete) {
      await removeUploadedFile(request.file.path);
      response.status(404).json({ error: { message: "Athlete not found" } });
      return;
    }

    const avatarUrl = `/uploads/${path.basename(request.file.filename)}`;
    const updatedAthlete = await prisma.athlete.update({
      where: { id: athlete.id },
      data: { avatarUrl },
      select: { id: true, avatarUrl: true },
    });

    const previousAvatarPath = getStoredAvatarPath(athlete.avatarUrl);
    if (previousAvatarPath) {
      try {
        await removeUploadedFile(previousAvatarPath);
      } catch (error) {
        logger.warn("Previous athlete avatar cleanup failed", {
          athleteId,
          previousAvatarPath,
          error,
        });
      }
    }

    response.json({ data: updatedAthlete });
  } catch (error) {
    try {
      await removeUploadedFile(request.file.path);
    } catch (cleanupError) {
      logger.error("Uploaded athlete avatar cleanup failed", { athleteId, cleanupError });
    }
    sendError(response, error);
  }
}

export async function createAthlete(request: Request, response: Response): Promise<void> {
  const authenticatedTrainerId = getAuthenticatedTrainerId(request, response);
  if (!authenticatedTrainerId) return;

  const body: unknown = request.body;
  if (!isRecord(body)) {
    response.status(400).json({ error: { message: "A valid JSON object is required" } });
    return;
  }

  const { name, objective, currentWeight, trainerId, email } = body;
  if (
    typeof name !== "string" ||
    !name.trim() ||
    typeof objective !== "string" ||
    !objective.trim() ||
    typeof currentWeight !== "number" ||
    !Number.isFinite(currentWeight) ||
    currentWeight <= 0 ||
    (trainerId !== undefined && (typeof trainerId !== "string" || !trainerId.trim()))
  ) {
    response.status(400).json({
      error: {
        message: "name, objective, and positive currentWeight are required",
      },
    });
    return;
  }

  const targetTrainerId =
    typeof trainerId === "string" ? trainerId.trim() : authenticatedTrainerId;
  if (targetTrainerId !== authenticatedTrainerId && !isAdministrator(authenticatedTrainerId)) {
    response.status(403).json({ error: { message: "You cannot create athletes for another trainer" } });
    return;
  }

  try {
    const athlete = await prisma.athlete.create({
      data: {
        name: name.trim(),
        objective: objective.trim(),
        currentWeight,
        trainerId: targetTrainerId,
        ...(typeof email === "string" ? { email } : {}),
      },
    });

    response.status(201).json({ data: athlete });
  } catch (error) {
    sendError(response, error);
  }
}

export async function importAthletesCsv(request: Request, response: Response): Promise<void> {
  const trainerId = getAuthenticatedTrainerId(request, response);
  if (!trainerId) return;
  if (!request.file) {
    response.status(400).json({ error: { message: "Selecciona un archivo CSV en el campo file." } });
    return;
  }

  let athletes;
  try {
    athletes = parseAthleteCsv(request.file.buffer.toString("utf8"));
  } catch (error) {
    if (error instanceof CsvValidationError) {
      response.status(400).json({
        error: {
          message: error.message,
          ...(error.details.length ? { details: error.details } : {}),
        },
      });
      return;
    }
    logger.error("Athlete CSV parsing failed", { trainerId, error });
    response.status(400).json({ error: { message: "El archivo CSV no tiene un formato válido." } });
    return;
  }

  try {
    const result = await prisma.athlete.createMany({
      data: athletes.map((athlete) => ({ ...athlete, trainerId })),
    });
    response.status(201).json({ data: { imported: result.count } });
  } catch (error) {
    logger.error("Athlete CSV import failed", { trainerId, rowCount: athletes.length, error });
    response.status(500).json({ error: { message: "No se pudieron importar los atletas." } });
  }
}

export async function listAllAthletes(request: Request, response: Response): Promise<void> {
  const trainerId = getAuthenticatedTrainerId(request, response);
  if (!trainerId) return;

  const rawPage = request.query.page ?? "1";
  const rawPageSize = request.query.pageSize ?? "20";
  const search = request.query.search;
  const page = typeof rawPage === "string" ? Number(rawPage) : Number.NaN;
  const pageSize = typeof rawPageSize === "string" ? Number(rawPageSize) : Number.NaN;
  if (
    !Number.isInteger(page) ||
    page < 1 ||
    !Number.isInteger(pageSize) ||
    pageSize < 1 ||
    pageSize > 100 ||
    (search !== undefined &&
      (typeof search !== "string" || search.trim().length > 100))
  ) {
    response.status(400).json({
      error: { message: "page, pageSize, or search has an invalid value" },
    });
    return;
  }

  const where: Prisma.AthleteWhereInput = {
    ...getAthleteAccessFilter(trainerId),
    ...(typeof search === "string" && search.trim()
      ? {
          OR: [
            { name: { contains: search.trim() } },
            { email: { contains: search.trim() } },
            { objective: { contains: search.trim() } },
          ],
        }
      : {}),
  };

  try {
    const [total, athletes] = await Promise.all([
      prisma.athlete.count({ where }),
      prisma.athlete.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    response.json({
      data: athletes,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    sendError(response, error);
  }
}

export async function listTrainerAthletes(request: Request, response: Response): Promise<void> {
  const authenticatedTrainerId = getAuthenticatedTrainerId(request, response);
  if (!authenticatedTrainerId) return;

  const trainerId = getRouteParam(request, "trainerId");
  if (!trainerId?.trim()) {
    response.status(400).json({ error: { message: "trainerId is required" } });
    return;
  }
  if (trainerId !== authenticatedTrainerId && !isAdministrator(authenticatedTrainerId)) {
    response.status(403).json({ error: { message: "You cannot access another trainer's athletes" } });
    return;
  }

  try {
    const athletes = await prisma.athlete.findMany({
      where: { trainerId },
      orderBy: { name: "asc" },
    });

    response.json({ data: athletes });
  } catch (error) {
    sendError(response, error);
  }
}

export async function getAthlete(request: Request, response: Response): Promise<void> {
  const trainerId = getAuthenticatedTrainerId(request, response);
  if (!trainerId) return;
  const athleteId = getRouteParam(request, "id");
  if (!athleteId) {
    response.status(400).json({ error: { message: "id is required" } });
    return;
  }

  try {
    const athlete = await prisma.athlete.findFirst({
      where: { id: athleteId, ...getAthleteAccessFilter(trainerId) },
    });
    if (!athlete) {
      response.status(404).json({ error: { message: "Athlete not found" } });
      return;
    }

    response.json({ data: athlete });
  } catch (error) {
    sendError(response, error);
  }
}

export async function updateAthlete(request: Request, response: Response): Promise<void> {
  const trainerId = getAuthenticatedTrainerId(request, response);
  if (!trainerId) return;
  const athleteId = getRouteParam(request, "id");
  if (!athleteId) {
    response.status(400).json({ error: { message: "id is required" } });
    return;
  }

  const body: unknown = request.body;
  if (!isRecord(body)) {
    response.status(400).json({ error: { message: "A valid JSON object is required" } });
    return;
  }

  const data: {
    name?: string;
    objective?: string;
    currentWeight?: number;
    isActive?: boolean;
    email?: string | null;
  } = {};
  if (body.name !== undefined) {
    if (typeof body.name !== "string" || !body.name.trim()) {
      response.status(400).json({ error: { message: "name must be a non-empty string" } });
      return;
    }
    data.name = body.name.trim();
  }
  if (body.objective !== undefined) {
    if (typeof body.objective !== "string" || !body.objective.trim()) {
      response.status(400).json({ error: { message: "objective must be a non-empty string" } });
      return;
    }
    data.objective = body.objective.trim();
  }
  if (body.currentWeight !== undefined) {
    if (
      typeof body.currentWeight !== "number" ||
      !Number.isFinite(body.currentWeight) ||
      body.currentWeight <= 0
    ) {
      response.status(400).json({ error: { message: "currentWeight must be a positive number" } });
      return;
    }
    data.currentWeight = body.currentWeight;
  }
  if (body.isActive !== undefined) {
    if (typeof body.isActive !== "boolean") {
      response.status(400).json({ error: { message: "isActive must be a boolean" } });
      return;
    }
    data.isActive = body.isActive;
  }
  if (body.email !== undefined) {
    if (body.email !== null && (typeof body.email !== "string" || !body.email.trim())) {
      response.status(400).json({ error: { message: "email must be a valid email address or null" } });
      return;
    }
    data.email = typeof body.email === "string" ? body.email.trim().toLowerCase() : null;
  }
  if (Object.keys(data).length === 0) {
    response.status(400).json({ error: { message: "At least one athlete field is required" } });
    return;
  }

  try {
    const athlete = await prisma.athlete.update({
      where: { id: athleteId, ...getAthleteAccessFilter(trainerId) },
      data,
    });
    response.json({ data: athlete });
  } catch (error) {
    sendError(response, error);
  }
}

export async function updateAthleteMetrics(
  request: Request,
  response: Response,
): Promise<void> {
  const trainerId = getAuthenticatedTrainerId(request, response);
  if (!trainerId) return;

  const body: unknown = request.body;
  if (!isRecord(body)) {
    response.status(400).json({ error: { message: "A valid JSON object is required" } });
    return;
  }

  const data: { objective?: string; currentWeight?: number } = {};
  if (body.objective !== undefined) {
    if (typeof body.objective !== "string" || !body.objective.trim()) {
      response.status(400).json({ error: { message: "objective must be a non-empty string" } });
      return;
    }
    data.objective = body.objective.trim();
  }

  if (body.currentWeight !== undefined) {
    if (
      typeof body.currentWeight !== "number" ||
      !Number.isFinite(body.currentWeight) ||
      body.currentWeight <= 0
    ) {
      response.status(400).json({ error: { message: "currentWeight must be a positive number" } });
      return;
    }
    data.currentWeight = body.currentWeight;
  }

  if (Object.keys(data).length === 0) {
    response.status(400).json({
      error: { message: "At least one metric (objective or currentWeight) is required" },
    });
    return;
  }

  const athleteId = getRouteParam(request, "athleteId");
  if (!athleteId) {
    response.status(400).json({ error: { message: "athleteId is required" } });
    return;
  }

  try {
    const athlete = await prisma.athlete.update({
      where: { id: athleteId, ...getAthleteAccessFilter(trainerId) },
      data,
    });

    response.json({ data: athlete });
  } catch (error) {
    sendError(response, error);
  }
}

export async function deleteAthlete(request: Request, response: Response): Promise<void> {
  const trainerId = getAuthenticatedTrainerId(request, response);
  if (!trainerId) return;
  const athleteId = getRouteParam(request, "id");
  if (!athleteId) {
    response.status(400).json({ error: { message: "id is required" } });
    return;
  }

  try {
    const result = await prisma.athlete.deleteMany({
      where: { id: athleteId, ...getAthleteAccessFilter(trainerId) },
    });
    if (result.count === 0) {
      response.status(404).json({ error: { message: "Athlete not found" } });
      return;
    }
    response.json({ data: { id: athleteId, deleted: true } });
  } catch (error) {
    sendError(response, error);
  }
}
