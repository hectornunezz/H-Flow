import express from "../hflow-backend/node_modules/express";
import jwt from "../hflow-backend/node_modules/jsonwebtoken";
import request from "supertest";
import {
  authenticateAthletePortalToken,
  authenticateToken,
} from "../hflow-backend/src/middlewares/auth.middleware";

const app = express();
app.get("/portal", authenticateAthletePortalToken, (req, res) => {
  res.json({ athleteId: req.auth?.athleteId });
});
app.get("/api", authenticateToken, (req, res) => {
  res.json({ athleteId: req.auth?.athleteId });
});

describe("athlete portal token scope", () => {
  const secret = "test-only-jwt-secret-with-at-least-32-bytes";

  beforeAll(() => {
    process.env.JWT_SECRET = secret;
  });

  it("accepts a portal token only on portal routes", async () => {
    const token = jwt.sign(
      { athleteId: "athlete-1", purpose: "athlete-portal" },
      secret,
      { algorithm: "HS256", expiresIn: "5m" },
    );

    const portalResponse = await request(app)
      .get("/portal")
      .set("Authorization", `Bearer ${token}`);
    const apiResponse = await request(app)
      .get("/api")
      .set("Authorization", `Bearer ${token}`);

    expect(portalResponse.status).toBe(200);
    expect(portalResponse.body.athleteId).toBe("athlete-1");
    expect(apiResponse.status).toBe(401);
  });

  it("rejects regular athlete tokens on portal routes", async () => {
    const token = jwt.sign({ athleteId: "athlete-1" }, secret, {
      algorithm: "HS256",
      expiresIn: "5m",
    });

    const response = await request(app)
      .get("/portal")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(401);
  });

  it("rejects expired portal tokens", async () => {
    const token = jwt.sign(
      { athleteId: "athlete-1", purpose: "athlete-portal" },
      secret,
      { algorithm: "HS256", expiresIn: -1 },
    );

    const response = await request(app)
      .get("/portal")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(401);
  });
});
