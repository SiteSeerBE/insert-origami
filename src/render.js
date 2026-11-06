// Turns a Template description into an inline SVG. The drawing is not to scale
// for tracing: the user copies the measurements, not the picture.

const SVG_NS = 'http://www.w3.org/2000/svg';

function el(name, attrs = {}, children = []) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  for (const child of children) node.append(typeof child === 'string' ? document.createTextNode(child) : child);
  return node;
}

export const fmt = (mm) => String(Math.round(mm));

// Emphasises the given lines and fades the rest; pass an empty list to reset.
export function highlightLines(svg, lineIds) {
  const ids = new Set(lineIds.map(String));
  svg.classList.toggle('highlighting', ids.size > 0);
  for (const line of svg.querySelectorAll('[data-line]')) {
    line.classList.toggle('highlight', ids.has(line.dataset.line));
  }
}

export function renderTemplate(template, { style = 'baseline' } = {}) {
  const { width, length } = template.sheet;
  const f = Math.max(width, length) / 48; // label size in drawing units (mm)
  const padTop = 5 * f;
  const padLeft = 5.5 * f;
  const pad = f;
  const svg = el('svg', {
    viewBox: `${-padLeft} ${-padTop} ${width + padLeft + pad} ${length + padTop + pad}`,
    role: 'img',
    'aria-label': `Template for a ${fmt(width)} by ${fmt(length)} mm Sheet`,
    style: `--label-size: ${f}px`,
  });

  svg.append(el('defs', {}, [
    el('pattern', { id: 'waste-hatch', width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, [
      el('line', { class: 'waste-hatch', x1: 0, y1: 0, x2: 0, y2: 6 }),
    ]),
    el('marker', { id: 'dim-arrow', viewBox: '0 0 10 10', refX: 10, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse', markerUnits: 'strokeWidth' }, [
      el('path', { class: 'dim-arrow', d: 'M0,0 L10,5 L0,10 z' }),
    ]),
  ]));
  for (const w of template.waste) {
    svg.append(el('rect', { class: 'waste', x: w.x, y: w.y, width: w.width, height: w.height }));
  }
  svg.append(el('rect', { class: 'sheet-edge', x: 0, y: 0, width, height: length }));
  for (const line of template.lines) {
    svg.append(el('line', {
      class: `line line-${line.kind}`,
      'data-line': line.id,
      x1: line.x1, y1: line.y1, x2: line.x2, y2: line.y2,
    }));
  }

  svg.append(dimensions(template.measurements, { f, width, length, style }));
  return svg;
}

function dimensions(measurements, { f, width, length, style }) {
  const g = el('g', { class: `dimensions dimensions-${style}`, 'font-size': f });
  const gap = f * 1.15;

  if (style === 'chained') {
    chain(g, measurements.x, 'x', f, gap, width);
    chain(g, measurements.y, 'y', f, gap, length);
    return g;
  }

  const xs = spread(measurements.x.map((m) => m.position), gap, -f, width + f);
  measurements.x.forEach((m, i) => {
    g.append(el('line', { class: 'dim-line', x1: m.position, y1: 0, x2: m.position, y2: -0.8 * f }));
    g.append(el('line', { class: 'dim-line', x1: m.position, y1: -0.8 * f, x2: xs[i], y2: -1.8 * f }));
    g.append(el('text', {
      class: 'dim-label', x: xs[i], y: -2 * f, transform: `rotate(-90 ${xs[i]} ${-2 * f})`,
      'dominant-baseline': 'central',
    }, [String(m.display)]));
  });
  const ys = spread(measurements.y.map((m) => m.position), gap, -f, length + f);
  measurements.y.forEach((m, i) => {
    g.append(el('line', { class: 'dim-line', x1: 0, y1: m.position, x2: -0.8 * f, y2: m.position }));
    g.append(el('line', { class: 'dim-line', x1: -0.8 * f, y1: m.position, x2: -1.8 * f, y2: ys[i] }));
    g.append(el('text', {
      class: 'dim-label', x: -2 * f, y: ys[i], 'text-anchor': 'end', 'dominant-baseline': 'central',
    }, [String(m.display)]));
  });
  return g;
}

// Chained Measurements: a dimension line with arrows between neighbouring
// positions, labelled with the distance.
function chain(g, measurements, axis, f, gap, extent) {
  const mids = [];
  for (let i = 1; i < measurements.length; i++) {
    mids.push((measurements[i - 1].position + measurements[i].position) / 2);
  }
  const labelAt = spread(mids, gap, -f, extent + f);
  for (let i = 1; i < measurements.length; i++) {
    const a = measurements[i - 1].position;
    const b = measurements[i].position;
    const label = String(measurements[i].chained);
    const at = labelAt[i - 1];
    if (axis === 'x') {
      g.append(el('line', { class: 'dim-line', x1: b, y1: 0, x2: b, y2: -1.2 * f }));
      if (i === 1) g.append(el('line', { class: 'dim-line', x1: a, y1: 0, x2: a, y2: -1.2 * f }));
      g.append(el('line', { class: 'dim-line dim-chain', x1: a, y1: -0.8 * f, x2: b, y2: -0.8 * f, 'marker-start': 'url(#dim-arrow)', 'marker-end': 'url(#dim-arrow)' }));
      g.append(el('line', { class: 'dim-line', x1: (a + b) / 2, y1: -0.8 * f, x2: at, y2: -1.8 * f }));
      g.append(el('text', { class: 'dim-label', x: at, y: -2 * f, transform: `rotate(-90 ${at} ${-2 * f})`, 'dominant-baseline': 'central' }, [label]));
    } else {
      g.append(el('line', { class: 'dim-line', x1: 0, y1: b, x2: -1.2 * f, y2: b }));
      if (i === 1) g.append(el('line', { class: 'dim-line', x1: 0, y1: a, x2: -1.2 * f, y2: a }));
      g.append(el('line', { class: 'dim-line dim-chain', x1: -0.8 * f, y1: a, x2: -0.8 * f, y2: b, 'marker-start': 'url(#dim-arrow)', 'marker-end': 'url(#dim-arrow)' }));
      g.append(el('line', { class: 'dim-line', x1: -0.8 * f, y1: (a + b) / 2, x2: -1.8 * f, y2: at }));
      g.append(el('text', { class: 'dim-label', x: -2 * f, y: at, 'text-anchor': 'end', 'dominant-baseline': 'central' }, [label]));
    }
  }
}

// Pushes label positions apart so neighbours are at least `gap` apart, while
// keeping them as close to their lines as possible and within [min, max].
function spread(positions, gap, min, max) {
  const out = positions.map((p) => Math.max(p, min));
  for (let i = 1; i < out.length; i++) out[i] = Math.max(out[i], out[i - 1] + gap);
  for (let i = out.length - 1; i >= 0; i--) {
    const limit = i === out.length - 1 ? max : out[i + 1] - gap;
    out[i] = Math.min(out[i], limit);
  }
  return out;
}
