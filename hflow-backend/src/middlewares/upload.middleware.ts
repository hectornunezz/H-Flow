import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import type { RequestHandler } from "express";
import multer from "multer";

export const uploadDirectory = path.resolve(process.cwd(), "uploads");
mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDirectory,
  filename: (_request, file, callback) => {
    const extension = file.mimetype === "image/jpeg" ? ".jpg" : ".png";
    callback(null, `${randomUUID()}${extension}`);
  },
});

const uploadAvatar = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
    fields: 5,
    parts: 6,
  },
  fileFilter: (_request, file, callback) => {
    if (file.mimetype !== "image/jpeg" && file.mimetype !== "image/png") {
      callback(new Error("Only JPEG and PNG images are allowed"));
      return;
    }
    callback(null, true);
  },
}).single("avatar");

const uploadMiddleware: RequestHandler = (request, response, next) => {
  uploadAvatar(request, response, (error: unknown) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      response.status(413).json({ error: { message: "Image must not exceed 5 MB" } });
      return;
    }

    response.status(400).json({
      error: {
        message:
          error instanceof Error ? error.message : "Unable to process uploaded image",
      },
    });
  });
};

export default uploadMiddleware;
