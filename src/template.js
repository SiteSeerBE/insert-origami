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
  } else if (!errors.insertHeight && !errors.paperThickness && insertHeight <= paperThickness) {
    errors.insertHeight = 'Must be more than the paper thickness.';
  }
  if (!errors.paperThickness && (paperThickness < 0 || paperThickness >= 2)) {
    errors.paperThickness = 'Must be between 0 and 2 mm.';
  }
  return errors;
}

export function generateTemplate(inputs) {
  const errors = validate(inputs);
  if (Object.keys(errors).length) return { ok: false, errors };

  const { length, width, insertHeight: h, paperThickness: t } = inputs;
  const compartment = (length - 2 * WALL_TOP - 2 * DIVIDER_TOP) / 3;

  // Flat length of each panel. Paper is conserved along its mid-surface, so
  // with the Insert's outer size fixed every 90-degree fold saves a little
  // paper (as with a sheet-metal bend). With t = 0 these are the plain sizes.
  const outerFace = h - t / 2; // stands on the box floor, reaches the top
  const wallTop = WALL_TOP - t;
  const innerFace = h - t; // between the floor and the top layer
  const dividerTop = DIVIDER_TOP - t;
  const floorLength = compartment + t;
  const floorWidth = width - 2 * WALL_TOP + t;

  // Fold positions along the Length (y), from the top edge of the Sheet.
  const y = positions([
    ['endWall1.outerTop', outerFace], ['endWall1.innerTop', wallTop], ['endWall1.base', innerFace],
    ['divider1.base1', floorLength], ['divider1.top1', innerFace], ['divider1.top2', dividerTop], ['divider1.base2', innerFace],
    ['divider2.base1', floorLength], ['divider2.top1', innerFace], ['divider2.top2', dividerTop], ['divider2.base2', innerFace],
    ['endWall2.base', floorLength], ['endWall2.innerTop', innerFace], ['endWall2.outerTop', wallTop], ['sheet.end', outerFace],
  ]);
  // Fold positions across the Width (x), from the left edge of the Sheet.
  const x = positions([
    ['sideWall1.outerTop', outerFace], ['sideWall1.innerTop', wallTop], ['sideWall1.base', innerFace],
    ['sideWall2.base', floorWidth], ['sideWall2.innerTop', innerFace], ['sideWall2.outerTop', wallTop], ['sheet.end', outerFace],
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
  // The floor's mid-surface meets the End Wall at WALL_TOP - t/2 from the box's end.
  const stripStart = y['endWall1.base'] - (WALL_TOP - t / 2);
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
    measurements: {
      x: measure([0, sheetWidth, ...lines.flatMap((l) => [l.x1, l.x2])]),
      y: measure([0, sheetLength, ...lines.flatMap((l) => [l.y1, l.y2])]),
    },
  };
}

// Baseline Measurements: each distinct position, at full precision and rounded
// to whole mm for display. Only the final position is rounded, so rounding
// never accumulates. Chained Measurements are differences of the rounded
// Baseline values, so the chain always adds up to them exactly.
function measure(values) {
  const distinct = [];
  for (const v of [...values].sort((a, b) => a - b)) {
    if (!distinct.length || v - distinct[distinct.length - 1] > 1e-9) distinct.push(v);
  }
  return distinct.map((position, i) => {
    const display = Math.round(position);
    const previous = i === 0 ? 0 : Math.round(distinct[i - 1]);
    return { position, display, chained: display - previous };
  });
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
