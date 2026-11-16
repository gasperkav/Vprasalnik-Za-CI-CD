import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { cases } from '../helpers/cases.js';
import { getMaxScore, getFlatItems, getFlatCategoriesItems } from '../../src/utils.js';

describe('getMaxScore', () => {
  it('should count each supported type across categories and nested levels', () => {
    const categories = [
      { items: [{ type: 'checkbox', items: [{ type: 'numeric', items: [{ type: 'text' }] }] }] },
      { items: [{ type: 'yes_no_na' }, { type: 'multiselect' }, { type: 'heading' }] },
    ];
    const before = structuredClone(categories);
    assert.equal(getMaxScore(categories), 50);
    assert.deepEqual(categories, before);
  });
  cases([null, undefined, [], [{}], [{ items: [] }], [{ items: [{ type: 'heading' }] }]])(
    'should return fallback 100 when no scoreable items exist in %j', categories => {
      assert.equal(getMaxScore(categories), 100);
    },
  );
  it('should count children beneath a non-scoreable group and exceed 100 for a large questionnaire', () => {
    assert.equal(getMaxScore([{ items: [{ type: 'group', items: Array.from({ length: 11 }, () => ({ type: 'text' })) }] }]), 110);
  });
  cases([{}, 'bad', -1, false, [null], [{ items: {} }], [{ items: [null] }],
    [{ items: [{ items: -1 }] }]])('should throw TypeError for malformed tree %j', categories => {
    assert.throws(() => getMaxScore(categories), TypeError);
  });
});

describe('questionnaire traversal', () => {
  it('should preserve depth-first order and item references', () => {
    const child = { id: 'child' };
    const parent = { id: 'parent', items: [child] };
    const sibling = { id: 'sibling' };
    const result = getFlatCategoriesItems([{ items: [parent] }, { items: [sibling] }]);
    assert.deepEqual(result, [parent, child, sibling]);
    assert.equal(result[1], child);
  });
  it('should flatten an absent item collection to an empty array', () => {
    assert.deepEqual(getFlatItems(null), []);
    assert.deepEqual(getFlatItems(undefined), []);
  });
});
