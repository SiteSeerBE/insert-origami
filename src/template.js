// Pure geometry for the Insert Template. No DOM access: this is the test seam.
// Vocabulary follows GLOSSARY.md.

const WALL_TOP = 5;
const DIVIDER_TOP = 10;

const FIELDS = ['length', 'width', 'insertHeight', 'paperThickness'];

function validate(inputs) {
  const errors = {};
  for (const field of FIELDS) {
    if (!Number.isFinite(inputs[field])) errors[field] = 'Enter a number.';
  }
  const { length, width, insertHeight, paperThickness } = inputs;
  if (!errors.length && length <= 30) {
    errors.length = 'Must be more than 30 mm: two 5 mm End Walls and two 10 mm Dividers need that much.';
  }
  if (!errors.width && width <= 10) {
    errors.width = 'Must be more than 10 mm: the two Side Walls are 5 mm each.';
  }
  if (!errors.insertHeight && insertHeight <= 0) {
    errors.insertHeight = 'Must be more than 0 mm.';
  }
  if (!errors.paperThickness && (paperThickness < 0 || paperThickness >= 2)) {
    errors.paperThickness = 'Must be between 0 and 2 mm.';
  }
  return errors;
}

export function generateTemplate(inputs) {
  const errors = validate(inputs);
  if (Object.keys(errors).length) return { ok: false, errors };

  const { length, width, insertHeight: h } = inputs;
  const compartment = (length - 2 * WALL_TOP - 2 * DIVIDER_TOP) / 3;

  // Fold positions along the Length (y), from the top edge of the Sheet.
  const y = positions([
    ['endWall1.outerTop', h], ['endWall1.innerTop', WALL_TOP], ['endWall1.base', h],
    ['divider1.base1', compartment], ['divider1.top1', h], ['divider1.top2', DIVIDER_TOP], ['divider1.base2', h],
    ['divider2.base1', compartment], ['divider2.top1', h], ['divider2.top2', DIVIDER_TOP], ['divider2.base2', h],
    ['endWall2.base', compartment], ['endWall2.innerTop', h], ['endWall2.outerTop', WALL_TOP], ['sheet.end', h],
  ]);
  // Fold positions across the Width (x), from the left edge of the Sheet.
  const x = positions([
    ['sideWall1.outerTop', h], ['sideWall1.innerTop', WALL_TOP], ['sideWall1.base', h],
    ['sideWall2.base', width - 2 * WALL_TOP], ['sideWall2.innerTop', h], ['sideWall2.outerTop', WALL_TOP], ['sheet.end', h],
  ]);

  const lines = [];
  const add = (kind, part, x1, y1, x2, y2) => lines.push({ id: lines.length, kind, part, x1, y1, x2, y2 });
  const acrossFloor = (kind, part, at) => add(kind, part, x['sideWall1.base'], at, x['sideWall2.base'], at);

  for (const wall of ['endWall1', 'endWall2']) {
    acrossFloor('valley', 'end-wall', y[`${wall}.outerTop`]);
    acrossFloor('valley', 'end-wall', y[`${wall}.innerTop`]);
    acrossFloor('mountain', 'end-wall', y[`${wall}.base`]);
  }
  for (const divider of ['divider1', 'divider2']) {
    acrossFloor('mountain', 'divider', y[`${divider}.base1`]);
    acrossFloor('valley', 'divider', y[`${divider}.top1`]);
    acrossFloor('valley', 'divider', y[`${divider}.top2`]);
    acrossFloor('mountain', 'divider', y[`${divider}.base2`]);
  }

  // Side Walls run the full Length, starting one Wall-top before Compartment 1
  // (they reach the box's end wall) and joined to the floor only beside
  // Compartment 1. See ADR 0001.
  const sheetWidth = x['sheet.end'];
  const sheetLength = y['sheet.end'];
  const stripStart = y['endWall1.base'] - WALL_TOP;
  const stripEnd = stripStart + length;
  const compartment1End = y['divider1.base1'];
  const waste = [];
  for (const side of ['sideWall1', 'sideWall2']) {
    const base = x[`${side}.base`];
    const edge = side === 'sideWall1' ? 0 : sheetWidth;
    add('valley', 'side-wall', x[`${side}.outerTop`], stripStart, x[`${side}.outerTop`], stripEnd);
    add('valley', 'side-wall', x[`${side}.innerTop`], stripStart, x[`${side}.innerTop`], stripEnd);
    add('mountain', 'side-wall', base, y['endWall1.base'], base, compartment1End);
    // Free the Side Wall from the End Wall at the corner, and from the floor
    // beyond Compartment 1; then cut off the waste above and below the strip.
    add('cut', 'side-wall', base, 0, base, y['endWall1.base']);
    add('cut', 'side-wall', base, compartment1End, base, sheetLength);
    add('cut', 'side-wall', edge, stripStart, base, stripStart);
    add('cut', 'side-wall', edge, stripEnd, base, stripEnd);
    const left = Math.min(edge, base);
    const stripWidth = Math.abs(base - edge);
    waste.push({ x: left, y: 0, width: stripWidth, height: stripStart });
    waste.push({ x: left, y: stripEnd, width: stripWidth, height: sheetLength - stripEnd });
  }

  return {
    ok: true,
    sheet: { width: sheetWidth, length: sheetLength },
    compartmentLength: compartment,
    lines,
    waste,
  };
}

// Turns [name, distance from previous] pairs into absolute positions by name.
function positions(steps) {
  const out = {};
  let at = 0;
  for (const [name, distance] of steps) {
    at += distance;
    out[name] = at;
  }
  return out;
}
