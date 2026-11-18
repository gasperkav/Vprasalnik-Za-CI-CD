// Recompute saved measurements from raw records; does not contact the backend.
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const runs = (await readdir(path.join(here, 'results'), { withFileTypes: true }))
  .filter(d => d.isDirectory()).map(d => d.name).sort();
const run = process.argv[2] || runs.at(-1);
if (!run || path.basename(run) !== run) throw new Error('Pass one results directory name.');
const directory = path.join(here, 'results', run);
const summary = JSON.parse(await readFile(path.join(directory, 'summary.json'), 'utf8'));
const environment = JSON.parse(await readFile(path.join(directory, 'environment.json'), 'utf8'));
const rawText = await readFile(path.join(directory, 'raw.ndjson'), 'utf8');
const records = rawText.trim().split('\n').map(line => JSON.parse(line));
assert(!/"(?:Authorization|password|token)"\s*:/i.test(rawText), 'raw records contain a credential field');
const round = n => Number(n.toFixed(3));
function check(raw, saved) {
  assert.equal(raw.length, saved.requests);
  assert.equal(raw.filter(r => !r.ok).length, saved.errors);
  assert.equal(raw.filter(r => r.errorType === 'integrity').length, saved.integrityFailures);
  assert.equal(raw.filter(r => r.errorType === 'timeout').length, saved.timeouts);
  assert.equal(round(raw.reduce((total, r) => total + r.ms, 0) / raw.length), saved.latencyMs.mean);
  const sorted = raw.map(r => r.ms).sort((a, b) => a - b);
  for (const [key, quantile] of [['p50', .5], ['p95', .95], ['p99', .99]]) {
    assert.equal(sorted[Math.ceil(sorted.length * quantile) - 1], saved.latencyMs[key]);
  }
  assert.equal(raw.filter(r => r.ok).length + saved.errors, saved.requests);
  assert.equal(Object.values(saved.statuses).reduce((sum, count) => sum + count, 0), saved.requests);
}
for (const phase of summary.phases) {
  const samples = records.filter(r => r.phase === phase.name);
  const requests = samples.filter(r => r.type === 'request');
  const journeys = samples.filter(r => r.type === 'journey');
  check(requests, phase);
  assert.equal(journeys.length, phase.journeys);
  assert.equal(journeys.filter(j => !j.ok).length, phase.journeyErrors);
  assert.equal(samples.filter(r => r.type === 'health' && !r.ok).length, phase.healthFailures);
  if (phase.journeyErrors === 0) assert.equal(requests.length, journeys.length * 6);
  // The saved duration is rounded to 1ms; permit only this rounding difference.
  assert(Math.abs(requests.length / phase.actualSeconds - phase.reqPerSecond) < .02);
  for (const [endpoint, result] of Object.entries(phase.endpoints)) {
    check(requests.filter(r => `${r.method} ${r.path}` === endpoint), result);
  }
}
for (const test of ['load', 'stress']) {
  if (!summary.aggregate[test]) continue;
  const names = new Set(summary.phases.filter(p => p.test === test).map(p => p.name));
  check(records.filter(r => r.type === 'request' && names.has(r.phase)), summary.aggregate[test]);
}
const sha256 = text => createHash('sha256').update(text).digest('hex');
assert.equal(sha256(await readFile(path.join(directory, 'plan.json'))), summary.planSha256);
for (const [file, hash] of Object.entries(environment.sourceSha256)) {
  assert.equal(sha256(await readFile(path.join(root, file))), hash, `${file} changed since the run`);
}
assert.equal(summary.cleanup.remaining, 0, 'test pipelines remain');
const report = { runId: run, auditedUtc: new Date().toISOString(), result: 'PASS',
  checks: ['raw JSON parses', 'request and journey counts', '6 calls per successful journey',
    'error and status totals', 'phase and endpoint percentiles', 'aggregate percentiles from merged samples',
    'throughput arithmetic', 'plan and source SHA-256 match', 'no credential fields in raw records', 'no remaining test pipelines'],
  records: records.length, requests: records.filter(r => r.type === 'request').length,
  phases: summary.phases.length };
await writeFile(path.join(directory, 'audit.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
