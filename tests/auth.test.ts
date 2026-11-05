import express from "../hflow-backend/node_modules/express";
import request from "supertest";

const mockPrisma = {
  trainer: {
    findUnique: jest.fn(),
  },
};

jest.doMock("@prisma/client", () => ({
  Prisma: {
    PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {},
  },
  PrismaClient: jest.fn(() => mockPrisma),
}));
jest.doMock("../hflow-backend/src/utils/logger", () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

const authRoutes = require("../hflow-backend/src/routes/auth.routes").default;
const bcrypt = require("../hflow-backend/node_modules/bcrypt") as {
  hash(value: string, rounds: number): Promise<string>;
};

const app = express();
app.use(express.json());
app.use("/api/auth", authRoutes);

describe("POST /api/auth/login", () => {
  const password = "correct-password";
  const trainer = {
    id: "trainer-1",
    email: "coach@example.com",
    name: "Coach",
    password: "",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
  };

  beforeAll(async () => {
    process.env.JWT_SECRET = "test-only-jwt-secret-with-at-least-32-bytes";
    trainer.password = await bcrypt.hash(password, 4);
  });

  beforeEach(() => {
    mockPrisma.trainer.findUnique.mockResolvedValue(trainer);
  });

  it("returns 401 when the password is incorrect", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: trainer.email, password: "incorrect-password" });

    expect(response.status).toBe(401);
    expect(response.body.error.message).toBe("Invalid email or password");
  });

  it("returns a token when the credentials are valid", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: trainer.email, password });

    expect(response.status).toBe(200);
    expect(response.body.data.token).toEqual(expect.any(String));
    expect(response.body.data.tokenType).toBe("Bearer");
    expect(response.body.data.trainer.id).toBe(trainer.id);
  });
});
