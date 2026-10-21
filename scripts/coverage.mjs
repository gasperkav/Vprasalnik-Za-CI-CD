import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
mkdirSync('coverage', { recursive: true });
const result = spawnSync(process.execPath, [
  '--test', '--experimental-test-coverage',
  '--test-reporter=tap', '--test-reporter-destination=stdout',
  '--test-reporter=lcov', '--test-reporter-destination=coverage/lcov.info',
], { encoding: 'utf8' });
writeFileSync('coverage/test-results.tap', (result.stdout || '') + (result.stderr || ''));
process.stdout.write(result.stdout || '');
process.stderr.write(result.stderr || '');
if (result.error) console.error(result.error);
process.exitCode = result.status ?? 1;
