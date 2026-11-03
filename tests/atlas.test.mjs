import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');

// Minimal DOM boundary: the actual browser controller handles all state changes.
function fixture(hash = '') {
  let document;
  const element = (dataset = {}, attributes = {}) => {
    const classes = new Set(), listeners = new Map();
    return {
      dataset, attributes, hidden: false, style: {}, textContent: '', innerHTML: '',
      classList: { toggle(name, on) { if (on) classes.add(name); else classes.delete(name); }, contains(name) { return classes.has(name); } },
      setAttribute(name, value) { this.attributes[name] = value; },
      toggleAttribute(name, on) { if (on) this.attributes[name] = ''; else delete this.attributes[name]; },
      removeAttribute(name) { delete this.attributes[name]; },
      getAttribute(name) { return this.attributes[name] ?? null; },
      addEventListener(name, handler) { const handlers = listeners.get(name) || []; handlers.push(handler); listeners.set(name, handlers); },
      fire(name, fields = {}) {
        const event = { button: 0, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, ...fields };
        for (const handler of listeners.get(name) || []) handler(event);
        return event;
      },
      focus() { document.activeElement = this; },
    };
  };
  const countryLinks = ['canada', 'japan'].flatMap((id) => [element({ atlasCountry: id }), element({ atlasCountry: id }), element({ atlasCountry: id }, { tabindex: '-1' })]);
  const albumLinks = ['toronto', 'gros-morne', 'japan'].flatMap((slug) => [element({ atlasAlbum: slug, atlasTitle: slug }), element({ atlasAlbum: slug, atlasTitle: slug })]);
  const panels = [element({ atlasPanel: 'canada', atlasLabel: 'Canada', atlasCount: '2', atlasTransform: 'matrix(7,0,0,7,-2200,-530)' }), element({ atlasPanel: 'japan', atlasLabel: 'Japan', atlasCount: '1', atlasTransform: 'matrix(8,0,0,8,-6800,-880)' })];
  const headings = panels.map(() => element());
  panels.forEach((panel, i) => { panel.querySelector = () => headings[i]; });
  const layers = panels.map((panel) => element({ atlasLayer: panel.dataset.atlasPanel }, { hidden: '' }));
  const world = element(), geography = element(), back = element(), heading = element(), description = element(), status = element(), caption = element();
  heading.innerHTML = 'A world of <em>stories.</em>';
  description.textContent = 'Choose a country.';
  caption.textContent = 'Select a country to explore its albums.';
  const nodes = new Map([['[data-atlas-world]', world], ['[data-atlas-geography]', geography], ['[data-atlas-back]', back], ['[data-atlas-heading]', heading], ['[data-atlas-description]', description], ['[data-atlas-status]', status], ['[data-atlas-caption]', caption]]);
  const groups = new Map([['[data-atlas-country]', countryLinks], ['[data-atlas-album]', albumLinks], ['[data-atlas-panel]', panels], ['[data-atlas-layer]', layers]]);
  const atlas = element();
  atlas.querySelector = (selector) => nodes.get(selector);
  atlas.querySelectorAll = (selector) => groups.get(selector);
  document = { activeElement: null, querySelector: (selector) => selector === '[data-atlas]' ? atlas : null };
  vm.runInNewContext(source, { document, window: { location: { hash } } });
  return { atlas, countryLinks, albumLinks, panels, headings, layers, world, geography, back, heading, description, status, caption, document };
}

test('country selection zooms and reveals only its own albums, including a single-album country', () => {
  const ui = fixture();
  assert.ok(ui.panels.every((panel) => panel.hidden));
  assert.equal(ui.world.getAttribute('hidden'), null);
  assert.equal(ui.back.hidden, true);
  const event = ui.countryLinks[0].fire('click');
  assert.equal(event.defaultPrevented, true);
  assert.equal(ui.geography.style.transform, ui.panels[0].dataset.atlasTransform);
  assert.deepEqual(ui.panels.map((panel) => panel.hidden), [false, true]);
  assert.deepEqual(ui.layers.map((layer) => layer.getAttribute('hidden') !== null), [false, true]);
  assert.equal(ui.heading.textContent, 'Canada');
  assert.equal(ui.world.getAttribute('hidden'), '');
  assert.equal(ui.document.activeElement, ui.headings[0]);
  ui.countryLinks[3].fire('click');
  assert.deepEqual(ui.panels.map((panel) => panel.hidden), [true, false]);
  assert.equal(ui.geography.style.transform, ui.panels[1].dataset.atlasTransform);
  assert.match(ui.status.textContent, /1 album is available/);
  assert.equal(ui.countryLinks[0].getAttribute('aria-expanded'), 'false');
  assert.equal(ui.countryLinks[3].getAttribute('aria-expanded'), 'true');
});

test('World map and Escape restore the world view and keyboard focus', () => {
  const ui = fixture();
  ui.countryLinks[0].fire('click');
  ui.back.fire('click');
  assert.equal(ui.geography.style.transform, 'matrix(1,0,0,1,0,0)');
  assert.equal(ui.world.getAttribute('hidden'), null);
  assert.ok(ui.panels.every((panel) => panel.hidden));
  assert.ok(ui.layers.every((layer) => layer.getAttribute('hidden') !== null));
  assert.equal(ui.document.activeElement, ui.countryLinks[0]);
  ui.countryLinks[3].fire('click');
  assert.equal(ui.atlas.fire('keydown', { key: 'Escape' }).defaultPrevented, true);
  assert.equal(ui.world.getAttribute('hidden'), null);
  assert.equal(ui.document.activeElement, ui.countryLinks[3]);
});

test('modified country clicks retain normal links and country hash links open their view', () => {
  const ui = fixture();
  assert.equal(ui.countryLinks[0].fire('click', { ctrlKey: true }).defaultPrevented, false);
  assert.equal(ui.world.getAttribute('hidden'), null);
  const linked = fixture('#atlas-country-japan');
  assert.deepEqual(linked.panels.map((panel) => panel.hidden), [true, false]);
  linked.back.fire('click');
  assert.equal(linked.document.activeElement, linked.countryLinks[3]);
  assert.equal(fixture('#atlas-country-missing').world.getAttribute('hidden'), null);
});

test('album hover highlights its matching pin and cover card together', () => {
  const ui = fixture();
  ui.countryLinks[0].fire('click');
  ui.albumLinks[0].fire('pointerenter');
  assert.deepEqual(ui.albumLinks.map((link) => link.classList.contains('is-active')), [true, true, false, false, false, false]);
  assert.equal(ui.caption.textContent, 'toronto');
  ui.albumLinks[0].fire('pointerleave');
  assert.match(ui.caption.textContent, /Canada · 2 albums/);
});
