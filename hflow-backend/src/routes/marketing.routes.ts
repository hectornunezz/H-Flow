import { Router } from "express";
import {
  generateMarketingVideo,
  getMarketingEpisodeVideo,
} from "../controllers/marketing.controller";
import {
  getMarketingEpisodeAudio,
  listMarketingEpisodes,
  scheduleMarketingEpisode,
} from "../controllers/marketingSchedule.controller";

const router = Router();

router.post("/generate", generateMarketingVideo);
router.post("/schedule", scheduleMarketingEpisode);
router.get("/episodes", listMarketingEpisodes);
router.get("/episodes/:episodeId/video", getMarketingEpisodeVideo);
router.get("/episodes/:episodeId/audio", getMarketingEpisodeAudio);

export default router;
