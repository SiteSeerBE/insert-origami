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

test('Paper thickness must be from 0 (ideal paper) up to, but not including, 2mm', () => {
  assert.ok(errorsFor({ paperThickness: -0.1 }).paperThickness);
  assert.equal(generateTemplate(input({ paperThickness: 0 })).ok, true);
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

const along = (line) => line.x1 === line.x2;
const span = (a, b) => [Math.min(a, b), Math.max(a, b)];

test('Side Walls are Pleats along the Length, folded to the floor only beside Compartment 1', () => {
  const lines = example().lines.filter((l) => isFold(l) && along(l));
  const actual = lines
    .map((l) => [l.x1, l.kind, ...span(l.y1, l.y2)])
    .sort((a, b) => a[0] - b[0]);
  assert.deepEqual(actual, [
    // Side Wall strip runs the full Length (330), starting 5mm before Compartment 1
    [40, 'valley', 80, 410], [45, 'valley', 80, 410],
    // the base fold exists only beside Compartment 1 (85..185)
    [85, 'mountain', 85, 185],
    [275, 'mountain', 85, 185],
    [315, 'valley', 80, 410], [320, 'valley', 80, 410],
  ]);
});

test('Corner squares and the paper beside Compartments 2 and 3 are waste', () => {
  const { waste } = example();
  const sorted = [...waste].sort((a, b) => a.x - b.x || a.y - b.y);
  assert.deepEqual(sorted, [
    { x: 0, y: 0, width: 85, height: 80 },
    { x: 0, y: 410, width: 85, height: 240 },
    { x: 275, y: 0, width: 85, height: 80 },
    { x: 275, y: 410, width: 85, height: 240 },
  ]);
});

// Splits the Sheet into a grid on every line coordinate, joins neighbouring cells
// unless a Cut runs along their shared edge, and returns the connected pieces.
function pieces(template) {
  const { width, length } = template.sheet;
  const xs = [...new Set([0, width, ...template.lines.flatMap((l) => [l.x1, l.x2])])].sort((a, b) => a - b);
  const ys = [...new Set([0, length, ...template.lines.flatMap((l) => [l.y1, l.y2])])].sort((a, b) => a - b);
  const cuts = template.lines.filter((l) => l.kind === 'cut');
  const cutAlongX = (x, y0, y1) => cuts.some((c) => c.x1 === x && c.x2 === x && span(c.y1, c.y2)[0] <= y0 && span(c.y1, c.y2)[1] >= y1);
  const cutAlongY = (y, x0, x1) => cuts.some((c) => c.y1 === y && c.y2 === y && span(c.x1, c.x2)[0] <= x0 && span(c.x1, c.x2)[1] >= x1);

  const parent = new Map();
  const find = (k) => (parent.get(k) === k ? k : (parent.set(k, find(parent.get(k))), parent.get(k)));
  const key = (i, j) => `${i},${j}`;
  for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < ys.length - 1; j++) parent.set(key(i, j), key(i, j));
  const join = (a, b) => parent.set(find(a), find(b));
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < ys.length - 1; j++) {
      if (i + 1 < xs.length - 1 && !cutAlongX(xs[i + 1], ys[j], ys[j + 1])) join(key(i, j), key(i + 1, j));
      if (j + 1 < ys.length - 1 && !cutAlongY(ys[j + 1], xs[i], xs[i + 1])) join(key(i, j), key(i, j + 1));
    }
  }
  const inWaste = (i, j) => {
    const cx = (xs[i] + xs[i + 1]) / 2, cy = (ys[j] + ys[j + 1]) / 2;
    return template.waste.some((w) => cx > w.x && cx < w.x + w.width && cy > w.y && cy < w.y + w.height);
  };
  const groups = new Map();
  for (const k of parent.keys()) {
    const [i, j] = k.split(',').map(Number);
    const root = find(k);
    if (!groups.has(root)) groups.set(root, { waste: 0, insert: 0 });
    groups.get(root)[inWaste(i, j) ? 'waste' : 'insert']++;
  }
  return [...groups.values()];
}

test('Cuts never split the Insert: it stays one piece and only waste comes away', () => {
  const sizes = [
    { length: 31, width: 11, insertHeight: 1 },
    { length: 330, width: 200, insertHeight: 40 },
    { length: 290, width: 290, insertHeight: 40 },
    { length: 120, width: 300, insertHeight: 80 },
    { length: 500, width: 60, insertHeight: 15 },
    { length: 75.5, width: 42.3, insertHeight: 63.7 },
  ];
  for (const size of sizes) {
    for (const paperThickness of [0, 0.1, 0.35, 1]) {
      const t = generateTemplate({ ...size, paperThickness });
      if (!t.ok) continue;
      const found = pieces(t);
      const insertPieces = found.filter((p) => p.insert > 0);
      assert.equal(insertPieces.length, 1, `Insert split into ${insertPieces.length} pieces for ${JSON.stringify({ ...size, paperThickness })}`);
      assert.equal(insertPieces[0].waste, 0, 'waste is still attached to the Insert');
    }
  }
});

