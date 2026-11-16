import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { assertFields } from '../helpers/assertFields.js';
import { cases } from '../helpers/cases.js';
import { evaluateAssessment } from '../../src/utils.js';

const category = items => [{ title: 'Build', items }];
const base = { level: 1, name: 'Initial', criteria: [] };
const customRules = [
  base,
  { level: 2, name: 'Managed', criteria: [{ item_id: 'a', value: true }, { item_id: 'b', value: true }],
    improvement_suggestions: { a: 'Enable builds', b: 'Enable tests' } },
  { level: 3, name: 'Optimized', criteria: [{ item_id: 'coverage', operator: '>=', value: 80 }] },
];
const legacyRules = [
  { level: 1, name: 'Initial', minScore: 0 },
  { level: 2, name: 'Managed', minScore: 50 },
  { level: 3, name: 'Optimized', minScore: 75 },
];

describe('evaluateAssessment with criteria', () => {
  it('should score all five supported answer types and choose the highest satisfied level', () => {
    const categories = category([
      { id: 'a', type: 'checkbox' }, { id: 'b', type: 'yes_no_na' },
      { id: 'text', type: 'text' }, { id: 'coverage', type: 'numeric' },
      { id: 'choices', type: 'multiselect' }, { id: 'heading', type: 'heading' },
    ]);
    const answers = { a: true, b: 'DA', text: '  build  ', coverage: 80, choices: ['PUSH'] };
    const before = structuredClone({ answers, categories, rules: customRules });
    assert.deepEqual(evaluateAssessment(answers, categories, customRules), {
      score: 100, level: 3, levelName: 'Optimized', missing: ['Čestitamo! Ste na najvišji stopnji zrelosti.'],
    });
    assert.deepEqual({ answers, categories, rules: customRules }, before);
  });

  cases([
    [{ a: false, b: false }, ['Enable builds', 'Enable tests']],
    [{ a: true, b: false }, ['Enable tests']],
    [{ a: false, b: true }, ['Enable builds']],
  ])('should require every criterion and recommend only missing conditions for %j', (answers, suggestions) => {
    const result = evaluateAssessment(answers, [], customRules);
    assert.deepEqual(result, { score: 0, level: 1, levelName: 'Initial', missing: [
      'Za dosego stopnje Managed morate izpolniti naslednje pogoje:', ...suggestions,
    ] });
  });

  it('should select the highest satisfied level even if a lower level is not satisfied', () => {
    assertFields(evaluateAssessment({ coverage: 80 }, [], [customRules[2], base, customRules[1]]), { level: 3, levelName: 'Optimized' });
  });

  it('should accept id/label rules and explain a missing numeric condition', () => {
    const rules = [{ id: 2, label: 'Measured', criteria: [{ item_id: 'coverage', operator: '>=', value: 80 }] },
      { id: 1, label: 'Initial', criteria: [] }];
    assert.deepEqual(evaluateAssessment({ coverage: 79 }, [], rules), { score: 0, level: 1, levelName: 'Initial', missing: [
      'Za dosego stopnje Measured morate izpolniti naslednje pogoje:',
      'Zahtevano: coverage mora ustrezati pogoju (>= 80)',
    ] });
    assert.equal(evaluateAssessment({ coverage: 80 }, [], rules).level, 2);
  });

  it('should include the default equality operator in a recommendation without suggestion text', () => {
    const rules = [base, { level: 2, name: 'Next', criteria: [{ item_id: 'a', value: true }] }];
    assert.deepEqual(evaluateAssessment({}, [], rules).missing, [
      'Za dosego stopnje Next morate izpolniti naslednje pogoje:', 'Zahtevano: a mora ustrezati pogoju (= true)',
    ]);
  });

  cases([
    [{ parent: false, child: true, other: true }, 50],
    [{ parent: true, child: false, other: true }, 67],
    [{ parent: 'DA', child: true, other: true }, 100],
  ])('should score children only when their parent is affirmative for %j', (answers, score) => {
    const categories = category([
      { id: 'parent', type: 'checkbox', items: [{ id: 'child', type: 'checkbox' }] },
      { id: 'other', type: 'checkbox' },
    ]);
    assertFields(evaluateAssessment(answers, categories, [base]), { score, level: 1 });
  });

  it('should gate grandchildren recursively', () => {
    const categories = category([{ id: 'a', type: 'checkbox', items: [
      { id: 'b', type: 'checkbox', items: [{ id: 'c', type: 'text' }] },
    ] }]);
    assert.equal(evaluateAssessment({ a: true, b: false, c: 'text' }, categories, [base]).score, 50);
    assert.equal(evaluateAssessment({ a: true, b: true, c: '' }, categories, [base]).score, 67);
  });

  cases([0, -1, 2.5, '0', ' -2 '])('should count finite numeric answer %j as filled', answer => {
    assert.equal(evaluateAssessment({ q: answer }, category([{ id: 'q', type: 'numeric' }]), [base]).score, 100);
  });

  cases([
    ['numeric', null], ['numeric', undefined], ['numeric', ''], ['numeric', '  '],
    ['numeric', 'bad'], ['numeric', true], ['numeric', false], ['numeric', []],
    ['numeric', {}], ['numeric', Infinity], ['numeric', NaN], ['numeric', Symbol('bad')],
    ['text', true], ['text', 42], ['text', '  '], ['text', null],
    ['multiselect', true], ['multiselect', 'PUSH'], ['multiselect', []],
    ['checkbox', 'true'], ['checkbox', 1], ['yes_no_na', 'NA'], ['yes_no_na', 'NE'],
  ])('should give zero for %s with invalid or unfilled answer %s', (type, answer) => {
    assert.equal(evaluateAssessment({ q: answer }, category([{ id: 'q', type }]), [base]).score, 0);
  });

  it('should treat a missing criterion list as unconditional in a mixed rules list', () => {
    assertFields(evaluateAssessment({}, [{}], [base, { level: 2, name: 'Default' }]), { score: 0, level: 2, levelName: 'Default' });
  });

  it('should fall back to the lowest configured level when no criteria match', () => {
    assertFields(evaluateAssessment({}, [], [{ id: 2, label: 'Base', criteria: [{ item_id: 'a', value: true }] }]), { score: 0, level: 2, levelName: 'Base' });
  });

  it('should cap recommendations at 15 including the heading', () => {
    const criteria = Array.from({ length: 20 }, (_, i) => ({ item_id: `q${i}`, value: true }));
    const result = evaluateAssessment({}, [], [base, { level: 2, name: 'Next', criteria }]);
    assert.equal(result.missing.length, 15);
    assert.equal(result.missing[14], 'Zahtevano: q13 mora ustrezati pogoju (= true)');
  });
});

