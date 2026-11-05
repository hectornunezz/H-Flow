import { Router } from "express";
import {
  createAthlete,
  deleteAthlete,
  getAthlete,
  importAthletesCsv,
  listAllAthletes,
  listTrainerAthletes,
  uploadAthleteAvatar,
  updateAthlete,
  updateAthleteMetrics,
} from "../controllers/athlete.controller";
import { validateRequest } from "../middlewares/validateRequest.middleware";
import uploadMiddleware from "../middlewares/upload.middleware";
import csvUploadMiddleware from "../middlewares/csvUpload.middleware";
import {
  createAthleteSchema,
  updateAthleteMetricsSchema,
  updateAthleteSchema,
} from "../validations/athlete.validation";

const router = Router();

router.post("/", validateRequest(createAthleteSchema), createAthlete);
router.post("/import-csv", csvUploadMiddleware, importAthletesCsv);
router.get("/", listAllAthletes);
router.get("/trainer/:trainerId", listTrainerAthletes);
router.put("/:id/avatar", uploadMiddleware, uploadAthleteAvatar);
router.get("/:id", getAthlete);
router.put("/:id", validateRequest(updateAthleteSchema), updateAthlete);
router.patch(
  "/:athleteId/metrics",
  validateRequest(updateAthleteMetricsSchema),
  updateAthleteMetrics,
);
router.delete("/:id", deleteAthlete);

export default router;
