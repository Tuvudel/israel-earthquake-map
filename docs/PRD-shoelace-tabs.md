# PRD: Single-Page Shoelace Tabs + Centralized API Key

Date: 2025-08-15T23:02:42+03:00
Owner: israel-earthquake-map

## 1) Overview
- Consolidate Events and Analytics into a single-page experience within `index.html` using Shoelace Web Components.
- Maintain one shared MapLibre map instance in `#map` and a shared filters pane in the sidebar below the tabs.
- Centralize MapTiler API key only in `js/config.js` and inject it at runtime into all style/asset URLs.

## 2) Goals
- Add a `sl-tab-group` in `#sidebar` with two tabs: Events and Analytics.
- Default active tab: Events.
- Analytics must be live and reflect the current filters (see Section 6).
- Avoid framework/build tooling changes; use CDN libraries only.

## 3) Non-Goals (v1)
- Replacing current filter UI with Shoelace components (planned later).
- Adding heavy charting libraries or an advanced analytics pipeline beyond the current live metrics.
- Introducing Tailwind/React or a Node-based build.

## 4) Constraints & Best Practices
- Use Shoelace via CDN (`sl-tab-group`, `sl-tab`, `sl-tab-panel`).
- Keep the map as a single instance to avoid performance penalties.
- Do not trigger `map.resize()` on tab switch; the map must remain unaffected when changing tabs. Ensure layout keeps the map container dimensions stable.
- Minimize CSS conflicts; scope overrides and keep them light.
- Respect accessibility: Shoelace tabs provide ARIA roles; keep semantic headings in panels.
- API key security: never hardcode in JSON/CSS; only `js/config.js` may contain the key.

## 5) UX Design
- Main area retains the `#map-container` (left) and `#sidebar` (right).
- Inside `#sidebar`, create a Shoelace tabs interface with the filters pane directly below the tab navigation and above tab content:
  - Filters pane (`#filters-panel`) is placed below the tab component and above the active tab’s content.
  - Tab 1: Events — contains the `#data-table-panel` (redesigned to match the example’s look and feel).
  - Tab 2: Analytics — contains the `#statistics-panel` and additional analytics UI adapted from `analytics_tab_example.html`.
- Tab changes must not affect map layout.

## 6) Data & Filter Semantics
- Both tabs (Events and Analytics) are live and must reflect the current filters (magnitude, country, area, date) at all times.
- Analytics updates in real time when any filter changes, consistent with how the map and events table update.

## 7) Components & Architecture
- Shoelace:
  - Components: `sl-tab-group`, `sl-tab`, `sl-tab-panel`.
  - Loaded via CDN, light DOM; default theme.
- Controllers (existing): `js/main.js`, `js/map.js`, `js/filters.js`, `js/statistics.js`, `js/table.js`.
- New (future): `js/analytics.js` (optional) to manage analytics interactions when made dynamic.

## 8) API Key Policy
- Sole source of truth: `window.MAPTILER_KEY` in `js/config.js` (not committed; provide `js/config.example.js`).
- `js/map.js` must inject the key into all MapTiler/OpenMapTiles URLs at runtime (tiles, glyphs, sprites if applicable).
- `css/positron.json` must not rely on a committed real key; if it contains placeholders or demo keys, runtime injection must override them.

## 9) Accessibility
- Tabs: rely on Shoelace ARIA-compliant widgets.
- Keyboard navigation: ensure focus order within panels; avoid keyboard traps.
- Color contrast remains acceptable; dark mode postponed to a later phase.

## 10) Performance
- Single map instance; avoid unnecessary reflows by keeping the map container stable and not resizing on tab switches.

## 11) Security
- Key restricted to GitHub Pages domain.
- No secrets in version control. `js/config.js` is ignored by git; ship `js/config.example.js`.

## 12) Acceptance Criteria
- Shoelace tabs render in `#sidebar` with Events and Analytics panels.
- Initial active tab is Events.
- Events tab shows the redesigned data table; sorting, pagination, and responsiveness continue to work.
- Analytics tab shows the statistics panel and new analytics UI from the example; all metrics update live with filter changes.
- Switching tabs must not change the map’s size or trigger a resize.
- API key only exists in `js/config.js`; style fetching uses injected key.

## 13) Risks & Mitigations
- CSS conflicts: keep overrides minimal and component-scoped.
- Map box sizing issues: do not resize on tab switch; keep map container dimensions stable. If the layout explicitly changes (e.g., sidebar show/hide), handle resize there only if required.
- Analytics correctness: analytics must reflect current filters; verify that map, events table, and analytics all update from the same filter events.

## 14) Milestones
- M1: Tabs scaffold added; Events moved under Events panel.
- M2: Analytics panel added (live), move `#statistics-panel` to Analytics and integrate analytics example UI; wire updates to filter changes.
- M3: API key audit completed; confirm runtime key injection and no hardcoded keys.

## 15) Open Questions
- Tab persistence: none (on refresh, default to Events).
- Future: Which analytics metrics should become dynamic first, and from which dataset slices?
