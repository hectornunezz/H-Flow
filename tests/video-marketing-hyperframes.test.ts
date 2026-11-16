import { mkdtemp, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { generateMarketingVideo } from "../hflow-backend/src/services/videoMarketing.service";
import { renderHyperframesVideo } from "../hflow-backend/src/services/hyperframesRenderer.service";

jest.mock("../hflow-backend/src/services/hyperframesRenderer.service", () => ({
  renderHyperframesVideo: jest.fn().mockResolvedValue(undefined),
}));

const renderMock = jest.mocked(renderHyperframesVideo);

describe("generateMarketingVideo Hyperframes smoke test", () => {
  let temporaryDirectory: string;
  let previousStorageDirectory: string | undefined;
  let previousPublicUrl: string | undefined;

  beforeEach(async () => {
    temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "hflow-marketing-smoke-"));
    previousStorageDirectory = process.env.MARKETING_STORAGE_DIR;
    previousPublicUrl = process.env.MARKETING_MEDIA_PUBLIC_URL;
    process.env.MARKETING_STORAGE_DIR = path.join(temporaryDirectory, "missing", "marketing");
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

  it("creates the storage directory and returns a valid media URL after rendering", async () => {
    const videoUrl = await generateMarketingVideo("trainer-1", {
      script: "Entrena con intención.",
      audio: Buffer.from("test-audio"),
      captions: [{ text: "Entrena con intención.", start: 0, end: 2 }],
      topic: "Entrenamiento de fuerza",
      audience: "Entrenadores",
      tone: "Cercano",
    });

    const parsedUrl = new URL(videoUrl);
    const storageInfo = await stat(process.env.MARKETING_STORAGE_DIR!);

    expect(storageInfo.isDirectory()).toBe(true);
    expect(parsedUrl.origin).toBe("http://localhost:3000");
    expect(parsedUrl.pathname).toMatch(/^\/marketing-media\/marketing_trainer-1_\d+\.mp4$/);
    expect(renderMock).toHaveBeenCalledWith(
      expect.objectContaining({
        script: "Entrena con intención.",
        audio: Buffer.from("test-audio"),
        outputPath: expect.stringContaining(path.join("missing", "marketing")),
      }),
    );
  });
});