test('Baseline Measurements list every line position from the top-left corner, Sheet edges included', () => {
  const { measurements } = example();
  assert.deepEqual(measurements.x.map((m) => m.display), [0, 40, 45, 85, 275, 315, 320, 360]);
  assert.deepEqual(measurements.y.map((m) => m.display), [
    0, 40, 45, 80, 85, 185, 225, 235, 275, 375, 410, 415, 425, 465, 565, 605, 610, 650,
  ]);
});

test('Baseline Measurements are shown in whole millimetres, never more than 0.5mm off', () => {
  const t = generateTemplate(input({ length: 290, width: 213.7, insertHeight: 37.3, paperThickness: 0.35 }));
  for (const m of [...t.measurements.x, ...t.measurements.y]) {
    assert.ok(Number.isInteger(m.display), `${m.display} is not whole`);
    assert.ok(Math.abs(m.display - m.position) <= 0.5, `${m.display} vs ${m.position}`);
  }
  // 290 box: Compartment 1 ends at 2*37.3 + 5 + 86.67 = 166.27 (ideal paper)
  const ideal = generateTemplate(input({ length: 290, width: 213.7, insertHeight: 37.3 }));
  assert.ok(ideal.measurements.y.some((m) => m.display === 166));
});

// Paper is conserved along its mid-surface. With 1mm card and the Insert's
// outer size fixed, each panel's flat length becomes:
//   Wall outer face h - t/2 = 39.5, Wall top 5 - t = 4, inner faces h - t = 39,
//   Compartment floor c + t = 101, Divider top 10 - t = 9, floor across W - 10 + t = 191.
const thick = () => generateTemplate(input({ length: 330, width: 200, insertHeight: 40, paperThickness: 1 }));

test('Thick paper moves the folds so the outer size stays as entered', () => {
  const t = thick();
  assert.deepEqual(t.measurements.x.map((m) => m.position), [0, 39.5, 43.5, 82.5, 273.5, 312.5, 316.5, 356]);
  const acrossFolds = t.lines.filter((l) => isFold(l) && across(l)).map((l) => l.y1).sort((a, b) => a - b);
  assert.deepEqual(acrossFolds, [
    39.5, 43.5, 82.5,
    183.5, 222.5, 231.5, 270.5,
    371.5, 410.5, 419.5, 458.5,
    559.5, 598.5, 602.5,
  ]);
});

test('Thick paper needs a smaller Sheet: 8 thicknesses shorter, 4 narrower', () => {
  assert.deepEqual(thick().sheet, { width: 356, length: 642 });
});

test('Side Wall strip still spans the full Length with thick paper', () => {
  const strip = thick().lines.filter((l) => l.kind === 'valley' && along(l));
  for (const l of strip) assert.deepEqual(span(l.y1, l.y2), [78, 408]);
});

test('Insert Height must exceed the paper thickness', () => {
  assert.ok(errorsFor({ insertHeight: 0.5, paperThickness: 0.5 }).insertHeight);
  assert.equal(generateTemplate(input({ insertHeight: 0.6, paperThickness: 0.5 })).ok, true);
});

test('Chained Measurements give each distance from the previous line', () => {
  const { measurements } = example();
  assert.deepEqual(measurements.x.map((m) => m.chained), [0, 40, 5, 40, 190, 40, 5, 40]);
});

test('Chained Measurements always add up exactly to the Baseline Measurements', () => {
  const sizes = [
    { length: 290, width: 213.7, insertHeight: 37.3, paperThickness: 0.35 },
    { length: 271.3, width: 271.3, insertHeight: 22.2, paperThickness: 0.27 },
    { length: 99.9, width: 45.45, insertHeight: 18.75, paperThickness: 0.15 },
  ];
  for (const size of sizes) {
    const t = generateTemplate(size);
    for (const axis of [t.measurements.x, t.measurements.y]) {
      let total = 0;
      for (const m of axis) {
        total += m.chained;
        assert.equal(total, m.display);
      }
    }
  }
});

test('Folding steps come in a fixed order', () => {
  assert.deepEqual(example().steps.map((s) => s.title), [
    'Mark the lines', 'Score every fold', 'Cut and remove the waste',
    'Fold the End Walls', 'Fold the Dividers', 'Fold the Side Walls',
  ]);
});

test('Every line belongs to a step, and every step has lines', () => {
  for (const paperThickness of [0, 0.35]) {
    const t = generateTemplate(input({ paperThickness }));
    const used = new Set(t.steps.flatMap((s) => s.lineIds));
    for (const line of t.lines) assert.ok(used.has(line.id), `line ${line.id} is in no step`);
    for (const step of t.steps) assert.ok(step.lineIds.length > 0, `${step.title} has no lines`);
  }
});

test('Scoring covers every fold and cutting covers every Cut', () => {
  const t = example();
  const ids = (title) => new Set(t.steps.find((s) => s.title === title).lineIds);
  const score = ids('Score every fold');
  const cut = ids('Cut and remove the waste');
  for (const line of t.lines) {
    assert.equal(score.has(line.id), isFold(line), `scoring and line ${line.id}`);
    assert.equal(cut.has(line.id), line.kind === 'cut', `cutting and line ${line.id}`);
  }
});
