import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  extractItemIdsFromCriteria,
  validateRulesAgainstQuestionnaire,
  getMissingItemsWithMeta,
  calculateSectionScore,
} from '../src/utils/validator.js';

test('criteria extraction ignores absent IDs and removes duplicates', () => {
  assert.deepEqual([...extractItemIdsFromCriteria([
    { item_id: 'build' }, {}, { item_id: 'build' }, { item_id: 'test' },
  ])], ['build', 'test']);
  assert.deepEqual([...extractItemIdsFromCriteria(undefined)], []);
});

test('validation distinguishes missing questions and orphaned rule references', () => {
  const categories = [{ items: [{ id: 'build' }, { id: 'test' }, { id: 'deploy' }] }];
  const rules = [{
    criteria: [{ item_id: 'build' }, { item_id: 'deleted' }],
    improvement_suggestions: { test: 'Add tests' },
  }];
  assert.deepEqual(validateRulesAgainstQuestionnaire(categories, rules), {
    orphanedInRules: ['deleted'], missingFromRules: ['deploy'],
  });
});

test('validation accepts missing optional collections', () => {
  assert.deepEqual(validateRulesAgainstQuestionnaire(undefined, undefined), {
    orphanedInRules: [], missingFromRules: [],
  });
  assert.deepEqual(validateRulesAgainstQuestionnaire([{}], [{}]), {
    orphanedInRules: [], missingFromRules: [],
  });
});

test('missing questions retain their metadata and exclude referenced questions', () => {
  const categories = [{ title: 'CI', items: [
    { id: 'build', label: 'Build', type: 'checkbox' },
    { id: 'test', label: 'Tests', type: 'yes_no_na' },
  ] }];
  assert.deepEqual(getMissingItemsWithMeta(categories, [{ criteria: [{ item_id: 'build' }] }]), [
    { id: 'test', label: 'Tests', categoryTitle: 'CI', type: 'yes_no_na' },
  ]);
});

test('section score handles all supported types and ignores unsupported types', () => {
  const category = { items: [
    { id: 'a', type: 'yes_no_na' }, { id: 'b', type: 'checkbox' },
    { id: 'c', type: 'text' }, { id: 'd', type: 'numeric' },
    { id: 'e', type: 'multiselect' }, { id: 'f', type: 'heading' },
  ] };
  assert.deepEqual(calculateSectionScore(category, {
    a: 'DA', b: true, c: 'Description', d: 0, e: ['unit'],
  }), { score: 100, answered: 5, total: 5 });
  assert.deepEqual(calculateSectionScore(category, {
    a: 'NE', b: false, c: '   ', d: 'invalid', e: [],
  }), { score: 0, answered: 0, total: 5 });
});

test('section score rounds percentages and handles empty sections', () => {
  assert.deepEqual(calculateSectionScore({ items: [
    { id: 'a', type: 'checkbox' }, { id: 'b', type: 'checkbox' },
    { id: 'c', type: 'checkbox' },
  ] }, { a: true }), { score: 33, answered: 1, total: 3 });
  assert.deepEqual(calculateSectionScore({}, {}), { score: 0, answered: 0, total: 0 });
  assert.deepEqual(calculateSectionScore({ items: [{ id: 'a', type: 'heading' }] }, {}), {
    score: 0, answered: 0, total: 0,
  });
});

// Contract: only immediate category.items are checked; nested trees are outside this API.
test('validateRulesAgainstQuestionnaire - duplicate references - returns unique IDs', () => {
  assert.deepEqual(validateRulesAgainstQuestionnaire([{ items: [{ id: 'a' }, { id: 'b' }] }], [
    { criteria: [{ item_id: 'a' }, { item_id: 'ghost' }, { item_id: 'ghost' }] },
    { improvement_suggestions: { ghost: 'Fix' } },
  ]), { orphanedInRules: ['ghost'], missingFromRules: ['b'] });
});

test('validateRulesAgainstQuestionnaire - invalid collections - throws TypeError', () => {
  assert.throws(() => validateRulesAgainstQuestionnaire({}, []), TypeError);
  assert.throws(() => validateRulesAgainstQuestionnaire([], {}), TypeError);
});

test('getMissingItemsWithMeta - empty or fully referenced input - returns empty array', () => {
  assert.deepEqual(getMissingItemsWithMeta(undefined, undefined), []);
  assert.deepEqual(getMissingItemsWithMeta([{}], []), []);
  assert.deepEqual(getMissingItemsWithMeta([{ items: [{ id: 'a' }] }], [
    { criteria: [{ item_id: 'a' }] },
  ]), []);
});

test('getMissingItemsWithMeta - several categories - preserves each question metadata', () => {
  const categories = [
    { title: 'Build', items: [{ id: 'a', label: 'Compile', type: 'checkbox' }] },
    { title: 'Deploy', items: [{ id: 'b', label: 'Release', type: 'text' }] },
  ];
  assert.deepEqual(getMissingItemsWithMeta(categories, []), [
    { id: 'a', label: 'Compile', categoryTitle: 'Build', type: 'checkbox' },
    { id: 'b', label: 'Release', categoryTitle: 'Deploy', type: 'text' },
  ]);
});

test('getMissingItemsWithMeta - invalid collection - throws TypeError', () => {
  assert.throws(() => getMissingItemsWithMeta({}, []), TypeError);
});

test('calculateSectionScore - two out of three positive answers - rounds to 67', () => {
  assert.deepEqual(calculateSectionScore({ items: [
    { id: 'a', type: 'checkbox' }, { id: 'b', type: 'checkbox' },
    { id: 'c', type: 'checkbox' },
  ] }, { a: true, b: true, c: false }), { score: 67, answered: 2, total: 3 });
});

test('calculateSectionScore - zero numeric answer - counts as valid', () => {
  assert.deepEqual(calculateSectionScore({ items: [{ id: 'n', type: 'numeric' }] }, { n: 0 }), {
    score: 100, answered: 1, total: 1,
  });
});

test('calculateSectionScore - missing or invalid typed answers - scores zero', () => {
  const category = { items: [
    { id: 'a', type: 'yes_no_na' }, { id: 'b', type: 'text' },
    { id: 'c', type: 'numeric' }, { id: 'd', type: 'multiselect' },
  ] };
  assert.deepEqual(calculateSectionScore(category, {}), { score: 0, answered: 0, total: 4 });
  assert.deepEqual(calculateSectionScore(category, { a: 'NA', b: 123, c: null, d: 'unit' }), {
    score: 0, answered: 0, total: 4,
  });
  for (const value of [undefined, null, '', 'invalid', Number.NaN]) {
    assert.deepEqual(calculateSectionScore({ items: [{ id: 'n', type: 'numeric' }] }, { n: value }), {
      score: 0, answered: 0, total: 1,
    });
  }
});

test('calculateSectionScore - invalid required arguments - throws TypeError', () => {
  assert.throws(() => calculateSectionScore(null, {}), TypeError);
  assert.throws(() => calculateSectionScore({ items: [{ id: 'a', type: 'checkbox' }] }, null), TypeError);
});
