import express, { Router } from "express";
import {
  createCheckoutSession,
  getSubscriptionOverview,
  handleStripeWebhook,
} from "../controllers/payment.controller";
import { authenticateToken } from "../middlewares/auth.middleware";
import { requireBetaTester } from "../middlewares/betaAccess.middleware";
import { requirePaymentsEnabled } from "../middlewares/paymentFeature.middleware";

const router = Router();

router.use(requirePaymentsEnabled);
router.post("/webhook", express.raw({ type: "application/json" }), handleStripeWebhook);
router.get("/subscription", authenticateToken, requireBetaTester, getSubscriptionOverview);
router.post("/checkout", express.json(), authenticateToken, requireBetaTester, createCheckoutSession);

export default router;
