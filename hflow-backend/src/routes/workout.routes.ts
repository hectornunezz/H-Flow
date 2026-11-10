import { Router, type RequestHandler } from "express";
import {
  createWorkoutPlan,
  cloneWorkoutPlan,
  downloadWorkoutPlanPdf,
  deleteWorkoutPlan,
  getWorkoutPlan,
  listWorkoutPlans,
  updateWorkoutPlan,
} from "../controllers/workout.controller";
import {
  createWorkoutSetReport,
  listWorkoutSetReports,
  streamWorkoutSetVideo,
  updateWorkoutSetReport,
  uploadWorkoutSetVideo,
} from "../controllers/workoutReport.controller";
import workoutVideoUploadMiddleware from "../middlewares/workoutVideoUpload.middleware";

const router = Router();
const trainerOnly: RequestHandler = (request, response, next) => {
  if (!request.auth?.trainerId) {
    response.status(403).json({ error: { message: "Only trainers can manage workout reports" } });
    return;
  }
  next();
};

router.post("/", createWorkoutPlan);
router.get("/reports", trainerOnly, listWorkoutSetReports);
router.post("/reports/sets", trainerOnly, createWorkoutSetReport);
router.patch("/reports/sets/:setId", trainerOnly, updateWorkoutSetReport);
router.post(
  "/reports/sets/:setId/video",
  trainerOnly,
  workoutVideoUploadMiddleware,
  uploadWorkoutSetVideo,
);
router.get("/reports/sets/:setId/video", trainerOnly, streamWorkoutSetVideo);
router.post("/:id/clone", cloneWorkoutPlan);
router.get("/", listWorkoutPlans);
router.get("/:id/pdf", downloadWorkoutPlanPdf);
router.get("/:id", getWorkoutPlan);
router.put("/:id", updateWorkoutPlan);
router.patch("/:planId", updateWorkoutPlan);
router.delete("/:id", deleteWorkoutPlan);

export default router;
