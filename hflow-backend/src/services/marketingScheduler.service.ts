import { copyFile, mkdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { videoMarketingService } from "./videoMarketing.service";
import { instagramService } from "./instagram.service";
import logger from "../utils/logger";

const prisma = new PrismaClient();
const POLL_INTERVAL_MS = 10_000;
const MAX_EPISODES_PER_POLL = 5;
const repositoryRoot = path.resolve(__dirname, "../../..");

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

export function getRemotionPublicDirectory(): string {
  return path.resolve(
    process.env.REMOTION_PUBLIC_DIR || path.join(repositoryRoot, "video-generador", "public"),
  );
}

async function renderMarketingVideo(
  script: string,
  audioFileName: string,
  publicDirectory: string,
  outputPath: string,
): Promise<void> {
  const backendRoot = path.resolve(__dirname, "../..");
  const backendEntryPoint = path.join(backendRoot, "src", "remotion", "index.ts");
  const repositoryEntryPoint = path.join(repositoryRoot, "src", "remotion", "index.ts");
  const entryPoint = existsSync(backendEntryPoint) ? backendEntryPoint : repositoryEntryPoint;
  const cliPath = path.join(backendRoot, "node_modules", "@remotion", "cli", "remotion-cli.js");
  if (!existsSync(entryPoint)) {
    throw new Error(`Remotion entry point not found: ${entryPoint}`);
  }
  if (!existsSync(cliPath)) {
    throw new Error(`Remotion CLI not found: ${cliPath}`);
  }

  const props = JSON.stringify({
    text: script,
    audioSrc: `audio/${audioFileName}`,
  });
  const propsPath = `${outputPath}.props.json`;
  await writeFile(propsPath, props, { flag: "wx" });
  try {
    await new Promise<void>((resolve, reject) => {
      const renderer = spawn(
        process.execPath,
        [
          cliPath,
          "render",
          entryPoint,
          "DopaminergicVideo",
          outputPath,
          `--props=${propsPath}`,
          `--public-dir=${publicDirectory}`,
          "--codec=h264",
          "--overwrite",
        ],
        { cwd: backendRoot, stdio: ["ignore", "ignore", "pipe"] },
      );
      let errorOutput = "";
      renderer.stderr.setEncoding("utf8");
      renderer.stderr.on("data", (chunk: string) => {
        errorOutput = `${errorOutput}${chunk}`.slice(-4000);
      });
      renderer.once("error", reject);
      renderer.once("close", (code) => {
        if (code === 0) {
          resolve();
          return;
        }
        reject(new Error(`Remotion render failed (${code}): ${errorOutput.trim() || "no details"}`));
      });
    });
    const renderedVideo = await stat(outputPath);
    if (!renderedVideo.isFile() || renderedVideo.size === 0) {
      throw new Error("Remotion did not produce a valid MP4 file");
    }
  } finally {
    await rm(propsPath, { force: true });
  }
}

async function generateEpisode(episodeId: string): Promise<void> {
  const episode = await prisma.marketingEpisode.findUnique({ where: { id: episodeId } });
  if (!episode) {
    throw new Error(`Scheduled marketing episode ${episodeId} no longer exists`);
  }

  try {
    const assets = await videoMarketingService.createMarketingAssets({
      topic: episode.topic,
      audience: episode.audience,
      tone: episode.tone,
    });

    const storageDirectory = getMarketingStorageDirectory();
    const audioFileName = `${episode.id}.mp3`;
    const destination = path.join(storageDirectory, audioFileName);
    const temporaryFile = `${destination}.tmp`;
    const videoDirectory = getMarketingVideoDirectory();
    const videoFileName = `${episode.id}.mp4`;
    const videoDestination = path.join(videoDirectory, videoFileName);
    const temporaryVideo = path.join(videoDirectory, `${episode.id}.tmp.mp4`);
    const publicDirectory = getRemotionPublicDirectory();
    const publicAudioDirectory = path.join(publicDirectory, "audio");
    const publicAudioPath = path.join(publicAudioDirectory, audioFileName);
    await mkdir(storageDirectory, { recursive: true });
    await mkdir(videoDirectory, { recursive: true });
    await mkdir(publicAudioDirectory, { recursive: true });

    try {
      await writeFile(temporaryFile, assets.audio, { flag: "wx" });
      await rename(temporaryFile, destination);
      await copyFile(destination, publicAudioPath);
      try {
        await renderMarketingVideo(assets.script, audioFileName, publicDirectory, temporaryVideo);
      } finally {
        await rm(publicAudioPath, { force: true });
      }
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
      try {
        const instagramMediaId = await instagramService.publishReel(videoFileName, assets.script);
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
    } catch (error) {
      await rm(temporaryFile, { force: true });
      await rm(temporaryVideo, { force: true });
      await rm(publicAudioPath, { force: true });
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
