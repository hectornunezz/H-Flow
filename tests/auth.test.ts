import express from "../hflow-backend/node_modules/express";
import request from "supertest";

const mockPrisma = {
  trainer: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};
const mockStripeService = {
  createCustomer: jest.fn(),
  deleteCustomer: jest.fn(),
};
const mockEmailService = {
  sendWelcomeEmail: jest.fn(),
  sendVerificationCodeEmail: jest.fn(),
};

class MockPrismaClientKnownRequestError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}

jest.doMock("@prisma/client", () => ({
  Prisma: {
    PrismaClientKnownRequestError: MockPrismaClientKnownRequestError,
  },
  PrismaClient: jest.fn(() => mockPrisma),
}));
jest.doMock("../hflow-backend/src/services/stripe.service", () => ({
  stripeService: mockStripeService,
}));
jest.doMock("../hflow-backend/src/services/email.service", () => ({
  emailService: mockEmailService,
}));
jest.doMock("../hflow-backend/src/utils/logger", () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

const authRoutes = require("../hflow-backend/src/routes/auth.routes").default;
const bcrypt = require("../hflow-backend/node_modules/bcrypt") as {
  hash(value: string, rounds: number): Promise<string>;
  compare(value: string, hash: string): Promise<boolean>;
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
    isBetaTester: false,
    emailVerifiedAt: new Date("2026-01-01T00:00:00.000Z"),
    emailVerificationCodeHash: null as string | null,
    emailVerificationExpiresAt: null as Date | null,
  };

  beforeAll(async () => {
    process.env.JWT_SECRET = "test-only-jwt-secret-with-at-least-32-bytes";
    trainer.password = await bcrypt.hash(password, 4);
  });

  beforeEach(() => {
    process.env.ENABLE_PAYMENTS = "false";
    Object.values(mockPrisma.trainer).forEach((mock) => mock.mockReset());
    Object.values(mockStripeService).forEach((mock) => mock.mockReset());
    mockEmailService.sendWelcomeEmail.mockReset();
    mockEmailService.sendVerificationCodeEmail.mockReset();
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
    expect(mockPrisma.trainer.findUnique).toHaveBeenCalledWith({
      where: { email: trainer.email },
    });
  });

  it("rejects login when the email is not verified", async () => {
    mockPrisma.trainer.findUnique.mockResolvedValue({
      ...trainer,
      emailVerifiedAt: null,
    });

    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: trainer.email, password });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("EMAIL_NOT_VERIFIED");
  });

  it("uses the same unauthorized response for unknown accounts", async () => {
    mockPrisma.trainer.findUnique.mockResolvedValue(null);

    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "missing@example.com", password });

    expect(response.status).toBe(401);
    expect(response.body.error.message).toBe("Invalid email or password");
  });

  it("rejects malformed or unexpected login fields before querying the database", async () => {
    const shortPassword = await request(app)
      .post("/api/auth/login")
      .send({ email: trainer.email, password: "short" });
    const extraField = await request(app)
      .post("/api/auth/login")
      .send({ email: trainer.email, password, admin: true });

    expect(shortPassword.status).toBe(400);
    expect(extraField.status).toBe(400);
    expect(mockPrisma.trainer.findUnique).not.toHaveBeenCalled();
  });

  it("registers a pending beta trainer and requires email verification", async () => {
    const createdTrainer = {
      id: "trainer-2",
      email: "coach@example.com",
      name: "New Coach",
      createdAt: new Date("2026-02-01T00:00:00.000Z"),
      isBetaTester: false,
      emailVerifiedAt: null,
    };
    mockPrisma.trainer.create.mockImplementation(async ({ data }) => ({
      ...createdTrainer,
      email: data.email,
      name: data.name,
      password: data.password,
    }));
    mockPrisma.trainer.update.mockResolvedValue(createdTrainer);
    mockEmailService.sendVerificationCodeEmail.mockResolvedValue(undefined);

    const response = await request(app)
      .post("/api/auth/register")
      .send({
        name: "  New Coach ",
        email: " COACH@EXAMPLE.COM ",
        password: "strong-password",
      });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      requiresEmailVerification: true,
      email: "coach@example.com",
      emailed: true,
      trainer: { id: "trainer-2", email: "coach@example.com", name: "New Coach" },
    });
    expect(response.body.data.token).toBeUndefined();
    const createCall = mockPrisma.trainer.create.mock.calls[0][0];
    expect(createCall.data.password).not.toBe("strong-password");
    await expect(
      bcrypt.compare("strong-password", createCall.data.password),
    ).resolves.toBe(true);
    expect(response.body.data.trainer.is_beta_tester).toBe(false);
    expect(mockStripeService.createCustomer).not.toHaveBeenCalled();
    expect(mockEmailService.sendVerificationCodeEmail).toHaveBeenCalledWith(
      "coach@example.com",
      "New Coach",
      expect.stringMatching(/^\d{6}$/),
    );
    expect(mockEmailService.sendWelcomeEmail).not.toHaveBeenCalled();
  });

  it("rejects invalid registration data before hashing or creating an account", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({
        name: " ",
        email: "not-an-email",
        password: "short",
      });

    expect(response.status).toBe(400);
    expect(mockPrisma.trainer.create).not.toHaveBeenCalled();
    expect(mockStripeService.createCustomer).not.toHaveBeenCalled();
  });

  it("returns conflict for duplicate registration emails", async () => {
    mockPrisma.trainer.create.mockRejectedValue(
      new MockPrismaClientKnownRequestError("Unique constraint failed", "P2002"),
    );

    const response = await request(app)
      .post("/api/auth/register")
      .send({ name: "Coach", email: "coach@example.com", password: "strong-password" });

    expect(response.status).toBe(409);
    expect(response.body.error.message).toBe("An account with this email already exists");
    expect(mockStripeService.createCustomer).not.toHaveBeenCalled();
  });

  it("rolls back a newly created trainer if billing provisioning fails", async () => {
    process.env.ENABLE_PAYMENTS = "true";
    mockPrisma.trainer.create.mockResolvedValue({
      id: "trainer-3",
      email: "coach@example.com",
      name: "Coach",
      password: "hashed-password",
      createdAt: new Date(),
      isBetaTester: false,
      emailVerifiedAt: null,
    });
    mockStripeService.createCustomer.mockRejectedValue(new Error("Stripe unavailable"));
    mockPrisma.trainer.delete.mockResolvedValue({});

    const response = await request(app)
      .post("/api/auth/register")
      .send({ name: "Coach", email: "coach@example.com", password: "strong-password" });

    expect(response.status).toBe(500);
    expect(mockPrisma.trainer.delete).toHaveBeenCalledWith({
      where: { id: "trainer-3" },
    });
  });

  it("verifies a pending trainer with a valid 6-digit code and returns a token", async () => {
    const code = "123456";
    const codeHash = await bcrypt.hash(code, 4);
    mockPrisma.trainer.findUnique.mockResolvedValue({
      ...trainer,
      emailVerifiedAt: null,
      emailVerificationCodeHash: codeHash,
      emailVerificationExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    mockPrisma.trainer.update.mockResolvedValue({
      ...trainer,
      emailVerifiedAt: new Date(),
      emailVerificationCodeHash: null,
      emailVerificationExpiresAt: null,
    });
    mockEmailService.sendWelcomeEmail.mockResolvedValue(undefined);

    const response = await request(app)
      .post("/api/auth/verify-email")
      .send({ email: trainer.email, code });

    expect(response.status).toBe(200);
    expect(response.body.data.token).toEqual(expect.any(String));
    expect(mockEmailService.sendWelcomeEmail).toHaveBeenCalledWith(trainer.email, trainer.name);
  });
});
