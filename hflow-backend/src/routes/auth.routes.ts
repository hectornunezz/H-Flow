import { Router } from "express";
import { getCurrentTrainer, loginTrainer, registerTrainer } from "../controllers/auth.controller";
import { authenticateToken } from "../middlewares/auth.middleware";
import { validateRequest } from "../middlewares/validateRequest.middleware";
import { loginTrainerSchema, registerTrainerSchema } from "../validations/auth.validation";

const router = Router();

router.post("/register", validateRequest(registerTrainerSchema), registerTrainer);
router.post("/login", validateRequest(loginTrainerSchema), loginTrainer);
router.get("/me", authenticateToken, getCurrentTrainer);

export default router;
