<div align="center">
  <img src="svg/qry-logo.svg" alt="qry.js" width="180">

  <h1>qry.js</h1>

  <p><strong>Ultra-light, prototype-based DOM library.</strong><br>
  <code>$()</code> returns native elements — no wrapper, fully chainable, zero dependencies.</p>

  <p><a href="https://bloechle.github.io/qry/"><strong>Live demo →</strong></a></p>
</div>

---

## What makes it different

Most DOM libraries hand you a wrapper object you have to unwrap (`.get(0)`, `.node`, `.el`). qry.js doesn't. `$()` returns the **native element**, with a handful of convenience methods attached to the prototype. So you keep everything the platform gives you and add nothing to learn around it:

```javascript
const el = $('#chart');     // a real HTMLElement
el.cls('+active');          // qry.js method, chainable
el.scrollIntoView();        // native method, still there
el instanceof Element;      // true
```

What you log is an element, not a mystery box. You can mix qry.js and raw DOM freely, because there is no boundary between them.

- **No wrapper** — `$()` is a real element; collections (`$.all`, `.find`) are real arrays, so `.map`/`.forEach`/`.filter` just work.
- **One namespace** — utilities live under `$.*` (`$.create`, `$.load`, `$.scale`, `$.tip`); nothing else is global.
- **Chainable** — every setter returns the element.
- **Null-safe** — a selector that matches nothing warns and returns a detached node instead of crashing your chain.
- **Single file** — ~600 lines, no build step, no runtime dependencies.

## Install

qry.js installs itself as the global `$` — load it with a plain script tag, no bundler required:

```html
<script src="qry.js"></script>
```

Via CDN (jsDelivr, from GitHub):

```html
<!-- pinned to a release (recommended) -->
<script src="https://cdn.jsdelivr.net/gh/Bloechle/qry@1.1.0/qry.js"></script>

<!-- or always the latest -->
<script src="https://cdn.jsdelivr.net/gh/Bloechle/qry@latest/qry.js"></script>
```

> qry.js is a classic script that defines `window.$`, **not** an ES module — there is no `import`. This is deliberate: drop the file in and start writing `$(...)`.

## A taste

```javascript
// vanilla
document.getElementById('btn').addEventListener('click', function () {
    this.textContent = 'Clicked';
    this.classList.add('active');
    this.style.background = 'green';
});

// qry.js
const btn = $('#btn');
btn.on('click', () => btn.text('Clicked').cls('+active').css('background', 'green'));
```

## API

### Selection & creation
```javascript
$('#id')                                   // by id (fast path)
$('main .title')                           // any CSS selector
$(existingElement)                         // pass-through
$.all('.btn')                              // → real Array of elements
$.opt('#maybe')                            // → Element | undefined (no warning)
$.create('div', { class: 'card', text: 'Hi', onclick: fn })
$.ready(() => { /* DOM is parsed */ })
```

### Events
```javascript
el.on('click', e => {})                    // add (chainable), accepts options
el.off('click', fn)                        // remove
list.delegate('li', 'click', function (e) {// delegated; `this` = matched <li>
    this.cls('~active');
})
el.trigger('update', { value: 42 })        // dispatch a bubbling CustomEvent
btn.click()                                // native actions: just call them
```

### Classes — prefix operators
```javascript
el.cls('active')                           // add (default)
el.cls('-active')                          // remove
el.cls('~open')                            // toggle
el.cls('?visible')                         // → boolean
el.cls('+a -b ~c')                         // multiple in one call
```

### Content & attributes
```javascript
el.text()             el.text('Hi')        // textContent get / set
el.html()             el.html('<b>Hi</b>') // innerHTML get / set
el.empty()                                 // remove all children
el.remove()                                // detach (chainable)

el.attr('href')       el.attr('href', '/') // get / set
el.attr('title', null)                     // remove
el.attr({ x: 10, y: 20 })                  // set multiple
el.data('id')         el.data('id', '42')  // data-* get / set
```

### Styles & visibility
```javascript
el.css('color')                            // computed value
el.css('color', 'red')
el.css({ color: 'red', fontSize: '2em' })
el.width()   el.width(320)                 // measure px (border-box) / set CSS width
el.height()  el.height(200)                //   (on img/canvas/video/iframe the native
                                           //    accessors win — use css('width') there)
el.show()   el.hide()
```

