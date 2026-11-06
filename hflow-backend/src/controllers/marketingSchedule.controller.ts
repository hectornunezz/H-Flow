import { Prisma } from "@prisma/client";
import type { Request, Response } from "express";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { getMarketingStorageDirectory } from "../services/marketingScheduler.service";
import path from "node:path";
import logger from "../utils/logger";
import { prisma } from "../services/prisma.service";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeTopic(topic: string): string {
  return topic.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

function getEpisodeJson(episode: {
  id: string;
  topic: string;
  audience: string;
  tone: string;
  scheduledAt: Date;
  status: string;
  script: string | null;
  transcription: string | null;
  audioFileName: string | null;
  errorMessage: string | null;
  createdAt: Date;
  completedAt: Date | null;
}) {
  return {
    id: episode.id,
    topic: episode.topic,
    audience: episode.audience,
    tone: episode.tone,
    scheduledAt: episode.scheduledAt,
    status: episode.status,
    script: episode.script,
    transcription: episode.transcription ? JSON.parse(episode.transcription) : null,
    audioUrl: episode.audioFileName ? `/api/marketing/episodes/${episode.id}/audio` : null,
    videoUrl:
      episode.status === "completed"
        ? `/api/marketing/episodes/${encodeURIComponent(episode.id)}/video`
        : null,
    errorMessage: episode.errorMessage,
    createdAt: episode.createdAt,
    completedAt: episode.completedAt,
  };
}

function getTrainerId(request: Request, response: Response): string | undefined {
  const trainerId = request.auth?.trainerId;
  if (!trainerId) {
    response.status(401).json({ error: { message: "Authentication is required" } });
    return undefined;
  }
  return trainerId;
}

export async function scheduleMarketingEpisode(
  request: Request,
  response: Response,
): Promise<void> {
  const trainerId = getTrainerId(request, response);
  if (!trainerId) return;

  const body: unknown = request.body;
  if (!isRecord(body)) {
    response.status(400).json({ error: { message: "A valid JSON object is required" } });
    return;
  }

  const { topic, audience, tone, scheduledAt } = body;
  if (
    typeof topic !== "string" ||
    !topic.trim() ||
    topic.trim().length > 300 ||
    typeof audience !== "string" ||
    !audience.trim() ||
    typeof tone !== "string" ||
    !tone.trim()
  ) {
    response.status(400).json({
      error: { message: "topic (max 300 characters), audience, and tone are required" },
    });
    return;
  }

  let runAt = new Date();
  if (scheduledAt !== undefined) {
    if (typeof scheduledAt !== "string" || !Number.isFinite(Date.parse(scheduledAt))) {
      response.status(400).json({ error: { message: "scheduledAt must be a valid ISO date" } });
      return;
    }
    runAt = new Date(scheduledAt);
    if (runAt.getTime() <= Date.now()) {
      response.status(400).json({ error: { message: "scheduledAt must be in the future" } });
      return;
    }
  }

  try {
    const episode = await prisma.marketingEpisode.create({
      data: {
        trainerId,
        topic: topic.trim().replace(/\s+/g, " "),
        topicKey: normalizeTopic(topic),
        audience: audience.trim(),
        tone: tone.trim(),
        scheduledAt: runAt,
      },
    });
    response.status(201).json({ data: getEpisodeJson(episode) });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      response.status(409).json({
        error: { message: "This topic already has a scheduled or generated episode" },
      });
      return;
    }
    logger.error("Marketing episode scheduling failed", { error });
    response.status(500).json({ error: { message: "Unable to schedule marketing episode" } });
  }
}

export async function listMarketingEpisodes(
  request: Request,
  response: Response,
): Promise<void> {
  const trainerId = getTrainerId(request, response);
  if (!trainerId) return;

  try {
    const episodes = await prisma.marketingEpisode.findMany({
      where: { trainerId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 100,
    });
    response.json({ data: episodes.map(getEpisodeJson) });
  } catch (error) {
    logger.error("Marketing episode listing failed", { error });
    response.status(500).json({ error: { message: "Unable to load marketing episodes" } });
  }
}

export async function getMarketingEpisodeAudio(
  request: Request,
  response: Response,
): Promise<void> {
  const trainerId = getTrainerId(request, response);
  if (!trainerId) return;

  const episodeId = request.params.episodeId;
  if (typeof episodeId !== "string") {
    response.status(400).json({ error: { message: "episodeId is required" } });
    return;
  }

  try {
    const episode = await prisma.marketingEpisode.findFirst({
      where: { id: episodeId, trainerId, status: "completed" },
      select: { audioFileName: true },
    });
    if (!episode?.audioFileName) {
      response.status(404).json({ error: { message: "Generated audio not found" } });
      return;
    }

    const audioPath = path.resolve(getMarketingStorageDirectory(), episode.audioFileName);
    await stat(audioPath);
    response.type("audio/mpeg");
    const audioStream = createReadStream(audioPath);
    audioStream.on("error", (error) => {
      logger.error("Marketing episode audio delivery failed", { error });
      if (!response.headersSent) {
        response.status(500).json({ error: { message: "Unable to deliver generated audio" } });
      } else {
        response.destroy(error);
      }
    });
    audioStream.pipe(response);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      response.status(404).json({ error: { message: "Generated audio file not found" } });
      return;
    }
    logger.error("Marketing episode audio lookup failed", { error });
    response.status(500).json({ error: { message: "Unable to load generated audio" } });
  }
}
