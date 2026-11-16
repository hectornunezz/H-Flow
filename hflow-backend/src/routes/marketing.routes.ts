import { Router } from 'express';
import { createCampaign } from '../controllers/marketing.controller';
import { triggerSchedule } from '../controllers/marketingSchedule.controller';

const router = Router();

// Rutas limpias
router.post('/generate', createCampaign);
router.post('/schedule', triggerSchedule);

export default router;