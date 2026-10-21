import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const mutations = [
  {
    "id": "V1",
    "unit": "validateRulesAgainstQuestionnaire",
    "from": "!allItemIds.has(id)",
    "to": "allItemIds.has(id)",
    "description": "Invert orphan reference condition"
  },
  {
    "id": "V2",
    "unit": "validateRulesAgainstQuestionnaire",
    "from": "Object.keys(rule.improvement_suggestions).forEach(id => referencedIds.add(id));",
    "to": "/* Deliberately ignore improvement suggestions. */",
    "description": "Ignore improvement suggestion references"
  },
  {
    "id": "M1",
    "unit": "getMissingItemsWithMeta",
    "from": "if (missingFromRules.includes(item.id))",
    "to": "if (!missingFromRules.includes(item.id))",
    "description": "Return referenced instead of missing items"
  },
  {
    "id": "M2",
    "unit": "getMissingItemsWithMeta",
    "from": "categoryTitle: category.title",
    "to": "categoryTitle: 'WRONG'",
    "description": "Return wrong category title"
  },
  {
    "id": "S1",
    "unit": "calculateSectionScore",
    "from": "Math.round((filled / total) * 100)",
    "to": "Math.floor((filled / total) * 100)",
    "description": "Round down instead of nearest integer"
  },
  {
    "id": "S2",
    "unit": "calculateSectionScore",
    "from": "answer !== undefined && answer !== null && answer !== '' && !isNaN(answer)",
    "to": "answer && !isNaN(answer)",
    "description": "Reject valid numeric zero"
  }
];
const original = readFileSync('src/utils/validator.js', 'utf8');
const tests = readFileSync('test/validator.test.js', 'utf8');
const directory = mkdtempSync(join(tmpdir(), 'zk2-mutations-'));
mkdirSync(join(directory, 'src/utils'), { recursive: true });
mkdirSync(join(directory, 'test'));
mkdirSync('evidence/zk2', { recursive: true });
writeFileSync(join(directory, 'package.json'), '{"type":"module"}');
writeFileSync(join(directory, 'test/validator.test.js'), tests);
const sourcePath = join(directory, 'src/utils/validator.js');
function execute(source, id) {
  writeFileSync(sourcePath, source);
  const result = spawnSync(process.execPath, ['--test', 'test/validator.test.js'], {
    cwd: directory, encoding: 'utf8',
  });
  if (result.error) throw result.error;
  const output = (result.stdout || '') + (result.stderr || '');
  writeFileSync('evidence/zk2/' + id + '.tap', output);
  return { exitCode: result.status, failedTests: [...output.matchAll(/^not ok \d+ - (.+)$/gm)].map(match => match[1]) };
}
const baseline = execute(original, 'baseline');
if (baseline.exitCode !== 0) throw new Error('Baseline tests must pass');
const results = [];
try {
  for (const mutation of mutations) {
    if (original.split(mutation.from).length !== 2) throw new Error('Mutation target must occur exactly once: ' + mutation.id);
    const result = execute(original.replace(mutation.from, mutation.to), mutation.id);
    const detected = result.exitCode !== 0 && result.failedTests.length > 0;
    results.push({ ...mutation, ...result, detected });
    console.log(mutation.id + ': ' + (detected ? 'DETECTED' : 'SURVIVED/INVALID'));
  }
} finally {
  writeFileSync(sourcePath, original);
}
const final = execute(original, 'restored');
const report = { baseline, results, final, detected: results.filter(result => result.detected).length, total: mutations.length };
writeFileSync('evidence/zk2/mutations.json', JSON.stringify(report, null, 2) + '\n');
if (report.detected !== report.total || final.exitCode !== 0) process.exitCode = 1;
