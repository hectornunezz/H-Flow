import { Router } from "express";
import { loginTrainer, registerTrainer } from "../controllers/auth.controller";
import { validateRequest } from "../middlewares/validateRequest.middleware";
import { loginTrainerSchema, registerTrainerSchema } from "../validations/auth.validation";

const router = Router();

router.post("/register", validateRequest(registerTrainerSchema), registerTrainer);
router.post("/login", validateRequest(loginTrainerSchema), loginTrainer);

export default router;
