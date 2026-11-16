import { Router } from 'express';
import { createCampaign } from '../controllers/marketing.controller';

const router = Router();

// Ruta limpia que usa el nuevo controlador
router.post('/generate', createCampaign);

export default router;