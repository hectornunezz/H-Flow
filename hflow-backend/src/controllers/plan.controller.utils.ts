import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../services/prisma.service";
import logger from "../utils/logger";

export { prisma };

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getParam(request: Request, name: string): string | undefined {
  const value = request.params[name];
  return typeof value === "string" && value.trim() ? value : undefined;
}

export function getTrainerId(request: Request, response: Response): string | undefined {
  const trainerId = request.auth?.trainerId;
  if (!trainerId) {
    response.status(401).json({ error: { message: "Authentication is required" } });
    return undefined;
  }
  return trainerId;
}

export function sendPlanError(response: Response, error: unknown, context: string): void {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") {
      response.status(404).json({ error: { message: "Plan not found" } });
      return;
    }

    if (error.code === "P2003") {
      response.status(404).json({ error: { message: "Trainer or athlete not found" } });
      return;
    }
  }

  logger.error(`${context} request failed`, { error });
  response.status(500).json({ error: { message: "Internal server error" } });
}
