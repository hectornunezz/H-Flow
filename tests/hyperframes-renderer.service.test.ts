import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { readFile, mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import {
  renderHyperframesVideo,
  type HyperframesRenderRequest,
} from "../hflow-backend/src/services/hyperframesRenderer.service";

jest.mock("node:child_process", () => ({ spawn: jest.fn() }));

const spawnMock = jest.mocked(spawn);

describe("renderHyperframesVideo", () => {
  let temporaryDirectory: string;

  beforeEach(async () => {
    temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "hflow-hyperframes-test-"));
    spawnMock.mockReset();
  });

  afterEach(async () => {
    await rm(temporaryDirectory, { recursive: true, force: true });
  });

  it("passes the script, audio, captions and format to Hyperframes and validates the MP4", async () => {
    const outputPath = path.join(temporaryDirectory, "marketing.mp4");
    const request: HyperframesRenderRequest = {
      script: "Entrena con intención.",
      audio: Buffer.from("test-audio"),
      captions: [{ text: "Entrena con intención.", start: 0, end: 2 }],
      topic: "Fuerza",
      audience: "Entrenadores",
      tone: "Cercano",
      outputPath,
      durationSeconds: 30,
      aspectRatio: "16:9",
    };

    spawnMock.mockImplementation((_command, args) => {
      const child = new EventEmitter() as ReturnType<typeof spawn>;
      const stdout = new PassThrough();
      const stderr = new PassThrough();
      Object.assign(child, { stdout, stderr });

      process.nextTick(async () => {
        const input = JSON.parse(await readFile(args[1] as string, "utf8")) as Record<
          string,
          unknown
        >;
        expect(input).toMatchObject({
          script: request.script,
          audioBase64: request.audio.toString("base64"),
          topic: request.topic,
          audience: request.audience,
          tone: request.tone,
          durationSeconds: 30,
          aspectRatio: "16:9",
        });
        await writeFile(args[2] as string, Buffer.from("rendered-mp4"));
        child.emit("close", 0);
      });

      return child;
    });

    await renderHyperframesVideo(request);

    expect(await stat(outputPath)).toMatchObject({ size: Buffer.byteLength("rendered-mp4") });
    expect(spawnMock).toHaveBeenCalledWith(
      process.execPath,
      [
        expect.stringContaining(path.join("src", "hyperframes", "render.mjs")),
        expect.stringMatching(/\.json$/),
        outputPath,
      ],
      expect.objectContaining({ stdio: ["ignore", "pipe", "pipe"] }),
    );
  });

  it("rejects empty scripts or audio before starting the renderer", async () => {
    const request: HyperframesRenderRequest = {
      script: "",
      audio: Buffer.alloc(0),
      captions: [],
      topic: "Fuerza",
      audience: "Entrenadores",
      tone: "Cercano",
      outputPath: path.join(temporaryDirectory, "invalid.mp4"),
    };

    await expect(renderHyperframesVideo(request)).rejects.toThrow(
      "A script and non-empty audio are required",
    );
    expect(spawnMock).not.toHaveBeenCalled();
  });
});
