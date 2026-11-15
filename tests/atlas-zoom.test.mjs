import test from 'node:test';
import assert from 'node:assert/strict';
import { initialAtlasView, boundAtlasView, pinchAtlas, initializeAtlasZoom } from '../src/atlas-zoom.js';

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, `${a} ≈ ${b}`);

test('pinching keeps the touched location under the fingers and permits a moving midpoint', () => {
  const from = { x: .3, y: .7 };
  const view = pinchAtlas(initialAtlasView(), 2, from);
  close(view.x + from.x * 1200 / view.scale, from.x * 1200);
  close(view.y + from.y * 600 / view.scale, from.y * 600);
  const next = pinchAtlas(view, 1.2, { x: .5, y: .5 }, { x: .55, y: .45 });
  close(next.x + .55 * 1200 / next.scale, view.x + .5 * 1200 / view.scale);
  close(next.y + .45 * 600 / next.scale, view.y + .5 * 600 / view.scale);
});

test('map zoom and pan stay within the whole-world extent', () => {
  assert.deepEqual(pinchAtlas(initialAtlasView(), .1, { x: .5, y: .5 }), initialAtlasView());
  const max = pinchAtlas(initialAtlasView(), 100, { x: .9, y: .9 });
  assert.equal(max.scale, 5);
  assert.deepEqual(boundAtlasView({ scale: 2, x: -100, y: 10000 }), { scale: 2, x: 0, y: 300 });
  for (const scale of [1, 1.1, 2, 5]) for (const x of [-10, 0, .5, 1, 10]) {
    const view = pinchAtlas(initialAtlasView(), scale, { x, y: x });
    assert.ok(view.x >= 0 && view.y >= 0);
    assert.ok(view.x + 1200 / view.scale <= 1200 + 1e-7);
    assert.ok(view.y + 600 / view.scale <= 600 + 1e-7);
  }
});

function fixture(t, mobile = false) {
  const previous = globalThis.requestAnimationFrame;
  const previousMatchMedia = globalThis.matchMedia;
  const compact = { matches: mobile, addEventListener(name, callback) { this.change = callback; } };
  globalThis.matchMedia = () => compact;
  globalThis.requestAnimationFrame = (callback) => callback();
  t.after(() => { if (previous === undefined) delete globalThis.requestAnimationFrame; else globalThis.requestAnimationFrame = previous; });
  t.after(() => { if (previousMatchMedia === undefined) delete globalThis.matchMedia; else globalThis.matchMedia = previousMatchMedia; });
  const node = (dataset = {}) => ({
    dataset, attributes: {}, listeners: {},
    setAttribute(name, value) { this.attributes[name] = value; },
    addEventListener(name, callback) { this.listeners[name] = callback; },
    fire(name, extra = {}) {
      const event = { target: this, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, stopPropagation() { this.stopped = true; }, ...extra };
      this.listeners[name]?.(event);
      return event;
    },
  });
  const viewport = node(), map = node(), status = node();
  map.getBoundingClientRect = () => ({ left: 0, top: 0, width: 360, height: 180 });
  const controls = ['out', 'in', 'reset'].map((mapZoom) => node({ mapZoom }));
  const atlas = node();
  atlas.classList = { contains: () => Boolean(atlas.selectedCountry) };
  atlas.querySelector = (selector) => ({ '.atlas-viewport': viewport, '.atlas-map': map, '[data-map-zoom-status]': status })[selector];
  atlas.querySelectorAll = () => controls;
  initializeAtlasZoom({ querySelector: () => atlas });
  return { viewport, map, controls, status, atlas, compact };
}

const touch = (clientX, clientY) => ({ clientX, clientY });

test('only mobile opens at 150%, with panning, full-map Fit and country views preserved', (t) => {
  const { viewport, map, controls, status, atlas, compact } = fixture(t, true);
  assert.equal(map.attributes.viewBox, '200 100 800 400');
  assert.equal(status.textContent, 'Map zoom 150%');
  assert.equal(viewport.attributes['data-zoomed'], 'true');
  viewport.fire('touchstart', { touches: [touch(180, 90)] });
  viewport.fire('touchmove', { touches: [touch(216, 90)] });
  close(Number(map.attributes.viewBox.split(' ')[0]), 120);
  controls[2].fire('click');
  assert.equal(map.attributes.viewBox, '0 0 1200 600');
  atlas.fire('keydown', { key: 'Escape' });
  assert.equal(map.attributes.viewBox, '200 100 800 400');
  atlas.selectedCountry = true;
  atlas.fire('keydown', { key: 'Escape' });
  assert.equal(map.attributes.viewBox, '0 0 1200 600', 'Country framing does not get extra zoom');
  atlas.selectedCountry = false;
  compact.matches = false;
  compact.change();
  assert.equal(map.attributes.viewBox, '0 0 1200 600', 'Desktop keeps the full-world view');
});

test('touch zoom, one-finger pan, fit and click suppression use the actual map controller', (t) => {
  const { viewport, map, controls, status } = fixture(t);
  assert.equal(map.attributes.viewBox, '0 0 1200 600');
  assert.equal(viewport.fire('touchstart', { touches: [touch(100, 80)] }).defaultPrevented, false);
  assert.equal(viewport.fire('touchmove', { touches: [touch(100, 120)] }).defaultPrevented, false, 'A normal vertical swipe belongs to the page');
  viewport.fire('touchstart', { touches: [touch(90, 90), touch(270, 90)] });
  assert.equal(viewport.fire('touchmove', { touches: [touch(0, 90), touch(360, 90)] }).defaultPrevented, true);
  assert.equal(status.textContent, 'Map zoom 200%');
  assert.equal(map.attributes.viewBox, '300 150 600 300');
  viewport.fire('touchend', { touches: [touch(180, 90)] });
  viewport.fire('touchmove', { touches: [touch(216, 90)] });
  close(Number(map.attributes.viewBox.split(' ')[0]), 240);
  assert.equal(viewport.fire('click').stopped, true, 'Dragging does not accidentally open a destination');
  controls[2].fire('click');
  assert.equal(map.attributes.viewBox, '0 0 1200 600');
  assert.equal(controls[0].disabled, true);
  assert.equal(controls[2].disabled, true);
  controls[1].fire('click');
  assert.equal(status.textContent, 'Map zoom 150%');
  viewport.fire('keydown', { key: '0' });
  assert.equal(status.textContent, 'Map zoom 100%');
});