describe('evaluateAssessment with score thresholds', () => {
  cases([[0, 0, 1], [1, 25, 1], [2, 50, 2], [3, 75, 3], [4, 100, 3]])(
    'should map %i positive answers to score %i and level %i', (count, score, level) => {
      const items = Array.from({ length: 4 }, (_, i) => ({ id: `q${i}`, type: 'checkbox', label: `Q${i}` }));
      const answers = Object.fromEntries(items.map((item, i) => [item.id, i < count]));
      assertFields(evaluateAssessment(answers, category(items), legacyRules), { score, level });
    },
  );

  it('should exclude NA from the legacy denominator and ignore unsupported types', () => {
    const items = [{ id: 'a', type: 'yes_no_na' }, { id: 'b', type: 'yes_no_na' },
      { id: 'c', type: 'text' }, { id: 'n', type: 'numeric' }];
    assert.deepEqual(evaluateAssessment({ a: 'NA', b: 'DA', c: 'ok', n: 0 }, category(items), legacyRules), { score: 100, level: 3, levelName: 'Optimized', missing: ['Ste na najvišji stopnji zrelosti!'] });
    assert.equal(evaluateAssessment({ a: 'NA' }, category([items[0]]), legacyRules).score, 0);
  });

  cases([null, undefined, true, 42, {}, [], ' ', ''])('should handle invalid legacy text %j without crashing', answer => {
    assert.equal(evaluateAssessment({ q: answer }, category([{ id: 'q', type: 'text' }]), legacyRules).score, 0);
  });

  it('should round two of three positives to 67 and explain the next threshold', () => {
    const items = ['a', 'b', 'c'].map(id => ({ id, label: id, type: 'checkbox' }));
    assert.deepEqual(evaluateAssessment({ a: true, b: true, c: false }, category(items), legacyRules), {
      score: 67, level: 2, levelName: 'Managed', missing: [
        'Za dosego stopnje Optimized potrebujete še 8 točk.', 'Manjka v Build: c',
      ],
    });
  });

  it('should choose the threshold independently of rule ordering without modifying inputs', () => {
    const rules = [legacyRules[2], legacyRules[0], legacyRules[1]];
    const before = structuredClone(rules);
    assert.equal(evaluateAssessment({ q: true }, category([{ id: 'q', type: 'checkbox' }]), rules).level, 3);
    assert.deepEqual(rules, before);
  });

  it('should cap legacy recommendations at 15', () => {
    const items = Array.from({ length: 20 }, (_, i) => ({ id: `q${i}`, label: `Q${i}`, type: 'checkbox' }));
    const result = evaluateAssessment({}, category(items), legacyRules);
    assert.equal(result.missing.length, 15);
    assert.equal(result.missing[14], 'Manjka v Build: Q13');
  });
});

describe('evaluateAssessment input contract', () => {
  cases([[[], []], [null, null], [undefined, undefined], [[{}], []]])(
    'should return an empty initial assessment for categories %j and rules %j', (categories, rules) => {
      assert.deepEqual(evaluateAssessment({}, categories, rules), { score: 0, level: 1, levelName: 'Začetna', missing: [] });
    },
  );
  cases([null, undefined, [], 'bad', -1, false])('should throw TypeError for malformed answer map %j', answers => {
    assert.throws(() => evaluateAssessment(answers, [], []), TypeError);
  });
  cases([
    [{}, []], [[], {}], [-1, []], [[], -1], [[null], []], [[], [null]],
    [[{ items: 'bad' }], []], [[{ items: [null] }], []],
    [[], [{ criteria: {} }]], [[], [{ criteria: [null] }]],
  ])('should throw TypeError for malformed categories %j or rules %j', (categories, rules) => {
    assert.throws(() => evaluateAssessment({}, categories, rules), TypeError);
  });
});
