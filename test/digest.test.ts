import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/reader.js';

// runs/ is read-only; the fixture tests read it as it lies on disk.
describe('readNight on runs/2026-10-28.jsonl', () => {
  it('reads the night into one row per job, the bad line counted', () => {
    const digest = readNight('runs', '2026-10-28');
    expect(digest?.badLines).toBe(1);
    expect(digest?.rows).toEqual([
      {
        job: 'digest/render',
        owner: null,
        runs: 1,
        retries: 0,
        lastStatus: 'ok',
        lastError: null,
        first: '2026-10-29T05:41:09+01:00',
        last: '2026-10-29T05:41:09+01:00',
      },
      {
        job: 'fixtures/refresh',
        owner: 'rook',
        runs: 4,
        retries: 3,
        lastStatus: 'ok',
        lastError: 'upstream 503',
        first: '2026-10-29T01:30:00+01:00',
        last: '2026-10-29T01:37:00+01:00',
      },
      {
        job: 'lane/sync',
        owner: 'rook',
        runs: 8,
        retries: 1,
        lastStatus: 'ok',
        lastError: 'lock held',
        first: '2026-10-28T23:00:06+01:00',
        last: '2026-10-29T05:00:04+01:00',
      },
      {
        job: 'notes/backup',
        owner: 'lane-07',
        runs: 1,
        retries: 0,
        lastStatus: 'fail',
        lastError: 'quota exceeded',
        first: '2026-10-29T04:00:01+01:00',
        last: '2026-10-29T04:00:01+01:00',
      },
      {
        job: 'rig/rotate-logs',
        owner: 'lane-07',
        runs: 1,
        retries: 0,
        lastStatus: 'ok',
        lastError: null,
        first: '2026-10-28T23:00:02+01:00',
        last: '2026-10-28T23:00:02+01:00',
      },
    ]);
  });

  it('answers null for a night with no file', () => {
    expect(readNight('runs', '2026-10-31')).toBeNull();
  });
});

describe('readNight on a temp runs dir', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'rig-digest-'));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('counts bad lines and skips blank ones, never throws', () => {
    writeFileSync(
      join(dir, '2026-11-01.jsonl'),
      'not json\n\n{"at":"2026-11-01T05:00:00+01:00","job":"only/one","status":"ok","owner":null}\n',
    );
    expect(readNight(dir, '2026-11-01')).toEqual({
      night: '2026-11-01',
      rows: [
        {
          job: 'only/one',
          owner: null,
          runs: 1,
          retries: 0,
          lastStatus: 'ok',
          lastError: null,
          first: '2026-11-01T05:00:00+01:00',
          last: '2026-11-01T05:00:00+01:00',
        },
      ],
      badLines: 1,
    });
  });

  it('renders an empty night as no rows, not null', () => {
    writeFileSync(join(dir, '2026-11-02.jsonl'), '');
    expect(readNight(dir, '2026-11-02')).toEqual({ night: '2026-11-02', rows: [], badLines: 0 });
  });
});
