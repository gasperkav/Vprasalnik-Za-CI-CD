import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomBytes } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile, unlink, open } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { once } from 'node:events';
import { performance, monitorEventLoopDelay } from 'node:perf_hooks';
import { setTimeout as pause } from 'node:timers/promises';
import { evaluateAssessment } from '../../src/utils/assessment.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const planText = await readFile(path.join(here, 'plan.json'), 'utf8');
const plan = JSON.parse(planText);
const mode = process.argv[2] || 'all';
if (!['all', 'load', 'stress', 'smoke'].includes(mode)) throw new Error('Usage: node run.mjs [all|load|stress|smoke]');
const base = new URL(process.env.PERF_BASE_URL || plan.baseUrl);
if (base.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname)
    || base.username || base.password || base.pathname !== '/' || base.search || base.hash) {
  throw new Error('Only a plain HTTP loopback origin is accepted.');
}
if (Number(process.versions.node.split('.')[0]) < 20) throw new Error('Node >=20 required');
const runId = new Date().toISOString().replace(/[:.]/g, '-') + '-' + randomBytes(3).toString('hex');
const prefix = `zk-perf-${runId}-`;
const output = path.join(here, 'results', runId);
const lockPath = path.join(here, '.runner.lock');
const hash = data => createHash('sha256').update(data).digest('hex');
const statePath = path.join(here, `.account-${hash(base.origin).slice(0, 12)}.local`);
const jsonWrite = (name, data) => writeFile(path.join(output, name), JSON.stringify(data, null, 2) + '\n');
const round = n => Number(n.toFixed(3));
const percentile = (sorted, p) => sorted.length ? sorted[Math.max(0, Math.ceil(sorted.length * p) - 1)] : null;
function distribution(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return { count: sorted.length, mean: sorted.length ? round(sorted.reduce((a, b) => a + b, 0) / sorted.length) : null,
    p50: percentile(sorted, .5), p95: percentile(sorted, .95), p99: percentile(sorted, .99), max: sorted.at(-1) ?? null };
}
function summarise(records, seconds) {
  const errors = records.filter(r => !r.ok).length;
  const statuses = {};
  for (const r of records) statuses[r.status] = (statuses[r.status] || 0) + 1;
  return { requests: records.length, errors, errorPercent: round(100 * errors / (records.length || 1)),
    integrityFailures: records.filter(r => r.errorType === 'integrity').length,
    timeouts: records.filter(r => r.errorType === 'timeout').length,
    reqPerSecond: round(records.length / seconds), successfulReqPerSecond: round((records.length - errors) / seconds),
    latencyMs: distribution(records.map(r => r.ms)), statuses };
}
const sla = s => s.requests >= plan.acceptance.minimumMeasuredRequestsPerPhase
  && s.latencyMs.p95 < plan.acceptance.httpP95MsExclusive
  && s.latencyMs.p99 < plan.acceptance.httpP99MsExclusive
  && s.errorPercent < plan.acceptance.requestErrorPercentExclusive;
let stream, account, lock, token, fixture, abort = false, consecutiveHealthFailures = 0, sequence = 0;
const lines = [];
const phases = [];
const health = [];
const resources = [];
const knownIds = new Set();
const controlAgent = new http.Agent({ keepAlive: true, maxSockets: 2 });
const probeAgent = new http.Agent({ keepAlive: true, maxSockets: 1 });
const log = message => { const line = `${new Date().toISOString()} ${message}`; lines.push(line); console.log(line); };
const raw = record => stream.write(JSON.stringify(record) + '\n');

