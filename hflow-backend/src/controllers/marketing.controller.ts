import { createReadStream } from "node:fs";
import { randomUUID } from "node:crypto";
import { stat } from "node:fs/promises";
import path from "node:path";
import type { Request, Response } from "express";
import {
  generateEpisode,
  getMarketingVideoDirectory,
} from "../services/marketingScheduler.service";
import { prisma } from "../services/prisma.service";
import logger from "../utils/logger";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function generateMarketingVideo(
  request: Request,
  response: Response,
): Promise<void> {
  const trainerId = request.auth?.trainerId;
  if (!trainerId) {
    response.status(401).json({ error: { message: "Authentication is required" } });
    return;
  }

  const body: unknown = request.body;
  if (!isRecord(body)) {
    response.status(400).json({ error: { message: "A valid JSON object is required" } });
    return;
  }

  const { topic, audience, tone, durationSeconds } = body;
  if ("batchSize" in body) {
    response.status(400).json({
      error: { message: "batchSize is no longer supported; generate one video per request" },
    });
    return;
  }

  if (
    typeof topic !== "string" ||
    !topic.trim() ||
    topic.trim().length > 300 ||
    typeof audience !== "string" ||
    !audience.trim() ||
    audience.trim().length > 200 ||
    typeof tone !== "string" ||
    !tone.trim() ||
    tone.trim().length > 120
  ) {
    response.status(400).json({
      error: { message: "topic (max 300), audience (max 200), and tone (max 120) are required" },
    });
    return;
  }

  if (
    durationSeconds !== undefined &&
    (typeof durationSeconds !== "number" ||
      !Number.isFinite(durationSeconds) ||
      durationSeconds < 5 ||
      durationSeconds > 60)
  ) {
    response.status(400).json({
      error: { message: "durationSeconds must be a number between 5 and 60" },
    });
    return;
  }

  const normalizedTopic = topic.trim().replace(/\s+/g, " ");
  const episodeId = randomUUID();
  try {
    const episode = await prisma.marketingEpisode.create({
      data: {
        id: episodeId,
        trainerId,
        topic: normalizedTopic,
        topicKey: `${normalizedTopic.normalize("NFKC").toLowerCase()}-${randomUUID()}`,
        audience: audience.trim(),
        tone: tone.trim(),
        status: "generating",
      },
    });

    await generateEpisode(episode.id, {
      publishToInstagram: false,
      ...(durationSeconds === undefined ? {} : { durationSeconds }),
    });
    const generatedEpisode = await prisma.marketingEpisode.findUnique({
      where: { id: episode.id },
    });
    if (!generatedEpisode || generatedEpisode.status !== "completed") {
      response.status(502).json({ error: { message: "Video generation failed" } });
      return;
    }

    response.status(201).json({
      data: {
        id: generatedEpisode.id,
        topic: generatedEpisode.topic,
        audience: generatedEpisode.audience,
        tone: generatedEpisode.tone,
        scheduledAt: generatedEpisode.scheduledAt,
        status: generatedEpisode.status,
        script: generatedEpisode.script,
        transcription: generatedEpisode.transcription
          ? JSON.parse(generatedEpisode.transcription)
          : null,
        audioUrl: generatedEpisode.audioFileName
          ? `/api/marketing/episodes/${generatedEpisode.id}/audio`
          : null,
        videoUrl: `/api/marketing/episodes/${generatedEpisode.id}/video`,
        errorMessage: generatedEpisode.errorMessage,
        createdAt: generatedEpisode.createdAt,
        completedAt: generatedEpisode.completedAt,
      },
    });
  } catch (error) {
    logger.error("On-demand marketing video generation failed", { trainerId, error });
    response.status(502).json({
      error: { message: "Video generation failed" },
    });
  }
}

export async function getMarketingEpisodeVideo(
  request: Request,
  response: Response,
): Promise<void> {
  const trainerId = request.auth?.trainerId;
  if (!trainerId) {
    response.status(401).json({ error: { message: "Authentication is required" } });
    return;
  }

  const episodeId = request.params.episodeId;
  if (typeof episodeId !== "string" || !episodeId.trim()) {
    response.status(400).json({ error: { message: "episodeId is required" } });
    return;
  }

  try {
    const episode = await prisma.marketingEpisode.findFirst({
      where: { id: episodeId, trainerId, status: "completed" },
      select: { id: true },
    });
    if (!episode) {
      response.status(404).json({ error: { message: "Generated video not found" } });
      return;
    }

    const videoPath = path.resolve(getMarketingVideoDirectory(), `${episode.id}.mp4`);
    const videoStat = await stat(videoPath);
    if (!videoStat.isFile() || videoStat.size === 0) {
      response.status(404).json({ error: { message: "Generated video not found" } });
      return;
    }

    const rangeHeader = request.headers.range;
    let start = 0;
    let end = videoStat.size - 1;
    let partial = false;
    if (rangeHeader) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
      if (!match || videoStat.size === 0) {
        response.status(416).setHeader("Content-Range", `bytes */${videoStat.size}`).end();
        return;
      }

      const requestedStart = match[1] ? Number(match[1]) : undefined;
      const requestedEnd = match[2] ? Number(match[2]) : undefined;
      if (requestedStart === undefined) {
        const suffixLength = requestedEnd;
        if (
          suffixLength === undefined ||
          !Number.isSafeInteger(suffixLength) ||
          suffixLength <= 0
        ) {
          response.status(416).setHeader("Content-Range", `bytes */${videoStat.size}`).end();
          return;
        }
        start = Math.max(videoStat.size - suffixLength, 0);
      } else {
        start = requestedStart;
        end = requestedEnd ?? end;
      }

      if (
        !Number.isSafeInteger(start) ||
        !Number.isSafeInteger(end) ||
        start < 0 ||
        start >= videoStat.size ||
        end < start
      ) {
        response.status(416).setHeader("Content-Range", `bytes */${videoStat.size}`).end();
        return;
      }
      end = Math.min(end, videoStat.size - 1);
      partial = true;
    }

    response
      .status(partial ? 206 : 200)
      .setHeader("Accept-Ranges", "bytes")
      .setHeader("Content-Type", "video/mp4")
      .setHeader(
        "Content-Disposition",
        `${request.query.download === "true" ? "attachment" : "inline"}; filename="${episode.id}.mp4"`,
      )
      .setHeader("Content-Length", end - start + 1);
    if (partial) {
      response.setHeader("Content-Range", `bytes ${start}-${end}/${videoStat.size}`);
    }

    const videoStream = createReadStream(videoPath, { start, end });
    videoStream.on("error", (error) => {
      logger.error("Marketing episode video delivery failed", { episodeId, trainerId, error });
      if (!response.headersSent) {
        response.status(500).json({ error: { message: "Unable to deliver generated video" } });
      } else {
        response.destroy(error);
      }
    });
    videoStream.pipe(response);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
      response.status(404).json({ error: { message: "Generated video file not found" } });
      return;
    }
    logger.error("Marketing episode video lookup failed", { episodeId, trainerId, error });
    response.status(500).json({ error: { message: "Unable to load generated video" } });
  }
}
