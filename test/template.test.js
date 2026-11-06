import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateTemplate } from '../src/template.js';

const input = (overrides = {}) => ({
  length: 290, width: 290, insertHeight: 40, paperThickness: 0, ...overrides,
});

test('Sheet is (Length + 8h) x (Width + 4h) for paper of zero thickness', () => {
  const t = generateTemplate(input());
  assert.equal(t.ok, true);
  assert.deepEqual(t.sheet, { width: 450, length: 610 });
});

test('Sheet size follows Length and Width independently', () => {
  const t = generateTemplate(input({ length: 120, width: 80, insertHeight: 25 }));
  assert.deepEqual(t.sheet, { width: 180, length: 320 });
});

const errorsFor = (overrides) => {
  const t = generateTemplate(input(overrides));
  assert.equal(t.ok, false, 'expected the input to be rejected');
  return t.errors;
};

test('Length must leave room for three Compartments (> 30mm)', () => {
  assert.ok(errorsFor({ length: 30 }).length);
  assert.equal(generateTemplate(input({ length: 30.5 })).ok, true);
});

test('Width must exceed the two 5mm Side Walls (> 10mm)', () => {
  assert.ok(errorsFor({ width: 10 }).width);
  assert.equal(generateTemplate(input({ width: 10.5 })).ok, true);
});

test('Insert Height must be positive', () => {
  assert.ok(errorsFor({ insertHeight: 0 }).insertHeight);
  assert.ok(errorsFor({ insertHeight: -5 }).insertHeight);
});

test('Paper thickness must be above 0 and below 2mm', () => {
  assert.ok(errorsFor({ paperThickness: -0.1 }).paperThickness);
  assert.ok(errorsFor({ paperThickness: 2 }).paperThickness);
  assert.equal(generateTemplate(input({ paperThickness: 1.9 })).ok, true);
});

test('A missing value is reported on its own field only', () => {
  const errors = errorsFor({ width: NaN });
  assert.deepEqual(Object.keys(errors), ['width']);
});

test('Every invalid field is reported at once', () => {
  const errors = errorsFor({ length: 10, width: 5 });
  assert.deepEqual(Object.keys(errors).sort(), ['length', 'width']);
});
