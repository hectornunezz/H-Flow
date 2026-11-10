CREATE TABLE "WorkoutSetReport" (
    "id" TEXT NOT NULL,
    "workoutPlanId" TEXT NOT NULL,
    "exercise" TEXT NOT NULL,
    "setNumber" INTEGER NOT NULL,
    "targetRir" DOUBLE PRECISION NOT NULL,
    "actualRir" DOUBLE PRECISION,
    "actualKg" DOUBLE PRECISION,
    "videoFileName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WorkoutSetReport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkoutSetReport_workoutPlanId_exercise_setNumber_key"
ON "WorkoutSetReport"("workoutPlanId", "exercise", "setNumber");

CREATE INDEX "WorkoutSetReport_workoutPlanId_createdAt_idx"
ON "WorkoutSetReport"("workoutPlanId", "createdAt");

ALTER TABLE "WorkoutSetReport"
ADD CONSTRAINT "WorkoutSetReport_workoutPlanId_fkey"
FOREIGN KEY ("workoutPlanId") REFERENCES "WorkoutPlan"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
