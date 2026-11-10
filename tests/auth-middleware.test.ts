import express from "../hflow-backend/node_modules/express";
import jwt from "../hflow-backend/node_modules/jsonwebtoken";
import request from "supertest";
import { authenticateToken } from "../hflow-backend/src/middlewares/auth.middleware";

const app = express();
app.get("/protected", authenticateToken, (req, res) => {
  res.json({ auth: req.auth });
});

describe("trainer authentication middleware", () => {
  const secret = "test-only-jwt-secret-with-at-least-32-bytes";

  beforeEach(() => {
    process.env.JWT_SECRET = secret;
  });

  it("requires a bearer token", async () => {
    const missing = await request(app).get("/protected");
    const malformed = await request(app)
      .get("/protected")
      .set("Authorization", "Basic token");

    expect(missing.status).toBe(401);
    expect(malformed.status).toBe(401);
  });

  it("accepts a signed trainer token and attaches only its trainer identity", async () => {
    const token = jwt.sign({ trainerId: "trainer-1" }, secret, {
      algorithm: "HS256",
      expiresIn: "5m",
    });

    const response = await request(app)
      .get("/protected")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.auth).toEqual({ trainerId: "trainer-1" });
  });

  it("rejects expired, invalid, and non-HS256 tokens", async () => {
    const expiredToken = jwt.sign({ trainerId: "trainer-1" }, secret, {
      algorithm: "HS256",
      expiresIn: -1,
    });
    const wrongAlgorithmToken = jwt.sign(
      { trainerId: "trainer-1" },
      secret,
      { algorithm: "HS384", expiresIn: "5m" },
    );
    const invalidToken = jwt.sign({ trainerId: "trainer-1" }, "different-secret", {
      algorithm: "HS256",
      expiresIn: "5m",
    });

    for (const token of [expiredToken, wrongAlgorithmToken, invalidToken]) {
      const response = await request(app)
        .get("/protected")
        .set("Authorization", `Bearer ${token}`);
      expect(response.status).toBe(401);
    }
  });

  it("rejects portal tokens and payloads with ambiguous or missing identities", async () => {
    const tokens = [
      jwt.sign({ athleteId: "athlete-1", purpose: "athlete-portal" }, secret, {
        algorithm: "HS256",
      }),
      jwt.sign({ trainerId: "trainer-1", athleteId: "athlete-1" }, secret, {
        algorithm: "HS256",
      }),
      jwt.sign({ sub: "trainer-1" }, secret, { algorithm: "HS256" }),
    ];

    for (const token of tokens) {
      const response = await request(app)
        .get("/protected")
        .set("Authorization", `Bearer ${token}`);
      expect(response.status).toBe(401);
    }
  });
});
