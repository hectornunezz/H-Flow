import { Router } from "express";
import { getTrainerProfile, putTrainerProfile } from "../controllers/profile.controller";
import uploadMiddleware from "../middlewares/upload.middleware";

const router = Router();

router.get("/", getTrainerProfile);
router.put("/", uploadMiddleware, putTrainerProfile);

export default router;
