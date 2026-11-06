// Pure geometry for the Insert Template. No DOM access: this is the test seam.
// Vocabulary follows GLOSSARY.md.

const WALL_TOP = 5;
const DIVIDER_TOP = 10;
export const MIN_COMPARTMENT = 10;
// Remaining Space within this much of 0 counts as filled, so decimals never get stuck.
export const FILLED_TOLERANCE = 0.05;

// The box fields. Compartment Lengths are a separate list: `compartments`.
export const INPUT_FIELDS = ['length', 'width', 'insertHeight', 'paperThickness'];

// The part of the Length not yet given to a Compartment, once both End Walls
// and every Divider for this many Compartments are taken off.
export function remainingSpace(length, compartments) {
  const used = compartments.reduce((sum, c) => sum + c, 0);
  return length - 2 * WALL_TOP - DIVIDER_TOP * (compartments.length - 1) - used;
}

// n Compartment Lengths that fill the Length evenly, each to 0.1 mm, with the
// last one taking the rounding difference so the Remaining Space is exactly 0.
export function equalSplit(length, n) {
  const total = remainingSpace(length, Array(n).fill(0));
  const each = Math.round((total / n) * 10) / 10;
  const last = total - each * (n - 1);
  return [...Array(n - 1).fill(each), Number(last.toFixed(6))];
}

