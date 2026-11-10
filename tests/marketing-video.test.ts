import express from "../hflow-backend/node_modules/express";
import request from "supertest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const mockPrisma = {
  marketingEpisode: {
    findFirst: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
  },
};
const mockGenerateEpisode = jest.fn();

jest.doMock("@prisma/client", () => ({
  PrismaClient: jest.fn(() => mockPrisma),
}));
jest.doMock("../hflow-backend/src/services/marketingScheduler.service", () => ({
  generateEpisode: mockGenerateEpisode,
  getMarketingVideoDirectory: () => process.env.MARKETING_VIDEO_STORAGE_DIR,
}));
jest.doMock("../hflow-backend/src/utils/logger", () => ({
  __esModule: true,
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

const {
  generateMarketingVideo,
  getMarketingEpisodeVideo,
} = require("../hflow-backend/src/controllers/marketing.controller") as {
  generateMarketingVideo: typeof import("../hflow-backend/src/controllers/marketing.controller").generateMarketingVideo;
  getMarketingEpisodeVideo: typeof import("../hflow-backend/src/controllers/marketing.controller").getMarketingEpisodeVideo;
};

const app = express();
app.use(express.json());
app.use((requestHandler, _response, next) => {
  if (requestHandler.get("Authorization") === "Bearer test-token") {
    Object.assign(requestHandler, { auth: { trainerId: "trainer-1" } });
  }
  next();
});
app.get("/episodes/:episodeId/video", getMarketingEpisodeVideo);
app.post("/generate", generateMarketingVideo);

describe("GET /episodes/:episodeId/video", () => {
  const videoContents = Buffer.from("0123456789");
  let videoDirectory: string;
  let previousVideoDirectory: string | undefined;

  beforeAll(async () => {
    videoDirectory = await mkdtemp(path.join(os.tmpdir(), "hflow-marketing-video-"));
    previousVideoDirectory = process.env.MARKETING_VIDEO_STORAGE_DIR;
    process.env.MARKETING_VIDEO_STORAGE_DIR = videoDirectory;
    await writeFile(path.join(videoDirectory, "episode-1.mp4"), videoContents);
  });

  afterAll(async () => {
    if (previousVideoDirectory === undefined) {
      delete process.env.MARKETING_VIDEO_STORAGE_DIR;
    } else {
      process.env.MARKETING_VIDEO_STORAGE_DIR = previousVideoDirectory;
    }
    await rm(videoDirectory, { recursive: true, force: true });
  });

  beforeEach(() => {
    mockPrisma.marketingEpisode.findFirst.mockResolvedValue({ id: "episode-1" });
    mockGenerateEpisode.mockResolvedValue(undefined);
  });

  it("generates one authenticated Reel and returns its persisted URLs", async () => {
    const episode = {
      id: "episode-2",
      topic: "Entrenamiento de fuerza",
      audience: "Entrenadores",
      tone: "Cercano",
      scheduledAt: new Date(),
      status: "completed",
      script: "Guion con llamada a la acción.",
      transcription: JSON.stringify({ words: [] }),
      audioFileName: "episode-2.mp3",
      errorMessage: null,
      createdAt: new Date(),
      completedAt: new Date(),
    };
    mockPrisma.marketingEpisode.create.mockResolvedValue(episode);
    mockPrisma.marketingEpisode.findUnique.mockResolvedValue(episode);

    const response = await request(app)
      .post("/generate")
      .set("Authorization", "Bearer test-token")
      .send({
        topic: episode.topic,
        audience: episode.audience,
        tone: episode.tone,
        durationSeconds: 30,
      });

    expect(response.status).toBe(201);
    expect(mockPrisma.marketingEpisode.create).toHaveBeenCalledTimes(1);
    expect(mockGenerateEpisode).toHaveBeenCalledWith(
      episode.id,
      { publishToInstagram: false, durationSeconds: 30 },
    );
    expect(response.body.data).toMatchObject({
      id: episode.id,
      status: "completed",
      audioUrl: `/api/marketing/episodes/${episode.id}/audio`,
      videoUrl: `/api/marketing/episodes/${episode.id}/video`,
    });
  });

  it("rejects batch generation instead of creating multiple videos", async () => {
    const response = await request(app)
      .post("/generate")
      .set("Authorization", "Bearer test-token")
      .send({
        batchSize: 4,
        topic: "Tema",
        audience: "Entrenadores",
        tone: "Cercano",
      });

    expect(response.status).toBe(400);
    expect(mockPrisma.marketingEpisode.create).not.toHaveBeenCalled();
    expect(mockGenerateEpisode).not.toHaveBeenCalled();
  });

  it("requires authentication to generate a Reel", async () => {
    const response = await request(app).post("/generate").send({
      topic: "Tema",
      audience: "Entrenadores",
      tone: "Cercano",
    });

    expect(response.status).toBe(401);
    expect(mockPrisma.marketingEpisode.create).not.toHaveBeenCalled();
    expect(mockGenerateEpisode).not.toHaveBeenCalled();
  });

  it("converts upstream generation failures to a stable API error response", async () => {
    mockPrisma.marketingEpisode.create.mockResolvedValue({ id: "episode-failed" });
    mockGenerateEpisode.mockRejectedValue(new Error("provider network unavailable"));

    const response = await request(app)
      .post("/generate")
      .set("Authorization", "Bearer test-token")
      .send({ topic: "Tema", audience: "Entrenadores", tone: "Cercano" });

    expect(response.body).toEqual({ error: { message: "Video generation failed" } });
    expect(response.status).toBe(502);
  });

  it("requires authentication", async () => {
    const response = await request(app).get("/episodes/episode-1/video");

    expect(response.status).toBe(401);
  });

  it("only returns completed episodes belonging to the authenticated trainer", async () => {
    mockPrisma.marketingEpisode.findFirst.mockResolvedValue(null);

    const response = await request(app)
      .get("/episodes/episode-1/video")
      .set("Authorization", "Bearer test-token");

    expect(response.status).toBe(404);
    expect(mockPrisma.marketingEpisode.findFirst).toHaveBeenCalledWith({
      where: { id: "episode-1", trainerId: "trainer-1", status: "completed" },
      select: { id: true },
    });
  });

  it("streams only the requested byte range", async () => {
    const response = await request(app)
      .get("/episodes/episode-1/video")
      .set("Authorization", "Bearer test-token")
      .set("Range", "bytes=2-5");

    expect(response.status).toBe(206);
    expect(response.headers["content-range"]).toBe("bytes 2-5/10");
    expect(response.headers["accept-ranges"]).toBe("bytes");
    expect(response.body).toEqual(videoContents.subarray(2, 6));
  });

  it("sets the download disposition when requested", async () => {
    const response = await request(app)
      .get("/episodes/episode-1/video?download=true")
      .set("Authorization", "Bearer test-token");

    expect(response.status).toBe(200);
    expect(response.headers["content-disposition"]).toBe(
      'attachment; filename="episode-1.mp4"',
    );
    expect(response.body).toEqual(videoContents);
  });
});
