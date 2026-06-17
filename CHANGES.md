# Changelog

Notable changes to the qry stack. The stack is served from jsDelivr at
`gh/Bloechle/qry-js@<version>`; tags are immutable. Per-file `@version` headers
track when each file last changed, so they may trail the release version.

## 1.3.0 — 2026-06-17

Additive, **backward compatible** — no core or CSS changes. Deepens the four
layout/UI factories introduced in 1.2.0.

> Behaviour note: `makeTabs` re-selecting the **current** tab is now a no-op
> (no `onChange`); pass `select(name, true)` to force it.

### qry-kit.js
- **makeSplitter** — `initial` size (applied immediately, double-click reset target), `onStart` / `onEnd` callbacks, function-form `max` (gets the live container size), and a richer controller: `set(px)` / `current()` / `reset()`.
- **makeTabs** — keyboard navigation per the ARIA tablist pattern (←/→/Home/End, roving `tabindex`, `role="tab"`; `keyboard: true` by default); re-select is a no-op unless forced; exposes the `tabs` array.
- **makeZoomPan** — two-finger pinch zoom, double-click toggle, plain-wheel option (`wheelModifier: false`) with tunable `wheelStep`, a `noPan` selector (don't hijack drags off interactive children), live content resolution (survives swapping the element inside the stage), an `onPan` callback, and `zoomAt(factor, x, y)` / `reset()` on the controller.
- **makeRow** — `label` / `value` may each be a `Node` (appended) as well as a string.
- **makeChips** — custom `key` / `label` accessors, multi-select (`selected` may be an array), `onClick(item, key)`, and `.select(sel)` to re-apply the highlight without rebuilding.
- **sortableTable** — `.update(rows)` and `.sortBy(key, dir)` refresh in place, an `onRow` body-row click handler, an `empty` message, plus `aria-sort` / `scope="col"` and escaped column labels.

## 1.2.0 — 2026-06-17

Additive — no core changes. Introduces a layout/UI layer on top of the DOM core.

### qry-kit.js
- Added layout/viewport controllers (each with `.destroy()`): **makeSplitter**, **makeTabs**, **makeZoomPan**.
- Added DOM builders returning a ready element: **makeRow**, **makeChips**, **sortableTable** (data cells HTML-escaped; `fmt` output stays author-trusted).

### qry-ui.css
- Added the **`.qry-workspace`** full-screen grid app shell (header · resizable aside · main · footer) — an alternative to the `.qry-dashboard` sidebar layout.
- Added **`.qry-split`**, **`.qry-tabs` / `.qry-tab` / `.qry-panel`**, **`.qry-stage`** and **`.qry-table`**, paired with the kit factories above. Light/dark inherited from the existing token set.

---

Earlier releases (1.1.0, 1.0.0) predate this changelog.
