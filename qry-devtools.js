/**
 * qry-devtools.js — optional in-page dev tools for the qry stack
 *
 * Three tools, handy when the browser DevTools aren't reachable (tablets, kiosks,
 * embedded webviews, live demos):
 *   • Console   — captures console.{log,info,warn,error,debug} into a resizable panel
 *   • Inspector — outlines every element with a type-coloured box + tag label
 *   • Styles    — strips the page's own CSS to reveal the raw structure
 *
 * Not loaded by default and NOT part of qry-kit. Pull it in only where you want
 * it. Styling rides on qry-ui.css tokens, so it follows light/dark automatically.
 * Everything injected is prefixed `qry-dev`.
 *
 *   import { makeDevtools } from './qry-devtools.js';
 *   const dev = makeDevtools();          // F2 toggles the console
 *   dev.inspector.toggle();              // outline all elements
 *   dev.destroy();                       // restore console.*, remove all UI
 *
 * Requires qry.js loaded first (global `$`).
 *
 * @version 1.3.0
 * @author  Jean-Luc Bloechle with Claude.ai
 * @license MIT
 */

const LEVELS = {
    log:   { symbol: '●', token: 'var(--qry-text-muted)' },
    debug: { symbol: '●', token: 'var(--qry-text-subtle)' },
    info:  { symbol: '●', token: 'rgb(var(--qry-green-rgb))' },
    warn:  { symbol: '●', token: 'rgb(var(--qry-orange-rgb))' },
    error: { symbol: '●', token: 'rgb(var(--qry-red-rgb))' },
};

const _stamp = () => new Date().toLocaleTimeString();
const _fmt = a => {
    if (a instanceof Error) return a.stack || a.message;
    if (typeof a === 'object' && a !== null) { try { return JSON.stringify(a, null, 2); } catch { return String(a); } }
    return String(a);
};

// Self-contained styles (injected once), built on qry-ui.css tokens so the
// panel follows light/dark. Falls back gracefully if qry-ui.css isn't loaded.
const _CSS = `
.qry-dev-console{position:fixed;left:0;right:0;bottom:0;z-index:10000;display:flex;flex-direction:column;
  background:var(--qry-surface,#1e1e1e);border-top:1px solid var(--qry-line,#3e3e42);
  transform:translateY(100%);transition:transform .25s var(--qry-ease,ease);font-family:var(--qry-font-mono,monospace);}
.qry-dev-console.is-open{transform:translateY(0);}
.qry-dev-console-bar{display:flex;align-items:center;gap:.5rem;padding:.4rem .6rem;cursor:ns-resize;
  background:var(--qry-glass,#252526);border-bottom:1px solid var(--qry-line,#3e3e42);user-select:none;}
.qry-dev-console-title{color:var(--qry-text,#ddd);font-size:.85rem;}
.qry-dev-spacer{flex:1;}
.qry-dev-console-out{margin:0;padding:.6rem .75rem;flex:1;overflow-y:auto;color:var(--qry-text,#d4d4d4);
  font-size:.8rem;line-height:1.45;white-space:pre-wrap;word-break:break-word;}
.qry-dev-time{color:var(--qry-text-subtle,#888);}
.qry-dev-btn{border:1px solid var(--qry-line,#3e3e42);background:transparent;color:var(--qry-text-muted,#d4d4d4);
  border-radius:var(--qry-radius-sm,4px);padding:.15rem .6rem;font-size:.8rem;cursor:pointer;transition:opacity .2s;}
.qry-dev-btn:hover{opacity:.8;}
.qry-dev-btn.is-active{background:var(--qry-tint,rgba(0,83,149,.15));color:var(--qry-text,#fff);}
.qry-dev-box{position:absolute;border:1px dashed;pointer-events:none;z-index:9999;box-sizing:border-box;}
.qry-dev-box-label{position:absolute;top:-14px;left:-1px;color:#fff;padding:0 3px;border-radius:2px;
  font:11px/13px var(--qry-font-mono,monospace);opacity:0;}
`;
let _styled = false;
const _injectStyles = () => {
    if (_styled) return;
    _styled = true;
    $.create('style', { id: 'qry-dev-styles', text: _CSS }).mount(document.head);
};

// ─── Console — capture console.* into a resizable bottom panel ───────────────

/** In-page console. Patches `console.{log,info,warn,error,debug}` to mirror
 *  output into a panel, while still calling the originals (so `$.debug` is
 *  captured too). `destroy()` restores them.
 *  @param {Object} [opts]
 *  @param {number} [opts.max=1000]   ring-buffer size (messages)
 *  @param {string} [opts.height='30vh']  initial panel height
 *  @returns {{ toggle, show, hide, clear, log, destroy, el }}
 */
