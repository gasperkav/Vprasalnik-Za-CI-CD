import { spawnSync } from 'node:child_process';
import { projectRoot, unitTestFiles } from './unit-test-files.mjs';

const run = spawnSync(process.execPath, [
  '--test', ...process.argv.slice(2), ...unitTestFiles(),
], { cwd: projectRoot, stdio: 'inherit' });
if (run.error) throw run.error;
process.exitCode = run.status ?? 1;
