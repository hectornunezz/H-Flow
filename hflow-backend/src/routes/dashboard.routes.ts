import { Router } from "express";
import {
  exportDashboardReport,
  getDashboardStats,
  getRetentionAlerts,
} from "../controllers/dashboard.controller";

const router = Router();

router.get("/stats", getDashboardStats);
router.get("/retention-alerts", getRetentionAlerts);
router.get("/export-report", exportDashboardReport);

export default router;