// Single absolute timeout, no redirects, retries, offline fallback or pipelining.
function request(agent, method, route, body, expected = 200, validate, stage, auth = true) {
  const start = performance.now();
  const utc = new Date().toISOString();
  return new Promise(resolve => {
    let settled = false, timer, req;
    const done = (data, status, bytes, errorType, error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const record = { type: 'request', utc, phase: stage?.name || 'control', method,
        path: route.replace(/\/api\/pipelines\/[^/]+$/, '/api/pipelines/:id'),
        status, ms: round(performance.now() - start), bytes, ok: !errorType,
        ...(errorType ? { errorType, error } : {}) };
      if (stage) { stage.records.push(record); raw(record); }
      resolve({ ...record, data });
    };
    const payload = body === undefined ? undefined : JSON.stringify(body);
    req = http.request(new URL(route, base), { method, agent, headers: {
      ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
      ...(auth && token ? { Authorization: `Bearer ${token}` } : {})
    } }, res => {
      const chunks = [];
      let size = 0;
      res.on('data', chunk => { chunks.push(chunk); size += chunk.length; });
      res.on('error', error => done(null, res.statusCode, size, 'transport', error.code || 'response error'));
      res.on('end', () => {
        if (settled) return;
        if (res.statusCode !== expected) return done(null, res.statusCode, size, 'status', `expected ${expected}`);
        let data;
        try {
          data = size ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : null;
          if (validate && !validate(data)) throw new Error('response content differs');
        } catch (error) { return done(data, res.statusCode, size, 'integrity', error.message); }
        done(data, res.statusCode, size);
      });
    });
    req.on('error', error => done(null, 0, 0, 'transport', error.code || 'request error'));
    timer = setTimeout(() => {
      done(null, 0, 0, 'timeout', `absolute timeout ${plan.requestTimeoutMs}ms`);
      req.destroy();
    }, plan.requestTimeoutMs);
    req.end(payload);
  });
}
function requireOK(response) {
  if (!response.ok) throw new Error(`${response.method} ${response.path}: ${response.errorType} (${response.status})`);
  return response.data;
}
function answersFor(questionnaire) {
  const answers = {};
  const visit = items => items.forEach(item => {
    if (item.type === 'numeric') answers[item.id] = 85;
    else if (item.type === 'multiselect') answers[item.id] = (item.options || []).slice(0, 2).map(o => o.value);
    else if (item.type === 'text') answers[item.id] = 'Synthetic CI/CD performance assessment';
    else answers[item.id] = true;
    if (item.items) visit(item.items);
  });
  visit(questionnaire.sections);
  return answers;
}
const questionnairePath = `/api/questionnaire/versions/${encodeURIComponent(plan.questionnaireVersion)}`;
const rulesPath = `/api/rules/versions/${encodeURIComponent(plan.questionnaireVersion)}`;
const validQuestionnaire = q => q?.version === plan.questionnaireVersion && q.sections?.length > 0;
const validRules = r => r?.version === plan.questionnaireVersion && r.levels?.length > 0;

async function journey(stage, vu) {
  const start = performance.now();
  const cycleId = ++sequence;
  let pipelineId, failure, deleteResult;
  try {
    const q = requireOK(await request(vu.agent, 'GET', questionnairePath, undefined, 200, validQuestionnaire, stage));
    const rules = requireOK(await request(vu.agent, 'GET', rulesPath, undefined, 200, validRules, stage));
    requireOK(await request(vu.agent, 'GET', '/api/pipelines', undefined, 200, Array.isArray, stage));
    const answers = answersFor(q);
    const evaluated = evaluateAssessment(answers, q.sections, rules.levels);
    const payload = { name: `${prefix}${cycleId}`, repoId: 'synthetic-performance',
      repoLink: 'https://example.invalid/zk/performance', assessor: 'ZK synthetic performance user',
      date: new Date().toISOString().slice(0, 10), version: q.version,
      answers, score: evaluated.score, level: evaluated.level };
    const created = await request(vu.agent, 'POST', '/api/pipelines', payload, 201,
      p => typeof p?.id === 'string' && p.name === payload.name && isDeepStrictEqual(p.answers, answers), stage);
    // Preserve an ID even if a 201 response fails its content check, for cleanup.
    if (created.data?.id) { pipelineId = created.data.id; knownIds.add(pipelineId); }
    requireOK(created);
    requireOK(await request(vu.agent, 'GET', `/api/pipelines/${encodeURIComponent(pipelineId)}`, undefined, 200,
      p => p?.id === pipelineId && p.name === payload.name && p.repoLink === payload.repoLink
        && p.level === payload.level && p.version === payload.version && isDeepStrictEqual(p.answers, answers), stage));
  } catch (error) { failure = error.message; }
  finally {
    if (pipelineId) {
      deleteResult = await request(vu.agent, 'DELETE', `/api/pipelines/${encodeURIComponent(pipelineId)}`, undefined, 204, undefined, stage);
      if (deleteResult.ok) knownIds.delete(pipelineId);
      else failure ||= 'cleanup request failed';
    }
  }
  const record = { type: 'journey', utc: new Date().toISOString(), phase: stage.name, vu: vu.id, cycleId,
    ms: round(performance.now() - start), ok: !failure, ...(failure ? { error: failure } : {}) };
  stage.journeys.push(record);
  raw(record);
}

