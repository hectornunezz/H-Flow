import { z } from "zod";

const email = z.string().trim().email().max(254);
const password = z
  .string()
  .min(8)
  .max(72)
  .refine((value) => Buffer.byteLength(value, "utf8") <= 72, {
    message: "Password must not exceed 72 UTF-8 bytes",
  });

export const registerTrainerSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    email,
    password,
  })
  .strict();

export const loginTrainerSchema = z
  .object({
    email,
    password,
  })
  .strict();
