import type { Job, JobStatus } from "../models/job.model.ts";
import { generateId } from "../utils/randomizer.ts";
import { logger } from "../utils/logger.ts";
import { spawnJob } from "../workers/job.worker.ts";

/** In-memory job store. */
const store = new Map<string, Job>();

function runningCount(): number {
  let n = 0;
  for (const job of store.values()) {
    if (job.status === "running") n++;
  }
  return n;
}

function makeJob(
  jobName: string,
  args: string[],
  extra: Partial<Pick<Job, "isRetry" | "originalJobId">> = {},
): Job {
  return {
    id: generateId(),
    jobName,
    arguments: args,
    status: "queued",
    submittedAt: new Date(),
    isRetry: false,
    concurrentJobsAtStart: runningCount(),
    ...extra,
  };
}

function onJobComplete(jobId: string, exitCode: number): void {
  const job = store.get(jobId);
  if (!job) return;

  if (exitCode === 0) {
    job.status = "completed";
    logger.info(`Job ${job.id} (${job.jobName}) completed successfully.`);
    return;
  }

  if (job.isRetry) {
    job.status = "retry_failed";
    logger.warn(`Job ${job.id} (${job.jobName}) failed on retry — giving up.`);
    return;
  }

  job.status = "retried";
  logger.warn(`Job ${job.id} (${job.jobName}) crashed — scheduling retry.`);

  const retry = makeJob(job.jobName, job.arguments, {
    isRetry: true,
    originalJobId: job.id,
  });
  store.set(retry.id, retry);
  job.retryJobId = retry.id;

  logger.info(`Retry job ${retry.id} spawned for original ${job.id}.`);
  spawnJob(retry, onJobComplete);
}

export function createJob(jobName: string, args: string[]): Job {
  const job = makeJob(jobName, args);
  store.set(job.id, job);
  spawnJob(job, onJobComplete);
  logger.info(
    `Job ${job.id} (${jobName}) submitted with ${args.length} arg(s).`,
  );
  return job;
}

export function getAllJobs(): Job[] {
  return [...store.values()];
}

export function getJobById(id: string): Job | undefined {
  return store.get(id);
}
