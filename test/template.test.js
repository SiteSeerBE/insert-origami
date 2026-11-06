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

// Worked example: 330 x 200 box, 40mm Insert, ideal paper.
// Compartments: (330 - 2*5 - 2*10) / 3 = 100mm. Sheet: 360 x 650.
const example = () => generateTemplate(input({ length: 330, width: 200, insertHeight: 40 }));
const isFold = (line) => line.kind === 'valley' || line.kind === 'mountain';
const across = (line) => line.y1 === line.y2;

test('End Walls and Dividers are Pleats folded across the Width', () => {
  const folds = example().lines.filter((l) => isFold(l) && across(l));
  const actual = folds.map((l) => [l.y1, l.kind]).sort((a, b) => a[0] - b[0]);
  assert.deepEqual(actual, [
    // End Wall: outer face 40, 5mm top, inner face 40, then Compartment 1
    [40, 'valley'], [45, 'valley'], [85, 'mountain'],
    // Divider 1 after a 100mm Compartment: up 40, 10mm top, down 40
    [185, 'mountain'], [225, 'valley'], [235, 'valley'], [275, 'mountain'],
    // Divider 2
    [375, 'mountain'], [415, 'valley'], [425, 'valley'], [465, 'mountain'],
    // End Wall at the far end
    [565, 'mountain'], [605, 'valley'], [610, 'valley'],
  ]);
});

test('End Wall and Divider folds span the floor between the Side Walls (Width - 10)', () => {
  const folds = example().lines.filter((l) => isFold(l) && across(l));
  for (const l of folds) {
    assert.deepEqual([Math.min(l.x1, l.x2), Math.max(l.x1, l.x2)], [85, 275]);
  }
});

test('The three Compartments are equal', () => {
  const t = generateTemplate(input({ length: 290 }));
  const bases = t.lines.filter((l) => l.kind === 'mountain' && across(l)).map((l) => l.y1).sort((a, b) => a - b);
  // mountain bases: [wall, div1 up, div1 down, div2 up, div2 down, wall]
  const compartments = [bases[1] - bases[0], bases[3] - bases[2], bases[5] - bases[4]];
  for (const c of compartments) assert.ok(Math.abs(c - 260 / 3) < 1e-9, `got ${c}`);
});
