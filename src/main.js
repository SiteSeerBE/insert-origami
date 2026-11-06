import { generateTemplate } from './template.js';
import { renderTemplate, fmt } from './render.js';

const form = document.getElementById('inputs');
const sheetSize = document.getElementById('sheet-size');
const drawing = document.getElementById('drawing');

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
  sheetSize.textContent = `${fmt(template.sheet.width)} × ${fmt(template.sheet.length)} mm`;
  drawing.replaceChildren(renderTemplate(template));
}

form.addEventListener('input', update);
update();
