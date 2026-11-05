import type { RequestHandler } from "express";
import multer from "multer";

const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
    fields: 0,
    parts: 1,
  },
  fileFilter: (_request, file, callback) => {
    if (!file.originalname.toLocaleLowerCase().endsWith(".csv")) {
      callback(new Error("Solo se admiten archivos .csv exportados desde Excel"));
      return;
    }
    callback(null, true);
  },
}).single("file");

const csvUploadMiddleware: RequestHandler = (request, response, next) => {
  csvUpload(request, response, (error: unknown) => {
    if (!error) {
      next();
      return;
    }
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      response.status(413).json({ error: { message: "El archivo CSV no puede superar 5 MB." } });
      return;
    }
    if (error instanceof multer.MulterError) {
      response.status(400).json({ error: { message: `No se pudo procesar el archivo CSV: ${error.message}` } });
      return;
    }
    response.status(400).json({
      error: { message: error instanceof Error ? error.message : "No se pudo procesar el archivo CSV." },
    });
  });
};

export default csvUploadMiddleware;
