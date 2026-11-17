import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { unitTestFiles } from './unit-test-files.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'coverage');
mkdirSync(output, { recursive: true });
const rawReport = path.join(output, 'raw-lcov.info');
// No shell, glob expansion or redirection: the same invocation works on Windows and Linux.
const run = spawnSync(process.execPath, [
  '--test', '--experimental-test-coverage',
  '--test-reporter=spec', '--test-reporter-destination=stdout',
  '--test-reporter=lcov', `--test-reporter-destination=${rawReport}`,
  ...unitTestFiles(),
], { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
process.stdout.write(run.stdout || '');
process.stderr.write(run.stderr || '');
writeFileSync(path.join(output, 'test-results.txt'), (run.stdout || '') + (run.stderr || ''));
if (run.error) throw run.error;

// Explicit scope: assessment engine and clipboard utility; not whole-app coverage.
const targets = ['src/utils/assessment.js', 'src/utils/clipboard.js'];
const records = readFileSync(rawReport, 'utf8').split('end_of_record').map(record => record.trim()).filter(Boolean);
const reports = [];
const filtered = [];
const escape = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const percent = (hit, total) => total === 0 ? 100 : 100 * hit / total;
for (const target of targets) {
  const record = records.find(record => record.split(/\r?\n/).some(line => {
    if (!line.startsWith('SF:')) return false;
    const sourcePath = line.slice(3).replaceAll('\\', '/');
    return sourcePath === target || sourcePath.endsWith(`/${target}`);
  }));
  if (!record) throw new Error(`Coverage report missing required source: ${target}`);
  filtered.push(record + '\nend_of_record\n');
  const metric = name => Number(record.match(new RegExp(`^${name}:(\\d+)`, 'm'))?.[1] ?? NaN);
  const summary = {
    file: target,
    lines: percent(metric('LH'), metric('LF')),
    branches: percent(metric('BRH'), metric('BRF')),
    functions: percent(metric('FNH'), metric('FNF')),
  };
  if (![summary.lines, summary.branches, summary.functions].every(Number.isFinite)) {
    throw new Error(`Incomplete coverage metrics for ${target}`);
  }
  reports.push(summary);
  const hits = new Map([...record.matchAll(/^DA:(\d+),(\d+)/gm)].map(match => [Number(match[1]), Number(match[2])]));
  const source = readFileSync(path.join(root, target), 'utf8').split(/\r?\n/);
  const lines = source.map((line, index) => `<tr class="${hits.get(index + 1) === 0 ? 'miss' : hits.has(index + 1) ? 'hit' : ''}"><td>${index + 1}</td><td>${hits.get(index + 1) ?? ''}</td><td><pre>${escape(line)}</pre></td></tr>`).join('\n');
  writeFileSync(path.join(output, path.basename(target) + '.html'), `<!doctype html><meta charset="utf-8"><title>${target}</title><style>body{font-family:system-ui}table{border-collapse:collapse}td{padding:0 8px}pre{margin:0}.hit{background:#e7f8ec}.miss{background:#ffdddd}</style><a href="index.html">Coverage summary</a><h1>${target}</h1><p>Green: executed; red: not executed. Columns: line, hit count, source.</p><table>${lines}</table>`);
}
writeFileSync(path.join(output, 'lcov.info'), filtered.join(''));
unlinkSync(rawReport);
const thresholds = { lines: 90, branches: 85, functions: 90 };
const failed = reports.some(report => Object.entries(thresholds).some(([metric, threshold]) => report[metric] < threshold));
writeFileSync(path.join(output, 'coverage-summary.json'), JSON.stringify({ scope: targets, thresholds, reports }, null, 2));
const rows = reports.map(report => `| ${report.file} | ${report.lines.toFixed(2)}% | ${report.branches.toFixed(2)}% | ${report.functions.toFixed(2)}% |`).join('\n');
const summary = `## Unit coverage (selected modules)\n\n| File | Lines | Branches | Functions |\n|---|---:|---:|---:|\n${rows}\n\nRequired per file: lines 90%, branches 85%, functions 90%.\nTest exit code: ${run.status}; coverage gate: ${failed ? 'FAIL' : 'PASS'}.\n`;
console.log(summary);
writeFileSync(path.join(output, 'summary.md'), summary);
const htmlRows = reports.map(report => `<tr><td><a href="${path.basename(report.file)}.html">${report.file}</a></td><td>${report.lines.toFixed(2)}%</td><td>${report.branches.toFixed(2)}%</td><td>${report.functions.toFixed(2)}%</td></tr>`).join('');
writeFileSync(path.join(output, 'index.html'), `<!doctype html><meta charset="utf-8"><title>Unit coverage</title><style>body{font:16px system-ui;margin:40px}td,th{padding:12px;border:1px solid #ccc}table{border-collapse:collapse}</style><h1>Unit coverage</h1><p>Scope: selected assessment and clipboard modules only. React UI, API and C++ backend are outside this report.</p><table><tr><th>Source</th><th>Lines</th><th>Branches</th><th>Functions</th></tr>${htmlRows}</table><p>Test exit code: ${run.status}. Coverage gate: ${failed ? 'FAIL' : 'PASS'}.</p>`);
// Coverage generation never turns a failing test run green.
process.exitCode = run.status === 0 && !failed ? 0 : 1;
