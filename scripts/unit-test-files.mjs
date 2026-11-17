import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const projectRoot = fileURLToPath(new URL('../', import.meta.url));

// Pass files, never a directory or a shell-expanded glob, to the Node test runner.
export function unitTestFiles() {
  function visit(directory) {
    return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) return visit(target);
      return entry.isFile() && entry.name.endsWith('.test.js') ? [target] : [];
    });
  }
  const files = visit(path.join(projectRoot, 'tests', 'unit')).sort();
  if (files.length === 0) throw new Error('No unit test files found');
  return files;
}
