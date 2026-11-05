import express from "../hflow-backend/node_modules/express";
import request from "supertest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const mockPrisma = {
  marketingEpisode: {
    findFirst: jest.fn(),
  },
};

jest.doMock("@prisma/client", () => ({
  PrismaClient: jest.fn(() => mockPrisma),
}));
jest.doMock("../hflow-backend/src/utils/logger", () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

const { getMarketingEpisodeVideo } = require("../hflow-backend/src/controllers/marketing.controller") as {
  getMarketingEpisodeVideo: typeof import("../hflow-backend/src/controllers/marketing.controller").getMarketingEpisodeVideo;
};

const app = express();
app.use((requestHandler, _response, next) => {
  if (requestHandler.get("Authorization") === "Bearer test-token") {
    Object.assign(requestHandler, { auth: { trainerId: "trainer-1" } });
  }
  next();
});
app.get("/episodes/:episodeId/video", getMarketingEpisodeVideo);

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
