# POI Map Editor

An Angular + MapLibre GL JS application for creating, editing, and managing Points of Interest (POIs) on an interactive map, with GeoJSON import/export and localStorage persistence.

---

## Requirements

| Tool        | Version                              |
| ----------- | ------------------------------------ |
| Node.js     | ≥ 18                                 |
| npm         | ≥ 9                                  |
| Angular CLI | 21.x (`npm install -g @angular/cli`) |

---

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
ng serve

# Open in browser
# http://localhost:4200
```

## Build

```bash
ng build
```

## Run Tests

```bash
ng test
```

---

## Features

| #   | Feature         | Notes                                                                                         |
| --- | --------------- | --------------------------------------------------------------------------------------------- |
| 1   | Visualise map   | OpenStreetMap raster tiles via MapLibre GL JS — no API key needed                             |
| 2   | Import GeoJSON  | Click **Import**, pick a `.geojson` file; invalid features are filtered with a reason summary |
| 3   | Display POIs    | Circle layer colour-coded by category; name labels visible at zoom ≥ 12                       |
| 4   | Add POI         | Toggle **Add Point**, then click anywhere on the map                                          |
| 5   | Edit POI        | Click a circle on the map or an item in the sidebar list; edit name/category inline           |
| 6   | Delete POI      | **Delete** button in the edit form                                                            |
| 7   | Persist locally | **Save** button writes `poi_editor_state` to `localStorage`; auto-restored on next load       |
| 8   | Export GeoJSON  | **Export** downloads `pois-export.geojson`                                                    |
| 9   | Error tolerance | Invalid features are skipped; banner shows `"Imported N / Discarded M (k× reason, …)"`        |
| 10  | Search & filter | Name search + category dropdown in the sidebar                                                |

---

## Architecture

### Layered, feature-based structure

```
src/app/
├── core/                       # Domain models, validators, services
│   ├── models/
│   │   ├── poi.model.ts        # PoiFeature, PoiFeatureCollection, Coordinates
│   │   └── import-result.model.ts
│   ├── validators/
│   │   └── geojson-feature.validator.ts   # Pure functions, fully unit-tested
│   └── services/
│       ├── local-storage.service.ts       # Thin storage abstraction
│       ├── geojson-import.service.ts      # Parse + validate GeoJSON files
│       ├── geojson-export.service.ts      # Serialise + download
│       └── poi-store.service.ts           # Central signals-based state store
├── features/
│   ├── map/
│   │   ├── map-renderer.service.ts        # All MapLibre GL API calls
│   │   └── map.component.ts              # Hosts canvas; bridges store → renderer
│   └── poi-panel/
│       ├── poi-panel.component.ts         # Left sidebar (search, list, form)
│       ├── poi-list/                      # Scrollable POI rows
│       ├── poi-form/                      # Reactive inline edit/delete form
│       └── import-summary/               # Dismissible import-result banner
└── shared/
    └── toolbar/                           # Top action bar
```

### Key design decisions

#### 1. Angular Signals for state

`PoiStoreService` exposes only `signal.asReadonly()` to consumers. Mutations go through explicit methods (`addPoi`, `updatePoi`, `deletePoi`, …). `computed()` signals derive filtered lists and categories automatically, eliminating manual subscription management.

#### 2. MapLibre decoupled in `MapRendererService`

All `maplibregl.*` calls live in `MapRendererService`. `MapComponent` injects it and translates Angular events (signals changing, clicks) into renderer calls. This makes the renderer easily replaceable (e.g., swap Mapbox ↔ MapLibre) without touching UI logic.

#### 3. `NgZone.runOutsideAngular` for MapLibre events

MapLibre fires many events per second (mouse move, render). Running them inside Angular's zone would trigger change detection on every frame. Map callbacks are registered outside the zone and only `ngZone.run()` is called when actual state mutation is needed.

#### 4. Pure validator functions

`geojson-feature.validator.ts` exports pure functions with no dependencies on Angular. They return typed discriminated-union results (`ValidationSuccess | ValidationFailure`) — easy to test exhaustively without `TestBed`.

#### 5. BDD-style unit tests

Tests use `describe('given …') / it('should …')` phrasing. Coverage targets:

- All validation edge cases (coordinates, types, missing fields)
- Import service filtering logic
- Store state transitions (add, update, delete, filter, reset)

---

## Validation Rules

A feature is accepted only if **all** conditions hold:

| Rule                                      | Detail                                                   |
| ----------------------------------------- | -------------------------------------------------------- |
| `type === 'Feature'`                      | Top-level GeoJSON type                                   |
| `geometry` present and non-null           | Geometry object exists                                   |
| `geometry.type === 'Point'`               | Only Point geometry                                      |
| Coordinates valid                         | Array of ≥ 2 numbers; lon ∈ [-180, 180], lat ∈ [-90, 90] |
| `properties` is an object                 | Not null, not an array                                   |
| `properties.name` is non-empty string     | Trimmed length > 0                                       |
| `properties.category` is non-empty string | Trimmed length > 0                                       |

Extra properties are preserved.

---

## Trade-offs & Known Limitations

- **No undo/redo** — out of scope for MVP; could be added with a command pattern or `ngrx/store`.
- **localStorage only** — for a production app, a backend (REST/GraphQL) would replace or supplement this.
- **Label font** — MapLibre's default font stack (`Open Sans Regular`) is bundled in the demo style; if using a custom tile style, fonts must match its glyphs URL.
- **No multipart geometry** — Lines and polygons are intentionally out of scope (rejected at import). Scaling to those types would require additional layer types in `MapRendererService` and an extended form.
- **Snapping** — a grid-snap bonus feature is not implemented; it could be added by rounding `lon/lat` to a configurable decimal precision in `PoiStoreService.addPoi`.
- **No clustering** — MapLibre supports `cluster: true` in the GeoJSON source config; adding it is a two-line change but was omitted to keep the implementation straightforward.

---

## Time spent

Approximately **5 hours** of active development (including architecture planning, writing tests, and this README).

---

## OSM Attribution

Map tiles provided by [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors, rendered via `tile.openstreetmap.org`. Attribution is rendered by MapLibre GL's built-in attribution control.