// Cleanup only this run's synthetic names/IDs under the dedicated account.
async function cleanup() {
  if (!token) return { remaining: null, reason: 'no authenticated test account' };
  const listing = await request(controlAgent, 'GET', '/api/pipelines', undefined, 200, Array.isArray);
  if (!listing.ok) return { remaining: null, reason: 'cannot verify pipeline listing' };
  const candidates = listing.data.filter(p => p.name.startsWith(prefix) || knownIds.has(p.id));
  const attempted = [];
  for (const p of candidates) {
    const result = await request(controlAgent, 'DELETE', `/api/pipelines/${encodeURIComponent(p.id)}`, undefined, 204);
    attempted.push({ id: p.id, ok: result.ok });
  }
  const after = await request(controlAgent, 'GET', '/api/pipelines', undefined, 200, Array.isArray);
  return { attempted, remaining: after.ok ? after.data.filter(p => p.name.startsWith(prefix) || knownIds.has(p.id)).length : null };
}

async function runPhase(config, test) {
  if (config.vus > plan.safety.maximumVus) throw new Error('VU safety ceiling exceeded');
  log(`START ${test}/${config.name}: ${config.vus} VUs, ${config.seconds}s, think=${config.thinkMs}ms`);
  const stage = { ...config, test, records: [], journeys: [] };
  const started = performance.now();
  const deadline = started + config.seconds * 1000;
  const cpuStart = process.cpuUsage();
  const samples = [];
  const histogram = monitorEventLoopDelay({ resolution: 10 });
  histogram.enable();
  let sampling = false, stopSampling = false, probePromise = Promise.resolve();
  const sample = () => {
    const sampleRecord = { type: 'resource', utc: new Date().toISOString(), phase: config.name,
      generatorRssBytes: process.memoryUsage().rss, hostFreeBytes: os.freemem() };
    samples.push(sampleRecord); resources.push(sampleRecord); raw(sampleRecord);
    if (sampling || stopSampling) return;
    sampling = true;
    probePromise = request(probeAgent, 'GET', '/health', undefined, 200, d => d?.status === 'ok', undefined, false)
      .then(r => {
        const h = { type: 'health', utc: r.utc, phase: config.name, ok: r.ok, status: r.status, ms: r.ms };
        health.push(h); raw(h);
        consecutiveHealthFailures = h.ok ? 0 : consecutiveHealthFailures + 1;
        if (consecutiveHealthFailures >= plan.safety.maximumConsecutiveHealthFailures) abort = true;
      }).finally(() => { sampling = false; });
  };
  const interval = setInterval(sample, plan.healthIntervalMs);
  sample();
  await Promise.all(Array.from({ length: config.vus }, (_, id) => (async () => {
    const vu = { id, agent: new http.Agent({ keepAlive: true, maxSockets: 1 }) };
    try {
      while (!abort && performance.now() < deadline) {
        await journey(stage, vu);
        const remaining = deadline - performance.now();
        if (config.thinkMs && remaining > 0) await pause(Math.min(config.thinkMs, remaining));
      }
    } finally { vu.agent.destroy(); }
  })()));
  const finished = performance.now();
  clearInterval(interval); stopSampling = true;
  await probePromise;
  histogram.disable();
  const cpu = process.cpuUsage(cpuStart);
  const seconds = (finished - started) / 1000;
  const result = { test, name: config.name, vus: config.vus, thinkMs: config.thinkMs,
    plannedSeconds: config.seconds, actualSeconds: round(seconds), drainSeconds: round(Math.max(0, seconds - config.seconds)),
    ...summarise(stage.records, seconds), journeyLatencyMs: distribution(stage.journeys.map(j => j.ms)),
    journeys: stage.journeys.length, journeyErrors: stage.journeys.filter(j => !j.ok).length,
    journeyErrorPercent: round(100 * stage.journeys.filter(j => !j.ok).length / (stage.journeys.length || 1)),
    healthSamples: health.filter(h => h.phase === config.name).length,
    healthFailures: health.filter(h => h.phase === config.name && !h.ok).length,
    generator: { cpuPercentOfOneCore: round((cpu.user + cpu.system) / (seconds * 10000)),
      eventLoopP99Ms: round(histogram.percentile(99) / 1e6),
      maxRssBytes: Math.max(0, ...samples.map(s => s.generatorRssBytes)),
      minHostFreeBytes: Math.min(...samples.map(s => s.hostFreeBytes)) },
    endpoints: Object.fromEntries([...new Set(stage.records.map(r => `${r.method} ${r.path}`))]
      .map(key => [key, summarise(stage.records.filter(r => `${r.method} ${r.path}` === key), seconds)])) };
  result.sloMet = sla(result);
  result.generatorValid = result.generator.cpuPercentOfOneCore < plan.acceptance.generatorCpuPercentOfOneCoreExclusive
    && result.generator.eventLoopP99Ms < plan.acceptance.generatorEventLoopP99MsExclusive;
  phases.push({ result, records: stage.records });
  await jsonWrite(`${test}-${config.name}.json`, result);
  log(`END ${test}/${config.name}: req/s=${result.reqPerSecond}, p95=${result.latencyMs.p95}ms, p99=${result.latencyMs.p99}ms, errors=${result.errorPercent}%, cycles=${result.journeys}, SLO=${result.sloMet}`);
  return result;
}

