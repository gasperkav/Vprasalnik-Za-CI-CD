import assert from 'node:assert/strict';

// Compare an explicit projection of the public result, not implementation details.
export function assertFields(actual, expected) {
  const selected = Object.fromEntries(Object.keys(expected).map(key => [key, actual[key]]));
  assert.deepEqual(selected, expected);
}
