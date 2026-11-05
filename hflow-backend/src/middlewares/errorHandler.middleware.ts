import type { ErrorRequestHandler } from "express";
import logger from "../utils/logger";

function getStatusCode(error: unknown): number {
  if (typeof error !== "object" || error === null) return 500;

  const statusCode = "statusCode" in error ? error.statusCode : undefined;
  const status = "status" in error ? error.status : undefined;
  const candidate = statusCode ?? status;
  return typeof candidate === "number" && Number.isInteger(candidate) && candidate >= 400 && candidate < 600
    ? candidate
    : 500;
}

const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, next) => {
  const code = getStatusCode(error);
  const isDevelopment = process.env.NODE_ENV === "development";
  const errorMessage = error instanceof Error ? error.message : "Internal server error";
  const message = code >= 500 && !isDevelopment ? "Internal server error" : errorMessage;
  const stack = error instanceof Error ? error.stack : undefined;

  logger.error("Unhandled API error", {
    code,
    error: stack ?? String(error),
  });

  if (response.headersSent) {
    next(error);
    return;
  }

  response.status(code).json({
    code,
    message,
    ...(isDevelopment && stack ? { stack } : {}),
  });
};

export default errorHandler;