function validate(inputs) {
  const errors = {};
  for (const field of INPUT_FIELDS) {
    if (!Number.isFinite(inputs[field])) errors[field] = 'Enter a number.';
  }
  const { length, width, insertHeight, paperThickness } = inputs;
  const minLength = 2 * WALL_TOP + MIN_COMPARTMENT;
  if (!errors.length && length < minLength) {
    errors.length = `Must be at least ${minLength} mm: two 5 mm End Walls and one ${MIN_COMPARTMENT} mm Compartment need that much.`;
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

  const compartments = inputs.compartments ?? [];
  if (!compartments.length) {
    errors.compartmentCount = 'An Insert needs at least one Compartment.';
  }
  const compartmentErrors = compartments.map((c) => {
    if (!Number.isFinite(c)) return 'Enter a number.';
    if (c < MIN_COMPARTMENT) return `Must be at least ${MIN_COMPARTMENT} mm.`;
    return null;
  });
  if (compartmentErrors.some(Boolean)) errors.compartments = compartmentErrors;
  if (!errors.length && !errors.compartments && !errors.compartmentCount) {
    const remaining = remainingSpace(length, compartments);
    if (remaining > FILLED_TOLERANCE) {
      errors.remainingSpace = `${remaining.toFixed(1)} mm of the Length is still to place.`;
    } else if (remaining < -FILLED_TOLERANCE) {
      errors.remainingSpace = `The Compartments are ${(-remaining).toFixed(1)} mm too long for the Length.`;
    }
  }
  return errors;
}

export function generateTemplate(inputs) {
  const errors = validate(inputs);
  if (Object.keys(errors).length) return { ok: false, errors };

  const { length, width, insertHeight: h, paperThickness: t } = inputs;
  // The last Compartment absorbs the tiny Remaining Space the tolerance allows,
  // so the Insert's outer size is exactly the Length.
  const compartments = [...inputs.compartments];
  compartments[compartments.length - 1] += remainingSpace(length, compartments);
  const dividers = compartments.length - 1;

  // Flat length of each panel. Paper is conserved along its mid-surface, so
  // with the Insert's outer size fixed every 90-degree fold saves a little
  // paper (as with a sheet-metal bend). With t = 0 these are the plain sizes.
  const outerFace = h - t / 2; // stands on the box floor, reaches the top
  const wallTop = WALL_TOP - t;
  const innerFace = h - t; // between the floor and the top layer
  const dividerTop = DIVIDER_TOP - t;
  const floorLength = (i) => compartments[i] + t;
  const floorWidth = width - 2 * WALL_TOP + t;

  // Fold positions along the Length (y), from the top edge of the Sheet.
  // Divider d follows Compartment d (both counted from 1).
  const dividerNames = Array.from({ length: dividers }, (_, i) => `divider${i + 1}`);
  const y = positions([
    ['endWall1.outerTop', outerFace], ['endWall1.innerTop', wallTop], ['endWall1.base', innerFace],
    ...dividerNames.flatMap((divider, i) => [
      [`${divider}.base1`, floorLength(i)], [`${divider}.top1`, innerFace], [`${divider}.top2`, dividerTop], [`${divider}.base2`, innerFace],
    ]),
    ['endWall2.base', floorLength(dividers)], ['endWall2.innerTop', innerFace], ['endWall2.outerTop', wallTop], ['sheet.end', outerFace],
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
  for (const divider of dividerNames) {
    acrossFloor('mountain', 'divider', y[`${divider}.base1`]);
    acrossFloor('valley', 'divider', y[`${divider}.top1`]);
    acrossFloor('valley', 'divider', y[`${divider}.top2`]);
    acrossFloor('mountain', 'divider', y[`${divider}.base2`]);
  }

  // Side Walls run the full Length, starting one Wall-top before Compartment 1
  // (they reach the box's end wall) and joined to the floor only beside
  // Compartment 1; with a single Compartment that is the whole floor. See ADR 0001.
  const sheetWidth = x['sheet.end'];
  const sheetLength = y['sheet.end'];
  // The floor's mid-surface meets the End Wall at WALL_TOP - t/2 from the box's end.
  const stripStart = y['endWall1.base'] - (WALL_TOP - t / 2);
  const stripEnd = stripStart + length;
  const compartment1End = dividers ? y['divider1.base1'] : y['endWall2.base'];
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
    lines,
    waste,
    steps: foldingSteps(lines, compartments.length),
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

function foldingSteps(lines, compartmentCount) {
  const ids = (keep) => lines.filter(keep).map((l) => l.id);
  const isFold = (l) => l.kind !== 'cut';
  const steps = [
    {
      title: 'Mark the lines',
      text: 'On the side that becomes the outside of the Insert, mark every measurement along the top and left edges, then draw each line straight across with a ruler.',
      lineIds: ids(() => true),
    },
    {
      title: 'Score every fold',
      text: 'Run a bone folder or blunt knife along every Valley and Mountain Fold against a ruler, so the paper folds crisply where you want it.',
      lineIds: ids(isFold),
    },
    {
      title: 'Cut and remove the waste',
      text: 'Cut along every solid line and remove the hatched waste. The Insert stays one piece.',
      lineIds: ids((l) => l.kind === 'cut'),
    },
    {
      title: 'Fold the End Walls',
      text: 'At each end, fold the Mountain Fold so the wall rises from the floor, then fold both Valley Folds so the paper runs 5 mm across the top and back down. The outer face stands on the box floor.',
      lineIds: ids((l) => l.part === 'end-wall'),
    },
    {
      title: 'Fold the Dividers',
      text: 'Pinch each Divider up from the floor: Mountain Folds at its two bases, Valley Folds at its two top lines, so it stands as a 10 mm wide hollow ridge.',
      lineIds: ids((l) => l.part === 'divider'),
    },
    {
      title: 'Fold the Side Walls',
      text: compartmentCount === 1
        ? 'Raise each Side Wall on its Mountain Fold along the Compartment, then fold both Valley Folds so it becomes a hollow 5 mm wall.'
        : 'Raise each Side Wall on its Mountain Fold beside Compartment 1, then fold both Valley Folds so it becomes a hollow 5 mm wall. Beside the other Compartments it stands free, held by the End Walls and the box.',
      lineIds: ids((l) => l.part === 'side-wall' && isFold(l)),
    },
  ];
  // With a single Compartment there are no Dividers to fold.
  return steps.filter((step) => step.lineIds.length > 0);
}
