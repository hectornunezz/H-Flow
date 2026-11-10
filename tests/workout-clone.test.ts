import express from "../hflow-backend/node_modules/express";
import request from "supertest";

const mockPrisma = {
  workoutPlan: {
    findFirst: jest.fn(),
    create: jest.fn(),
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
  Object.assign(request, { auth: { trainerId: "trainer-1" } });
  next();
});
app.use("/api/workouts", workoutRoutes);

describe("POST /api/workouts/:id/clone", () => {
  beforeEach(() => {
    mockPrisma.workoutPlan.findFirst.mockReset();
    mockPrisma.workoutPlan.create.mockReset();
  });

  it("creates an independent next-week plan and preserves the source", async () => {
    const scheduledAt = new Date("2026-11-02T09:00:00.000Z");
    const sourcePlan = {
      id: "plan-1",
      title: "Fuerza · Semana 1",
      description: "Sentadilla 80 kg × 8 reps · RIR 2",
      trainerId: "trainer-1",
      athleteId: "athlete-1",
      scheduledAt,
      createdAt: new Date("2026-10-26T09:00:00.000Z"),
      sourcePlanId: null,
    };
    const clonedPlan = {
      ...sourcePlan,
      id: "plan-2",
      scheduledAt: new Date("2026-11-09T09:00:00.000Z"),
      createdAt: new Date("2026-11-06T09:00:00.000Z"),
      sourcePlanId: sourcePlan.id,
    };
    mockPrisma.workoutPlan.findFirst.mockResolvedValue(sourcePlan);
    mockPrisma.workoutPlan.create.mockResolvedValue(clonedPlan);

    const response = await request(app).post("/api/workouts/plan-1/clone");

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      id: "plan-2",
      sourcePlanId: "plan-1",
      description: sourcePlan.description,
      athleteId: sourcePlan.athleteId,
    });
    expect(mockPrisma.workoutPlan.findFirst).toHaveBeenCalledWith({
      where: { id: "plan-1", trainerId: "trainer-1" },
    });
    expect(mockPrisma.workoutPlan.create).toHaveBeenCalledWith({
      data: {
        title: sourcePlan.title,
        description: sourcePlan.description,
        trainerId: sourcePlan.trainerId,
        athleteId: sourcePlan.athleteId,
        sourcePlanId: sourcePlan.id,
        scheduledAt: new Date("2026-11-09T09:00:00.000Z"),
      },
    });
    expect(sourcePlan.scheduledAt).toEqual(scheduledAt);
    expect(sourcePlan.sourcePlanId).toBeNull();
  });

  it("does not clone a plan owned by another trainer", async () => {
    mockPrisma.workoutPlan.findFirst.mockResolvedValue(null);

    const response = await request(app).post("/api/workouts/foreign-plan/clone");

    expect(response.status).toBe(404);
    expect(response.body.error.message).toBe("Plan not found");
    expect(mockPrisma.workoutPlan.create).not.toHaveBeenCalled();
  });
});
