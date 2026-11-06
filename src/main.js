import { generateTemplate, remainingSpace, equalSplit, INPUT_FIELDS, MIN_COMPARTMENT, FILLED_TOLERANCE } from './template.js';
import { renderTemplate, highlightLines, fmt } from './render.js';

const form = document.getElementById('inputs');
const sheetSize = document.getElementById('sheet-size');
const drawing = document.getElementById('drawing');
const result = document.getElementById('result');
const invalid = document.getElementById('invalid');
const STYLE_KEY = 'insert-origami.measurementStyle';
const explainer = document.getElementById('measurements-explainer');
const EXPLAIN = {
  baseline: "Every position is measured from the Sheet's top-left corner. Mark them along the top and left edges, then draw each line straight across.",
  chained: 'Each distance is measured from the previous mark, starting at the top-left corner. Mark them one after another along the top and left edges, then draw each line straight across.',
};

function loadStyle() {
  try {
    return localStorage.getItem(STYLE_KEY) === 'chained' ? 'chained' : 'baseline';
  } catch {
    return 'baseline';
  }
}

function saveStyle(style) {
  try {
    localStorage.setItem(STYLE_KEY, style);
  } catch {
    // Storage blocked: the choice simply isn't remembered.
  }
}

let style = loadStyle();
for (const radio of document.querySelectorAll('input[name="measurementStyle"]')) {
  radio.checked = radio.value === style;
  radio.addEventListener('change', () => {
    style = radio.value;
    saveStyle(style);
    update();
  });
}

// Compartment Lengths as typed. Until the user types one, they follow an
// equal split of the Length (equal-split mode).
let compartmentValues = equalSplit(290, 3).map(String);
let equalSplitMode = true;
const compartmentRows = document.getElementById('compartment-rows');
const remainingEl = document.getElementById('remaining');
const MIN_LENGTH = 10 + MIN_COMPARTMENT;

// Shows a computed length without floating-point noise.
const mmValue = (n) => String(Number(n.toFixed(6)));
// Blank or unfinished Compartments count as 0 towards the Remaining Space.
const parsedCompartments = () => compartmentValues.map((v) => parseFloat(v)).map((n) => (Number.isFinite(n) ? n : 0));

function showErrors(errors) {
  for (const name of INPUT_FIELDS) {
    const message = errors[name] ?? '';
    document.getElementById(`${name}-error`).textContent = message;
    form.elements.namedItem(name).setAttribute('aria-invalid', String(Boolean(message)));
  }
  compartmentRows.querySelectorAll('li').forEach((li, i) => {
    const message = errors.compartments?.[i] ?? '';
    li.querySelector('.error').textContent = message;
    li.querySelector('input').setAttribute('aria-invalid', String(Boolean(message)));
  });
}

function readBox() {
  const value = (name) => parseFloat(form.elements.namedItem(name).value);
  return {
    length: value('length'),
    width: value('width'),
    insertHeight: value('insertHeight'),
    paperThickness: value('paperThickness'),
  };
}

function renderRows() {
  const only = compartmentValues.length === 1;
  const rows = compartmentValues.map((value, i) => {
    const li = document.createElement('li');
    const id = `compartment-${i}`;
    const label = document.createElement('label');
    label.htmlFor = id;
    label.textContent = `Compartment ${i + 1}`;
    const input = document.createElement('input');
    Object.assign(input, { id, type: 'number', inputMode: 'decimal', step: 'any', value });
    input.setAttribute('aria-describedby', `${id}-error`);
    input.addEventListener('input', () => {
      compartmentValues[i] = input.value;
      equalSplitMode = false;
    });
    const fill = document.createElement('button');
    Object.assign(fill, { type: 'button', className: 'fill', textContent: 'Fill', title: 'Add the Remaining Space to this Compartment' });
    fill.setAttribute('aria-label', `Fill Compartment ${i + 1} with the Remaining Space`);
    fill.addEventListener('click', () => {
      const length = readBox().length;
      if (!Number.isFinite(length)) return;
      const current = parseFloat(compartmentValues[i]);
      const filled = (Number.isFinite(current) ? current : 0) + remainingSpace(length, parsedCompartments());
      compartmentValues[i] = mmValue(filled);
      input.value = compartmentValues[i];
      equalSplitMode = false;
      update();
    });
    const remove = document.createElement('button');
    Object.assign(remove, { type: 'button', className: 'remove', textContent: '×', disabled: only });
    remove.setAttribute('aria-label', `Remove Compartment ${i + 1}`);
    remove.addEventListener('click', () => {
      compartmentValues.splice(i, 1);
      renderRows();
      update();
    });
    const error = document.createElement('p');
    Object.assign(error, { className: 'error', id: `${id}-error` });
    li.append(label, input, fill, remove, error);
    return li;
  });
  compartmentRows.replaceChildren(...rows);
}

