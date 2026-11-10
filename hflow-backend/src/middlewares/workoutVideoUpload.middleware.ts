import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import type { RequestHandler } from "express";
import multer from "multer";

export const workoutVideoDirectory = path.resolve(
  process.env.WORKOUT_VIDEO_STORAGE_DIR ??
    path.join(process.cwd(), "storage", "workout-videos"),
);
mkdirSync(workoutVideoDirectory, { recursive: true });

const videoTypes = new Map([
  ["video/mp4", ".mp4"],
  ["video/webm", ".webm"],
  ["video/quicktime", ".mov"],
]);

const uploadVideo = multer({
  storage: multer.diskStorage({
    destination: workoutVideoDirectory,
    filename: (_request, file, callback) => {
      const extension = videoTypes.get(file.mimetype);
      if (!extension) {
        callback(new Error("Solo se admiten vídeos MP4, WebM o MOV"), "");
        return;
      }
      callback(null, `${randomUUID()}${extension}`);
    },
  }),
  limits: {
    fileSize: 100 * 1024 * 1024,
    files: 1,
    fields: 0,
    parts: 1,
  },
  fileFilter: (_request, file, callback) => {
    if (!videoTypes.has(file.mimetype)) {
      callback(new Error("Solo se admiten vídeos MP4, WebM o MOV"));
      return;
    }
    callback(null, true);
  },
}).single("video");

const workoutVideoUploadMiddleware: RequestHandler = (request, response, next) => {
  uploadVideo(request, response, (error: unknown) => {
    if (!error) {
      next();
      return;
    }
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      response.status(413).json({ error: { message: "El vídeo no puede superar 100 MB." } });
      return;
    }
    response.status(400).json({
      error: {
        message: error instanceof Error ? error.message : "No se pudo procesar el vídeo.",
      },
    });
  });
};

export default workoutVideoUploadMiddleware;
