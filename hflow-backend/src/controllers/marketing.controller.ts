import { Request, Response } from 'express';
import { generateMarketingVideo } from '../services/videoMarketing.service';
import logger from '../utils/logger';

export const createCampaign = async (req: Request, res: Response) => {
    try {
        const trainerId = req.body.trainerId || 'default_trainer'; 
        const campaignData = req.body.campaignData || {};
        
        const videoUrl = await generateMarketingVideo(trainerId, campaignData);
        res.status(200).json({ success: true, videoUrl });
    } catch (error) {
        logger.error("Error en marketing controller:", error);
        res.status(500).json({ error: 'Error generating video' });
    }
};