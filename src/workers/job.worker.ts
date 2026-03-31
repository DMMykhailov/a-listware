import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { Job } from "../models/job.model.ts";
import { logger } from "../utils/logger.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SIMULATOR = path.resolve(__dirname, "../../scripts/simulate-job.js");

export type CompletionCallback = (jobId: string, exitCode: number) => void;

export function spawnJob(job: Job, onComplete: CompletionCallback): void {
  const child = spawn("node", [SIMULATOR, job.jobName, ...job.arguments], {
    stdio: ["ignore", "pipe", "pipe"],
  });

  job.pid = child.pid;
  job.status = "running";
  job.startedAt = new Date();

  child.stdout?.on("data", (chunk: Buffer) =>
    logger.info(`[job:${job.id}] ${chunk.toString().trim()}`),
  );
  child.stderr?.on("data", (chunk: Buffer) =>
    logger.warn(`[job:${job.id}] ${chunk.toString().trim()}`),
  );

  child.on("exit", (code) => {
    job.exitCode = code;
    job.finishedAt = new Date();
    onComplete(job.id, code ?? 1);
  });

  child.on("error", (err) => {
    logger.error(`[job:${job.id}] spawn error – ${err.message}`);
    job.exitCode = 1;
    job.finishedAt = new Date();
    onComplete(job.id, 1);
  });
}
