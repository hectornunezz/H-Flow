import bcrypt from "bcrypt";
import { Prisma } from "@prisma/client";
import type { Request, Response } from "express";
import { readFile, unlink } from "node:fs/promises";
import path from "node:path";
import logger from "../utils/logger";
import { uploadDirectory } from "../middlewares/upload.middleware";
import { getTrainerId, isRecord, prisma } from "./plan.controller.utils";

const BCRYPT_ROUNDS = 12;
const MAX_BCRYPT_PASSWORD_BYTES = 72;

function getImageType(buffer: Buffer): "image/jpeg" | "image/png" | undefined {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 8 &&
    buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return "image/png";
  }
  return undefined;
}

async function removeUploadedFile(filePath: string): Promise<void> {
  try {
    await unlink(filePath);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
      return;
    }
    throw error;
  }
}

function getStoredAvatarPath(avatarUrl: string | null): string | undefined {
  if (!avatarUrl?.startsWith("/uploads/")) return undefined;
  const filename = path.basename(avatarUrl);
  if (!filename || filename !== avatarUrl.slice("/uploads/".length)) return undefined;
  const filePath = path.resolve(uploadDirectory, filename);
  return filePath.startsWith(`${uploadDirectory}${path.sep}`) ? filePath : undefined;
}

async function discardNewUpload(request: Request): Promise<void> {
  if (!request.file) return;
  try {
    await removeUploadedFile(request.file.path);
  } catch (error) {
    logger.error("Unable to remove rejected trainer avatar upload", { error });
  }
}

export async function getTrainerProfile(request: Request, response: Response): Promise<void> {
  const trainerId = getTrainerId(request, response);
  if (!trainerId) return;

  try {
    const trainer = await prisma.trainer.findUnique({
      where: { id: trainerId },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        profile: { select: { specialty: true, experienceYears: true, bio: true } },
      },
    });
    if (!trainer) {
      response.status(404).json({ error: { message: "Trainer not found" } });
      return;
    }

    response.json({
      data: {
        name: trainer.name,
        email: trainer.email,
        avatarUrl: trainer.avatarUrl,
        specialty: trainer.profile?.specialty ?? "",
        experienceYears: trainer.profile?.experienceYears ?? 0,
        bio: trainer.profile?.bio ?? "",
      },
    });
  } catch (error) {
    logger.error("Trainer profile lookup failed", { trainerId, error });
    response.status(500).json({ error: { message: "Unable to load trainer profile" } });
  }
}

export async function putTrainerProfile(request: Request, response: Response): Promise<void> {
  const trainerId = getTrainerId(request, response);
  if (!trainerId) {
    await discardNewUpload(request);
    return;
  }

  if (!isRecord(request.body)) {
    await discardNewUpload(request);
    response.status(400).json({ error: { message: "A valid profile object is required" } });
    return;
  }

  const { name, specialty, bio, experienceYears, password } = request.body;
  const years =
    typeof experienceYears === "string" && experienceYears.trim()
      ? Number(experienceYears)
      : experienceYears;
  if (typeof name !== "string" || !name.trim() || name.trim().length > 100) {
    await discardNewUpload(request);
    response.status(400).json({ error: { message: "name must be between 1 and 100 characters" } });
    return;
  }
  if (typeof specialty !== "string" || !specialty.trim() || specialty.trim().length > 100) {
    await discardNewUpload(request);
    response.status(400).json({ error: { message: "specialty must be between 1 and 100 characters" } });
    return;
  }
  if (typeof bio !== "string" || !bio.trim() || bio.trim().length > 2000) {
    await discardNewUpload(request);
    response.status(400).json({ error: { message: "bio must be between 1 and 2000 characters" } });
    return;
  }
  if (
    typeof years !== "number" ||
    !Number.isInteger(years) ||
    years < 0 ||
    years > 80
  ) {
    await discardNewUpload(request);
    response.status(400).json({ error: { message: "experienceYears must be an integer from 0 to 80" } });
    return;
  }
  if (
    password !== undefined &&
    password !== "" &&
    (typeof password !== "string" ||
      password.length < 8 ||
      Buffer.byteLength(password, "utf8") > MAX_BCRYPT_PASSWORD_BYTES)
  ) {
    await discardNewUpload(request);
    response.status(400).json({
      error: { message: "password must be at least 8 characters and no more than 72 UTF-8 bytes" },
    });
    return;
  }

  if (request.file) {
    try {
      const signature = await readFile(request.file.path);
      if (getImageType(signature) !== request.file.mimetype) {
        await removeUploadedFile(request.file.path);
        response.status(400).json({ error: { message: "Uploaded file is not a valid JPEG or PNG image" } });
        return;
      }
    } catch (error) {
      await discardNewUpload(request);
      logger.error("Unable to validate trainer avatar upload", { trainerId, error });
      response.status(500).json({ error: { message: "Unable to process uploaded avatar" } });
      return;
    }
  }

  try {
    const passwordHash =
      typeof password === "string" && password
        ? await bcrypt.hash(password, BCRYPT_ROUNDS)
        : undefined;
    const avatarUrl = request.file ? `/uploads/${path.basename(request.file.filename)}` : undefined;
    const previousTrainer = await prisma.trainer.findUnique({
      where: { id: trainerId },
      select: { avatarUrl: true },
    });
    if (!previousTrainer) {
      await discardNewUpload(request);
      response.status(404).json({ error: { message: "Trainer not found" } });
      return;
    }

    const profile = await prisma.$transaction(async (transaction) => {
      const trainerData: Prisma.TrainerUpdateInput = {
        name: name.trim(),
        ...(passwordHash ? { password: passwordHash } : {}),
        ...(avatarUrl ? { avatarUrl } : {}),
      };
      await transaction.trainer.update({ where: { id: trainerId }, data: trainerData });
      const savedProfile = await transaction.trainerProfile.upsert({
        where: { trainerId },
        create: {
          trainerId,
          specialty: specialty.trim(),
          experienceYears: years,
          bio: bio.trim(),
        },
        update: {
          specialty: specialty.trim(),
          experienceYears: years,
          bio: bio.trim(),
        },
      });
      return savedProfile;
    });

    if (request.file) {
      const previousAvatarPath = getStoredAvatarPath(previousTrainer.avatarUrl);
      if (previousAvatarPath && previousAvatarPath !== request.file.path) {
        try {
          await removeUploadedFile(previousAvatarPath);
        } catch (error) {
          logger.error("Unable to remove replaced trainer avatar", { trainerId, error });
        }
      }
    }

    response.json({
      data: {
        name: name.trim(),
        specialty: profile.specialty,
        experienceYears: profile.experienceYears,
        bio: profile.bio,
        avatarUrl: avatarUrl ?? previousTrainer.avatarUrl,
      },
    });
  } catch (error) {
    await discardNewUpload(request);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      response.status(404).json({ error: { message: "Trainer not found" } });
      return;
    }
    logger.error("Trainer profile update failed", { trainerId, error });
    response.status(500).json({ error: { message: "Unable to save trainer profile" } });
  }
}
