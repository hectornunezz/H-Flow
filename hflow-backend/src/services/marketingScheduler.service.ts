import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "./prisma.service";
import {
  TRAINER_CALL_TO_ACTION,
  videoMarketingService,
  type Transcription,
} from "./videoMarketing.service";
import {
  renderHyperframesVideo,
  type MarketingAspectRatio,
  type MarketingCaption,
} from "./hyperframesRenderer.service";
import { instagramService } from "./instagram.service";
import logger from "../utils/logger";
import { runExclusiveVideoGeneration } from "./videoGenerationQueue.service";

const POLL_INTERVAL_MS = 10_000;
const MAX_EPISODES_PER_POLL = 1;
export function getMarketingStorageDirectory(): string {
  return path.resolve(
    process.env.MARKETING_STORAGE_DIR || path.join(process.cwd(), "storage", "marketing"),
  );
}

export function getMarketingVideoDirectory(): string {
  return path.resolve(
    process.env.MARKETING_VIDEO_STORAGE_DIR ||
      path.join(getMarketingStorageDirectory(), "videos"),
  );
}

export async function renderMarketingVideo(
  script: string,
  audio: Buffer,
  outputPath: string,
  transcription: Transcription,
  metadata: { topic: string; audience: string; tone: string },
  options: { durationSeconds?: number; aspectRatio?: MarketingAspectRatio } = {},
): Promise<void> {
  const captions: MarketingCaption[] =
    transcription.segments.length > 0
      ? transcription.segments.map(({ text, start, end }) => ({ text, start, end }))
      : transcription.words.map(({ word, start, end }) => ({ text: word, start, end }));

  await renderHyperframesVideo({
    script,
    audio,
    captions,
    ...metadata,
    outputPath,
    ...options,
    callToAction: TRAINER_CALL_TO_ACTION,
  });
}

export async function generateEpisode(
  episodeId: string,
  options: {
    publishToInstagram?: boolean;
    durationSeconds?: number;
    aspectRatio?: MarketingAspectRatio;
  } = {},
): Promise<void> {
  await runExclusiveVideoGeneration(`marketing_episode:${episodeId}`, async () => {
    const episode = await prisma.marketingEpisode.findUnique({ where: { id: episodeId } });
    if (!episode) {
      throw new Error(`Marketing episode ${episodeId} no longer exists`);
    }

    try {
      const assets = await videoMarketingService.createMarketingAssets({
        topic: episode.topic,
        audience: episode.audience,
        tone: episode.tone,
        ...(options.durationSeconds === undefined
          ? {}
          : { durationSeconds: options.durationSeconds }),
      });

      const storageDirectory = getMarketingStorageDirectory();
      const audioFileName = `${episode.id}.mp3`;
      const destination = path.join(storageDirectory, audioFileName);
      const temporaryFile = `${destination}.tmp`;
      const videoDirectory = getMarketingVideoDirectory();
      const videoFileName = `${episode.id}.mp4`;
      const videoDestination = path.join(videoDirectory, videoFileName);
      const temporaryVideo = path.join(videoDirectory, `${episode.id}.tmp.mp4`);
      await mkdir(storageDirectory, { recursive: true });
      await mkdir(videoDirectory, { recursive: true });

      try {
        await writeFile(temporaryFile, assets.audio, { flag: "wx" });
        await rename(temporaryFile, destination);
        await renderMarketingVideo(
          assets.script,
          assets.audio,
          temporaryVideo,
          assets.transcription,
          { topic: episode.topic, audience: episode.audience, tone: episode.tone },
          options,
        );
        await rename(temporaryVideo, videoDestination);
        await prisma.marketingEpisode.update({
          where: { id: episode.id },
          data: {
            status: "completed",
            script: assets.script,
            transcription: JSON.stringify(assets.transcription),
            audioFileName,
            errorMessage: null,
            completedAt: new Date(),
          },
        });
        logger.info("Marketing episode rendered successfully", {
          episodeId: episode.id,
          videoFileName,
        });
        if (options.publishToInstagram !== false) {
          try {
            const instagramMediaId = await instagramService.publishReel(
              videoFileName,
              assets.script,
            );
            logger.info("Marketing episode published to Instagram", {
              episodeId: episode.id,
              instagramMediaId,
            });
          } catch (error) {
            logger.error("Marketing episode rendered but Instagram publishing failed", {
              episodeId: episode.id,
              error,
            });
          }
        }
      } catch (error) {
        await rm(temporaryFile, { force: true });
        await rm(destination, { force: true });
        await rm(temporaryVideo, { force: true });
        throw error;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown generation error";
      await prisma.marketingEpisode.update({
        where: { id: episode.id },
        data: { status: "failed", errorMessage: message.slice(0, 1000) },
      });
      logger.error("Marketing episode generation failed", { episodeId: episode.id, error });
    }
  });
}

export async function processDueMarketingEpisodes(): Promise<void> {
  const dueEpisodes = await prisma.marketingEpisode.findMany({
    where: { status: "scheduled", scheduledAt: { lte: new Date() } },
    orderBy: { scheduledAt: "asc" },
    take: MAX_EPISODES_PER_POLL,
    select: { id: true },
  });

  for (const episode of dueEpisodes) {
    const claimed = await prisma.marketingEpisode.updateMany({
      where: { id: episode.id, status: "scheduled", scheduledAt: { lte: new Date() } },
      data: { status: "generating", errorMessage: null },
    });
    if (claimed.count === 1) {
      await generateEpisode(episode.id);
    }
  }
}

export function startMarketingScheduler(): void {
  let stopped = false;
  const scheduleNextPoll = (): void => {
    if (stopped) return;
    const timer = setTimeout(() => {
      void poll();
    }, POLL_INTERVAL_MS);
    timer.unref();
  };

  const poll = async (): Promise<void> => {
    try {
      await processDueMarketingEpisodes();
    } catch (error) {
      logger.error("Marketing scheduler poll failed", { error });
    } finally {
      scheduleNextPoll();
    }
  };

  void poll();
  process.once("SIGINT", () => {
    stopped = true;
  });
  process.once("SIGTERM", () => {
    stopped = true;
  });
}
