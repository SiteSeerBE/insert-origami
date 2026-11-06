// Pure geometry for the Insert Template. No DOM access: this is the test seam.
// Vocabulary follows GLOSSARY.md.

export function generateTemplate({ length, width, insertHeight }) {
  const h = insertHeight;
  return {
    ok: true,
    sheet: {
      width: width + 4 * h,
      length: length + 8 * h,
    },
  };
}
