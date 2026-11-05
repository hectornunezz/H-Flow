import { Router } from "express";
import {
  createWorkoutPlan,
  downloadWorkoutPlanPdf,
  deleteWorkoutPlan,
  getWorkoutPlan,
  listWorkoutPlans,
  updateWorkoutPlan,
} from "../controllers/workout.controller";

const router = Router();

router.post("/", createWorkoutPlan);
router.get("/", listWorkoutPlans);
router.get("/:id/pdf", downloadWorkoutPlanPdf);
router.get("/:id", getWorkoutPlan);
router.put("/:id", updateWorkoutPlan);
router.patch("/:planId", updateWorkoutPlan);
router.delete("/:id", deleteWorkoutPlan);

export default router;
