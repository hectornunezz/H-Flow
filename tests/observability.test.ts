import express from "../hflow-backend/node_modules/express";
import request from "supertest";
import { prisma } from "../hflow-backend/src/services/prisma.service";

jest.mock("../hflow-backend/src/services/prisma.service", () => ({
  prisma: {
    $queryRaw: jest.fn().mockResolvedValue([]),
  },
}));

import { collectHttpMetrics, metricsHandler } from "../hflow-backend/src/middlewares/observability.middleware";
import healthRouter from "../hflow-backend/src/routes/health.routes";

const app = express();
const queryRawMock = prisma.$queryRaw as jest.Mock;
app.use(collectHttpMetrics);
app.use(healthRouter);
app.get("/metrics", metricsHandler);
app.get("/sample", (_request, response) => response.status(202).json({ status: "ok" }));

describe("backend observability endpoints", () => {
  it("serves liveness and readiness health checks", async () => {
    const healthz = await request(app).get("/healthz");
    const live = await request(app).get("/health/live");
    const ready = await request(app).get("/health/ready");

    expect(healthz.status).toBe(200);
    expect(healthz.body).toEqual({ status: "ok" });
    expect(live.status).toBe(200);
    expect(ready.status).toBe(200);
    expect(ready.body).toEqual({ status: "ready" });
  });

  it("exposes Prometheus metrics for requests without counting scrapes", async () => {
    await request(app).get("/sample");

    const metrics = await request(app).get("/metrics");
    const secondScrape = await request(app).get("/metrics");

    expect(metrics.status).toBe(200);
    expect(metrics.headers["content-type"]).toContain("text/plain");
    expect(metrics.text).toContain("# HELP hflow_http_requests_total");
    expect(metrics.text).toContain('hflow_http_requests_total{method="GET",status_code="202"} 1');
    expect(secondScrape.text).toContain('hflow_http_requests_total{method="GET",status_code="202"} 1');
    expect(metrics.text).not.toContain('path="/metrics"');
  });

  it("reports readiness failure when the database is unavailable", async () => {
    queryRawMock.mockRejectedValueOnce(new Error("database unavailable"));

    const response = await request(app).get("/health/ready");

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ status: "not_ready" });
  });
});
