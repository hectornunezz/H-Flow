import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const password = "password123";
const passwordHashRounds = 12;

const athletes = [
  { id: "demo-athlete-01", name: "Alex Morgan", email: "alex.morgan@example.com", objective: "Build strength and muscle", currentWeight: 78 },
  { id: "demo-athlete-02", name: "Sofia Reyes", email: "sofia.reyes@example.com", objective: "Lose 8 kg while maintaining muscle", currentWeight: 68 },
  { id: "demo-athlete-03", name: "Liam Chen", email: "liam.chen@example.com", objective: "Prepare for a half marathon", currentWeight: 72 },
  { id: "demo-athlete-04", name: "Camila Torres", email: "camila.torres@example.com", objective: "Improve mobility and core strength", currentWeight: 61 },
  { id: "demo-athlete-05", name: "Noah Patel", email: "noah.patel@example.com", objective: "Gain lean mass", currentWeight: 84 },
  { id: "demo-athlete-06", name: "Isabella García", email: "isabella.garcia@example.com", objective: "Build a consistent fitness routine", currentWeight: 64 },
  { id: "demo-athlete-07", name: "Ethan Brooks", email: "ethan.brooks@example.com", objective: "Improve athletic conditioning", currentWeight: 80 },
  { id: "demo-athlete-08", name: "Valentina Cruz", email: "valentina.cruz@example.com", objective: "Lose 5 kg and improve endurance", currentWeight: 70 },
  { id: "demo-athlete-09", name: "Lucas Silva", email: "lucas.silva@example.com", objective: "Increase squat and deadlift strength", currentWeight: 91 },
  { id: "demo-athlete-10", name: "Mia Johnson", email: "mia.johnson@example.com", objective: "Improve posture and overall wellness", currentWeight: 58 },
];

const workoutPlans = [
  { id: "demo-workout-01", athleteId: athletes[0].id, title: "Foundational Strength", description: "Three full-body sessions each week, focused on compound lifts and progressive overload." },
  { id: "demo-workout-02", athleteId: athletes[2].id, title: "Half-Marathon Base", description: "Four weekly runs with an easy long run, intervals, and two recovery days." },
  { id: "demo-workout-03", athleteId: athletes[4].id, title: "Lean Mass Block", description: "Four upper/lower split sessions with controlled tempo and gradual volume increases." },
  { id: "demo-workout-04", athleteId: athletes[6].id, title: "Athletic Conditioning", description: "Strength circuits, short sprints, and low-impact aerobic conditioning across four days." },
  { id: "demo-workout-05", athleteId: athletes[8].id, title: "Powerlifting Technique", description: "Three technique-focused sessions for squat, bench press, and deadlift with planned deloads." },
];

const nutritionPlans = [
  { id: "demo-nutrition-01", athleteId: athletes[1].id, details: "High-protein, moderate-calorie meals with vegetables at lunch and dinner.", calories: 1850 },
  { id: "demo-nutrition-02", athleteId: athletes[3].id, details: "Balanced meals with adequate protein and carbohydrates around training.", calories: 2050 },
  { id: "demo-nutrition-03", athleteId: athletes[5].id, details: "Simple maintenance-focused meal structure emphasizing whole foods and hydration.", calories: 1950 },
  { id: "demo-nutrition-04", athleteId: athletes[7].id, details: "Small calorie deficit with high-fiber meals and a protein source at each meal.", calories: 1900 },
  { id: "demo-nutrition-05", athleteId: athletes[9].id, details: "Balanced nutrition plan supporting recovery, regular meals, and steady energy.", calories: 2000 },
];

const marketingEpisodes = [
  {
    id: "demo-marketing-01",
    topic: "Three strength-training mistakes beginners can avoid",
    topicKey: "three strength-training mistakes beginners can avoid",
    audience: "People new to strength training",
    tone: "Encouraging and practical",
    daysFromNow: 1,
  },
  {
    id: "demo-marketing-02",
    topic: "Protein myths and what actually matters",
    topicKey: "protein myths and what actually matters",
    audience: "Busy adults interested in nutrition",
    tone: "Clear and evidence-informed",
    daysFromNow: 2,
  },
  {
    id: "demo-marketing-03",
    topic: "A five-minute mobility routine for desk workers",
    topicKey: "a five-minute mobility routine for desk workers",
    audience: "People who spend most of the day sitting",
    tone: "Friendly and motivating",
    daysFromNow: 3,
  },
];

