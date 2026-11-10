import express from "../hflow-backend/node_modules/express";
import request from "supertest";

const mockPrisma = {
  workoutPlan: { findFirst: jest.fn() },
  workoutSetReport: {
    findMany: jest.fn(),
    upsert: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
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

const workoutRoutes = require("../hflow-backend/src/routes/workout.routes").default;
const app = express();
app.use(express.json());
app.use((request: express.Request, _response: express.Response, next: express.NextFunction) => {
  const auth =
    request.header("x-actor") === "athlete"
      ? { athleteId: "athlete-1" }
      : { trainerId: "trainer-1" };
  Object.assign(request, { auth });
  next();
});
app.use("/api/workouts", workoutRoutes);

describe("workout set reports", () => {
  beforeEach(() => {
    Object.values(mockPrisma.workoutPlan).forEach((mock) => mock.mockReset());
    Object.values(mockPrisma.workoutSetReport).forEach((mock) => mock.mockReset());
  });

  it("lists only the authenticated trainer's reports", async () => {
    mockPrisma.workoutSetReport.findMany.mockResolvedValue([]);

    const response = await request(app).get("/api/workouts/reports");

    expect(response.status).toBe(200);
    expect(mockPrisma.workoutSetReport.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { workoutPlan: { trainerId: "trainer-1" } },
      }),
    );
  });

  it("creates a planned set report only for an owned workout", async () => {
    mockPrisma.workoutPlan.findFirst.mockResolvedValue({ id: "plan-1" });
    mockPrisma.workoutSetReport.upsert.mockResolvedValue({
      id: "set-1",
      exercise: "Sentadilla",
      setNumber: 2,
      targetRir: 2,
      actualRir: null,
      actualKg: null,
    });

    const response = await request(app).post("/api/workouts/reports/sets").send({
      workoutPlanId: "plan-1",
      exercise: "Sentadilla",
      setNumber: 2,
      targetRir: 2,
    });

    expect(response.status).toBe(201);
    expect(mockPrisma.workoutPlan.findFirst).toHaveBeenCalledWith({
      where: { id: "plan-1", trainerId: "trainer-1" },
      select: { id: true },
    });
    expect(mockPrisma.workoutSetReport.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: {
          workoutPlanId: "plan-1",
          exercise: "Sentadilla",
          setNumber: 2,
          targetRir: 2,
        },
      }),
    );
  });

  it("rejects invalid actual RIR values", async () => {
    const response = await request(app)
      .patch("/api/workouts/reports/sets/set-1")
      .send({ actualRir: 12 });

    expect(response.status).toBe(400);
    expect(mockPrisma.workoutSetReport.update).not.toHaveBeenCalled();
  });

  it("rejects athlete tokens before parsing or storing report videos", async () => {
    const response = await request(app)
      .post("/api/workouts/reports/sets/set-1/video")
      .set("x-actor", "athlete");

    expect(response.status).toBe(403);
    expect(response.body.error.message).toMatch(/Only trainers/);
    expect(mockPrisma.workoutSetReport.findFirst).not.toHaveBeenCalled();
  });

  it("updates actual values only for a report owned by the trainer", async () => {
    mockPrisma.workoutSetReport.findFirst.mockResolvedValue({ id: "set-1" });
    mockPrisma.workoutSetReport.update.mockResolvedValue({
      id: "set-1",
      actualRir: 1.5,
      actualKg: 92.5,
    });

    const response = await request(app)
      .patch("/api/workouts/reports/sets/set-1")
      .send({ actualRir: 1.5, actualKg: 92.5 });

    expect(response.status).toBe(200);
    expect(mockPrisma.workoutSetReport.findFirst).toHaveBeenCalledWith({
      where: { id: "set-1", workoutPlan: { trainerId: "trainer-1" } },
      select: { id: true },
    });
    expect(mockPrisma.workoutSetReport.update).toHaveBeenCalledWith({
      where: { id: "set-1" },
      data: { actualRir: 1.5, actualKg: 92.5 },
    });
  });
});