document.getElementById('add-compartment').addEventListener('click', () => {
  compartmentValues.push('');
  renderRows();
  update();
  if (!equalSplitMode) compartmentRows.querySelector('li:last-child input').focus();
});

function showRemaining(length) {
  const fills = compartmentRows.querySelectorAll('.fill');
  if (!Number.isFinite(length)) {
    remainingEl.textContent = '';
    return;
  }
  const r = remainingSpace(length, parsedCompartments());
  // Filling only helps when it leaves the Compartment a usable length.
  parsedCompartments().forEach((c, i) => {
    fills[i].disabled = Math.abs(r) <= FILLED_TOLERANCE || c + r < MIN_COMPARTMENT;
  });
  const state = r > FILLED_TOLERANCE ? 'open' : r < -FILLED_TOLERANCE ? 'over' : 'filled';
  remainingEl.dataset.state = state;
  remainingEl.innerHTML = '';
  const strong = document.createElement('strong');
  if (state === 'open') {
    strong.textContent = `${r.toFixed(1)} mm`;
    remainingEl.append('Remaining Space: ', strong, ' still to place');
  } else if (state === 'over') {
    strong.textContent = `${(-r).toFixed(1)} mm`;
    remainingEl.append('Too long by ', strong, ': shorten a Compartment');
  } else {
    strong.textContent = '0 mm';
    remainingEl.append('Remaining Space: ', strong, ' — box filled ✓');
  }
}

function showAdvice() {
  const [first, ...rest] = compartmentValues.map((v) => parseFloat(v));
  const longerExists = Number.isFinite(first) && rest.some((c) => Number.isFinite(c) && c > first + FILLED_TOLERANCE);
  document.getElementById('compartment-advice').hidden = !longerExists;
}

