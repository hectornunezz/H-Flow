import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import type { Request, Response } from "express";
import { getMarketingVideoDirectory } from "../services/marketingScheduler.service";
import { videoMarketingService } from "../services/videoMarketing.service";
import logger from "../utils/logger";

const MAX_BATCH_SIZE = 10;
const prisma = new PrismaClient();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function generateMarketingVideos(
  request: Request,
  response: Response,
): Promise<void> {
  const body: unknown = request.body;
  if (!isRecord(body)) {
    response.status(400).json({ error: { message: "A valid JSON object is required" } });
    return;
  }

  const { batchSize, topic, audience, tone, durationSeconds } = body;
  if (
    typeof batchSize !== "number" ||
    !Number.isInteger(batchSize) ||
    batchSize < 1 ||
    batchSize > MAX_BATCH_SIZE
  ) {
    response.status(400).json({
      error: { message: `batchSize must be an integer between 1 and ${MAX_BATCH_SIZE}` },
    });
    return;
  }

  if (
    typeof topic !== "string" ||
    !topic.trim() ||
    typeof audience !== "string" ||
    !audience.trim() ||
    typeof tone !== "string" ||
    !tone.trim()
  ) {
    response.status(400).json({
      error: { message: "topic, audience, and tone are required non-empty strings" },
    });
    return;
  }

  if (
    durationSeconds !== undefined &&
    (typeof durationSeconds !== "number" ||
      !Number.isFinite(durationSeconds) ||
      durationSeconds <= 0)
  ) {
    response.status(400).json({
      error: { message: "durationSeconds must be a positive number" },
    });
    return;
  }

  try {
    const videos = [];
    for (let index = 0; index < batchSize; index += 1) {
      const assets = await videoMarketingService.createMarketingAssets({
        topic: topic.trim(),
        audience: audience.trim(),
        tone: tone.trim(),
        ...(durationSeconds === undefined ? {} : { durationSeconds }),
      });

      videos.push({
        script: assets.script,
        audioBase64: assets.audio.toString("base64"),
        audioContentType: "audio/mpeg",
        transcription: assets.transcription,
      });
    }

    response.status(201).json({ data: { batchSize: videos.length, videos } });
  } catch (error) {
    logger.error("Marketing video batch generation failed", { error });
    response.status(502).json({
      error: { message: "Video generation failed; no complete batch was produced" },
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
