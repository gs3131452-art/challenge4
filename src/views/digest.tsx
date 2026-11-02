import type { DigestRow, NightDigest } from '../digest/types.js';

// A row that needs eyes at breakfast: three or more retries, or the night ended in a fail.
const needsAttention = (row: DigestRow) => row.retries >= 3 || row.lastStatus === 'fail';

export function DigestPage({ digest }: { digest: NightDigest }) {
  return (
    <>
      <h1>digest · {digest.night}</h1>
      {digest.rows.length === 0 ? (
        <p class="mute">nothing ran</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>job</th>
              <th>owner</th>
              <th>runs</th>
              <th>retries</th>
              <th>last status</th>
              <th>last error</th>
              <th>first</th>
              <th>last</th>
            </tr>
          </thead>
          <tbody>
            {/* The reader sorts by job already; the view keeps that order (ADR 0001). */}
            {digest.rows.map((row) => (
              <tr class={needsAttention(row) ? 'warn' : undefined}>
                <td>{row.job}</td>
                <td>{row.owner ?? '—'}</td>
                <td>{row.runs}</td>
                <td>{row.retries}</td>
                <td>{row.lastStatus}</td>
                <td>{row.lastError ?? '—'}</td>
                <td>{row.first}</td>
                <td>{row.last}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {digest.badLines > 0 && (
        <p class="mute">
          {digest.badLines} {digest.badLines === 1 ? 'line' : 'lines'} didn't parse
        </p>
      )}
    </>
  );
}