export const makeConsole = ({ max = 1000, height = '30vh' } = {}) => {
    _injectStyles();
    const originals = {};
    const lines = [];               // pre-rendered html strings
    let visible = false;

    const panel = $.create('div', { class: 'qry-dev-console' });
    const header = $.create('div', { class: 'qry-dev-console-bar' });
    const title = $.create('span', { class: 'qry-dev-console-title', html: '&#9636; Console' });
    const spacer = $.create('span', { class: 'qry-dev-spacer' });
    const btnClear = $.create('button', { class: 'qry-dev-btn', text: 'Clear', type: 'button' });
    const btnClose = $.create('button', { class: 'qry-dev-btn', text: '✕', type: 'button' });
    const output = $.create('pre', { class: 'qry-dev-console-out' });

    header.add(title); header.add(spacer); header.add(btnClear); header.add(btnClose);
    panel.add(header); panel.add(output);
    panel.css('height', height);

    const render = () => { if (visible) { output.html(lines.join('')); output.scrollTop = output.scrollHeight; } };
    const esc = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

    const push = (level, args) => {
        const { symbol, token } = LEVELS[level] || LEVELS.log;
        const text = args.map(_fmt).join(' ');
        lines.push(`<span class="qry-dev-line"><span style="color:${token}">${symbol}</span> <span class="qry-dev-time">[${_stamp()}]</span> ${esc(text)}</span>\n`);
        if (lines.length > max) lines.shift();
        render();
    };

    for (const level of Object.keys(LEVELS)) {
        originals[level] = console[level];
        console[level] = (...args) => { originals[level].apply(console, args); push(level, args); };
    }

    // resize by dragging the header
    let startY = 0, startH = 0;
    const onMove = e => {
        const h = Math.min(Math.max(startH + (startY - e.clientY), 80), window.innerHeight * 0.85);
        panel.css('height', h + 'px');
    };
    const onUp = () => { document.off('mousemove', onMove); document.off('mouseup', onUp); };
    const onDown = e => {
        if (e.target.closest('.qry-dev-btn')) return;        // don't drag when hitting a button
        startY = e.clientY; startH = panel.getBoundingClientRect().height;
        document.on('mousemove', onMove); document.on('mouseup', onUp); e.preventDefault();
    };
    header.on('mousedown', onDown);

    const show = () => { visible = true; panel.cls('+is-open'); render(); };
    const hide = () => { visible = false; panel.cls('-is-open'); };
    const toggle = () => visible ? hide() : show();
    const clear = () => { lines.length = 0; output.html(''); };

    btnClear.on('click', clear);
    btnClose.on('click', hide);
    panel.mount(document.body);

    return {
        el: panel, toggle, show, hide, clear,
        /** Manually log a line at a given level (without touching console). */
        log: (msg, level = 'log') => push(level, [msg]),
        destroy() {
            for (const level of Object.keys(originals)) console[level] = originals[level];
            document.off('mousemove', onMove); document.off('mouseup', onUp);
            panel.remove();
            lines.length = 0;
        },
    };
};

// ─── Inspector — outline every element with a type-coloured box ──────────────

const _BOX_COLORS = {
    container: ['div', 'section', 'article', 'main', 'header', 'footer', 'nav', 'aside'],
    text:      ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'a', 'label'],
    media:     ['img', 'video', 'canvas', 'svg', 'picture'],
    input:     ['button', 'input', 'form', 'select', 'textarea'],
    list:      ['ul', 'ol', 'li', 'dl', 'dt', 'dd'],
};
const _COLOR_TOKEN = {
    container: 'rgb(var(--qry-accent-rgb))',
    text:      'rgb(var(--qry-green-rgb))',
    media:     'rgb(var(--qry-purple-rgb))',
    input:     'rgb(var(--qry-orange-rgb))',
    list:      'rgb(var(--qry-red-rgb))',
    other:     'var(--qry-text-subtle)',
};
const _kindOf = tag => {
    for (const [kind, tags] of Object.entries(_BOX_COLORS)) if (tags.includes(tag)) return kind;
    return 'other';
};

/** Element inspector: overlays a coloured outline + tag label on every element,
 *  kept in sync with scroll / resize / DOM mutations. Elements added to the
 *  page while the inspector is on are picked up automatically (childList
 *  mutations trigger a rebuild). The mutation observer is detached while the
 *  inspector writes its own box styles, so it never reacts to itself.
 *  `toggle()` on/off, `destroy()` removes everything.
 *  @param {Object} [opts]
 *  @param {string} [opts.root='body *']  selector for elements to outline
 *  @returns {{ toggle, show, hide, destroy, isOn }}
 */
