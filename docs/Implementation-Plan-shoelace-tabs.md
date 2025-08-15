# Implementation Plan: Shoelace Tabs + API Key Centralization

Date: 2025-08-15T23:02:42+03:00
Owner: israel-earthquake-map

## 0) Summary
Implement a single-page tabbed UI in `index.html` using Shoelace. Default to the Events tab. Ensure MapTiler API key is only in `js/config.js` and injected at runtime. Analytics are live and must reflect current filters; the entire site (map, analytics, events) updates when filters change. No tab persistence; on refresh, default to Events.

## 1) Dependencies
- Shoelace via CDN (no build step):
  - CSS: `https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.16.0/cdn/themes/light.css`
  - JS:  `https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.16.0/cdn/shoelace.js`
- Existing: MapLibre GL JS, noUiSlider.

## 2) Files to Modify / Add
- Modify: `index.html`
- Modify: `css/styles.css` (minimal overrides for tabs)
- Modify: `js/main.js` (ensure analytics subscribe to filter changes; do not resize map on tab switch)
- Verify: `js/map.js` (key injection already present)
- Verify/Sanitize: `css/positron.json` (no committed real key; runtime injection wins)
- Add (if missing): `js/config.example.js` documenting `window.MAPTILER_KEY`
- Already added: `docs/PRD-shoelace-tabs.md`, `docs/Implementation-Plan-shoelace-tabs.md`

## 3) Detailed Steps

### 3.1 Add Shoelace to `index.html`
- In `<head>`, after existing CSS links, add:
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.16.0/cdn/themes/light.css" />
<script type="module" src="https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.16.0/cdn/shoelace.js"></script>
```
- Rationale: Use CDN to avoid Node/build. Keep first paint small.

### 3.2 Wrap Sidebar in Shoelace Tabs and Reorganize Content
- In `index.html`, find `#sidebar` and replace its inner structure with a Shoelace tab group. Place the filters pane directly below the tab navigation and above the tab panels. Reorganize content so the data table is under Events and the statistics + analytics UI are under Analytics.
- New structure inside `#sidebar`:
```html
<sl-tab-group placement="top" activation="auto" id="app-tabs">
  <sl-tab slot="nav" panel="events" active>Events</sl-tab>
  <sl-tab slot="nav" panel="analytics">Analytics</sl-tab>

  <!-- Filters pane positioned below tabs and above content -->
  <div id="filters-panel">...</div>

  <sl-tab-panel name="events">
    <!-- Data table (redesigned to match example) -->
    <div id="data-table-panel">...</div>
  </sl-tab-panel>

  <sl-tab-panel name="analytics">
    <!-- Live statistics and analytics UI adapted from analytics_tab_example.html -->
    <div id="statistics-panel">...</div>
    <div class="analytics-content">...</div>
  </sl-tab-panel>
</sl-tab-group>
```
- Notes:
  - Initial tab: Events (`active` on its tab).
  - Keep existing IDs for `#filters-panel`, `#data-table-panel`, and `#statistics-panel` so controllers continue working with minimal changes.

### 3.3 Keep Map Unaffected on Tab Switch
- Do not register any `sl-tab-show` handler to resize the map. The map container layout must remain stable regardless of the active tab.
- Verify CSS ensures the sidebar/tab content height/width changes do not affect `#map-container` sizing.

### 3.4 Analytics Panel (Live v1)
- Adapt visual structure from `analytics_tab_example.html` into the Analytics tab.
- Make analytics live: subscribe to the same filter change events used by `map.js`/`table.js` and recompute metrics immediately on change.
- Reuse or extend `js/statistics.js` to power the metrics now located in the Analytics tab. Ensure selectors target the moved `#statistics-panel`.
- Add lightweight, panel-scoped CSS snippets in `css/styles.css` under a namespace like `.analytics-panel` (or `#sidebar sl-tab-panel[name="analytics"]`) to avoid collisions.

### 3.5 CSS Updates (`css/styles.css`)
- Add minimal styles to blend Shoelace tabs with existing look:
  - Tab spacing and typography to match current sidebar.
  - Ensure tab panel scroll behavior works within `#sidebar`.
- Scope analytics styles under `.analytics-panel` or `#sidebar sl-tab-panel[name="analytics"]`.
- Redesign the data table styling within Events to match the example’s look and feel without breaking existing functionality.

### 3.6 Relocate Filters Pane Below Tabs
- Move the existing `#filters-panel` from the header into the `#sidebar`, placing it directly below the tab navigation and above the tab panels as shown in 3.2.
- Preserve existing filter IDs and behavior; update CSS to accommodate the new layout.

### 3.7 API Key Centralization Audit
- Confirm `js/config.js` defines `window.MAPTILER_KEY`.
- Ensure `index.html` loads `js/config.js` before `js/map.js`.
- Verify `js/map.js` runtime injection points:
  - Tile source URL: replace `key` parameter with `window.MAPTILER_KEY`.
  - Glyphs/sprites if style references them.
- Ensure `css/positron.json` does not rely on a real committed key; if a demo key remains, injection must override.
- If `js/config.example.js` is missing, add it:
```js
// Copy to js/config.js and set your restricted MapTiler key
// Example: window.MAPTILER_KEY = 'YOUR_MAPTILER_KEY_HERE';
window.MAPTILER_KEY = '';
```
- Ensure `.gitignore` contains `js/config.js` (verify present).

### 3.8 QA / Regression Checklist
- Filters:
  - Magnitude, Country, Area, Date — still update stats, table, and map.
- Events Tab:
  - Sorting, pagination, row click interactions remain functional.
- Analytics Tab:
  - Statistics and analytics UI update live on filter changes; no console errors.
- Map:
  - Unchanged on tab switches (no resize triggered); still responds correctly to filter changes.
- Key:
  - No key appears in `css/positron.json` (real key). Requests use `window.MAPTILER_KEY`.
- Mobile:
  - Sidebar toggling works; tab state retained while open.

### 3.9 Rollback Plan
- Tabs can be disabled by removing Shoelace CDN and restoring original `#sidebar` inner HTML.
- No data migrations or index changes required.

## 4) Timeline & Milestones
- M1 (0.5 day): Shoelace CDN + tab scaffold in `index.html`; relocate filters below tabs; move data table to Events and keep it functional.
- M2 (0.5 day): Add Analytics panel with live statistics and analytics UI; wire to filter changes; minimal CSS.
- M3 (0.5 day): API key audit + cleanup; final acceptance review.

## 5) Best Practices Applied
- Progressive enhancement: vanilla stack + Web Components via CDN.
- Accessibility: leverage Shoelace ARIA-compliant tabs; maintain semantic headings.
- Performance: single map instance; avoid unnecessary resizes on tab switches; minimal CSS.
- Security: keys only in `js/config.js`; restricted MapTiler key; no secrets in committed styles.
- Maintainability: preserve existing IDs to avoid JS churn; namespace new styles; document future wiring points.

## 6) Future Work (Out of Scope for v1)
- Replace custom selects with `sl-select` and `sl-option` (Phase 2).
- Introduce design tokens and dark mode using a Radix-like palette.
- Dynamic analytics with charts; compute over the current filter selection, constrained by the active time range.
- Optional Tailwind with CI build if utility classes desired.
