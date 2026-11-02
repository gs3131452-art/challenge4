import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestRow, NightDigest, ReadNight, RunStatus } from './types.js';

// Plan § 1. Folds runs/<night>.jsonl into one row per job, sorted by job — the page and
// the JSON both read from here, so they cannot disagree (ADR 0001).

type RunEvent = {
  at: string;
  job: string;
  status: RunStatus;
  owner: string | null;
  error: string | null;
};

// One JSONL line in, or null if it doesn't parse: the line is only counted, never thrown.
function parseEvent(line: string): RunEvent | null {
  let raw: unknown;
  try {
    raw = JSON.parse(line);
  } catch {
    return null;
  }
  if (typeof raw !== 'object' || raw === null) return null;
  const e = raw as Record<string, unknown>;
  if (typeof e.at !== 'string' || typeof e.job !== 'string') return null;
  if (e.status !== 'ok' && e.status !== 'retry' && e.status !== 'fail') return null;
  if (e.owner !== null && typeof e.owner !== 'string') return null;
  return {
    at: e.at,
    job: e.job,
    status: e.status,
    owner: e.owner,
    error: typeof e.error === 'string' ? e.error : null,
  };
}

export const readNight: ReadNight = (runsDir, night) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(night)) return null;
  let text: string;
  try {
    text = readFileSync(join(runsDir, `${night}.jsonl`), 'utf8');
  } catch {
    return null;
  }

  const byJob = new Map<string, DigestRow>();
  let badLines = 0;

  for (const line of text.split('\n')) {
    if (line.trim() === '') continue;
    const event = parseEvent(line);
    if (event === null) {
      badLines += 1;
      continue;
    }
    const row = byJob.get(event.job);
    if (row === undefined) {
      byJob.set(event.job, {
        job: event.job,
        owner: event.owner,
        runs: 1,
        retries: event.status === 'retry' ? 1 : 0,
        lastStatus: event.status,
        lastError: event.error,
        first: event.at,
        last: event.at,
      });
    } else {
      row.runs += 1;
      if (event.status === 'retry') row.retries += 1;
      row.lastStatus = event.status;
      row.last = event.at;
      if (event.error !== null) row.lastError = event.error;
    }
  }

  const rows = [...byJob.values()].sort((a, b) => (a.job < b.job ? -1 : a.job > b.job ? 1 : 0));
  return { night, rows, badLines };
};
