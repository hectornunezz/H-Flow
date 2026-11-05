import { Router } from "express";
import { generatePlanDraft } from "../controllers/ai.controller";

const router = Router();

router.post("/generate-plan", generatePlanDraft);

export default router;
