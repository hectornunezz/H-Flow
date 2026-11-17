import { randomInt } from "node:crypto";
import bcrypt from "bcrypt";
import { Prisma } from "@prisma/client";
import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import logger from "../utils/logger";
import { stripeService } from "../services/stripe.service";
import { emailService } from "../services/email.service";
import { prisma } from "../services/prisma.service";
import { paymentsEnabled } from "../utils/featureFlags";

const BCRYPT_ROUNDS = 12;
const MAX_BCRYPT_PASSWORD_BYTES = 72;
const VERIFICATION_CODE_TTL_MS = 15 * 60 * 1000;

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

function createVerificationCode(): string {
  return String(randomInt(100000, 1000000));
}

async function issueVerificationChallenge(trainer: {
  id: string;
  email: string;
  name: string;
}): Promise<{ code: string; emailed: boolean }> {
  const code = createVerificationCode();
  const emailVerificationCodeHash = await bcrypt.hash(code, BCRYPT_ROUNDS);
  const emailVerificationExpiresAt = new Date(Date.now() + VERIFICATION_CODE_TTL_MS);

  await prisma.trainer.update({
    where: { id: trainer.id },
    data: {
      emailVerificationCodeHash,
      emailVerificationExpiresAt,
      emailVerifiedAt: null,
    },
  });

  let emailed = false;
  try {
    await emailService.sendVerificationCodeEmail(trainer.email, trainer.name, code);
    emailed = true;
  } catch (error) {
    logger.error("Trainer verification email delivery failed", {
      trainerId: trainer.id,
      error,
    });
    if (process.env.NODE_ENV !== "production") {
      logger.info("Development verification code (SMTP unavailable)", {
        trainerId: trainer.id,
        email: trainer.email,
        code,
      });
    }
  }

  return { code, emailed };
}

function buildAuthPayload(trainer: {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  isBetaTester: boolean;
}) {
  const token = createAccessToken(trainer.id);
  return {
    token,
    tokenType: "Bearer" as const,
    expiresIn: 3600,
    trainer: {
      id: trainer.id,
      email: trainer.email,
      name: trainer.name,
      createdAt: trainer.createdAt,
      is_beta_tester: trainer.isBetaTester,
    },
  };
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
    getJwtSecret();
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const trainer = await prisma.trainer.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: hashedPassword,
        emailVerifiedAt: null,
      },
    });

    if (paymentsEnabled()) {
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
    }

    const challenge = await issueVerificationChallenge(trainer);
    const payload: Record<string, unknown> = {
      requiresEmailVerification: true,
      email: trainer.email,
      message: "Te hemos enviado un código de verificación de 6 dígitos a tu correo.",
      emailed: challenge.emailed,
      trainer: {
        id: trainer.id,
        email: trainer.email,
        name: trainer.name,
        createdAt: trainer.createdAt,
        is_beta_tester: trainer.isBetaTester,
      },
    };

    if (!challenge.emailed && process.env.NODE_ENV !== "production") {
      payload.debugVerificationCode = challenge.code;
    }

    response.status(201).json({ data: payload });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      response.status(409).json({ error: { message: "An account with this email already exists" } });
      return;
    }
    sendServerError(response, error);
  }
}

export async function verifyTrainerEmail(request: Request, response: Response): Promise<void> {
  const body: unknown = request.body;
  if (!isRecord(body) || typeof body.email !== "string" || typeof body.code !== "string") {
    response.status(400).json({ error: { message: "email and code are required" } });
    return;
  }

  const email = body.email.trim().toLowerCase();
  const code = body.code.trim();

  try {
    const trainer = await prisma.trainer.findUnique({ where: { email } });
    if (!trainer?.emailVerificationCodeHash || !trainer.emailVerificationExpiresAt) {
      response.status(400).json({
        error: { message: "No hay una verificación pendiente para este correo" },
      });
      return;
    }

    if (trainer.emailVerificationExpiresAt.getTime() < Date.now()) {
      response.status(400).json({
        error: { message: "El código de verificación ha caducado. Solicita uno nuevo." },
      });
      return;
    }

    const matches = await bcrypt.compare(code, trainer.emailVerificationCodeHash);
    if (!matches) {
      response.status(400).json({ error: { message: "Código de verificación incorrecto" } });
      return;
    }

    const verifiedTrainer = await prisma.trainer.update({
      where: { id: trainer.id },
      data: {
        emailVerifiedAt: new Date(),
        emailVerificationCodeHash: null,
        emailVerificationExpiresAt: null,
      },
    });

    try {
      await emailService.sendWelcomeEmail(verifiedTrainer.email, verifiedTrainer.name);
    } catch (error) {
      logger.error("Trainer welcome email delivery failed", {
        trainerId: verifiedTrainer.id,
        error,
      });
    }

    response.status(200).json({ data: buildAuthPayload(verifiedTrainer) });
  } catch (error) {
    sendServerError(response, error);
  }
}

export async function resendTrainerVerification(
  request: Request,
  response: Response,
): Promise<void> {
  const body: unknown = request.body;
  if (!isRecord(body) || typeof body.email !== "string") {
    response.status(400).json({ error: { message: "email is required" } });
    return;
  }

  const email = body.email.trim().toLowerCase();

  try {
    const trainer = await prisma.trainer.findUnique({ where: { email } });
    if (!trainer) {
      response.status(200).json({
        data: {
          message: "Si existe una cuenta pendiente, te enviaremos un nuevo código.",
        },
      });
      return;
    }

    if (trainer.emailVerifiedAt) {
      response.status(400).json({
        error: { message: "Esta cuenta ya está verificada. Puedes iniciar sesión." },
      });
      return;
    }

    const challenge = await issueVerificationChallenge(trainer);
    const payload: Record<string, unknown> = {
      message: "Si existe una cuenta pendiente, te enviaremos un nuevo código.",
      emailed: challenge.emailed,
    };
    if (!challenge.emailed && process.env.NODE_ENV !== "production") {
      payload.debugVerificationCode = challenge.code;
    }

    response.status(200).json({ data: payload });
  } catch (error) {
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

    if (!trainer.emailVerifiedAt) {
      response.status(403).json({
        error: {
          message: "Debes verificar tu correo electrónico antes de iniciar sesión",
          code: "EMAIL_NOT_VERIFIED",
        },
      });
      return;
    }

    response.json({ data: buildAuthPayload(trainer) });
  } catch (error) {
    sendServerError(response, error);
  }
}

export async function getCurrentTrainer(request: Request, response: Response): Promise<void> {
  const trainerId = request.auth?.trainerId;
  if (!trainerId) {
    response.status(401).json({ error: { message: "Trainer authentication is required" } });
    return;
  }

  try {
    const trainer = await prisma.trainer.findUnique({
      where: { id: trainerId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        isBetaTester: true,
        emailVerifiedAt: true,
      },
    });
    if (!trainer) {
      response.status(404).json({ error: { message: "Trainer not found" } });
      return;
    }
    response.json({
      data: {
        trainer: {
          id: trainer.id,
          email: trainer.email,
          name: trainer.name,
          createdAt: trainer.createdAt,
          is_beta_tester: trainer.isBetaTester,
          email_verified: Boolean(trainer.emailVerifiedAt),
        },
      },
    });
  } catch (error) {
    sendServerError(response, error);
  }
}
