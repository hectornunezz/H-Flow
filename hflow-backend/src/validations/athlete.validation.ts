import { z } from "zod";

const athleteName = z.string().trim().min(1).max(100);
const athleteObjective = z.string().trim().min(1).max(500);
const currentWeight = z.number().finite().positive();
const athleteEmail = z.string().trim().email().max(254).transform((email) => email.toLowerCase());

export const createAthleteSchema = z
  .object({
    name: athleteName,
    objective: athleteObjective,
    currentWeight,
    trainerId: z.string().trim().min(1).max(64).optional(),
    email: athleteEmail.optional(),
  })
  .strict();

export const updateAthleteSchema = z
  .object({
    name: athleteName.optional(),
    objective: athleteObjective.optional(),
    currentWeight: currentWeight.optional(),
    isActive: z.boolean().optional(),
    email: athleteEmail.nullable().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one athlete field is required",
  });

export const updateAthleteMetricsSchema = z
  .object({
    objective: athleteObjective.optional(),
    currentWeight: currentWeight.optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one metric (objective or currentWeight) is required",
  });
