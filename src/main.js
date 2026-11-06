import { generateTemplate } from './template.js';
import { renderTemplate, fmt } from './render.js';

const form = document.getElementById('inputs');
const sheetSize = document.getElementById('sheet-size');
const drawing = document.getElementById('drawing');
const result = document.getElementById('result');
const invalid = document.getElementById('invalid');
const FIELDS = ['length', 'width', 'insertHeight', 'paperThickness'];

function showErrors(errors) {
  for (const name of FIELDS) {
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
  const template = generateTemplate(readInputs());
  showErrors(template.ok ? {} : template.errors);
  result.hidden = !template.ok;
  invalid.hidden = template.ok;
  if (!template.ok) return;
  sheetSize.textContent = `${fmt(template.sheet.width)} × ${fmt(template.sheet.length)} mm`;
  drawing.replaceChildren(renderTemplate(template));
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
    label.append(box, `Mark ${i + 1}`);
    tick.append(label);
    const mm = document.createElement('td');
    mm.className = 'mm';
    mm.textContent = `${m.display} mm`;
    tr.append(tick, mm);
    return tr;
  });
  document.getElementById(id).replaceChildren(...rows);
}
