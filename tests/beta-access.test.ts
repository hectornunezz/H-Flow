import express from "../hflow-backend/node_modules/express";
import jwt from "../hflow-backend/node_modules/jsonwebtoken";
import request from "supertest";
import { authenticateToken } from "../hflow-backend/src/middlewares/auth.middleware";

const mockFindUnique = jest.fn();
jest.doMock("../hflow-backend/src/services/prisma.service", () => ({
  prisma: { trainer: { findUnique: mockFindUnique } },
}));

const { requireBetaTester } = require("../hflow-backend/src/middlewares/betaAccess.middleware") as {
  requireBetaTester: express.RequestHandler;
};
const { requirePaymentsEnabled } = require(
  "../hflow-backend/src/middlewares/paymentFeature.middleware",
) as { requirePaymentsEnabled: express.RequestHandler };

const app = express();
app.get("/protected", authenticateToken, requireBetaTester, (_request, response) => {
  response.json({ allowed: true });
});
app.get("/payments", requirePaymentsEnabled, (_request, response) => {
  response.json({ enabled: true });
});

describe("closed beta access controls", () => {
  const secret = "test-only-jwt-secret-with-at-least-32-bytes";
  const token = jwt.sign({ trainerId: "trainer-1" }, secret, {
    algorithm: "HS256",
    expiresIn: "5m",
  });

  beforeEach(() => {
    process.env.JWT_SECRET = secret;
    process.env.ENABLE_PAYMENTS = "false";
    mockFindUnique.mockReset();
  });

  it("blocks non-approved trainers at the API boundary", async () => {
    mockFindUnique.mockResolvedValue({ isBetaTester: false });

    const response = await request(app)
      .get("/protected")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("BETA_ACCESS_PENDING");
  });

  it("allows approved trainers", async () => {
    mockFindUnique.mockResolvedValue({ isBetaTester: true });

    const response = await request(app)
      .get("/protected")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.allowed).toBe(true);
  });

  it("fails closed when the beta flag cannot be checked", async () => {
    mockFindUnique.mockRejectedValue(new Error("database unavailable"));

    const response = await request(app)
      .get("/protected")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(503);
  });

  it("keeps payment endpoints disabled unless explicitly enabled", async () => {
    const disabled = await request(app).get("/payments");
    expect(disabled.status).toBe(503);
    expect(disabled.body.error.code).toBe("PAYMENTS_DISABLED");

    process.env.ENABLE_PAYMENTS = "true";
    const enabled = await request(app).get("/payments");
    expect(enabled.status).toBe(200);
  });
});
