import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

export type MarketingCaption = {
  text: string;
  start: number;
  end: number;
};

export type MarketingAspectRatio = "9:16" | "16:9";

export type HyperframesRenderRequest = {
  script: string;
  audio: Buffer;
  captions: MarketingCaption[];
  topic: string;
  audience: string;
  tone: string;
  outputPath: string;
  durationSeconds?: number;
  aspectRatio?: MarketingAspectRatio;
  callToAction?: string;
};

const repositoryRoot = path.resolve(__dirname, "../../..");
const rendererPath = path.join(repositoryRoot, "src", "hyperframes", "render.mjs");

export async function renderHyperframesVideo(
  request: HyperframesRenderRequest,
): Promise<void> {
  if (!request.script.trim() || request.audio.length === 0) {
    throw new Error("A script and non-empty audio are required to render a marketing video");
  }

  const outputPath = path.resolve(request.outputPath);
  await mkdir(path.dirname(outputPath), { recursive: true });
  const inputPath = `${outputPath}.${randomUUID()}.json`;
  const input = {
    script: request.script,
    audioBase64: request.audio.toString("base64"),
    captions: request.captions,
    topic: request.topic,
    audience: request.audience,
    tone: request.tone,
    durationSeconds: request.durationSeconds,
    aspectRatio: request.aspectRatio ?? "9:16",
    callToAction: request.callToAction,
  };

  try {
    await writeFile(inputPath, JSON.stringify(input), { flag: "wx" });
    await new Promise<void>((resolve, reject) => {
      const renderer = spawn(process.execPath, [rendererPath, inputPath, outputPath], {
        cwd: repositoryRoot,
        stdio: ["ignore", "pipe", "pipe"],
      });
      let output = "";
      const capture = (chunk: string): void => {
        output = `${output}${chunk}`.slice(-8000);
      };
      renderer.stdout.setEncoding("utf8").on("data", capture);
      renderer.stderr.setEncoding("utf8").on("data", capture);
      renderer.once("error", reject);
      renderer.once("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(
            new Error(`Hyperframes renderer process failed (${code}): ${output.trim() || "no details"}`),
          );
        }
      });
    });

    const output = await stat(outputPath);
    if (!output.isFile() || output.size === 0) {
      throw new Error("Hyperframes did not produce a valid MP4 file");
    }
  } finally {
    await rm(inputPath, { force: true });
  }
}
