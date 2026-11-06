import "dotenv/config";
import cors, { type CorsOptions } from "cors";
import express from "express";
import path from "node:path";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import { authenticateToken } from "./middlewares/auth.middleware";
import errorHandler from "./middlewares/errorHandler.middleware";
import athleteRoutes from "./routes/athlete.routes";
import athletePortalRoutes from "./routes/athletePortal.routes";
import aiRoutes from "./routes/ai.routes";
import authRoutes from "./routes/auth.routes";
import checkInRoutes from "./routes/checkin.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import marketingRoutes from "./routes/marketing.routes";
import nutritionRoutes from "./routes/nutrition.routes";
import profileRoutes from "./routes/profile.routes";
import paymentRoutes from "./routes/payment.routes";
import workoutRoutes from "./routes/workout.routes";
import { uploadDirectory } from "./middlewares/upload.middleware";
import {
  getMarketingVideoDirectory,
  startMarketingScheduler,
} from "./services/marketingScheduler.service";
import logger from "./utils/logger";
import { startDailyRemindersCron } from "./cron/dailyReminders.cron";
import { swaggerSpec } from "./config/swagger";
import { prisma } from "./services/prisma.service";

const app = express();
const port = Number(process.env.PORT) || 3000;

function getAllowedOrigins(): Set<string> {
  const configuredOrigins = (process.env.FRONTEND_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  for (const origin of configuredOrigins) {
    let parsedOrigin: URL;
    try {
      parsedOrigin = new URL(origin);
    } catch {
      throw new Error(`Invalid origin in FRONTEND_ORIGINS: ${origin}`);
    }

    if (
      !["http:", "https:"].includes(parsedOrigin.protocol) ||
      parsedOrigin.origin !== origin
    ) {
      throw new Error(`FRONTEND_ORIGINS entries must be HTTP(S) origins without paths: ${origin}`);
    }
  }

  return new Set([
    "http://localhost:3000",
    "http://localhost:3001",
    ...configuredOrigins,
  ]);
}

const allowedOrigins = getAllowedOrigins();
const corsOptions: CorsOptions = {
  origin(origin, callback) {
    callback(null, !origin || allowedOrigins.has(origin));
  },
};

app.use(helmet());
app.use(
  morgan("combined", {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  }),
);
app.get("/health/live", (_request, response) => {
  response.status(200).json({ status: "ok" });
});
app.get("/health/ready", async (_request, response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    response.status(200).json({ status: "ready" });
  } catch (error) {
    logger.warn("Backend readiness check failed", { error });
    response.status(503).json({ status: "not_ready" });
  }
});
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_request, response) => {
      response.status(429).json({ error: { message: "Too many requests; try again later" } });
    },
  }),
);
app.use(cors(corsOptions));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api/payments", paymentRoutes);
app.use("/api/athlete-portal", athletePortalRoutes);
app.use("/uploads", express.static(uploadDirectory, { dotfiles: "deny", index: false }));
app.use(
  "/marketing-media",
  express.static(getMarketingVideoDirectory(), {
    dotfiles: "deny",
    index: false,
    setHeaders: (response, filePath) => {
      if (path.extname(filePath).toLowerCase() === ".mp4") {
        response.setHeader("Content-Type", "video/mp4");
      }
    },
  }),
);
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/checkins", authenticateToken, checkInRoutes);
app.use("/api/dashboard", authenticateToken, dashboardRoutes);
app.use("/api/ai", authenticateToken, aiRoutes);
app.use("/api/athletes", authenticateToken, athleteRoutes);
app.use("/api/marketing", authenticateToken, marketingRoutes);
app.use("/api/profile", authenticateToken, profileRoutes);
app.use("/api/workouts", authenticateToken, workoutRoutes);
app.use("/api/nutrition", authenticateToken, nutritionRoutes);

app.get("/", (_request, response) => {
  response.json({ message: "H-Flow backend is running" });
});

app.use(errorHandler);

app.listen(port, () => {
  logger.info(`H-Flow backend listening on port ${port}`);
  startMarketingScheduler();
  startDailyRemindersCron();
});
