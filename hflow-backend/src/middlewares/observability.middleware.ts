import type { RequestHandler } from "express";
import { Counter, Histogram, Registry, collectDefaultMetrics } from "prom-client";
import logger from "../utils/logger";

const registry = new Registry();

collectDefaultMetrics({ register: registry, prefix: "hflow_" });

const httpRequests = new Counter({
  name: "hflow_http_requests_total",
  help: "Total number of HTTP requests handled by the backend.",
  labelNames: ["method", "status_code"] as const,
  registers: [registry],
});

const httpRequestDuration = new Histogram({
  name: "hflow_http_request_duration_seconds",
  help: "Duration of HTTP requests handled by the backend in seconds.",
  labelNames: ["method"] as const,
  registers: [registry],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

export const collectHttpMetrics: RequestHandler = (request, response, next) => {
  const start = process.hrtime.bigint();

  response.on("finish", () => {
    if (request.path === "/metrics") return;

    const durationSeconds = Number(process.hrtime.bigint() - start) / 1_000_000_000;
    const durationMs = durationSeconds * 1_000;
    const method = request.method;
    const statusCode = String(response.statusCode);

    httpRequests.inc({ method, status_code: statusCode });
    httpRequestDuration.observe({ method }, durationSeconds);

    if (!request.path.startsWith("/health")) {
      const route = request.route?.path;
      const path = route
        ? `${request.baseUrl}${Array.isArray(route) ? route.join("|") : route}`
        : "unmatched";

      logger.info("HTTP request", {
        http: {
          method,
          path,
          status_code: response.statusCode,
          response_time_ms: Math.round(durationMs * 100) / 100,
        },
      });
    }
  });

  next();
};

export const metricsHandler: RequestHandler = async (_request, response) => {
  response.type(registry.contentType).send(await registry.metrics());
};
