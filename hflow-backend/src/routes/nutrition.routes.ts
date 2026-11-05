import { Router } from "express";
import {
  createNutritionPlan,
  deleteNutritionPlan,
  getNutritionPlan,
  listNutritionPlans,
  updateNutritionPlan,
} from "../controllers/nutrition.controller";

const router = Router();

router.post("/", createNutritionPlan);
router.get("/", listNutritionPlans);
router.get("/:planId", getNutritionPlan);
router.patch("/:planId", updateNutritionPlan);
router.delete("/:planId", deleteNutritionPlan);

export default router;