// Top view of the box with the Compartments in proportion; Compartment 1 shaded.
function drawSketch(length) {
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const node = (name, attrs, text) => {
    const n = document.createElementNS(SVG_NS, name);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    if (text) n.textContent = text;
    return n;
  };
  const top = 8, height = 96, bottom = top + height;
  const compartments = parsedCompartments();
  const total = Number.isFinite(length) && length > 0
    ? length
    : 10 + 10 * (compartments.length - 1) + compartments.reduce((a, b) => a + b, 0);
  const scale = height / Math.max(total, 1);
  const clamp = (y) => Math.min(y, bottom);
  const parts = [node('rect', { class: 'sk-box', x: 8, y: top, width: 100, height, rx: 2 })];
  let at = top + 5 * scale;
  compartments.forEach((c, i) => {
    if (i > 0) {
      const mid = clamp(at + 5 * scale);
      parts.push(node('line', { class: 'sk-div', x1: 8, y1: mid, x2: 108, y2: mid, 'stroke-width': Math.max(10 * scale, 1.5) }));
      at += 10 * scale;
    }
    const y0 = clamp(at), y1 = clamp(at + c * scale);
    if (i === 0) parts.splice(1, 0, node('rect', { class: 'sk-fixed', x: 8, y: y0, width: 100, height: y1 - y0 }));
    if (y1 - y0 >= 12) parts.push(node('text', { class: 'sk-num', x: 58, y: (y0 + y1) / 2, 'dominant-baseline': 'central' }, String(i + 1)));
    at += c * scale;
  });
  const marker = node('marker', { id: 'sk-arrow', viewBox: '0 0 10 10', refX: 5, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' });
  marker.append(node('path', { d: 'M0,0 L10,5 L0,10 z' }));
  const defs = node('defs', {});
  defs.append(marker);
  parts.push(
    node('line', { class: 'sk-dim', x1: 122, y1: top, x2: 122, y2: bottom, 'marker-start': 'url(#sk-arrow)', 'marker-end': 'url(#sk-arrow)' }),
    node('text', { class: 'sk-label', x: 128, y: 60 }, 'Length'),
    defs,
  );
  document.getElementById('length-sketch').replaceChildren(...parts);
}

function update() {
  const box = readBox();
  if (equalSplitMode && Number.isFinite(box.length) && box.length >= MIN_LENGTH) {
    compartmentValues = equalSplit(box.length, compartmentValues.length).map(mmValue);
    compartmentRows.querySelectorAll('input').forEach((input, i) => { input.value = compartmentValues[i]; });
  }
  document.getElementById('equal-split-hint').hidden = !equalSplitMode;
  const inputs = { ...box, compartments: compartmentValues.map((v) => parseFloat(v)) };
  const template = generateTemplate(inputs);
  const errors = template.ok ? {} : template.errors;
  showErrors(errors);
  const boxValid = INPUT_FIELDS.every((f) => !errors[f]);
  document.getElementById('compartments').disabled = !boxValid;
  document.getElementById('compartments-disabled').hidden = boxValid;
  showRemaining(boxValid ? box.length : NaN);
  showAdvice();
  drawSketch(box.length);
  result.hidden = !template.ok;
  invalid.hidden = template.ok;
  if (!template.ok) {
    const onlyRemaining = Object.keys(errors).every((k) => k === 'remainingSpace');
    document.getElementById('invalid-message').textContent = onlyRemaining
      ? 'Place the Remaining Space in your Compartments to see your Template.'
      : 'Fix the highlighted values to see your Template.';
    return;
  }
  const size = `${fmt(template.sheet.width)} × ${fmt(template.sheet.length)} mm`;
  sheetSize.textContent = size;
  document.getElementById('materials-sheet').textContent = size;
  const { length, width, insertHeight, paperThickness } = inputs;
  const count = compartmentValues.length;
  document.getElementById('print-summary').textContent =
    `for a ${length} × ${width} mm box, ${insertHeight} mm high, ${paperThickness} mm paper; ` +
    `${count} Compartment${count === 1 ? '' : 's'}: ${compartmentValues.join(', ')} mm`;
  drawing.replaceChildren(renderTemplate(template, { style }));
  explainer.textContent = EXPLAIN[style];
  fillSteps(template.steps);
  fillTable('measure-x', template.measurements.x);
  fillTable('measure-y', template.measurements.y);
}

form.addEventListener('input', update);
renderRows();
update();

function fillTable(id, measurements) {
  const rows = measurements.map((m, i) => {
    const tr = document.createElement('tr');
    const tick = document.createElement('td');
    const label = document.createElement('label');
    const box = document.createElement('input');
    box.type = 'checkbox';
    label.append(box, i === 0 ? 'Corner' : `Mark ${i}`);
    tick.append(label);
    const mm = document.createElement('td');
    mm.className = 'mm';
    mm.textContent = style === 'chained' ? (i === 0 ? 'corner' : `+${m.chained} mm`) : `${m.display} mm`;
    tr.append(tick, mm);
    return tr;
  });
  document.getElementById(id).replaceChildren(...rows);
}

function fillSteps(steps) {
  const items = steps.map((step) => {
    const li = document.createElement('li');
    li.tabIndex = 0;
    const title = document.createElement('strong');
    title.textContent = step.title;
    li.append(title, step.text);
    const highlight = (on) => highlightLines(drawing.querySelector('svg'), on ? step.lineIds : []);
    li.addEventListener('mouseenter', () => highlight(true));
    li.addEventListener('mouseleave', () => highlight(false));
    li.addEventListener('focus', () => highlight(true));
    li.addEventListener('blur', () => highlight(false));
    return li;
  });
  document.getElementById('steps').replaceChildren(...items);
}
