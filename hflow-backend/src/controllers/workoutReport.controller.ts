import { unlink } from "node:fs/promises";
import path from "node:path";
import type { Request, Response } from "express";
import { getParam, getTrainerId, isRecord, prisma } from "./plan.controller.utils";
import { workoutVideoDirectory } from "../middlewares/workoutVideoUpload.middleware";
import logger from "../utils/logger";

function isRir(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 10;
}

function isActualKg(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1000;
}

function sendReportError(response: Response, error: unknown): void {
  logger.error("Workout report request failed", { error });
  response.status(500).json({ error: { message: "Internal server error" } });
}

export async function listWorkoutSetReports(
  request: Request,
  response: Response,
): Promise<void> {
  const trainerId = getTrainerId(request, response);
  if (!trainerId) return;

  const athleteId = request.query.athleteId;
  if (athleteId !== undefined && (typeof athleteId !== "string" || !athleteId.trim())) {
    response.status(400).json({ error: { message: "athleteId must be a non-empty string" } });
    return;
  }

  try {
    const reports = await prisma.workoutSetReport.findMany({
      where: {
        workoutPlan: {
          trainerId,
          ...(typeof athleteId === "string" ? { athleteId } : {}),
        },
      },
      include: {
        workoutPlan: {
          select: {
            id: true,
            title: true,
            athleteId: true,
            scheduledAt: true,
            athlete: { select: { name: true } },
          },
        },
      },
      orderBy: [{ createdAt: "desc" }, { setNumber: "asc" }],
    });
    response.json({ data: reports });
  } catch (error) {
    sendReportError(response, error);
  }
}

export async function createWorkoutSetReport(
  request: Request,
  response: Response,
): Promise<void> {
  const trainerId = getTrainerId(request, response);
  if (!trainerId) return;
  const body: unknown = request.body;
  if (!isRecord(body)) {
    response.status(400).json({ error: { message: "A valid JSON object is required" } });
    return;
  }

  const workoutPlanId =
    typeof body.workoutPlanId === "string" ? body.workoutPlanId.trim() : "";
  const exercise = typeof body.exercise === "string" ? body.exercise.trim() : "";
  const setNumber = body.setNumber;
  const targetRir = body.targetRir;
  if (
    !workoutPlanId ||
    !exercise ||
    exercise.length > 120 ||
    !Number.isInteger(setNumber) ||
    typeof setNumber !== "number" ||
    setNumber < 1 ||
    setNumber > 50 ||
    !isRir(targetRir)
  ) {
    response.status(400).json({
      error: {
        message:
          "workoutPlanId, exercise, setNumber (1–50), and targetRir (0–10) are required",
      },
    });
    return;
  }
  if (Object.keys(body).some((key) => !["workoutPlanId", "exercise", "setNumber", "targetRir"].includes(key))) {
    response.status(400).json({ error: { message: "Unknown workout set report fields are not allowed" } });
    return;
  }

  try {
    const plan = await prisma.workoutPlan.findFirst({
      where: { id: workoutPlanId, trainerId },
      select: { id: true },
    });
    if (!plan) {
      response.status(404).json({ error: { message: "Workout plan not found" } });
      return;
    }

    const report = await prisma.workoutSetReport.upsert({
      where: {
        workoutPlanId_exercise_setNumber: { workoutPlanId, exercise, setNumber },
      },
      create: { workoutPlanId, exercise, setNumber, targetRir },
      update: { targetRir },
    });
    response.status(201).json({ data: report });
  } catch (error) {
    sendReportError(response, error);
  }
}

