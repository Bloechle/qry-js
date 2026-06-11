/**
 * qry-bridge.js — cross-page shared store over a hidden iframe
 *
 * Lets several pages on the same site share a small key/value store that
 * survives navigation. Each page embeds a hidden iframe pointing at the same
 * bridge URL; the host inside persists the store in the IFRAME ORIGIN's
 * localStorage — the iframes are many, the storage is one. Writes from one
 * page reach other open pages live via `storage` events. Two halves:
 *
 *   • makeBridge(opts)      — PARENT side: get/set/del/keys (Promise) + on(path)
 *   • makeBridgeHost(opts)  — runs INSIDE the iframe: persists the store, answers
 *
 * SECURITY — origin is mandatory on both sides. The host only answers callers
 * whose origin is in its allowlist; the parent only trusts messages from the
 * iframe's window AND the configured origin. There is no `'*'` escape hatch:
 * an unset origin throws, by design (the original Bridge used `'*'` and trusted
 * any sender — not repeated here).
 *
 *   // in the iframe page (e.g. bridge.html):
 *   import { makeBridgeHost } from './qry-bridge.js';
 *   makeBridgeHost({ allow: ['https://app.example'] });
 *
 *   // in each app page:
 *   import { makeBridge } from './qry-bridge.js';
 *   const store = makeBridge({ src: '/shared/bridge.html', origin: 'https://app.example' });
 *   await store.set('cart.items', 3);
 *   const n = await store.get('cart.items');
 *   const off = store.on('cart.items', v => console.log('changed', v));
 *
 * Values must be JSON-safe (they live in localStorage). Requires qry.js (global `$`).
 *
 * @version 1.0.0
 * @author  Jean-Luc Bloechle with Claude.ai
 * @license MIT
 */

const _TYPE = 'qry:bridge';                 // every message carries this namespace

// dot-path helpers (shared by both halves) ───────────────────────────────────
const _get = (obj, path) =>
    !path ? obj : path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
const _set = (obj, path, value) => {
    const parts = path.split('.');
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        const k = parts[i];
        if (typeof cur[k] !== 'object' || cur[k] === null) cur[k] = {};   // primitives on the path are replaced
        cur = cur[k];
    }
    cur[parts[parts.length - 1]] = value;
};
const _del = (obj, path) => {
    const parts = path.split('.');
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) { cur = cur[parts[i]]; if (cur == null) return; }
    delete cur[parts[parts.length - 1]];
};

// ─── Host (runs inside the iframe) ───────────────────────────────────────────

/** Run the shared store inside the bridge iframe. The store is persisted in
 *  this (the iframe origin's) localStorage on every write and re-read on every
 *  request — localStorage is the single source of truth, so every page
 *  embedding the same bridge URL sees the same data, across navigations.
 *  Answers only callers whose origin is allow-listed; when ANOTHER page writes
 *  the store, the `storage` event is forwarded to the parent as a `sync`.
 *  @param {Object}   opts
 *  @param {string[]} opts.allow                      allowed parent origins (required, non-empty)
 *  @param {Object}   [opts.initial={}]               store contents while storage is empty
 *  @param {string}   [opts.storageKey='qry-bridge']  localStorage key
 *  @returns {{ data: Object, destroy: () => void }}  `data` is a fresh read
 */
export const makeBridgeHost = ({ allow, initial = {}, storageKey = 'qry-bridge' } = {}) => {
    if (!Array.isArray(allow) || allow.length === 0)
        throw new Error('makeBridgeHost: `allow` (allowed parent origins) is required');

    const load = () => {
        try { return JSON.parse(localStorage.getItem(storageKey)) ?? structuredClone(initial); }
        catch { return structuredClone(initial); }
    };
    const save = d => { try { localStorage.setItem(storageKey, JSON.stringify(d)); } catch {} };
    const reply = (origin, msg) => window.parent.postMessage({ ...msg, type: _TYPE }, origin);

    const onMsg = e => {
        if (!allow.includes(e.origin)) return;                 // origin gate
        const m = e.data;
        if (!m || m.type !== _TYPE || !m.op) return;
        const data = load();
        switch (m.op) {
            case 'ping':
                reply(e.origin, { op: 'ready' });
                break;
            case 'get':
                reply(e.origin, { op: 'value', id: m.id, value: _get(data, m.path) });
                break;
            case 'keys':
                reply(e.origin, { op: 'value', id: m.id, value: Object.keys(_get(data, m.path) ?? {}) });
                break;
            case 'set':
                _set(data, m.path, m.value);
                save(data);
                reply(e.origin, { op: 'value', id: m.id, value: true });
                reply(e.origin, { op: 'changed', path: m.path, value: m.value });
                break;
            case 'del':
                _del(data, m.path);
                save(data);
                reply(e.origin, { op: 'value', id: m.id, value: true });
                reply(e.origin, { op: 'changed', path: m.path, value: undefined });
                break;
        }
    };

    // another page wrote the store (through its own bridge iframe) → tell our
    // parent to re-read its watched paths
    const onStorage = e => {
        if (e.key !== storageKey) return;
        allow.forEach(o => { try { window.parent.postMessage({ type: _TYPE, op: 'sync' }, o); } catch {} });
    };

    window.on('message', onMsg);
    window.on('storage', onStorage);
    // announce readiness to every allowed origin
    allow.forEach(o => { try { window.parent.postMessage({ type: _TYPE, op: 'ready' }, o); } catch {} });

    return {
        get data() { return load(); },
        destroy() { window.off('message', onMsg); window.off('storage', onStorage); },
    };
};

