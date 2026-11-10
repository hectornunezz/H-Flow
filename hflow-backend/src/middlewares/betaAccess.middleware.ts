import type { NextFunction, Request, Response } from "express";
import { prisma } from "../services/prisma.service";
import logger from "../utils/logger";

export async function requireBetaTester(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const trainerId = request.auth?.trainerId;
  if (!trainerId) {
    response.status(401).json({ error: { message: "Trainer authentication is required" } });
    return;
  }

  try {
    const trainer = await prisma.trainer.findUnique({
      where: { id: trainerId },
      select: { isBetaTester: true },
    });
    if (!trainer) {
      response.status(401).json({ error: { message: "Trainer account no longer exists" } });
      return;
    }
    if (!trainer.isBetaTester) {
      response.status(403).json({
        error: {
          code: "BETA_ACCESS_PENDING",
          message: "Beta access is pending manual approval",
        },
      });
      return;
    }
    next();
  } catch (error) {
    logger.error("Beta access verification failed", { trainerId, error });
    response.status(503).json({ error: { message: "Beta access could not be verified" } });
  }
}
