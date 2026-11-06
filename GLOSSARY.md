# Insert Origami

Generates printable templates that turn a single sheet of paper, by cutting and folding only, into an insert for a board game box.

## Language

**Insert**:
The finished paper tray that sits inside a board game box, made from one connected sheet.
_Avoid_: Tray, organizer

**Length**:
The box interior dimension, as entered by the user, along which the three Compartments lie. Not necessarily the longer side.
_Avoid_: Depth, long side

**Width**:
The box interior dimension across the Compartments, perpendicular to the Length.
_Avoid_: Short side, breadth

**Insert Height**:
How tall the finished Insert stands. The user chooses it, leaving room above for the board and rulebook. It is not the box's height.
_Avoid_: Box height, depth

**Compartment**:
One of the three open cells of the Insert, lying one after another along the box's length.
_Avoid_: Slot, section, bin

**Pleat**:
A raised, hollow ridge folded into the sheet: up, a flat top of fixed width, and back down.
_Avoid_: Fold, crease

**Wall**:
A 5mm-wide Pleat forming one of the four edges of the Insert.
_Avoid_: Border, rim, edge

**End Wall**:
A Wall running across the width at either end of the Insert's length; it is attached to the floor along its full width.
_Avoid_: Top wall, bottom wall, short wall

**Side Wall**:
A Wall running along the length; it is attached to the floor only beside the first Compartment and stands free beside the others.
_Avoid_: Long wall, left/right wall

**Divider**:
A 10mm-wide Pleat in the floor that separates two Compartments.
_Avoid_: Separator, partition

**Sheet**:
The rectangle of paper, cut to the exact size the app specifies from larger stock, that becomes the Insert.
_Avoid_: Paper, blank, stock

**Waste**:
The parts of the Sheet that Cuts remove and that never become part of the Insert: the corners and the paper beside the free Side Walls.
_Avoid_: Scrap, offcut

**Cut**:
A line on the Template along which the Sheet is cut through. Drawn solid.
_Avoid_: Slit, incision

**Valley Fold**:
A fold whose crease sinks away from the viewer, forming a V. Drawn dashed.
_Avoid_: Inward fold

**Mountain Fold**:
A fold whose crease rises toward the viewer, forming a ridge. Drawn dash-dot.
_Avoid_: Outward fold

**Template**:
A dimensioned drawing (not to scale) of the Sheet with every Cut and fold marked, from which the user transfers measurements onto the Sheet with a ruler.
_Avoid_: Pattern, net, layout

**Baseline Measurement**:
A position on the Template given as its distance from the Sheet's top-left corner.
_Avoid_: Absolute measurement

**Chained Measurement**:
A position on the Template given as its distance from the previous line.
_Avoid_: Relative measurement, incremental measurement
