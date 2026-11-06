# The Template is a dimensioned drawing, not a 1:1 printout

A Sheet is roughly (Length + 8 × Insert Height) × (Width + 4 × Insert Height), e.g. 610 × 450 mm for a typical 290 × 290 box. That rarely fits on A4 or Letter. So the Template is a drawing that is not to scale. It gives every line's position in whole millimetres, and the user copies those measurements with a ruler onto a Sheet they cut from larger stock. That is why there is no SVG/PDF download, why displayed measurements are rounded to 1mm (with Chained Measurements derived from rounded Baseline Measurements so rounding never adds up), and why the user can switch between Baseline and Chained Measurements.

## Considered Options

- **1:1 SVG/PDF printout**: only works for small inserts or with a large-format printer.
- **1:1 tiled across several A4 pages**: lining up and taping the tiles introduces more error than measuring with a ruler.
