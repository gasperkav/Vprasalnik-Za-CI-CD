import { it } from 'node:test';
import { format } from 'node:util';

// Each row is a separate native test with its own scenario name and failure report.
export const cases = rows => (name, check) => {
  for (const row of rows) {
    const args = check.length === 1 ? [row] : row;
    it(format(name, ...args), () => check(...args));
  }
};
