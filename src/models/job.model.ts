export type JobStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'crashed'      // crashed, no retry was scheduled (should not appear after retry logic)
  | 'retried'      // crashed and a retry was spawned
  | 'retry_failed'; // retry also failed

export interface Job {
  id: string;
  jobName: string;
  arguments: string[];
  status: JobStatus;
  pid?: number;
  exitCode?: number | null;
  submittedAt: Date;
  startedAt?: Date;
  finishedAt?: Date;
  /** ID of the automatically-spawned retry job, if any. */
  retryJobId?: string;
  /** True when this job was created as a retry of another. */
  isRetry: boolean;
  /** ID of the original job this is retrying, if applicable. */
  originalJobId?: string;
  /** How many jobs were already running at the moment this one started. */
  concurrentJobsAtStart: number;
}
