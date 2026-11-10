import { Router, type RequestHandler } from "express";
import logger from "../utils/logger";
import { prisma } from "../services/prisma.service";

const healthRouter = Router();

const liveHandler: RequestHandler = (_request, response) => {
  response.status(200).json({ status: "ok" });
};

healthRouter.get("/healthz", liveHandler);
healthRouter.get("/health/live", liveHandler);
healthRouter.get("/health/ready", async (_request, response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    response.status(200).json({ status: "ready" });
  } catch (error) {
    logger.warn("Backend readiness check failed", { error });
    response.status(503).json({ status: "not_ready" });
  }
});

export default healthRouter;
