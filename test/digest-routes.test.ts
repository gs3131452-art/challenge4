import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

// Plan § 2d. Both digest routes, through app.request() (styleguide). The real fixture is
// read as it lies; runs/ itself is never written.
const config = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: 'runs' };

describe('digest routes on runs/2026-10-28.jsonl', () => {
  it('GET /digest/:night renders the night, bad line counted', async () => {
    const res = await createApp(config).request('/digest/2026-10-28');
    const html = await res.text();
    expect(res.status).toBe(200);
    // The reader's order: rows sorted by job, the bad line noted below the table.
    expect(html.indexOf('digest/render')).toBeLessThan(html.indexOf('fixtures/refresh'));
    expect(html.indexOf('fixtures/refresh')).toBeLessThan(html.indexOf('lane/sync'));
    expect(html).toContain('didn&#39;t parse');
  });

  it('GET /api/digest/:night answers the same rows as JSON', async () => {
    const res = await createApp(config).request('/api/digest/2026-10-28');
    const digest = (await res.json()) as { night: string; rows: { job: string }[]; badLines: number };
    expect(res.status).toBe(200);
    expect(digest.night).toBe('2026-10-28');
    expect(digest.badLines).toBe(1);
    expect(digest.rows.map((row) => row.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
  });
});

describe('digest routes on a temp runs dir', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'rig-digest-routes-'));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('answers 404 for a night with no file, both routes', async () => {
    const app = createApp({ ...config, runsDir: dir });
    const page = await app.request('/digest/2026-10-31');
    expect(page.status).toBe(404);
    const json = await app.request('/api/digest/2026-10-31');
    expect(json.status).toBe(404);
    expect(((await json.json()) as { error: string }).error).toBe('no run log for 2026-10-31');
  });

  it('renders the empty night as "nothing ran", JSON as empty rows', async () => {
    writeFileSync(join(dir, '2026-11-02.jsonl'), '');
    const app = createApp({ ...config, runsDir: dir });
    const page = await app.request('/digest/2026-11-02');
    expect(page.status).toBe(200);
    expect(await page.text()).toContain('nothing ran');
    const json = await app.request('/api/digest/2026-11-02');
    expect(json.status).toBe(200);
    expect(await json.json()).toEqual({ night: '2026-11-02', rows: [], badLines: 0 });
  });

  it('still serves a night with a bad line, the line counted, never thrown', async () => {
    writeFileSync(
      join(dir, '2026-11-01.jsonl'),
      'not json\n{"at":"2026-11-01T05:00:00+01:00","job":"only/one","status":"ok","owner":null}\n',
    );
    const app = createApp({ ...config, runsDir: dir });
    const page = await app.request('/digest/2026-11-01');
    expect(page.status).toBe(200);
    const html = await page.text();
    expect(html).toContain('only/one');
    expect(html).toContain('1 line didn&#39;t parse');
    const json = await app.request('/api/digest/2026-11-01');
    expect(json.status).toBe(200);
    const digest = (await json.json()) as { rows: unknown[]; badLines: number };
    expect(digest.rows).toHaveLength(1);
    expect(digest.badLines).toBe(1);
  });
});
