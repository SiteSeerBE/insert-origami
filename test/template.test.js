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
