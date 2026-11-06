// Pure geometry for the Insert Template. No DOM access: this is the test seam.
// Vocabulary follows GLOSSARY.md.

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
  return {
    ok: true,
    sheet: {
      width: width + 4 * h,
      length: length + 8 * h,
    },
  };
}