### Insertion
```javascript
el.add(child)          el.add('<li>Item</li>')   // append (element or HTML)
el.addFirst(child)                                // prepend
el.addBefore(node)     el.addAfter(node)          // insert as sibling
card.mount('#container')                          // append self into target
header.mountFirst('body')                         // prepend self into target
```

### Traversal
```javascript
el.parent()            el.parent('.card')  // parent, or nearest matching ancestor
el.next()    el.prev()                     // sibling elements
el.find('.item')                           // → Array (querySelectorAll)
el.childs()  el.childs('.done')            // → Array of direct children
el.sibs()    el.sibs('.active')            // → Array of siblings (excl. self)
el.idx()                                   // index among siblings
```

### Manipulation & forms
```javascript
el.is('.active')                           // matches selector → boolean
el.clone()                                 // deep clone
el.swap('<div>new</div>')                  // replace, returns the replacement
el.wrap('<div class="box">')               // wrap inside structure
el.offset()                                // { top, left } in document

input.val()  input.val('John')             // value get / set
input.enable()  input.disable()
form.serialize()                           // → URLSearchParams
```

### Utilities
```javascript
$.scale(82, 0, 100, 0, 500)                // linear map → 410
$.scale(82, 0, 100, 300, 0)                // inverted for SVG y-axis → 54

$.log(...)  $.warn(...)  $.error(...)  $.debug(...)

const data = await $.load.json('./data.json')
const rows = await $.load.csv('./data.csv')              // → [{col: 'val', ...}]
const rows = await $.load.csv('./data.tsv', { sep: '\t' })

const rows = $.parseCSV(text)                            // same parser, on text you already have
```

`$.load` checks the HTTP status, so a 404 throws a readable error rather than an opaque parse failure. The CSV parser handles quoted fields, `""` escapes, separators and newlines inside quotes, BOM, and CRLF.

### Tooltip
A single shared tooltip that follows the cursor — bind all three listeners in one call:

```javascript
$.tip(circle, 'France', '67.4M inhabitants');
$.tip(slice, d.name, d.value, () => slice.css('opacity', '0.7'));  // optional hooks

// low-level, for full control (e.g. suppress while dragging)
$.tip.show(e, title, content);  $.tip.move(e);  $.tip.hide();
```

The tooltip ships **mechanics only** (position, fade, never eats the mouse) and **no appearance** — so it inherits your project's design instead of fighting it. Style it in your own CSS via `#qry-tooltip`, `#qry-tooltip-title`, `#qry-tooltip-content`. A sensible starting skin:

```css
#qry-tooltip {
    padding: 8px 12px;
    background: #fff;
    border-radius: 8px;
    box-shadow: 2px 2px 10px rgba(0, 0, 0, 0.25);
}
#qry-tooltip-title   { font-size: 13px; font-weight: bold; color: #111; }
#qry-tooltip-content { font-size: 12px; color: #444; margin-top: 4px; }
```

## The qry stack

`qry.js` stands on its own. But the same repo also ships a small, optional
**application stack** built on top of it — the pieces I reach for when turning
`qry.js` into a real app. They're independent: take only what you need.

| File | Role | CDN |
|---|---|---|
| `qry.js` | DOM core — the global `$` | `gh/Bloechle/qry@1.1.0/qry.js` |
| `qry-ui.css` | App shell + design tokens (light/dark, built on Shoelace) | `gh/Bloechle/qry@1.1.0/qry-ui.css` |
| `qry-kit.js` | Glue: theme, toast, files, keyboard, iframe embed, boot… | `gh/Bloechle/qry@1.1.0/qry-kit.js` |
| `qry-devtools.js` | Optional in-page console + element inspector | `gh/Bloechle/qry@1.1.0/qry-devtools.js` |
| `qry-bridge.js` | Optional cross-page shared store over a hidden iframe | `gh/Bloechle/qry@1.1.0/qry-bridge.js` |

