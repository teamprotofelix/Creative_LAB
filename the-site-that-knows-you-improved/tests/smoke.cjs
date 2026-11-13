// Dependency-free functional smoke test for the site's JavaScript state machine.
// This uses a minimal DOM mock; it does NOT replace visual browser testing.
'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const mobileMode = process.argv.includes('--mobile');
const reducedMotion = process.argv.includes('--reduced');
const source = fs.readFileSync(path.join(__dirname, '..', 'assets', 'app.js'), 'utf8');
class Element {
  constructor(tag = 'div', id = '') {
    this.tagName = tag; this.id = id; this.children = []; this.attrs = {};
    this.style = {}; this.dataset = {}; this.textContent = ''; this.hidden = false;
    this.listeners = {}; this.width = 100; this.height = 100; this.disabled = false;
    this.active = new Set();
    this.classList = { add: c => this.active.add(c), remove: c => this.active.delete(c), contains: c => this.active.has(c) };
  }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return this.attrs[k] ?? null; }
  addEventListener(k, cb) { (this.listeners[k] ||= []).push(cb); }
  fire(type, extra = {}) { for (const cb of (this.listeners[type] || [])) cb({ type, button: 0, clientX: 200, clientY: 250, code: '', preventDefault(){}, ...extra }); }
  append(...children) { this.children.push(...children); }
  appendChild(child) { this.children.push(child); }
  remove() { }
  replaceChildren(...children) { this.children = children; }
  click() { this.fire('click'); }
  focus() { }
  querySelector(query) {
    if (query === 'title') return this.children.find(ch => ch.tagName === 'title') || null;
    if (query === '[data-i18n]') return this.children.find(ch => ch.dataset.i18n) || null;
    return null;
  }
  toBlob(cb) { cb(new Blob([Buffer.from('PNG')], { type: 'image/png' })); }
  getContext() { return context2d; }
}
const noOp = () => {};
const context2d = { setTransform:noOp, clearRect:noOp, beginPath:noOp, arc:noOp, stroke:noOp,
  setLineDash:noOp, drawImage:noOp, fillRect:noOp, fill:noOp,
  createRadialGradient: () => ({ addColorStop:noOp }) };
const ids = ['sky','surface','intro','watch','ending','startBtn','revealBtn','restart','soundBtn','langBtn',
 'phaseTag','watchPoem','watchTime','progressBar','distanceMetric','zonesMetric','clicksMetric',
 'portraitHost','portraitSerial','resultTitle','archetypeKo','resultDescription','resultNote','finalTime',
 'finalTravel','finalClicks','downloadSvg','downloadPng','announcement'];
const nodes = new Map(ids.map(id => [id, new Element('div', id)]));
const i18nPhase = new Element('span'); i18nPhase.dataset.i18n = 'phaseBefore';
nodes.get('phaseTag').append(i18nPhase);
nodes.get('watch').hidden=true; nodes.get('ending').hidden=true;
const i18ns = [i18nPhase];
const body = new Element('body');
const listeners = {};
const document = {
  documentElement: { lang:'ko' }, body, hidden:false,
  querySelector(s) { return nodes.get(s.slice(1)); },
  querySelectorAll(s) { return s === '[data-i18n]' ? i18ns : []; },
  createElement(tag) { return new Element(tag); }, createElementNS(ns, tag) { return new Element(tag); },
  addEventListener(type, cb) { (listeners[type] ||= []).push(cb); }
};
let downloads = 0;
const BlobClass = global.Blob;
const URLObject = { createObjectURL() { return 'blob:test'; }, revokeObjectURL(){} };
let frameCallback;
const window = {
  innerWidth:mobileMode ? 390 : 1200, innerHeight:mobileMode ? 844 : 800, devicePixelRatio:mobileMode ? 2 : 1, crypto: { getRandomValues(arr){ arr[0]=2897832043;return arr;} },
  matchMedia(q){ return { matches:q.includes('pointer: coarse') ? mobileMode : q.includes('prefers-reduced-motion') ? reducedMotion : false,addEventListener(){} }; },
  setTimeout(){ return 1; },
  addEventListener(type, cb) { (listeners[type] ||= []).push(cb); }
};
const sandbox = { window, document, Blob:BlobClass, URL:URLObject, Image:class { set src(u){ this.onload(); } },
  XMLSerializer: class {
    serializeToString(root) {
      const xmlEscape = value => String(value).replaceAll('&', '&amp;').replaceAll('\"', '&quot;').replaceAll('<', '&lt;');
      const render = node => `<${node.tagName}${Object.entries(node.attrs).map(([key, value]) => ` ${key}=\"${xmlEscape(value)}\"`).join('')}>${xmlEscape(node.textContent || '')}${node.children.map(render).join('')}</${node.tagName}>`;
      return render(root);
    }
  },
  requestAnimationFrame(cb){ frameCallback=cb;return 1;}, cancelAnimationFrame:noOp,
  Uint32Array, Math, console };
vm.runInNewContext(source, sandbox, { filename:'app.js' });
function el(id){return nodes.get(id)}
function t(id,ev='click',props={}){el(id).fire(ev,props)}
assert.equal(el('intro').hidden,false);
assert.equal(el('watch').hidden,true);
t('startBtn');
assert.equal(el('intro').hidden,true);
assert.equal(el('watch').hidden,false);
t('surface','pointermove',{clientX:100,clientY:100});
frameCallback(100);
frameCallback(200);
t('surface','pointermove',{clientX:450,clientY:300});
t('surface','pointerdown',{clientX:470,clientY:310});
t('surface','pointerdown',{clientX:500,clientY:350});
assert.equal(el('clicksMetric').textContent,0); // UI updates next frame.
frameCallback(400);
assert.equal(el('clicksMetric').textContent,2);
t('revealBtn');
assert.equal(el('ending').hidden,false);
assert.equal(el('portraitHost').children[0].tagName,'svg');
assert.ok(el('resultTitle').textContent);
assert.ok(el('portraitHost').children[0].children.length>8);
if (process.env.EXPORT_PREVIEW) {
  const xml = new sandbox.XMLSerializer().serializeToString(el('portraitHost').children[0]);
  fs.writeFileSync(process.env.EXPORT_PREVIEW, xml);
}
t('downloadSvg');
t('downloadPng');
assert.equal(el('downloadPng').disabled,false);
t('langBtn');
assert.equal(document.documentElement.lang,'en');
assert.ok(el('resultDescription').textContent.match(/you|Your|You/));
t('restart');
assert.equal(el('intro').hidden,false);
t('startBtn');
t('revealBtn');
assert.equal(el('resultTitle').textContent,'The Stillness');
assert.ok(el('portraitHost').children[0]);
t('restart');t('startBtn');t('surface','pointerdown');t('revealBtn');
assert.equal(el('resultTitle').textContent,'The Minimalist');
t('restart');t('startBtn');for(let i=0;i<8;i++)t('surface','pointerdown');t('revealBtn');
assert.equal(el('resultTitle').textContent,'The Player');
t('restart');t('startBtn');
// Confirm automatic completion of the 30-second observing period.
for (let i=1;i<=165;i++) frameCallback(400+i*200);
assert.equal(el('ending').hidden,false);
assert.ok(el('portraitHost').children[0]);
assert.equal(typeof window.fetch,'undefined');
console.log('PASS [' + (mobileMode ? 'mobile' : 'desktop') + (reducedMotion ? ', reduced' : '') + ']: start / pointer input / reveal / portrait / SVG & PNG actions / bilingual text / restart / stillness / minimalist / player / automatic completion');
