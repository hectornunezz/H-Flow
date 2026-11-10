import { mkdirSync } from "node:fs";
import path from "node:path";
import { createLogger, format, transports } from "winston";

const logDirectory = path.resolve(process.cwd(), "logs");
mkdirSync(logDirectory, { recursive: true });

const logger = createLogger({
  level: process.env.LOG_LEVEL || "info",
  defaultMeta: {
    service: "hflow-backend",
    environment: process.env.NODE_ENV || "development",
  },
  format: format.combine(
    format.errors({ stack: true }),
    format((info) => {
      if (info.error instanceof Error) {
        return {
          ...info,
          error: {
            message: info.error.message,
            stack: info.error.stack,
          },
        };
      }
      return info;
    })(),
    format.timestamp(),
    format.json(),
  ),
  transports: [
    new transports.File({
      filename: path.join(logDirectory, "error.log"),
      level: "error",
    }),
    new transports.File({
      filename: path.join(logDirectory, "combined.log"),
    }),
    new transports.Console(),
  ],
});

export default logger;
