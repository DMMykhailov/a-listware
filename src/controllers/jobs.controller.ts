import type { Request, Response } from "express";
import { createJob, getAllJobs } from "../services/job.service.ts";

export function postJob(req: Request, res: Response): void {
  const { jobName, arguments: args = [] } = req.body as {
    jobName: string;
    arguments?: string[];
  };
  const job = createJob(jobName.trim(), args);
  res.status(201).json(job);
}

export function getJobs(_req: Request, res: Response): void {
  res.json(getAllJobs());
}
