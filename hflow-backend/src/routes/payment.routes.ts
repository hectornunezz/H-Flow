import express, { Router } from "express";
import {
  createCheckoutSession,
  getSubscriptionOverview,
  handleStripeWebhook,
} from "../controllers/payment.controller";
import { authenticateToken } from "../middlewares/auth.middleware";

const router = Router();

router.post("/webhook", express.raw({ type: "application/json" }), handleStripeWebhook);
router.get("/subscription", authenticateToken, getSubscriptionOverview);
router.post("/checkout", express.json(), authenticateToken, createCheckoutSession);

export default router;
