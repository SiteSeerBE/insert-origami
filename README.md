# Insert Origami

A small website that designs a paper or card **Insert** for a board game box. The Insert is made from one Sheet, with no glue, by cutting and folding only.

Enter the box's interior Length and Width, the Insert Height you want, and the paper thickness, all in millimetres. The site then gives you:

- **The exact Sheet size** to cut from larger paper or card.
- **A Template**: a dimensioned drawing of the Sheet showing every Cut, Valley Fold and Mountain Fold, with the Waste hatched.
- **Measurements** for every line in whole millimetres, either from the Sheet's top-left corner (Baseline) or from the previous line (Chained).
- **Step-by-step instructions**: hover over a step to see its lines on the drawing.
- **A one-page A4 reference** to print and take to your craft table.

## The Insert

The finished Insert has three equal Compartments along the box's Length:

- **Walls**: 5 mm thick, hollow Pleats around the edge.
- **Dividers**: 10 mm thick Pleats raised from the floor.
- **Side Walls**: fixed to the floor only beside the first Compartment, so the floor can pleat into Dividers while the Insert stays one piece.

The Insert's outer size matches what you enter exactly. Paper thickness is taken into account, so card folds to the right size too.

Inserts rarely fit on A4 or Letter. So the Template is a set of measurements to copy onto your own Sheet with a ruler, not a full-size printout.

## Using it

Open `index.html` through any static web server, for example:

```bash
python3 -m http.server 8123
```

Then go to http://localhost:8123. There is nothing to install or build.

## Development

The site is plain HTML, CSS and JavaScript modules, with no framework, build step or dependencies.

| Path | What it holds |
|---|---|
| `src/template.js` | All the geometry, as one pure function `generateTemplate(inputs)`. It turns the four inputs into the Sheet size, lines, Waste, measurements and folding steps. |
| `src/render.js` | Draws a Template as an SVG, with dimension labels. |
| `src/main.js` | Connects the form, the drawing, the tables and the steps. |
| `test/` | Tests that go through `generateTemplate` only. |

Run the tests with Node's built-in test runner:

```bash
npm test
```

### Documentation

- [`GLOSSARY.md`](GLOSSARY.md): the project's vocabulary (Insert, Compartment, Pleat, Wall, Divider, Sheet, Template, …). Use these terms in code and UI.
- [`docs/adr/`](docs/adr/): the decisions that shaped the design:
  - why Side Walls are attached only along the first Compartment;
  - why the Template is a dimensioned drawing;
  - why thicker paper needs a smaller Sheet.

### Deployment

The site is static and can be served from GitHub Pages: deploy from the `main` branch, root folder.

## Credits

- **Project manager:** Iwan Lemmens
- **Developer:** Claude (Claude Opus 5.5 by Anthropic, working in Claude Code)

## License

[MIT](LICENSE) © 2026 Iwan Lemmens
