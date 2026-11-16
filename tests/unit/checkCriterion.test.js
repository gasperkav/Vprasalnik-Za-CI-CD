import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { cases } from '../helpers/cases.js';
import { checkCriterion } from '../../src/utils.js';

describe('checkCriterion', () => {
  cases([
    [true, true, true], ['DA', true, true], ['NE', true, false],
    [false, false, true], ['NE', false, true], [undefined, false, true],
    [null, false, true], ['', false, true], ['DA', false, false],
    [0, false, false], [1, true, false], ['true', true, false],
    ['build', 'build', true], ['build', 'Build', false], ['10', 10, false],
  ])('should return %s = %s as %s using the equality contract', (answer, value, expected) => {
    assert.equal(checkCriterion({ q: answer }, { item_id: 'q', value }), expected);
  });

  cases([
    [['PUSH', 'PR'], 'PR', true], [[], 'PR', false],
    ['PUSH, PR , TIMER', 'PR', true], ['PR', 'PR', true],
    ['PULL_REQUEST', 'REQUEST', false], ['pr', 'PR', false],
    [null, 'PR', false], [undefined, 'PR', false], [17, 'PR', false],
  ])('should match membership of %j for %s as %s', (answer, value, expected) => {
    assert.equal(checkCriterion({ q: answer }, { item_id: 'q', operator: 'includes', value }), expected);
  });

  cases([
    ['>=', 9, 10, false], ['>=', 10, 10, true], ['>=', 11, 10, true],
    ['>', 9, 10, false], ['>', 10, 10, false], ['>', 11, 10, true],
    ['<=', 9, 10, true], ['<=', 10, 10, true], ['<=', 11, 10, false],
    ['<', 9, 10, true], ['<', 10, 10, false], ['<', 11, 10, false],
    ['>=', 0, 0, true], ['<', -2, -1, true], ['>=', ' 80 ', '80', true],
    ['>', 0.5, 0.4, true], ['unknown', 10, 1, false],
  ])('should compare with %s: %j against %j returning %s', (operator, answer, value, expected) => {
    assert.equal(checkCriterion({ q: answer }, { item_id: 'q', operator, value }), expected);
  });

  cases([null, undefined, '', ' ', 'abc', true, false, [], [1], {}, NaN, Infinity, -Infinity, Symbol('x')])(
    'should reject invalid numeric operand %s on either side without throwing', value => {
      assert.equal(checkCriterion({ q: value }, { item_id: 'q', operator: '>=', value: 0 }), false);
      assert.equal(checkCriterion({ q: 0 }, { item_id: 'q', operator: '<=', value }), false);
    },
  );

  cases([null, undefined, [], 1, 'answers', false])('should throw TypeError for malformed answers %j', answers => {
    assert.throws(() => checkCriterion(answers, { item_id: 'q', value: true }), TypeError);
  });
  cases([null, undefined, [], 1, {}, { item_id: '' }, { item_id: ' ' }, { item_id: -1 }])(
    'should throw TypeError for malformed criterion %j', criterion => {
      assert.throws(() => checkCriterion({}, criterion), TypeError);
    },
  );
});
