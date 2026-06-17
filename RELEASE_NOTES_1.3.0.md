Additive release — **backward compatible, no core or CSS changes**. `qry.js`,
`qry-ui.css`, `qry-devtools.js` and `qry-bridge.js` are unchanged; this release
deepens the four layout/UI factories introduced in 1.2.0. Existing call sites
keep working unchanged.

> One behaviour note: `makeTabs` re-selecting the **current** tab is now a no-op
> (no `onChange`) — pass `select(name, true)` to force it.

### `qry-kit.js`

**`makeSplitter`** — `initial` size (applied immediately, and the double-click
reset target), `onStart` / `onEnd` callbacks (commit-once work belongs in
`onEnd`), `max` may be a function of the live container size, and a richer
controller: `set(px)` / `current()` / `reset()`.

**`makeTabs`** — keyboard navigation per the ARIA tablist pattern: ←/→/Home/End
move between tabs with a roving `tabindex` and `role="tab"` (`keyboard: true` by
default). Re-selecting the current tab is now a no-op unless forced; exposes the
`tabs` array.

**`makeZoomPan`** — two-finger **pinch** zoom (toward the pinch midpoint),
double-click toggle zoom, plain-wheel option (`wheelModifier: false`) and tunable
`wheelStep`, a `noPan` selector so drags starting on interactive children are
left alone, **live content resolution** (keeps working after you swap the element
inside the stage), an `onPan` callback, and `zoomAt(factor, x, y)` / `reset()`
exposed on the controller.

**`makeRow`** — `label` / `value` may now each be a `Node` (appended) as well as
a string.

**`makeChips`** — custom `key` / `label` accessors, **multi-select** (`selected`
may be an array), `onClick(item, key)`, and `.select(sel)` to re-apply the
highlight without rebuilding.

**`sortableTable`** — `.update(rows)` and `.sortBy(key, dir)` refresh in place,
an `onRow` body-row click handler, an `empty` message for no-data, plus
`aria-sort` / `scope="col"` and escaped column labels.

### CDN

```
https://cdn.jsdelivr.net/gh/Bloechle/qry-js@1.3.0/qry-kit.js
```

**Full changelog:** https://github.com/Bloechle/qry-js/compare/1.2.0...1.3.0
