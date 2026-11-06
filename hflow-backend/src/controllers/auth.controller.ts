import bcrypt from "bcrypt";
import { Prisma } from "@prisma/client";
import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import logger from "../utils/logger";
import { stripeService } from "../services/stripe.service";
import { emailService } from "../services/email.service";
import { prisma } from "../services/prisma.service";

const BCRYPT_ROUNDS = 12;
const MAX_BCRYPT_PASSWORD_BYTES = 72;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || Buffer.byteLength(secret, "utf8") < 32) {
    throw new Error("JWT_SECRET must be configured with at least 32 bytes");
  }
  return secret;
}

function createAccessToken(trainerId: string): string {
  return jwt.sign({ trainerId }, getJwtSecret(), {
    algorithm: "HS256",
    expiresIn: "1h",
  });
}

function sendServerError(response: Response, error: unknown): void {
  logger.error("Authentication request failed", { error });
  response.status(500).json({ error: { message: "Internal server error" } });
}

export async function registerTrainer(request: Request, response: Response): Promise<void> {
  const body: unknown = request.body;
  if (!isRecord(body)) {
    response.status(400).json({ error: { message: "A valid JSON object is required" } });
    return;
  }

  const { name, email, password } = body;
  if (
    typeof name !== "string" ||
    !name.trim() ||
    typeof email !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
    typeof password !== "string" ||
    password.length < 8 ||
    Buffer.byteLength(password, "utf8") > MAX_BCRYPT_PASSWORD_BYTES
  ) {
    response.status(400).json({
      error: {
        message:
          "A non-empty name, valid email, and password between 8 characters and 72 UTF-8 bytes are required",
      },
    });
    return;
  }

  try {
    const jwtSecret = getJwtSecret();
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const trainer = await prisma.trainer.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: hashedPassword,
      },
    });
    let customer: Awaited<ReturnType<typeof stripeService.createCustomer>> | undefined;
    try {
      customer = await stripeService.createCustomer({
        trainerId: trainer.id,
        email: trainer.email,
        name: trainer.name,
      });
      await prisma.trainer.update({
        where: { id: trainer.id },
        data: { stripeCustomerId: customer.id },
      });
    } catch (error) {
      try {
        await prisma.trainer.delete({ where: { id: trainer.id } });
      } catch (cleanupError) {
        logger.error("Trainer cleanup failed after Stripe registration error", {
          trainerId: trainer.id,
          error: cleanupError,
        });
      }
      if (customer) {
        try {
          await stripeService.deleteCustomer(customer.id);
        } catch (cleanupError) {
          logger.error("Stripe customer cleanup failed after trainer registration error", {
            trainerId: trainer.id,
            stripeCustomerId: customer.id,
            error: cleanupError,
          });
        }
      }
      throw error;
    }
    const token = jwt.sign({ trainerId: trainer.id }, jwtSecret, {
      algorithm: "HS256",
      expiresIn: "1h",
    });

    try {
      await emailService.sendWelcomeEmail(trainer.email, trainer.name);
    } catch (error) {
      logger.error("Trainer welcome email delivery failed", {
        trainerId: trainer.id,
        error,
      });
    }

    response.status(201).json({
      data: {
        token,
        tokenType: "Bearer",
        expiresIn: 3600,
        trainer: {
          id: trainer.id,
          email: trainer.email,
          name: trainer.name,
          createdAt: trainer.createdAt,
        },
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      response.status(409).json({ error: { message: "An account with this email already exists" } });
      return;
    }
    sendServerError(response, error);
  }
}

export async function loginTrainer(request: Request, response: Response): Promise<void> {
  const body: unknown = request.body;
  if (!isRecord(body) || typeof body.email !== "string" || typeof body.password !== "string") {
    response.status(400).json({
      error: { message: "email and password are required" },
    });
    return;
  }

  try {
    const trainer = await prisma.trainer.findUnique({
      where: { email: body.email.trim().toLowerCase() },
    });
    if (!trainer || !(await bcrypt.compare(body.password, trainer.password))) {
      response.status(401).json({ error: { message: "Invalid email or password" } });
      return;
    }

    const token = createAccessToken(trainer.id);

    response.json({
      data: {
        token,
        tokenType: "Bearer",
        expiresIn: 3600,
        trainer: {
          id: trainer.id,
          email: trainer.email,
          name: trainer.name,
          createdAt: trainer.createdAt,
        },
      },
    });
  } catch (error) {
    sendServerError(response, error);
  }
}
