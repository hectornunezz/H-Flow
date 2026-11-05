import { Router } from "express";
import { createCheckIn, getCheckInsByAthlete } from "../controllers/checkin.controller";

const router = Router();

router.post("/", createCheckIn);
router.get("/:athleteId", getCheckInsByAthlete);

export default router;
