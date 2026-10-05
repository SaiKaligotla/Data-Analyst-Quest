/* ============================================================================
 * Test-only DOM + localStorage shim.
 * Just enough of the browser to run the real page scripts unmodified:
 *   - a tolerant HTML parser that builds a real element tree
 *   - innerHTML parsing/serialising, classList, dataset, style, events
 *   - a selector engine for the selectors the site actually uses
 *   - a localStorage implementation with .key()/.length
 * This file is part of the test suite and is never served to users.
 * ========================================================================== */
'use strict';

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr']);
const RAWTEXT = new Set(['script', 'style']);

/* ------------------------------- parser ---------------------------------- */
function parseAttributes(src) {
  const attrs = {};
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let m;
  while ((m = re.exec(src))) {
    const name = m[1].toLowerCase();
    const val = m[3] !== undefined ? m[3] : m[4] !== undefined ? m[4] : m[5] !== undefined ? m[5] : '';
    attrs[name] = decodeEntities(val);
  }
  return attrs;
}

function decodeEntities(s) {
  return String(s)
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&mdash;/g, '\u2014').replace(/&ndash;/g, '\u2013')
    .replace(/&middot;/g, '\u00b7').replace(/&amp;/g, '&')
    .replace(/&larr;/g, '\u2190').replace(/&rarr;/g, '\u2192')
    .replace(/&hellip;/g, '\u2026').replace(/&rsquo;/g, '\u2019')
    .replace(/&nbsp;/g, '\u00a0').replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d));
}

class TextNode {
  constructor(text) { this.text = text; this.parentNode = null; }
  get textContent() { return this.text; }
}

class Element {
  constructor(tag, attrs) {
    this.tagName = String(tag).toUpperCase();
    this.attributes = attrs || {};
    this.childNodes = [];
    this.parentNode = null;
    this.listeners = {};
    this.style = {};
    this.dataset = {};
    this.value = this.attributes.value !== undefined ? this.attributes.value : '';
    this.disabled = this.attributes.disabled !== undefined;
    this.checked = this.attributes.checked !== undefined;
    this.files = null;
    this._text = '';
    const self = this;
    Object.keys(this.attributes).forEach((k) => {
      if (k.indexOf('data-') === 0) {
        const key = k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        self.dataset[key] = this.attributes[k];
      }
    });
  }
  /* ---- attributes ---- */
  get id() { return this.attributes.id || ''; }
  set id(v) { this.attributes.id = v; }
  get className() { return this.attributes.class || ''; }
  set className(v) { this.attributes.class = v; }
  get type() { return this.attributes.type || ''; }
  set type(v) { this.attributes.type = v; }
  getAttribute(n) { return this.attributes[n] !== undefined ? this.attributes[n] : null; }
  setAttribute(n, v) {
    this.attributes[n] = v;
    if (n.indexOf('data-') === 0) {
      this.dataset[n.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = v;
    }
  }
  get href() { return this.attributes.href || ''; }
  set href(v) { this.attributes.href = v; }
  get placeholder() { return this.attributes.placeholder || ''; }
  set placeholder(v) { this.attributes.placeholder = v; }

  /* ---- class list ---- */
  get classList() {
    const self = this;
    const list = () => String(self.className).split(/\s+/).filter(Boolean);
    return {
      add: (...c) => { const s = new Set(list()); c.forEach((x) => s.add(x)); self.className = [...s].join(' '); },
      remove: (...c) => { const s = new Set(list()); c.forEach((x) => s.delete(x)); self.className = [...s].join(' '); },
      contains: (c) => list().indexOf(c) >= 0,
      toggle: (c, force) => {
        const has = list().indexOf(c) >= 0;
        const want = force === undefined ? !has : !!force;
        if (want) self.classList.add(c); else self.classList.remove(c);
        return want;
      }
    };
  }

  /* ---- tree ---- */
  get children() { return this.childNodes.filter((n) => n instanceof Element); }
  get parentElement() { return this.parentNode instanceof Element ? this.parentNode : null; }
  appendChild(node) {
    if (node.parentNode) node.parentNode.removeChild(node);
    node.parentNode = this;
    this.childNodes.push(node);
    return node;
  }
  insertBefore(node, ref) {
    if (node.parentNode) node.parentNode.removeChild(node);
    const i = ref ? this.childNodes.indexOf(ref) : -1;
    node.parentNode = this;
    if (i < 0) this.childNodes.push(node); else this.childNodes.splice(i, 0, node);
    return node;
  }
  removeChild(node) {
    const i = this.childNodes.indexOf(node);
    if (i >= 0) this.childNodes.splice(i, 1);
    node.parentNode = null;
    return node;
  }

  /* ---- content ---- */
  get textContent() {
    return this.childNodes.map((n) => n.textContent).join('');
  }
  set textContent(v) { this.childNodes = [new TextNode(String(v))]; }
  get innerHTML() { return this.childNodes.map((n) => serialize(n)).join(''); }
  set innerHTML(html) {
    this.childNodes = [];
    parseInto(String(html), this);
  }

  /* ---- events ---- */
  addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); }
  removeEventListener(type, fn) {
    const l = this.listeners[type] || [];
    const i = l.indexOf(fn);
    if (i >= 0) l.splice(i, 1);
  }
  click() { (this.listeners.click || []).forEach((fn) => fn.call(this, { target: this, preventDefault() {} })); }
  dispatch(type, evt) { (this.listeners[type] || []).forEach((fn) => fn.call(this, evt || { target: this })); }
  select() {}
  focus() {}
  blur() {}
}

