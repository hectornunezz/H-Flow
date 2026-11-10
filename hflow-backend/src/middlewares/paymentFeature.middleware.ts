import type { NextFunction, Request, Response } from "express";
import { paymentsEnabled } from "../utils/featureFlags";

export function requirePaymentsEnabled(
  _request: Request,
  response: Response,
  next: NextFunction,
): void {
  if (!paymentsEnabled()) {
    response.status(503).json({
      error: {
        code: "PAYMENTS_DISABLED",
        message: "Payments are disabled during the closed beta",
      },
    });
    return;
  }
  next();
}
