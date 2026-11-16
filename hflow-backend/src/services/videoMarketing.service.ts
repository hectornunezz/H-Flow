import fs from "node:fs";
import path from "node:path";
import {
  renderHyperframesVideo,
  type HyperframesRenderRequest,
} from "./hyperframesRenderer.service";
import logger from "../utils/logger";

type CampaignData = Partial<Omit<HyperframesRenderRequest, "outputPath" | "audio">> & {
  audio?: Buffer | string;
  audioBase64?: string;
  headline?: string;
  athletes?: Array<{ name?: string }>;
};

export const generateMarketingVideo = async (
  trainerId: string,
  campaignData: CampaignData,
): Promise<string> => {
  try {
    logger.info(`Iniciando generación de vídeo Hyperframes para el entrenador ${trainerId}`);

    const storageDirectory = path.resolve(
      process.cwd(),
      process.env.MARKETING_STORAGE_DIR || "storage/marketing",
    );
    fs.mkdirSync(storageDirectory, { recursive: true });

    const safeTrainerId = trainerId.replace(/[^a-zA-Z0-9_-]/g, "_") || "trainer";
    const fileName = `marketing_${safeTrainerId}_${Date.now()}.mp4`;
    const outputPath = path.join(storageDirectory, fileName);
    const audio = Buffer.isBuffer(campaignData.audio)
      ? campaignData.audio
      : Buffer.from(campaignData.audioBase64 ?? campaignData.audio ?? "", "base64");
    const renderRequest: HyperframesRenderRequest = {
      script: campaignData.script ?? campaignData.headline ?? "",
      audio,
      captions: campaignData.captions ?? [],
      topic: campaignData.topic ?? campaignData.headline ?? "Marketing H-Flow",
      audience: campaignData.audience ?? "Entrenadores",
      tone: campaignData.tone ?? "Cercano",
      outputPath,
      durationSeconds: campaignData.durationSeconds,
      aspectRatio: campaignData.aspectRatio,
      callToAction: campaignData.callToAction,
    };

    await renderHyperframesVideo(renderRequest);

    const publicBaseUrl = (
      process.env.MARKETING_MEDIA_PUBLIC_URL || "http://localhost:3000/marketing-media"
    ).replace(/\/+$/, "");
    const videoUrl = `${publicBaseUrl}/${encodeURIComponent(fileName)}`;
    logger.info(`Vídeo generado con éxito: ${videoUrl}`);
    return videoUrl;
  } catch (error) {
    logger.error(`Error crítico generando vídeo para el entrenador ${trainerId}:`, error);
    throw new Error("No se pudo generar el vídeo de marketing.");
  }
};