function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function daysFromNow(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

async function seed(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("The demo seed is disabled in production");
  }

  const hashedPassword = await bcrypt.hash(password, passwordHashRounds);

  await prisma.$transaction(async (transaction) => {
    const trainer = await transaction.trainer.upsert({
      where: { email: "demo@hflow.com" },
      update: { name: "H-Flow Demo Trainer", password: hashedPassword, isBetaTester: true },
      create: {
        email: "demo@hflow.com",
        name: "H-Flow Demo Trainer",
        password: hashedPassword,
        isBetaTester: true,
      },
    });

    for (const athlete of athletes) {
      await transaction.athlete.upsert({
        where: { id: athlete.id },
        update: {
          name: athlete.name,
          email: athlete.email,
          objective: athlete.objective,
          currentWeight: athlete.currentWeight,
          trainerId: trainer.id,
          isActive: true,
        },
        create: { ...athlete, trainerId: trainer.id },
      });
    }

    for (const [index, athlete] of athletes.entries()) {
      const historicalWeight = athlete.currentWeight + (index % 2 === 0 ? 2.4 : 1.6);
      const baselineId = `demo-checkin-${String(index * 2 + 1).padStart(2, "0")}`;
      await transaction.checkIn.upsert({
        where: { id: baselineId },
        update: {
          athleteId: athlete.id,
          weight: historicalWeight,
          bodyFat: 20 + (index % 6),
          notes: "Baseline progress check-in",
          createdAt: daysAgo(180 - index),
        },
        create: {
          id: baselineId,
          athleteId: athlete.id,
          weight: historicalWeight,
          bodyFat: 20 + (index % 6),
          notes: "Baseline progress check-in",
          createdAt: daysAgo(180 - index),
        },
      });

      if (index < 5) {
        const recentId = `demo-checkin-${String(index * 2 + 2).padStart(2, "0")}`;
        await transaction.checkIn.upsert({
          where: { id: recentId },
          update: {
            athleteId: athlete.id,
            weight: athlete.currentWeight,
            bodyFat: 19 + (index % 6),
            notes: "Monthly progress check-in",
            createdAt: daysAgo(30 - index),
          },
          create: {
            id: recentId,
            athleteId: athlete.id,
            weight: athlete.currentWeight,
            bodyFat: 19 + (index % 6),
            notes: "Monthly progress check-in",
            createdAt: daysAgo(30 - index),
          },
        });
      }
    }

    for (const plan of workoutPlans) {
      await transaction.workoutPlan.upsert({
        where: { id: plan.id },
        update: {
          title: plan.title,
          description: plan.description,
          trainerId: trainer.id,
          athleteId: plan.athleteId,
        },
        create: { ...plan, trainerId: trainer.id },
      });
    }

    for (const plan of nutritionPlans) {
      await transaction.nutritionPlan.upsert({
        where: { id: plan.id },
        update: {
          details: plan.details,
          calories: plan.calories,
          trainerId: trainer.id,
          athleteId: plan.athleteId,
        },
        create: { ...plan, trainerId: trainer.id },
      });
    }

    for (const episode of marketingEpisodes) {
      await transaction.marketingEpisode.upsert({
        where: { id: episode.id },
        update: {
          trainerId: trainer.id,
          topic: episode.topic,
          topicKey: episode.topicKey,
          audience: episode.audience,
          tone: episode.tone,
          scheduledAt: daysFromNow(episode.daysFromNow),
          status: "scheduled",
        },
        create: {
          id: episode.id,
          trainerId: trainer.id,
          topic: episode.topic,
          topicKey: episode.topicKey,
          audience: episode.audience,
          tone: episode.tone,
          scheduledAt: daysFromNow(episode.daysFromNow),
        },
      });
    }
  });

  console.info("Demo data seeded: 1 trainer, 10 athletes, 5 workout plans, 5 nutrition plans, 15 check-ins, 3 marketing episodes.");
  console.info(`Login: demo@hflow.com / ${password}`);
}

seed()
  .catch((error: unknown) => {
    console.error("Failed to seed demo data:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
