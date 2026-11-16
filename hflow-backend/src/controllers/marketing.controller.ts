import { Request, Response } from 'express';
import { runMarketingScheduler } from '../services/marketingScheduler.service';

export const triggerSchedule = async (req: Request, res: Response) => {
    await runMarketingScheduler();
    res.status(200).json({ success: true, message: "Scheduler ejecutado" });
};