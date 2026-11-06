import cron from "node-cron";
import { emailService } from "../services/email.service";
import { prisma } from "../services/prisma.service";
import logger from "../utils/logger";

export async function sendDailyWorkoutReminders(now = new Date()): Promise<void> {
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const startOfNextDay = new Date(startOfDay);
  startOfNextDay.setDate(startOfNextDay.getDate() + 1);

  const plans = await prisma.workoutPlan.findMany({
    where: {
      scheduledAt: { gte: startOfDay, lt: startOfNextDay },
      athlete: { email: { not: null } },
    },
    select: {
      title: true,
      athlete: { select: { id: true, name: true, email: true } },
    },
    orderBy: [{ athleteId: "asc" }, { title: "asc" }],
  });

  const reminders = new Map<
    string,
    { name: string; email: string; planTitles: string[] }
  >();

  for (const plan of plans) {
    const email = plan.athlete.email;
    if (!email) continue;

    const reminder = reminders.get(plan.athlete.id);
    if (reminder) {
      reminder.planTitles.push(plan.title);
    } else {
      reminders.set(plan.athlete.id, {
        name: plan.athlete.name,
        email,
        planTitles: [plan.title],
      });
    }
  }

  let sent = 0;
  let failed = 0;
  for (const [athleteId, reminder] of reminders) {
    try {
      await emailService.sendWorkoutReminder(
        reminder.email,
        reminder.name,
        reminder.planTitles,
      );
      sent += 1;
    } catch (error) {
      failed += 1;
      logger.error("Daily workout reminder delivery failed", { athleteId, error });
    }
  }

  logger.info("Daily workout reminders completed", {
    day: startOfDay.toISOString(),
    athletes: reminders.size,
    sent,
    failed,
  });
}

export function startDailyRemindersCron(): void {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  cron.schedule(
    "0 8 * * *",
    () => {
      void sendDailyWorkoutReminders().catch((error: unknown) => {
        logger.error("Daily workout reminder job failed", { error });
      });
    },
    { noOverlap: true },
  );
  logger.info("Daily workout reminders scheduled", { time: "08:00", timezone });
}
