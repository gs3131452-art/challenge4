import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseEvent } from './reader.js';

// Plan § 2c. Line-level counts by status for one night — the board shows them beside
// its link to /digest/<night>. The buckets come from the reader's parseEvent, so a
// line lands in one here exactly when it became a run there: board and digest cannot
// disagree (ADR 0001).

export type NightCounts = {
  ok: number;
  retry: number;
  fail: number;
};

// Pure: fold one night's text into counts. Blank lines are skipped; a line that
// doesn't parse is counted as a line, never in a bucket, never thrown (plan § 1).
export function countLines(text: string): NightCounts {
  const counts: NightCounts = { ok: 0, retry: 0, fail: 0 };
  for (const line of text.split('\n')) {
    if (line.trim() === '') continue;
    const event = parseEvent(line);
    if (event !== null) counts[event.status] += 1;
  }
  return counts;
}

// null: the night's file can't be read (e.g. gone between the board listing it and
// counting it) — the board renders `—` for that night's counts (styleguide).
export function countNight(runsDir: string, night: string): NightCounts | null {
  try {
    return countLines(readFileSync(join(runsDir, `${night}.jsonl`), 'utf8'));
  } catch {
    return null;
  }
}
