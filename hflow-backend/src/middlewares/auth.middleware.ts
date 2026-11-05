import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import logger from "../utils/logger";

declare global {
  namespace Express {
    interface Request {
      auth?: { trainerId: string; athleteId?: never } | { athleteId: string; trainerId?: never };
    }
  }
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || Buffer.byteLength(secret, "utf8") < 32) {
    throw new Error("JWT_SECRET must be configured with at least 32 bytes");
  }
  return secret;
}

export function authenticateToken(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const authorization = request.get("authorization");
  const match = authorization?.match(/^Bearer\s+(\S+)$/i);

  if (!match) {
    response.status(401).json({ error: { message: "Bearer token is required" } });
    return;
  }

  let secret: string;
  try {
    secret = getJwtSecret();
  } catch (error) {
    logger.error("JWT configuration error", { error });
    response.status(500).json({ error: { message: "Authentication is not configured" } });
    return;
  }

  try {
    const payload = jwt.verify(match[1], secret, { algorithms: ["HS256"] });
    if (typeof payload === "string") {
      response.status(401).json({ error: { message: "Invalid or expired token" } });
      return;
    }
    if (payload.purpose === "athlete-portal") {
      response.status(401).json({ error: { message: "Invalid or expired token" } });
      return;
    }

    const trainerId = payload.trainerId;
    const athleteId = payload.athleteId;
    if (typeof trainerId === "string" && typeof athleteId !== "string") {
      request.auth = { trainerId };
    } else if (typeof athleteId === "string" && typeof trainerId !== "string") {
      request.auth = { athleteId };
    } else {
      response.status(401).json({ error: { message: "Invalid or expired token" } });
      return;
    }
  } catch {
    response.status(401).json({ error: { message: "Invalid or expired token" } });
    return;
  }

  next();
}

export function authenticateAthletePortalToken(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const authorization = request.get("authorization");
  const match = authorization?.match(/^Bearer\s+(\S+)$/i);

  if (!match) {
    response.status(401).json({ error: { message: "Athlete portal access token is required" } });
    return;
  }

  let secret: string;
  try {
    secret = getJwtSecret();
  } catch (error) {
    logger.error("JWT configuration error", { error });
    response.status(500).json({ error: { message: "Authentication is not configured" } });
    return;
  }

  try {
    const payload = jwt.verify(match[1], secret, { algorithms: ["HS256"] });
    if (
      typeof payload === "string" ||
      typeof payload.athleteId !== "string" ||
      payload.purpose !== "athlete-portal"
    ) {
      response.status(401).json({ error: { message: "Invalid or expired athlete portal token" } });
      return;
    }

    request.auth = { athleteId: payload.athleteId };
  } catch {
    response.status(401).json({ error: { message: "Invalid or expired athlete portal token" } });
    return;
  }

  next();
}
