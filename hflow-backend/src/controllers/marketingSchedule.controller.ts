import { Request, Response } from 'express';

export const triggerSchedule = async (req: Request, res: Response) => {
    // Stub limpio: ya no llamamos a la cola vieja de Remotion
    res.status(200).json({ success: true, message: "Scheduler simulado (Modo Hyperframes)" });
};