export const makeInspector = ({ root = 'body *' } = {}) => {
    _injectStyles();
    let on = false;
    let boxes = [];                 // { element, box, label }
    let ro = null, mo = null, onScroll = null, onResize = null, raf = 0;

    const observe = () => mo?.observe(document.body, {
        childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'],
    });

    const sync = () => {
        if (!on) return;
        mo?.disconnect();                          // our own writes must not re-trigger us
        const sx = window.scrollX, sy = window.scrollY;
        for (const { element, box, label } of boxes) {
            if (!element.isConnected) { box.css('display', 'none'); continue; }
            const r = element.getBoundingClientRect();
            box.css({ left: (r.left + sx) + 'px', top: (r.top + sy) + 'px', width: r.width + 'px', height: r.height + 'px', display: 'block' });
            label.css('opacity', (r.width > 50 && r.height > 20) ? '1' : '0');
        }
        observe();
    };

    // coalesce childList bursts into one rebuild per frame
    const queueBuild = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; if (on) build(); }); };

    const build = () => {
        teardown();
        ro = new ResizeObserver(sync);
        mo = new MutationObserver(muts =>
            muts.some(m => m.type === 'childList') ? queueBuild() : sync());
        for (const element of $.all(root)) {
            if (!element.getBoundingClientRect || element.closest('.qry-dev-console') || element.closest('.qry-dev-box')) continue;
            const tag = element.tagName.toLowerCase();
            const color = _COLOR_TOKEN[_kindOf(tag)];
            const box = $.create('div', { class: 'qry-dev-box' });
            box.css('borderColor', color);
            const label = $.create('div', { class: 'qry-dev-box-label', text: element.id ? `${tag}#${element.id}` : tag });
            label.css('background', color);
            box.add(label);
            box.mount(document.body);
            boxes.push({ element, box, label });
            ro.observe(element);
        }
        observe();                                 // attach AFTER our boxes are mounted
        onScroll = () => requestAnimationFrame(sync);
        onResize = () => requestAnimationFrame(sync);
        window.on('scroll', onScroll, { passive: true });
        window.on('resize', onResize, { passive: true });
        sync();
    };

    const teardown = () => {
        ro?.disconnect(); mo?.disconnect();
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
        if (onScroll) { window.off('scroll', onScroll); window.off('resize', onResize); onScroll = onResize = null; }
        boxes.forEach(({ box }) => box.remove());
        boxes = [];
    };

    const show = () => { on = true; build(); };
    const hide = () => { on = false; teardown(); };
    const toggle = () => on ? hide() : show();

    return { toggle, show, hide, isOn: () => on, destroy: hide };
};

// ─── Style toggle — disable/restore the page's own CSS (see structure nude) ──

/** Toggle all page stylesheets (`<link rel=stylesheet>` and `<style>`) off/on,
 *  to inspect the raw, unstyled document structure. Skips qry-devtools' own
 *  injected styles so the panel keeps its look. `destroy()` restores CSS.
 *  @returns {{ toggle, on, off, isOff, destroy }}
 */
export const makeStyleToggle = () => {
    let off = false;
    const sheets = () => $.all('link[rel="stylesheet"], style').filter(s => s.id !== 'qry-dev-styles');
    const set = disabled => { off = disabled; sheets().forEach(s => { s.disabled = disabled; }); };
    return {
        toggle: () => set(!off),
        off:    () => set(true),
        on:     () => set(false),
        isOff:  () => off,
        destroy: () => set(false),
    };
};

// ─── makeDevtools — console + inspector, with a small control bar ────────────

/** Bundle the in-page console and the element inspector, wired to a keyboard
 *  shortcut and a tiny toolbar in the console header.
 *  @param {Object} [opts]
 *  @param {string}  [opts.key='F2']   toggle key for the console
 *  @param {boolean} [opts.open=false] start with the console open
 *  @param {Object}  [opts.console]    options forwarded to makeConsole
 *  @param {Object}  [opts.inspector]  options forwarded to makeInspector
 *  @returns {{ toggle, console, inspector, destroy }}
 *  @example const dev = makeDevtools(); dev.inspector.toggle();
 */
export const makeDevtools = ({ key = 'F2', open = false, console: cOpts, inspector: iOpts } = {}) => {
    const con = makeConsole(cOpts);
    const insp = makeInspector(iOpts);
    const styles = makeStyleToggle();

    const bar = con.el.find('.qry-dev-console-bar')[0];
    const spacer = bar.find('.qry-dev-spacer')[0];

    // toolbar: Inspect (outline boxes) + Styles (strip page CSS), before Clear/Close
    const btnInspect = $.create('button', { class: 'qry-dev-btn', text: 'Inspect', type: 'button' });
    btnInspect.on('click', () => { insp.toggle(); btnInspect.cls(insp.isOn() ? '+is-active' : '-is-active'); });
    const btnStyles = $.create('button', { class: 'qry-dev-btn', text: 'Styles', type: 'button' });
    btnStyles.on('click', () => { styles.toggle(); btnStyles.cls(styles.isOff() ? '+is-active' : '-is-active'); });
    spacer.addAfter(btnInspect);
    btnInspect.addAfter(btnStyles);

    const onKey = e => {
        if (e.key !== key) return;
        const t = e.target;
        if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable) return;
        e.preventDefault();
        con.toggle();
    };
    document.on('keydown', onKey);
    if (open) con.show();

    return {
        console: con,
        inspector: insp,
        styles,
        toggle: con.toggle,
        destroy() {
            document.off('keydown', onKey);
            styles.destroy();
            insp.destroy();
            con.destroy();
        },
    };
};
