import { PrismaClient } from "@prisma/client";
import type { Request, Response } from "express";
import logger from "../utils/logger";

const prisma = new PrismaClient();
const RETENTION_THRESHOLD_DAYS = 7;
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

function csvCell(value: string | number): string {
  let text = String(value);
  if (typeof value === "string" && /^[\s]*[=+\-@]/.test(text)) {
    text = `'${text}`;
  }
  return `"${text.replace(/"/g, '""')}"`;
}

export async function getDashboardStats(request: Request, response: Response): Promise<void> {
  const trainerId = request.auth?.trainerId;
  if (!trainerId) {
    response.status(401).json({ error: { message: "Authentication is required" } });
    return;
  }

  const now = new Date();
  const currentMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const previousMonthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1),
  );

  try {
    const [activeAthletes, thisMonthRegistrations, lastMonthRegistrations, recentAthletes] =
      await Promise.all([
        prisma.athlete.count({ where: { trainerId, isActive: true } }),
        prisma.athlete.count({
          where: {
            trainerId,
            createdAt: { gte: currentMonthStart },
          },
        }),
        prisma.athlete.count({
          where: {
            trainerId,
            createdAt: { gte: previousMonthStart, lt: currentMonthStart },
          },
        }),
        prisma.athlete.findMany({
          where: { trainerId },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 5,
          select: {
            id: true,
            name: true,
            objective: true,
            currentWeight: true,
            isActive: true,
            createdAt: true,
          },
        }),
      ]);

    const growthPercentage =
      lastMonthRegistrations === 0
        ? null
        : ((thisMonthRegistrations - lastMonthRegistrations) / lastMonthRegistrations) * 100;

    response.json({
      data: {
        activeAthletes,
        growth: {
          period: "month-over-month",
          thisMonthRegistrations,
          lastMonthRegistrations,
          percentage: growthPercentage,
        },
        recentAthletes,
      },
    });
  } catch (error) {
    logger.error("Dashboard stats request failed", { error });
    response.status(500).json({ error: { message: "Unable to load dashboard statistics" } });
  }
}

export async function exportDashboardReport(request: Request, response: Response): Promise<void> {
  const trainerId = request.auth?.trainerId;
  if (!trainerId) {
    response.status(401).json({ error: { message: "Authentication is required" } });
    return;
  }

  try {
    const athletes = await prisma.athlete.findMany({
      where: { trainerId },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: {
        name: true,
        objective: true,
        currentWeight: true,
        isActive: true,
        createdAt: true,
        checkIns: {
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          select: { weight: true },
        },
      },
    });

    const rows = [
      [
        "Atleta",
        "Objetivo",
        "Peso inicial registrado (kg)",
        "Último peso registrado (kg)",
        "Variación de peso (kg)",
        "Número de check-ins",
        "Peso actual (kg)",
        "Estado",
        "Fecha de alta",
      ],
      ...athletes.map((athlete) => {
        const firstWeight = athlete.checkIns[0]?.weight;
        const lastWeight = athlete.checkIns[athlete.checkIns.length - 1]?.weight;
        const weightChange =
          firstWeight !== undefined && lastWeight !== undefined
            ? (lastWeight - firstWeight).toFixed(2)
            : "";

        return [
          athlete.name,
          athlete.objective,
          firstWeight === undefined ? "" : firstWeight.toFixed(2),
          lastWeight === undefined ? "" : lastWeight.toFixed(2),
          weightChange,
          String(athlete.checkIns.length),
          athlete.currentWeight.toFixed(2),
          athlete.isActive ? "Activo" : "Inactivo",
          athlete.createdAt.toISOString().slice(0, 10),
        ];
      }),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
    const reportMonth = new Date().toISOString().slice(0, 7);

    response
      .status(200)
      .setHeader("Content-Type", "text/csv; charset=utf-8")
      .setHeader(
        "Content-Disposition",
        `attachment; filename="hflow-informe-atletas-${reportMonth}.csv"`,
      )
      .send(csv);
  } catch (error) {
    logger.error("Dashboard report export failed", { trainerId, error });
    response.status(500).json({ error: { message: "Unable to export dashboard report" } });
  }
}

export async function getRetentionAlerts(request: Request, response: Response): Promise<void> {
  const trainerId = request.auth?.trainerId;
  if (!trainerId) {
    response.status(401).json({ error: { message: "Authentication is required" } });
    return;
  }

  const now = new Date();
  const threshold = new Date(now.getTime() - RETENTION_THRESHOLD_DAYS * DAY_IN_MILLISECONDS);

  try {
    const athletes = await prisma.athlete.findMany({
      where: { trainerId, isActive: true },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: {
        id: true,
        name: true,
        checkIns: {
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 1,
          select: { createdAt: true },
        },
        workoutPlans: { take: 1, select: { id: true } },
        nutritionPlans: { take: 1, select: { id: true } },
      },
    });

    const alerts = athletes.flatMap((athlete) => {
      const lastCheckInAt = athlete.checkIns[0]?.createdAt ?? null;
      const daysSinceCheckIn = lastCheckInAt
        ? Math.floor((now.getTime() - lastCheckInAt.getTime()) / DAY_IN_MILLISECONDS)
        : null;
      const hasActivePlan = athlete.workoutPlans.length > 0 || athlete.nutritionPlans.length > 0;
      const reasons: ("no_recent_checkin" | "no_active_plan")[] = [];

      if (!lastCheckInAt || lastCheckInAt < threshold) reasons.push("no_recent_checkin");
      if (!hasActivePlan) reasons.push("no_active_plan");
      if (reasons.length === 0) return [];

      return [{
        id: athlete.id,
        name: athlete.name,
        lastCheckInAt,
        daysSinceCheckIn,
        hasActivePlan,
        reasons,
      }];
    });

    response.json({
      data: {
        thresholdDays: RETENTION_THRESHOLD_DAYS,
        count: alerts.length,
        alerts,
      },
    });
  } catch (error) {
    logger.error("Dashboard retention alerts request failed", { trainerId, error });
    response.status(500).json({ error: { message: "Unable to load retention alerts" } });
  }
}