export async function updateWorkoutSetReport(
  request: Request,
  response: Response,
): Promise<void> {
  const trainerId = getTrainerId(request, response);
  if (!trainerId) return;
  const setId = getParam(request, "setId");
  if (!setId) {
    response.status(400).json({ error: { message: "setId is required" } });
    return;
  }
  const body: unknown = request.body;
  if (!isRecord(body)) {
    response.status(400).json({ error: { message: "A valid JSON object is required" } });
    return;
  }

  const data: { actualRir?: number | null; actualKg?: number | null } = {};
  if (body.actualRir !== undefined) {
    if (body.actualRir !== null && !isRir(body.actualRir)) {
      response.status(400).json({ error: { message: "actualRir must be between 0 and 10 or null" } });
      return;
    }
    data.actualRir = body.actualRir === null ? null : body.actualRir;
  }
  if (body.actualKg !== undefined) {
    if (body.actualKg !== null && !isActualKg(body.actualKg)) {
      response.status(400).json({ error: { message: "actualKg must be between 0 and 1000 or null" } });
      return;
    }
    data.actualKg = body.actualKg === null ? null : body.actualKg;
  }
  if (
    Object.keys(data).length === 0 ||
    Object.keys(body).some((key) => !["actualRir", "actualKg"].includes(key))
  ) {
    response.status(400).json({ error: { message: "Provide only actualRir and/or actualKg" } });
    return;
  }

  try {
    const report = await prisma.workoutSetReport.findFirst({
      where: { id: setId, workoutPlan: { trainerId } },
      select: { id: true },
    });
    if (!report) {
      response.status(404).json({ error: { message: "Workout set report not found" } });
      return;
    }
    const updatedReport = await prisma.workoutSetReport.update({
      where: { id: setId },
      data,
    });
    response.json({ data: updatedReport });
  } catch (error) {
    sendReportError(response, error);
  }
}

export async function uploadWorkoutSetVideo(
  request: Request,
  response: Response,
): Promise<void> {
  const trainerId = getTrainerId(request, response);
  if (!trainerId) return;
  const setId = getParam(request, "setId");
  const file = request.file;
  if (!setId || !file) {
    if (file) await unlink(file.path).catch((error: unknown) => {
      logger.warn("Unable to remove unclaimed workout video", { error });
    });
    response.status(400).json({ error: { message: "A setId and video file are required" } });
    return;
  }

  try {
    const report = await prisma.workoutSetReport.findFirst({
      where: { id: setId, workoutPlan: { trainerId } },
      select: { id: true, videoFileName: true },
    });
    if (!report) {
      await unlink(file.path);
      response.status(404).json({ error: { message: "Workout set report not found" } });
      return;
    }

    await prisma.workoutSetReport.update({
      where: { id: setId },
      data: { videoFileName: file.filename },
    });
    if (report.videoFileName) {
      await unlink(path.join(workoutVideoDirectory, report.videoFileName)).catch((error: unknown) => {
        logger.warn("Unable to remove replaced workout video", { error, setId });
      });
    }
    response.status(200).json({ data: { setId, videoUploaded: true } });
  } catch (error) {
    await unlink(file.path).catch((cleanupError: unknown) => {
      logger.warn("Unable to remove failed workout video upload", { error: cleanupError });
    });
    sendReportError(response, error);
  }
}

export async function streamWorkoutSetVideo(
  request: Request,
  response: Response,
): Promise<void> {
  const trainerId = getTrainerId(request, response);
  if (!trainerId) return;
  const setId = getParam(request, "setId");
  if (!setId) {
    response.status(400).json({ error: { message: "setId is required" } });
    return;
  }

  try {
    const report = await prisma.workoutSetReport.findFirst({
      where: { id: setId, workoutPlan: { trainerId } },
      select: { videoFileName: true },
    });
    if (!report?.videoFileName || !/^[0-9a-f-]+\.(mp4|webm|mov)$/i.test(report.videoFileName)) {
      response.status(404).json({ error: { message: "Workout video not found" } });
      return;
    }
    response.setHeader("Cache-Control", "private, no-store");
    response.type(path.extname(report.videoFileName));
    response.sendFile(path.join(workoutVideoDirectory, report.videoFileName), (error) => {
      if (error && !response.headersSent) {
        if ("statusCode" in error && error.statusCode === 404) {
          response.status(404).json({ error: { message: "Workout video not found" } });
          return;
        }
        logger.error("Unable to stream workout video", { error, setId });
        response.status(500).json({ error: { message: "Unable to stream workout video" } });
      }
    });
  } catch (error) {
    sendReportError(response, error);
  }
}
