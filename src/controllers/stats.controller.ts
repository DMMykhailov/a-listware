import type { Request, Response } from "express";
import { getStats } from "../services/stats.service.ts";

export function getStatsHandler(_req: Request, res: Response): void {
  res.json(getStats());
}