function serialize(node) {
  if (node instanceof TextNode) return node.text;
  const attrs = Object.keys(node.attributes)
    .map((k) => ` ${k}="${node.attributes[k]}"`).join('');
  const inner = node.childNodes.map(serialize).join('');
  if (VOID.has(node.tagName.toLowerCase())) return `<${node.tagName.toLowerCase()}${attrs}>`;
  return `<${node.tagName.toLowerCase()}${attrs}>${inner}</${node.tagName.toLowerCase()}>`;
}

/* Parse a fragment (or document) and attach the nodes to `root`. */
function parseInto(html, root) {
  let i = 0;
  const stack = [root];
  const tagRe = /<(\/)?([a-zA-Z][-a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/)?>/g;
  let m;
  const push = (node) => stack[stack.length - 1].appendChild(node);
  while ((m = tagRe.exec(html))) {
    const text = html.slice(i, m.index);
    if (text.trim()) push(new TextNode(decodeEntities(text)));
    i = m.index + m[0].length;
    const closing = !!m[1];
    const tag = m[2].toLowerCase();
    const attrs = parseAttributes(m[3] || '');
    const selfClose = !!m[4] || VOID.has(tag);
    if (closing) {
      for (let j = stack.length - 1; j > 0; j--) {
        if (stack[j].tagName.toLowerCase() === tag) { stack.length = j; break; }
      }
      continue;
    }
    const el = new Element(tag, attrs);
    push(el);
    if (RAWTEXT.has(tag)) {
      const close = html.toLowerCase().indexOf(`</${tag}`, i);
      const end = close < 0 ? html.length : close;
      const raw = html.slice(i, end);
      if (raw) el.appendChild(new TextNode(raw));
      i = end;
      tagRe.lastIndex = end;
      continue;
    }
    if (!selfClose) stack.push(el);
  }
  const tail = html.slice(i);
  if (tail.trim()) push(new TextNode(decodeEntities(tail)));
}

/* ----------------------------- selectors --------------------------------- */
/* Supports the subset the site uses: "tag", "#id", ".class", "a.c",
 * "[attr=val]", descendant (space) and child (>) combinators, plus comma
 * groups. Good enough to run the real page scripts against. */
function matchesSimple(el, sel) {
  sel = String(sel).trim();
  const head = sel.match(/^([a-zA-Z][-a-zA-Z0-9]*)?((?:[#.\[][^#.\[]*)*)$/);
  if (!head) return false;
  if (head[1] && el.tagName !== head[1].toUpperCase()) return false;
  const rest = head[2] || '';
  const re = /([#.])([^#.\[]+)|\[([a-zA-Z-]+)(?:=["']?([^\]"']*)["']?)?\]/g;
  let m;
  while ((m = re.exec(rest))) {
    if (m[1] === '#') { if (el.id !== m[2]) return false; }
    else if (m[1] === '.') { if (!el.classList.contains(m[2])) return false; }
    else {
      const v = el.getAttribute(m[3]);
      if (v === null) return false;
      if (m[4] !== undefined && v !== m[4]) return false;
    }
  }
  return true;
}

function parseSelector(group) {
  const toks = [];
  String(group).trim().split(/\s+/).forEach((t) => {
    if (t === '>') { toks.push({ comb: '>' }); return; }
    const last = toks[toks.length - 1];
    if (last && last.part && !last.comb) toks.push({ comb: ' ' });
    toks.push({ part: t });
  });
  return toks;
}

function matchesTokens(el, toks) {
  let node = el;
  for (let i = toks.length - 1; i >= 0; i--) {
    const t = toks[i];
    if (t.part) {
      if (!matchesSimple(node, t.part)) return false;
    } else {
      const prev = toks[i - 1];
      if (i === 0 || !prev || !prev.part) return false;
      if (t.comb === '>') {
        node = node.parentElement;
        if (!node) return false;
      } else {
        let p = node.parentElement;
        while (p && !matchesSimple(p, prev.part)) p = p.parentElement;
        node = p;
        if (!node) return false;
      }
    }
  }
  return true;
}

function descendants(el, out) {
  el.children.forEach((c) => { out.push(c); descendants(c, out); });
  return out;
}

function queryAll(root, selector) {
  const all = descendants(root, []);
  const results = [];
  String(selector).split(',').map((s) => s.trim()).filter(Boolean).forEach((group) => {
    const toks = parseSelector(group);
    if (!toks.length) return;
    all.forEach((el) => { if (matchesTokens(el, toks) && results.indexOf(el) < 0) results.push(el); });
  });
  return results;
}

/* ------------------------------- document --------------------------------- */
class Document {
  constructor() {
    this.documentElement = new Element('html', {});
    this.body = new Element('body', {});
    this.documentElement.appendChild(this.body);
    this.listeners = {};
  }
  createElement(tag) { return new Element(tag, {}); }
  createTextNode(t) { return new TextNode(t); }
  getElementById(id) {
    const found = descendants(this.documentElement, []).filter((e) => e.id === id);
    return found[0] || null;
  }
  querySelector(sel) { return queryAll(this.documentElement, sel)[0] || null; }
  querySelectorAll(sel) { return queryAll(this.documentElement, sel); }
  addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); }
  dispatch(type, evt) { (this.listeners[type] || []).forEach((fn) => fn(evt || {})); }
  execCommand() { return true; }
}

/* ----------------------------- localStorage ------------------------------- */
class LocalStorage {
  constructor(seed) { this.data = Object.assign({}, seed || {}); }
  getItem(k) { return Object.prototype.hasOwnProperty.call(this.data, k) ? this.data[k] : null; }
  setItem(k, v) { this.data[k] = String(v); }
  removeItem(k) { delete this.data[k]; }
  key(i) { return Object.keys(this.data)[i]; }
  get length() { return Object.keys(this.data).length; }
  clear() { this.data = {}; }
  dump() { return JSON.parse(JSON.stringify(this.data)); }
}

/* ------------------------------- sandbox ---------------------------------- */
function createEnvironment(html, seed) {
  const doc = new Document();
  if (html) parseInto(html, doc.body);

  const win = {
    document: doc,
    localStorage: new LocalStorage(seed),
    navigator: {},
    location: { href: '', hash: '' },
    console,
    setTimeout, clearTimeout, setInterval, clearInterval,
    alert: (m) => { win.__alerts.push(String(m)); },
    confirm: (m) => { win.__confirms.push(String(m)); return win.__confirmAnswer !== false; },
    scrollTo() {},
    fetch: () => Promise.reject(new Error('network disabled in tests')),
    URL: { createObjectURL: () => 'blob:test', revokeObjectURL() {} },
    Blob: class { constructor(parts) { this.parts = parts; } },
    FileReader: class {
      readAsText() { this.result = this.__text || ''; if (this.onload) this.onload(); }
    },
    __alerts: [],
    __confirms: [],
    __confirmAnswer: true
  };
  win.window = win;
  win.self = win;
  win.globalThis = win;
  doc.defaultView = win;
  return win;
}

module.exports = { createEnvironment, Element, TextNode, parseInto, queryAll, Document, LocalStorage };
