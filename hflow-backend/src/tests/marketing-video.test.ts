import { mkdtemp, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { generateMarketingVideo } from "../services/videoMarketing.service";
import { renderHyperframesVideo } from "../services/hyperframesRenderer.service";

jest.mock("../services/hyperframesRenderer.service", () => ({
  renderHyperframesVideo: jest.fn().mockResolvedValue(undefined),
}));

const renderMock = jest.mocked(renderHyperframesVideo);

describe("generateMarketingVideo smoke test", () => {
  let temporaryDirectory: string;
  let previousStorageDirectory: string | undefined;
  let previousPublicUrl: string | undefined;

  beforeEach(async () => {
    temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "hflow-marketing-unit-"));
    previousStorageDirectory = process.env.MARKETING_STORAGE_DIR;
    previousPublicUrl = process.env.MARKETING_MEDIA_PUBLIC_URL;
    process.env.MARKETING_STORAGE_DIR = path.join(temporaryDirectory, "storage", "marketing");
    process.env.MARKETING_MEDIA_PUBLIC_URL = "http://localhost:3000/marketing-media";
    renderMock.mockClear();
  });

  afterEach(async () => {
    if (previousStorageDirectory === undefined) delete process.env.MARKETING_STORAGE_DIR;
    else process.env.MARKETING_STORAGE_DIR = previousStorageDirectory;
    if (previousPublicUrl === undefined) delete process.env.MARKETING_MEDIA_PUBLIC_URL;
    else process.env.MARKETING_MEDIA_PUBLIC_URL = previousPublicUrl;
    await rm(temporaryDirectory, { recursive: true, force: true });
  });

  it("crea storage/marketing si no existe y devuelve una URL válida", async () => {
    const videoUrl = await generateMarketingVideo("trainer-qa", {
      script: "Smoke test H-Flow marketing.",
      audio: Buffer.from("fake-audio-bytes"),
      captions: [{ text: "Smoke test H-Flow marketing.", start: 0, end: 1.5 }],
      topic: "Smoke test",
      audience: "Entrenadores",
      tone: "Cercano",
      headline: "Smoke test",
    });

    const storageInfo = await stat(process.env.MARKETING_STORAGE_DIR!);
    const parsedUrl = new URL(videoUrl);

    expect(storageInfo.isDirectory()).toBe(true);
    expect(parsedUrl.origin).toBe("http://localhost:3000");
    expect(parsedUrl.pathname).toMatch(/^\/marketing-media\/marketing_trainer-qa_\d+\.mp4$/);
    expect(renderMock).toHaveBeenCalledTimes(1);
    expect(renderMock).toHaveBeenCalledWith(
      expect.objectContaining({
        script: "Smoke test H-Flow marketing.",
        audio: Buffer.from("fake-audio-bytes"),
        outputPath: expect.stringContaining(path.join("storage", "marketing")),
      }),
    );
  });
});