// ─── Bridge (runs in each app page) ──────────────────────────────────────────

/** Connect to a bridge iframe and talk to its store. Creates the (hidden)
 *  iframe if `#qry-bridge` isn't already present.
 *  @param {Object}  opts
 *  @param {string}  opts.src             iframe URL (the page running makeBridgeHost)
 *  @param {string}  opts.origin          iframe origin to trust (required)
 *  @param {number}  [opts.timeout=5000]  per-request timeout (ms)
 *  @returns {{ get, set, del, keys, on, ready, destroy }}
 */
export const makeBridge = ({ src, origin, timeout = 5000 } = {}) => {
    if (!origin) throw new Error('makeBridge: `origin` (the iframe origin to trust) is required');
    if (!src)    throw new Error('makeBridge: `src` (the bridge iframe URL) is required');

    let frame = $.opt('#qry-bridge');
    if (!frame) {
        frame = $.create('iframe', { id: 'qry-bridge', src,
            style: 'position:absolute;width:0;height:0;border:0;top:-999px;left:-999px' });
        frame.mount(document.body);
    }

    let ready = false;
    let counter = 1;
    const pending = new Map();                                  // id → { resolve, reject, timer }
    const watchers = new Map();                                 // path → Set<cb>
    const readyWaiters = [];

    const post = msg => frame.contentWindow?.postMessage({ ...msg, type: _TYPE }, origin);

    const notify = (path, value) =>
        watchers.get(path)?.forEach(cb => { try { cb(value); } catch (err) { console.error(err); } });

    const onMsg = e => {
        if (e.source !== frame.contentWindow) return;          // must be OUR iframe
        if (e.origin !== origin) return;                       // and the trusted origin
        const m = e.data;
        if (!m || m.type !== _TYPE) return;
        if (m.op === 'ready') {
            if (!ready) { ready = true; readyWaiters.splice(0).forEach(r => r()); }
        } else if (m.op === 'value' && pending.has(m.id)) {
            const { resolve, timer } = pending.get(m.id);
            clearTimeout(timer); pending.delete(m.id); resolve(m.value);
        } else if (m.op === 'changed') {
            notify(m.path, m.value);
        } else if (m.op === 'sync') {
            // the store changed from another page — re-read every watched path
            watchers.forEach((_, path) => request('get', path).then(v => notify(path, v)));
        }
    };
    window.on('message', onMsg);

    const whenReady = () => ready ? Promise.resolve() : new Promise(r => readyWaiters.push(r));
    // nudge the host in case it loaded before us
    const ping = () => post({ op: 'ping' });
    ping(); const pinger = setInterval(() => { if (ready) clearInterval(pinger); else ping(); }, 150);

    const request = (op, path, value) =>
        new Promise((resolve, reject) => {
            const id = counter++;
            // timeout covers the whole round-trip, INCLUDING waiting for the
            // iframe — a bridge that never loads rejects instead of hanging
            const timer = setTimeout(() => { pending.delete(id); reject(new Error(`bridge ${op} timed out`)); }, timeout);
            pending.set(id, { resolve, reject, timer });
            whenReady().then(() => { if (pending.has(id)) post({ op, id, path, value }); });
        });

    return {
        /** Read the value at a dot-path. @returns {Promise<any>} */
        get: path => request('get', path),
        /** Write a value at a dot-path. @returns {Promise<true>} */
        set: (path, value) => request('set', path, value),
        /** Delete the value at a dot-path. @returns {Promise<true>} */
        del: path => request('del', path),
        /** List keys of the object at a dot-path. @returns {Promise<string[]>} */
        keys: (path = '') => request('keys', path),
        /** Watch a path for changes; returns an unsubscribe function. */
        on(path, cb) {
            if (!watchers.has(path)) watchers.set(path, new Set());
            watchers.get(path).add(cb);
            return () => watchers.get(path)?.delete(cb);
        },
        /** Resolves once the host iframe has answered. @returns {Promise<void>} */
        ready: whenReady,
        destroy() {
            window.off('message', onMsg);
            clearInterval(pinger);
            pending.forEach(({ reject, timer }) => { clearTimeout(timer); reject(new Error('bridge destroyed')); });
            pending.clear(); watchers.clear();
        },
    };
};
