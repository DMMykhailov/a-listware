import { Router } from "express";
import { getStatsHandler } from "../controllers/stats.controller.ts";

const router = Router();

router.get("/", getStatsHandler);

export default router;
