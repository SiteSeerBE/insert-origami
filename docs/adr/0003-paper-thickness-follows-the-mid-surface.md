# Paper thickness follows the mid-surface, so thicker paper needs a smaller Sheet

The Insert's outer faces must match the entered Length × Width × Insert Height exactly. The original rule ("move each fold outward by one thickness per layer inside it, so the Sheet grows") had it backwards. Paper keeps its length along its mid-surface, so a 90° fold of thickness t needs less flat paper than the outside measurements add up to, the same as a sheet-metal bend. We therefore size each panel along the mid-surface:

- Wall outer face: h − t/2
- Wall top: 5 − t
- inner faces of Walls and Dividers: h − t
- Divider top: 10 − t
- each Compartment's floor: c + t
- the floor across the Width: W − 10 + t

With three Compartments the Sheet comes out 8t shorter and 4t narrower than for ideal paper; in general, (2 + 2n)t shorter for n Compartments.

## Consequences

- A thickness of 0 is accepted as ideal paper and gives the plain formula (Length + 2h(n + 1)) × (Width + 4h) for n Compartments: (Length + 8h) × (Width + 4h) for three.
- The Insert Height must exceed the paper thickness, or the inner faces would have no length.
- Do not "correct" this to make the Sheet grow with thickness; the outer size would then come out too big.
