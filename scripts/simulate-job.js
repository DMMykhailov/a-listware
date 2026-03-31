#!/usr/bin/env node
/**
 * Simulates a native C++ ad-campaign processing job.
 *
 * Receives: <jobName> [...args]
 * Exits 0 on success, 1 on failure (crash).
 *
 * Failure probability is seeded from realistic characteristics so that
 * the stats endpoint can surface meaningful correlations.
 */

const jobName = process.argv[2] ?? 'unknown-job';
const args = process.argv.slice(3);
const duration = 300 + Math.floor(Math.random() * 1700); // 300–2000 ms

// ── Base failure rate ─────────────────────────────────────────────────────────
let failureProbability = 0.30;

// Pipeline-stage reliability (from job-name prefix)
if (jobName.startsWith('bidding-'))   failureProbability += 0.18; // least stable — real-time bidding is latency-sensitive
if (jobName.startsWith('analytics-')) failureProbability -= 0.14; // most stable — read-only aggregation
if (jobName.startsWith('creative-'))  failureProbability += 0.07; // moderate — depends on asset availability
if (jobName.startsWith('targeting-')) failureProbability += 0.03; // slightly above baseline

// Targeting complexity (argument count drives CPU/memory pressure)
if (args.length >= 6)                 failureProbability += 0.14;
else if (args.length >= 3)            failureProbability += 0.06;

// Campaign tier (premium allocates dedicated worker threads)
if (/premium|enterprise/i.test(jobName)) failureProbability -= 0.10;
if (/test|demo/i.test(jobName))          failureProbability += 0.18; // test pipelines use unstable code paths

// Clamp to a sensible range so nothing is guaranteed to succeed or fail
failureProbability = Math.min(0.88, Math.max(0.05, failureProbability));

process.stdout.write(
  `[${jobName}] Starting | args: [${args.join(', ') || 'none'}] | ` +
  `duration: ${duration}ms | failP: ${failureProbability.toFixed(2)}\n`
);

setTimeout(() => {
  if (Math.random() < failureProbability) {
    process.stderr.write(`[${jobName}] CRASH: pipeline encountered an unrecoverable error\n`);
    process.exit(1);
  } else {
    process.stdout.write(`[${jobName}] SUCCESS: pipeline completed\n`);
    process.exit(0);
  }
}, duration);