async function preflight() {
  requireOK(await request(controlAgent, 'GET', '/health', undefined, 200, d => d?.status === 'ok', undefined, false));
  try { account = JSON.parse(await readFile(statePath, 'utf8')); }
  catch (e) { if (e.code !== 'ENOENT') throw e; }
  // Reuse the account from the first runner revision on the same local target.
  if (!account) {
    try {
      const previous = JSON.parse(await readFile(path.join(here, '.account.local'), 'utf8'));
      if (previous.baseUrl === base.origin) {
        account = previous;
        await writeFile(statePath, JSON.stringify(account) + '\n', { mode: 0o600 });
      }
    } catch (e) { if (e.code !== 'ENOENT') throw e; }
  }
  if (account && !/^zk_perf_[a-f0-9]+$/.test(account.username)) throw new Error('Only a synthetic performance account is accepted.');
  if (account && account.baseUrl !== base.origin) throw new Error('Stored test account belongs to a different target; use a separate checkout/account profile.');
  if (!account) {
    account = { baseUrl: base.origin, username: `zk_perf_${randomBytes(6).toString('hex')}`, password: randomBytes(24).toString('hex') };
    const registered = requireOK(await request(controlAgent, 'POST', '/api/auth/register', {
      username: account.username, password: account.password, email: `${account.username}@example.invalid`
    }, 201, d => !!d?.token && d.user?.role === 'member', undefined, false));
    token = registered.token;
    await writeFile(statePath, JSON.stringify(account) + '\n', { mode: 0o600 });
  }
  const loggedIn = requireOK(await request(controlAgent, 'POST', '/api/auth/login', {
    username: account.username, password: account.password
  }, 200, d => !!d?.token && d.user?.role === 'member', undefined, false));
  token = loggedIn.token;
  const q = requireOK(await request(controlAgent, 'GET', questionnairePath, undefined, 200, validQuestionnaire));
  const rules = requireOK(await request(controlAgent, 'GET', rulesPath, undefined, 200, validRules));
  const answers = answersFor(q);
  const evaluated = evaluateAssessment(answers, q.sections, rules.levels);
  fixture = { name: `${prefix}preflight`, repoId: 'synthetic-performance', repoLink: 'https://example.invalid/zk/performance',
    assessor: 'ZK synthetic performance user', date: new Date().toISOString().slice(0, 10),
    version: q.version, answers, score: evaluated.score, level: evaluated.level };
  await jsonWrite('fixture.json', { questionnaire: q, rules, pipelinePost: fixture, answerCount: Object.keys(answers).length });
  const saved = requireOK(await request(controlAgent, 'POST', '/api/pipelines', fixture, 201, p => !!p?.id));
  knownIds.add(saved.id);
  const reread = requireOK(await request(controlAgent, 'GET', `/api/pipelines/${saved.id}`));
  const removed = requireOK(await request(controlAgent, 'DELETE', `/api/pipelines/${saved.id}`, undefined, 204));
  knownIds.delete(saved.id);
  // Backend evaluation has a separate, legacy rule schema. Omit rules so the
  // server uses its DB rules; do not feed the frontend levels schema to C++.
  const backendEvaluation = await request(controlAgent, 'POST', '/api/assessment/evaluate',
    { questionnaire: q, answers }, 200, d => Number.isFinite(d?.score) && Number.isFinite(d?.level));
  const preflight = { utc: new Date().toISOString(), account: account.username, answerCount: Object.keys(answers).length,
    clientEvaluation: evaluated, createdScore: saved.score, readBackScore: reread.score,
    scorePersisted: saved.score === reread.score,
    answersPersisted: isDeepStrictEqual(answers, reread.answers),
    backendEvaluation: { status: backendEvaluation.status, ok: backendEvaluation.ok, result: backendEvaluation.data },
    cleanupStatus: removed === null ? 204 : null };
  await jsonWrite('preflight.json', preflight);
  if (!preflight.answersPersisted) throw new Error('Preflight answer read-back failed; load test would be meaningless.');
  log(`Preflight: ${preflight.answerCount} answers; persisted=${preflight.answersPersisted}; score persisted=${preflight.scorePersisted}`);
}

