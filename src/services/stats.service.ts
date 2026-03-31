/**
 * Stats Service — AdFlow Campaign Processing Platform
 *
 * Context: AdFlow processes ad-campaign data through native C++ pipeline workers
 * (targeting, bidding, creative rendering, analytics). The goal is to maximise
 * successful job completions, which directly drives ad delivery and revenue.
 *
 * This module surfaces correlations between job characteristics and success rate
 * so engineering can prioritise stability work where it matters most.
 */

import { getAllJobs } from './job.service.ts';
import type { Job } from '../models/job.model.ts';

type Outcome = 'success' | 'failure' | 'pending';

function outcome(job: Job): Outcome {
  if (job.status === 'completed') return 'success';
  if (job.status === 'running' || job.status === 'queued') return 'pending';
  return 'failure';
}

interface Pattern {
  pattern: string;
  description: string;
  matchCount: number;
  settledCount: number;
  successRate: number;
  differenceFromAverage: string;
}

function buildPattern(
  label: string,
  description: string,
  jobs: Job[],
  predicate: (j: Job) => boolean,
  overallRate: number
): Pattern | null {
  const matched = jobs.filter(predicate);
  const settled = matched.filter((j) => outcome(j) !== 'pending');
  if (settled.length === 0) return null;

  const successRate = settled.filter((j) => outcome(j) === 'success').length / settled.length;
  const diff = successRate - overallRate;
  const sign = diff >= 0 ? '+' : '';

  return {
    pattern: label,
    description,
    matchCount: matched.length,
    settledCount: settled.length,
    successRate: round(successRate),
    differenceFromAverage: `${sign}${(diff * 100).toFixed(1)}%`,
  };
}

const round = (n: number) => parseFloat(n.toFixed(3));

// ── Pipeline stage ────────────────────────────────────────────────────────────
// Each job name is prefixed with the processing stage (e.g. "targeting-brand-42").
// Knowing which stage is least reliable helps triage on-call incidents.
const STAGES = ['targeting', 'bidding', 'creative', 'analytics', 'sync'] as const;

// ── Targeting complexity bucket ───────────────────────────────────────────────
// More targeting dimensions (CLI arguments) mean higher CPU / memory pressure
// on the native worker. We bucket by arg count to find the tipping point.
const COMPLEXITY_BUCKETS = [
  { label: 'Targeting complexity: simple (0–2 params)', min: 0, max: 2 },
  { label: 'Targeting complexity: moderate (3–5 params)', min: 3, max: 5 },
  { label: 'Targeting complexity: high (6+ params)', min: 6, max: Infinity },
] as const;

// ── Campaign tier ─────────────────────────────────────────────────────────────
// Premium / enterprise campaigns are routed to dedicated worker pools with
// reserved memory. Test / demo pipelines use unstable staging code paths.
// We check whether tier correlates with stability.

// ── Concurrent system load at job start ───────────────────────────────────────
// Measures how many jobs were already running when this one was dispatched.
// High concurrency → resource contention → more OOM-style crashes.
const LOAD_BUCKETS = [
  { label: 'System load at start: low (0–2 concurrent)', min: 0, max: 2 },
  { label: 'System load at start: medium (3–5 concurrent)', min: 3, max: 5 },
  { label: 'System load at start: high (6+ concurrent)', min: 6, max: Infinity },
] as const;

// ── Public ────────────────────────────────────────────────────────────────────

export function getStats() {
  const all = getAllJobs();

  // Analyse only original submissions (retries are tracked separately)
  const originals = all.filter((j) => !j.isRetry);
  const settled = originals.filter((j) => outcome(j) !== 'pending');
  const totalJobs = originals.length;
  const successCount = settled.filter((j) => outcome(j) === 'success').length;
  const overallRate = settled.length > 0 ? successCount / settled.length : 0;

  // Retry stats
  const retries = all.filter((j) => j.isRetry);
  const settledRetries = retries.filter((j) => outcome(j) !== 'pending');
  const retrySuccesses = settledRetries.filter((j) => outcome(j) === 'success').length;

  const patterns: Pattern[] = [];

  // 1. Pipeline stage
  for (const stage of STAGES) {
    const p = buildPattern(
      `Pipeline stage: ${stage}-*`,
      `Jobs belonging to the ${stage} processing stage`,
      originals,
      (j) => j.jobName.startsWith(`${stage}-`),
      overallRate
    );
    if (p) patterns.push(p);
  }

  // 2. Targeting complexity
  for (const bucket of COMPLEXITY_BUCKETS) {
    const p = buildPattern(
      bucket.label,
      `Jobs with ${bucket.max === Infinity ? `${bucket.min}+` : `${bucket.min}–${bucket.max}`} targeting parameters`,
      originals,
      (j) => j.arguments.length >= bucket.min && j.arguments.length <= bucket.max,
      overallRate
    );
    if (p) patterns.push(p);
  }

  // 3. Campaign tier
  const tierPatterns: Array<{ label: string; desc: string; re: RegExp }> = [
    {
      label: 'Campaign tier: premium / enterprise',
      desc: 'Jobs for campaigns flagged as premium or enterprise (dedicated worker pool)',
      re: /premium|enterprise/i,
    },
    {
      label: 'Campaign tier: test / demo',
      desc: 'Jobs running on staging pipelines — use unstable code paths',
      re: /test|demo/i,
    },
    {
      label: 'Campaign tier: standard',
      desc: 'All other campaigns running on the shared worker pool',
      re: /^(?!.*(premium|enterprise|test|demo)).*/i,
    },
  ];

  for (const tier of tierPatterns) {
    const p = buildPattern(tier.label, tier.desc, originals, (j) => tier.re.test(j.jobName), overallRate);
    if (p) patterns.push(p);
  }

  // 4. Concurrent system load at job start
  for (const bucket of LOAD_BUCKETS) {
    const p = buildPattern(
      bucket.label,
      `Jobs dispatched while ${bucket.max === Infinity ? `${bucket.min}+` : `${bucket.min}–${bucket.max}`} other jobs were running`,
      originals,
      (j) => j.concurrentJobsAtStart >= bucket.min && j.concurrentJobsAtStart <= bucket.max,
      overallRate
    );
    if (p) patterns.push(p);
  }

  return {
    service: 'AdFlow – Ad Campaign Processing Platform',
    insight: 'Correlations between job characteristics and processing success rate. Use these to prioritise reliability investments that maximise ad delivery and revenue.',
    totalJobsSubmitted: totalJobs,
    settled: settled.length,
    pending: totalJobs - settled.length,
    overallSuccessRate: round(overallRate),
    retryStats: {
      totalRetries: retries.length,
      settledRetries: settledRetries.length,
      retrySuccessRate: settledRetries.length > 0 ? round(retrySuccesses / settledRetries.length) : null,
    },
    patterns: patterns.filter(Boolean),
  };
}