Pair it with [Shoelace](https://shoelace.style) for widgets and
[Lucide](https://lucide.dev) for icons. No build step — everything is served
from GitHub via jsDelivr, pinned to a release.

### Quick start (full stack)

```html
<!-- Shoelace (both themes, for dark mode) -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.20.1/cdn/themes/light.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.20.1/cdn/themes/dark.css">
<script type="module" src="https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.20.1/cdn/shoelace-autoloader.js"></script>

<!-- qry-ui.css (shell) + Lucide (icons) + qry.js core -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/Bloechle/qry@1.1.0/qry-ui.css">
<script src="https://cdn.jsdelivr.net/npm/lucide@1.17.0/dist/umd/lucide.min.js"></script>
<script src="https://cdn.jsdelivr.net/gh/Bloechle/qry@1.1.0/qry.js"></script>

<script type="module">
    import { boot, theme, toast } from 'https://cdn.jsdelivr.net/gh/Bloechle/qry@1.1.0/qry-kit.js';
    boot({ title: 'My app', ready: () => toast('Ready', 'success') });
</script>
```

**Examples** ([source](./examples)):

- **[Live demo →](https://bloechle.github.io/qry/examples/qry-demo.html)** — a running showcase of every helper.
- **[Template →](https://bloechle.github.io/qry/examples/qry-template.html)** — a copy-and-go starter for a new app.

### qry-kit.js

A flat set of named ES exports — import only what a page needs. Pure helpers and
one-shot actions are bare functions (`clamp`, `toast`, `copy`); cohesive
families are namespaces (`format.*`, `str.*`, `theme.*`); anything stateful is a
`make*` factory returning a controller with `.destroy()` (`makeSidebar`,
`makeDropZone`, `makeIframeAutoHeight`…). One switch — `theme.toggle()` — drives
both the qry-ui.css tokens and every Shoelace widget. See the header of
[`qry-kit.js`](./qry-kit.js) for the full contents.

### qry-ui.css

The app shell and design system: header/sidebar/content layout, cards, metrics,
buttons, drop overlays, and a full set of semantic tokens defined once for light
and once for dark — so dark mode falls out with no rule duplication. Class
namespace is `.qry-*`.

### qry-devtools.js (optional)

In-page dev tools for when the browser DevTools aren't reachable (tablets,
kiosks, embedded webviews, demos): a console that captures `console.*` into a
resizable panel, an element inspector, and a CSS on/off toggle. `import
{ makeDevtools }` then `makeDevtools()` — F2 toggles the console.

### qry-bridge.js (optional)

A small key/value store shared across same-site pages through a hidden iframe,
persisted in the iframe origin's localStorage — so it survives navigation, and
open pages stay in sync via storage events. Origin-pinned on both sides (no `'*'`): `makeBridgeHost`
runs inside the iframe, `makeBridge` in each page (`get`/`set`/`del`/`keys` +
`on(path)` change subscriptions).

## Design notes

qry.js **extends native prototypes** (`Element`, `EventTarget`) on purpose. That is what keeps `$()` transparent: there is no wrapper to step around. The well-known caution against extending built-ins comes from libraries shipped to coexist with arbitrary third-party code on the open web (the MooTools `Array.prototype.flatten` / `flat` collision is the canonical case). qry.js is built for environments you control — your own pages and projects — where that failure mode does not apply and a collision, should the platform ever add a same-named method, is a one-line rename away.

The library is almost entirely **additive**. Two native members are deliberately overridden: `Element.prototype.remove()`, returned chainable (`this`) instead of `undefined` with otherwise identical behaviour, and `HTMLSelectElement.prototype.add()`, replaced by the qry `add(el|html)` so the API stays uniform (the rarely-used native two-argument `add(option, before)` form is dropped). A few vestigial legacy accessors that would otherwise *shadow* qry methods are also re-pointed at them: `.text` on `<a>`/`<option>`/`<script>` and `.data` on `<object>` — so `$('a').text('Hi')` works everywhere. One boundary remains by design: on `<img>`, `<canvas>`, `<video>`, `<iframe>`, `<embed>`, `<object>` and `<td>`, the native `width`/`height` accessors are kept (`canvas.width = 500` must keep resizing the bitmap), so use `el.css('width')` or `getBoundingClientRect()` there instead of qry's `.width()`/`.height()`.

A selector that matches nothing returns a fresh detached `<qry-nil>` element and logs a warning naming the selector — your chain keeps running instead of throwing, and two failed lookups never share state.

## Browser support

Modern evergreen browsers: Chrome, Firefox, Safari, Edge. Uses ES2020+ features (optional chaining, nullish coalescing) and standard DOM APIs.

## License

MIT © Jean-Luc Bloechle