function shellInfo(exe, args) {
  try { return { available: true, output: execFileSync(exe, args, { cwd: root, encoding: 'utf8', timeout: 5000, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }).trim() }; }
  catch (error) { return { available: false, reason: String(error.stderr || error.message).trim().slice(0, 1200) }; }
}

let cleanupResult;
try {
  lock = await open(lockPath, 'wx');
  await lock.writeFile(JSON.stringify({ pid: process.pid, runId }));
  await mkdir(output, { recursive: true });
  stream = createWriteStream(path.join(output, 'raw.ndjson'), { flags: 'wx' });
  stream.on('error', () => { abort = true; });
  await once(stream, 'open');
  await writeFile(path.join(output, 'plan.json'), planText);
  const sourceFiles = ['tests/performance/plan.json', 'tests/performance/run.mjs', 'tests/performance/SPECIFIKACIJA.md',
    'src/utils/assessment.js', 'backend/src/main.cpp', 'backend/include/cicdq/db.hpp', 'backend/include/cicdq/store.hpp',
    'backend/include/cicdq/routes/pipelines.hpp', 'Dockerfile.backend'];
  const sources = Object.fromEntries(await Promise.all(sourceFiles.map(async f => [f, hash(await readFile(path.join(root, f)))])));
  const docker = shellInfo('docker', ['version', '--format', '{{json .}}']);
  await jsonWrite('environment.json', { runId, startedUtc: new Date().toISOString(), mode, target: base.origin,
    planSha256: hash(planText), sourceSha256: sources, node: process.version, platform: process.platform,
    os: os.version(), release: os.release(), cpu: os.cpus()[0]?.model, logicalCpus: os.cpus().length,
    hostTotalBytes: os.totalmem(), hostFreeBytes: os.freemem(), generatorPid: process.pid,
    git: shellInfo('git', ['-c', `safe.directory=${root.replaceAll('\\', '/')}`, 'rev-parse', 'HEAD']),
    gitStatus: shellInfo('git', ['-c', `safe.directory=${root.replaceAll('\\', '/')}`, 'status', '--short']),
    docker, targetTelemetry: 'N/A: runner samples generator and host only. No target CPU/RAM/restart monitor attached.',
    targetBuildIdentity: 'Existing local service; source hash is not proof of the running image build.',
    cppSourceStandard: 'C++17', cppCompilerRuntimeVersion: 'N/A (Docker access unavailable)',
    postgresRuntimeVersion: 'N/A (Docker access unavailable)', postgresComposeImage: 'postgres:15-alpine' });
  log(`RUN ${runId}, target=${base.origin}, plan SHA-256=${hash(planText)}`);
  await preflight();
  await runPhase(plan.smoke[0], 'smoke');
  const smoke = phases.at(-1).result;
  if (smoke.errors || smoke.journeyErrors || smoke.healthFailures) throw new Error('Smoke failed; full load was not started.');
  if (mode === 'all' || mode === 'load') {
    for (const config of plan.load) {
      if (abort) break;
      const result = await runPhase(config, 'load');
      if (result.errorPercent >= plan.safety.stopAtStageBoundaryIfRequestErrorPercentAtLeast) { abort = true; break; }
    }
  }
  if (mode === 'all') { log('COOLDOWN 10s'); await pause(10000); }
  if ((mode === 'all' || mode === 'stress') && !abort) {
    for (const config of plan.stress) {
      if (abort) break;
      const result = await runPhase(config, 'stress');
      if (config.name !== 'recovery' && result.errorPercent >= plan.safety.stopAtStageBoundaryIfRequestErrorPercentAtLeast) {
        log('Error safety threshold: skipping higher VUs, proceeding to recovery.');
        await runPhase(plan.stress.at(-1), 'stress'); break;
      }
    }
  }
  cleanupResult = await cleanup();
  await jsonWrite('cleanup.json', cleanupResult);
  const allResults = phases.map(p => p.result);
  const aggregate = name => {
    const matching = phases.filter(p => p.result.test === name);
    if (!matching.length) return null;
    const seconds = matching.reduce((sum, p) => sum + p.result.actualSeconds, 0);
    return { actualSeconds: round(seconds), ...summarise(matching.flatMap(p => p.records), seconds),
      journeys: matching.reduce((sum, p) => sum + p.result.journeys, 0),
      journeyErrors: matching.reduce((sum, p) => sum + p.result.journeyErrors, 0) };
  };
  const load = aggregate('load');
  const stress = aggregate('stress');
  const measured = allResults.filter(r => r.test !== 'smoke');
  const steady = allResults.find(r => r.name === 'steady');
  const recovery = allResults.find(r => r.name === 'recovery');
  const stressStages = allResults.filter(r => r.name.startsWith('stress-'));
  const firstSloBreach = stressStages.find(r => !r.sloMet);
  const plateau = stressStages.find((r, i) => i > 0 && r.vus === stressStages[i - 1].vus * 2
    && r.reqPerSecond < stressStages[i - 1].reqPerSecond * 1.2
    && r.latencyMs.p95 >= stressStages[i - 1].latencyMs.p95 * 1.5);
  const common = test => measured.filter(r => r.test === test)
    .every(r => r.integrityFailures === 0 && r.healthFailures === 0 && r.generatorValid)
    && cleanupResult.remaining === 0;
  const journeySlo = r => r.journeyErrorPercent < plan.acceptance.journeyErrorPercentExclusive;
  const loadPass = load && steady && allResults.filter(r => r.test === 'load').length === plan.load.length
    && common('load') && sla(load) && sla(steady) && journeySlo(steady)
    && load.journeyErrors * 100 / Math.max(1, load.journeys) < plan.acceptance.journeyErrorPercentExclusive
    && steady.successfulReqPerSecond >= plan.acceptance.minimumLoadSteadyRequestsPerSecond
    && Object.values(steady.endpoints).every(e => sla(e));
  const stressPass = stress && common('stress') && !abort && recovery && sla(recovery) && journeySlo(recovery);
  const verdict = { load: !load ? 'NOT_RUN' : loadPass ? 'PASS' : 'FAIL',
    stress: !stress ? 'NOT_RUN' : !stressPass ? 'FAIL' : firstSloBreach || plateau ? 'PASS' : 'INCONCLUSIVE',
    firstStressSloBreachVus: firstSloBreach?.vus ?? null, plateauVus: plateau?.vus ?? null,
    firstStressJourneyErrorBreachVus: stressStages.find(r => !journeySlo(r))?.vus ?? null,
    generatorValid: measured.every(r => r.generatorValid),
    memoryLeak: 'NOT_ASSESSED', targetResourceTelemetry: 'UNAVAILABLE',
    runningBuildMatchesSource: 'UNVERIFIED', stoppedBySafety: abort };
  const summary = { runId, endedUtc: new Date().toISOString(), planSha256: hash(planText), mode,
    aggregate: { load, stress }, verdict, cleanup: cleanupResult, phases: allResults };
  await jsonWrite('summary.json', summary);
  log(`VERDICT ${JSON.stringify(verdict)}`);
  const table = ['# Izmerjeni rezultati', '', `Run: ${runId}; UTC. Načrt SHA-256: ${hash(planText)}.`, '',
    '| Test/faza | VU | Čas s | req/s | Povp. ms | p95 ms | p99 ms | Napake % | Cikli | Napake ciklov |',
    '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|',
    ...allResults.map(r => `| ${r.test}/${r.name} | ${r.vus} | ${r.actualSeconds} | ${r.reqPerSecond} | ${r.latencyMs.mean} | ${r.latencyMs.p95} | ${r.latencyMs.p99} | ${r.errorPercent} | ${r.journeys} | ${r.journeyErrors} |`),
    '', '```json', JSON.stringify(verdict, null, 2), '```', ''];
  await writeFile(path.join(output, 'RESULTS.md'), table.join('\n'));
  if (['FAIL', 'INCONCLUSIVE'].includes(verdict.load) || ['FAIL', 'INCONCLUSIVE'].includes(verdict.stress)) process.exitCode = 1;
} catch (error) {
  console.error(error.stack);
  if (stream) {
    log(`FAILED: ${error.message}`);
    cleanupResult = await cleanup().catch(e => ({ remaining: null, reason: e.message }));
    await jsonWrite('failure.json', { utc: new Date().toISOString(), error: error.message, cleanup: cleanupResult });
  }
  process.exitCode = 1;
} finally {
  controlAgent.destroy(); probeAgent.destroy();
  if (stream) { stream.end(); await once(stream, 'close'); }
  if (lock) { await writeFile(path.join(output, 'console.txt'), lines.join('\n') + '\n'); await lock.close(); await unlink(lockPath); }
  console.log(`Artifacts: ${output}`);
}
