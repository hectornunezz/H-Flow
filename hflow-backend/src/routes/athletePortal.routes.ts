import express from "express";
import { Router } from "express";
import {
  createAthletePortalAccess,
  createAthletePortalCheckIn,
  downloadAthletePortalNutritionPdf,
  downloadAthletePortalWorkoutPdf,
  getAthletePortal,
} from "../controllers/athletePortal.controller";
import {
  authenticateAthletePortalToken,
  authenticateToken,
} from "../middlewares/auth.middleware";
import { requireBetaTester } from "../middlewares/betaAccess.middleware";

const router = Router();

router.post("/access", express.json(), authenticateToken, requireBetaTester, createAthletePortalAccess);
router.get("/me", authenticateAthletePortalToken, getAthletePortal);
router.post(
  "/checkins",
  express.json(),
  authenticateAthletePortalToken,
  createAthletePortalCheckIn,
);
router.get(
  "/workouts/:planId/pdf",
  authenticateAthletePortalToken,
  downloadAthletePortalWorkoutPdf,
);
router.get(
  "/nutrition/:planId/pdf",
  authenticateAthletePortalToken,
  downloadAthletePortalNutritionPdf,
);

export default router;
