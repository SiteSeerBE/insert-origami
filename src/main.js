import { generateTemplate, INPUT_FIELDS } from './template.js';
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

function showErrors(errors) {
  for (const name of INPUT_FIELDS) {
    const message = errors[name] ?? '';
    document.getElementById(`${name}-error`).textContent = message;
    form.elements.namedItem(name).setAttribute('aria-invalid', String(Boolean(message)));
  }
}

function readInputs() {
  const value = (name) => parseFloat(form.elements.namedItem(name).value);
  return {
    length: value('length'),
    width: value('width'),
    insertHeight: value('insertHeight'),
    paperThickness: value('paperThickness'),
  };
}

function update() {
  const inputs = readInputs();
  const template = generateTemplate(inputs);
  showErrors(template.ok ? {} : template.errors);
  result.hidden = !template.ok;
  invalid.hidden = template.ok;
  if (!template.ok) return;
  const size = `${fmt(template.sheet.width)} × ${fmt(template.sheet.length)} mm`;
  sheetSize.textContent = size;
  document.getElementById('materials-sheet').textContent = size;
  const { length, width, insertHeight, paperThickness } = inputs;
  document.getElementById('print-summary').textContent =
    `for a ${length} × ${width} mm box, ${insertHeight} mm high, ${paperThickness} mm paper`;
  drawing.replaceChildren(renderTemplate(template, { style }));
  explainer.textContent = EXPLAIN[style];
  fillSteps(template.steps);
  fillTable('measure-x', template.measurements.x);
  fillTable('measure-y', template.measurements.y);
}

form.addEventListener('input', update);
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
