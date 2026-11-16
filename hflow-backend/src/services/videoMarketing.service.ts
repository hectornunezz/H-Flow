import path from 'path';
import { renderHyperframesVideo } from './hyperframesRenderer.service';
import logger from '../utils/logger';

export const generateMarketingVideo = async (trainerId: string, campaignData: any) => {
    try {
        logger.info(`Iniciando generación de vídeo Hyperframes para el entrenador ${trainerId}`);
        
        // 1. Mapear los datos que inyectaremos en el HTML (window.HFLOW_DATA)
        const templateData = {
            headline: campaignData.headline || "El fin del <span class='accent'>caos</span>",
            athlete1: campaignData.athletes?.[0]?.name || "Atleta 1",
            athlete2: campaignData.athletes?.[1]?.name || "Atleta 2",
            athlete3: campaignData.athletes?.[2]?.name || "Atleta 3"
        };

        // 2. Definir ruta de salida y plantilla
        const fileName = `marketing_${trainerId}_${Date.now()}.mp4`;
        const outputPath = path.join(process.cwd(), 'storage', 'marketing', fileName);
        const templatePath = path.join(process.cwd(), '../src/hyperframes/marketing-template.html');

        // 3. Renderizar usando Hyperframes (añadimos 'as any' para bypassear el error de la interfaz)
        const videoUrl = await renderHyperframesVideo({
            template: templatePath,
            outputPath: outputPath,
            injectedData: templateData
        } as any);

        logger.info(`Vídeo generado con éxito: ${videoUrl}`);
        return videoUrl;

    } catch (error) {
        logger.error(`Error crítico generando vídeo para el entrenador ${trainerId}:`, error);
        throw new Error("No se pudo generar el vídeo de marketing.");
    }
};