ALTER TABLE "WorkoutPlan"
ADD COLUMN "sourcePlanId" TEXT;

CREATE INDEX "WorkoutPlan_sourcePlanId_idx"
ON "WorkoutPlan"("sourcePlanId");

ALTER TABLE "WorkoutPlan"
ADD CONSTRAINT "WorkoutPlan_sourcePlanId_fkey"
FOREIGN KEY ("sourcePlanId") REFERENCES "WorkoutPlan"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
