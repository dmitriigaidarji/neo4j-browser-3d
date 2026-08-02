# Neo4j Browser 3D

A browser UI for querying a Neo4j database and exploring the result as an
interactive 3D graph. Runs entirely client-side — it talks to your database
over Bolt straight from the browser, with no server in between.

![Preview](./graph-3d-preview.jpg?raw=true "Preview")

Rendering is handled by
[3d-force-graph](https://github.com/vasturiano/3d-force-graph) on top of
three.js, with Cypher editing by
[@neo4j-cypher/react-codemirror](https://github.com/neo4j/cypher-editor).

## Features

**Querying**

- Cypher editor with schema-aware autocompletion, run with `Ctrl`/`Cmd` + `Enter`
- Results as an interactive **3D graph**, a **table**, or raw **JSON**
- Per-query result frames, query history, and one-click queries from the
  schema panel
- Record counts, execution time, and write counters for every run

**Exploring the graph**

- Click any node or relationship to inspect its properties
- Expand a node's neighbours by relationship type and direction, with a
  filterable picker
- Search across every label and property value, with matches highlighted in
  the scene
- Legend doubles as a filter — hide a label or relationship type, or choose
  which property to use as a caption per label
- Drag a node to pin it in place; release all pins from the toolbar
- Nine layouts (force-directed plus eight DAG orientations), node sizing by
  uniform / degree / relationship value
- Export the view as a PNG, the graph as JSON, or the nodes as CSV

**Interface**

- Dark and light themes, following your system preference by default
- Automatic framing when a result lands, zoom-to-fit, and a full-screen mode
- Display settings persist across sessions

## Getting started

Requires Node.js 22.12 or newer.

```bash
npm install
npm run dev      # http://localhost:3000
```

Then connect to a database. For a local instance the defaults are
`neo4j://localhost:7687` with user `neo4j`. Aura and other TLS endpoints use
the `neo4j+s://` protocol.

Your URL, database and username are remembered in `localStorage`; the password
never is.

### Scripts

| Command             | Description                        |
| ------------------- | ---------------------------------- |
| `npm run dev`       | Start the dev server               |
| `npm run build`     | Typecheck and build to `dist/`     |
| `npm run preview`   | Serve the production build locally |
| `npm test`          | Run the test suite                 |
| `npm run typecheck` | Typecheck only                     |
| `npm run lint`      | Lint                               |
| `npm run format`    | Format with Prettier               |

## Customising appearance

`src/config/graph-config.json` optionally styles labels and relationships.
Every field is optional — anything not listed gets a sensible default, and
label colours are otherwise derived from a hash of the label so they stay
stable between queries.

```json
{
  "labels": {
    "Movie": { "color": "#f72585", "caption": "title", "icon": "🎬" }
  },
  "relationships": {
    "ACTED_IN": { "valueField": "supplied" }
  },
  "value": {
    "unitField": "buom",
    "unitFactors": { "GM": 0.001, "LB": 0.453592 }
  }
}
```

- `labels.<Label>.color` — overrides the derived colour
- `labels.<Label>.caption` — property to show next to the node; can also be
  chosen at runtime from the legend
- `labels.<Label>.icon` — an emoji, or a path/URL to an image
- `relationships.<TYPE>.valueField` — numeric property summed by the
  "By relationship value" node size mode
- `value.unitField` / `value.unitFactors` — optional unit normalisation for
  that mode

## Deployment

The production site is published to the `gh-pages` branch on every push to
`main`, and every pull request gets its own preview at
`/pr-preview/pr-<number>/` which is removed when the PR closes.

This needs **Settings → Pages → Source** set to _Deploy from a branch_,
branch `gh-pages`, folder `/ (root)`.

The build uses a relative base path, so it works unchanged from a domain root,
a project page, or a preview subdirectory.

### Custom domain

The site is served from `browser.gaidarji.com`, configured by `public/CNAME`.

Branch-based publishing takes the custom domain from a `CNAME` file at the
published root rather than from the repository setting alone, so that file has
to be part of every production build — which is why it lives in `public/` and
why the deploy workflow fails if it does not reach the root. Removing it would
send the site back to `<owner>.github.io/<repo>`.

When switching the Pages source over for the first time, **merge to `main`
first** so the deploy populates `gh-pages` with the site and its `CNAME`, then
change the setting. Flipping it while the branch root is still empty leaves
the domain with nothing to serve. Re-check **Enforce HTTPS** afterwards; it can
need a moment to re-issue the certificate.

## Tech stack

React 19 · TypeScript 5 · Vite 8 · three.js · neo4j-driver 6 · Bulma ·
Vitest
