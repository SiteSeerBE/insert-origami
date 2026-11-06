// Turns a Template description into an inline SVG. Not to scale in spirit:
// the viewBox simply uses mm so proportions stay readable.

const SVG_NS = 'http://www.w3.org/2000/svg';

export function el(name, attrs = {}, children = []) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  for (const child of children) node.append(child);
  return node;
}

export function renderTemplate(template) {
  const { width, length } = template.sheet;
  const pad = 10;
  const svg = el('svg', {
    viewBox: `${-pad} ${-pad} ${width + 2 * pad} ${length + 2 * pad}`,
    role: 'img',
    'aria-label': `Template for a ${fmt(width)} by ${fmt(length)} mm Sheet`,
  });
  svg.append(el('rect', { class: 'sheet-edge', x: 0, y: 0, width, height: length }));
  for (const line of template.lines) {
    svg.append(el('line', {
      class: `line line-${line.kind}`,
      'data-line': line.id,
      x1: line.x1, y1: line.y1, x2: line.x2, y2: line.y2,
    }));
  }
  return svg;
}

export const fmt = (mm) => String(Math.round(mm));
