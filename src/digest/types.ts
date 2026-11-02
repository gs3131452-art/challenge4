// Plan morning-digest § 1. This file lands first, on its own commit: the digest page,
// the JSON and the board link all start against it.

export type RunStatus = 'ok' | 'retry' | 'fail';

// One row per job in a night's run log. first/last keep the log's own offset — never
// converted for display (styleguide).
export type DigestRow = {
  job: string;
  owner: string | null;
  runs: number;
  retries: number;
  lastStatus: RunStatus;
  lastError: string | null;
  first: string;
  last: string;
};

export type NightDigest = {
  night: string;
  rows: DigestRow[];
  // Lines that didn't parse: counted, never thrown — the night still renders.
  badLines: number;
};

// null: the night has no file on disk. An empty file is a NightDigest with no rows.
export type ReadNight = (runsDir: string, night: string) => NightDigest | null;
