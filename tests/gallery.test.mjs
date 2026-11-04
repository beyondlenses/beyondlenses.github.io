import test from 'node:test';
import assert from 'node:assert/strict';
import { loadContent } from '../scripts/build.mjs';
import { packGallery } from '../src/gallery-layout.js';
import { initializeGalleries } from '../src/gallery.js';
import { renderStory, escapeHtml } from '../src/templates.mjs';

const { site, trips } = await loadContent();
const widths = [280, 350, 628, 696, 1000, 1328, 2000];

test('the Bugis portrait packs with two landscapes, leaving a complete second row', () => {
  const chapter = trips.find(({ slug }) => slug === 'singapore').chapters.find(({ title }) => title === 'Bugis and the Rochor streets');
  for (const width of [696, 1000, 1328]) {
    const rows = packGallery(chapter.photos, { width });
    assert.deepEqual(rows.map(({ indices }) => indices), [[0, 1, 2], [3, 4]]);
    for (const row of rows) assert.ok(Math.abs(row.width - width) < 0.001);
    const oldImageHeight = 3 * ((width - 28) / 2) / (4 / 3) + ((width - 28) / 2) * (4 / 3 - 3 / 4);
    assert.ok(rows.reduce((height, row) => height + row.height, 0) < oldImageHeight, 'Packed image rows use less vertical space');
  }
});

test('every packed chapter preserves sequence, aspect ratios and bounds at seven viewport widths', () => {
  let checked = 0;
  for (const trip of trips) for (const chapter of trip.chapters) {
    if (chapter.layout === 'full') continue;
    for (const width of widths) {
      const rows = packGallery(chapter.photos, { width });
      assert.deepEqual(rows.flatMap(({ indices }) => indices), chapter.photos.map((_, index) => index), `${trip.slug}: ${chapter.title}, ${width}px`);
      for (const row of rows) {
        assert.ok(Number.isFinite(row.height) && row.height > 0);
        assert.ok(row.width <= width + 0.001 && row.width > 0);
        const photoWidths = row.indices.map((index) => row.height * chapter.photos[index].width / chapter.photos[index].height);
        assert.ok(Math.abs(photoWidths.reduce((sum, value) => sum + value, 0) + 24 * (photoWidths.length - 1) - row.width) < 0.001);
        row.indices.forEach((index, i) => assert.ok(Math.abs(photoWidths[i] / row.height - chapter.photos[index].width / chapter.photos[index].height) < 1e-8));
        if (width <= 660) assert.equal(row.indices.length, 1, 'Small screens keep one readable photo per row');
        else if (chapter.photos.length > 1) assert.ok(row.indices.length > 1, 'Look-ahead avoids stranded photos in the current albums');
      }
      checked += 1;
    }
  }
  assert.ok(checked >= 2000);
});

test('a lone portrait stays modest on desktop and uses the full mobile width', () => {
  const portrait = [{ width: 1500, height: 2000 }];
  const desktop = packGallery(portrait, { width: 1328 })[0];
  assert.ok(desktop.width < 650 && desktop.height <= 570);
  assert.equal(packGallery(portrait, { width: 350 })[0].width, 350);
});

test('every gallery photo fits the screen height on phones, tablets, desktops and short landscape windows', () => {
  for (const [viewportWidth, viewportHeight] of [[390, 844], [768, 1024], [1024, 768], [1440, 900], [1920, 1080], [844, 390], [1280, 400]]) {
    const width = Math.min(1440, viewportWidth - (viewportWidth > 1100 ? 112 : viewportWidth > 700 ? 72 : 40));
    const maxHeight = viewportHeight - 140;
    for (const trip of trips) for (const chapter of trip.chapters) {
      if (chapter.layout === 'full') continue;
      const rows = packGallery(chapter.photos, { width, maxHeight });
      assert.deepEqual(rows.flatMap(({ indices }) => indices), chapter.photos.map((_, index) => index));
      for (const row of rows) {
        assert.ok(row.height <= maxHeight + 0.001, `${trip.slug}: ${chapter.title} fits ${viewportWidth} × ${viewportHeight}`);
        assert.ok(row.width <= width + 0.001);
        row.indices.forEach((index, offset) => assert.ok(Math.abs(row.ratios[offset] - chapter.photos[index].width / chapter.photos[index].height) < 1e-8));
      }
    }
  }
  const portrait = packGallery([{ width: 1500, height: 2000 }], { width: 628, maxHeight: 400 })[0];
  assert.equal(portrait.height, 400);
  assert.equal(portrait.width, 300);
});

test('empty galleries, missing dimensions and custom gaps produce valid layouts', () => {
  assert.deepEqual(packGallery([], { width: 1000 }), []);
  const rows = packGallery([{}, { width: 1, height: 0 }, { width: 3, height: 2 }], { width: 1000, gap: 0 });
  assert.ok(rows.every(({ height, width }) => Number.isFinite(height) && Number.isFinite(width)));
  for (const width of [0, -1, Infinity, NaN]) assert.throws(() => packGallery([], { width }), RangeError);
  assert.throws(() => packGallery([], { width: 1000, gap: -1 }), RangeError);
});

test('story pages ship packed rows without JavaScript and preserve lightbox order and captions', () => {
  for (const slug of ['singapore', 'japan', 'turkey', 'spiti', 'vietnam', 'toronto']) {
    const trip = trips.find((trip) => trip.slug === slug);
    const html = renderStory(site, trip);
    assert.ok(html.includes('src="/assets/gallery.js" type="module"'));
    assert.ok(html.includes('class="gallery-row" style="--row-columns:'));
    const captions = [...html.matchAll(/data-photo data-caption="([^"]*)"/g)].map((match) => match[1]);
    const photos = trip.chapters.flatMap(({ photos }) => photos);
    assert.equal(captions.length, photos.length);
    photos.forEach((photo, index) => assert.ok(captions[index].startsWith(escapeHtml(photo.caption || photo.alt))));
  }
});

test('resizing repacks the original photo nodes, keeps keyboard focus and coalesces observer updates', (t) => {
  const originals = new Map(['getComputedStyle', 'requestAnimationFrame', 'ResizeObserver', 'window'].map((key) => [key, globalThis[key]]));
  t.after(() => {
    for (const [key, value] of originals) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  });
  class Element {
    children = [];
    attributes = {};
    className = '';
    append(...children) {
      for (const child of children) {
        if (child.parent) child.parent.children = child.parent.children.filter((item) => item !== child);
        child.parent = this;
        this.children.push(child);
      }
    }
    replaceChildren(...children) { this.children = []; this.append(...children); }
    setAttribute(name, value) { this.attributes[name] = value; }
    getAttribute(name) { return this.attributes[name] || null; }
    classList = { contains: (name) => this.className.split(' ').includes(name) };
    contains(element) { return this === element || this.children.some((child) => child.contains(element)); }
    querySelectorAll(name) { return this.children.flatMap((child) => [...(child.tag === name ? [child] : []), ...child.querySelectorAll(name)]); }
    querySelector(name) { return this.querySelectorAll(name)[0]; }
  }
  const gallery = new Element();
  let width = 1328;
  gallery.getBoundingClientRect = () => ({ width });
  const photos = [4 / 3, 3 / 4, 4 / 3, 4 / 3, 4 / 3].map((ratio) => {
    const figure = new Element(); figure.tag = 'figure';
    const image = new Element(); image.tag = 'img';
    image.attributes = { width: ratio * 1200, height: 1200 };
    const link = new Element(); link.tag = 'a';
    figure.append(link); link.append(image);
    return figure;
  });
  gallery.append(...photos);
  const link = photos[1].querySelector('a');
  let focusCount = 0;
  const root = { querySelectorAll: () => [gallery], createElement: () => new Element(), activeElement: link };
  link.focus = () => { root.activeElement = link; focusCount += 1; };
  const frames = [];
  let observerCallback;
  let resizeCallback;
  globalThis.window = { innerHeight: 900, addEventListener(name, callback) { assert.equal(name, 'resize'); resizeCallback = callback; } };
  globalThis.getComputedStyle = () => ({ columnGap: '24px' });
  globalThis.requestAnimationFrame = (callback) => frames.push(callback);
  globalThis.ResizeObserver = class { constructor(callback) { observerCallback = callback; } observe(element) { assert.equal(element, gallery); } };
  initializeGalleries(root);
  assert.deepEqual(gallery.children.map(({ children }) => children.length), [3, 2]);
  assert.deepEqual(gallery.querySelectorAll('figure'), photos);
  width = 350;
  observerCallback(); observerCallback();
  assert.equal(frames.length, 1);
  frames.shift()();
  assert.deepEqual(gallery.children.map(({ children }) => children.length), [1, 1, 1, 1, 1]);
  assert.deepEqual(gallery.querySelectorAll('figure'), photos);
  assert.equal(root.activeElement, link);
  assert.equal(focusCount, 2);
  observerCallback(); frames.shift()();
  assert.equal(focusCount, 2, 'Height-only resize notifications do not trigger a layout loop');
  window.innerHeight = 320;
  resizeCallback(); frames.shift()();
  assert.equal(focusCount, 3, 'A changed screen height triggers repacking without a width change');
  assert.ok(gallery.children.every((row) => Number(row.attributes.style.match(/--row-width:([\d.]+)/)[1]) < 100), 'Photos scale down to fit a short screen');
  assert.deepEqual(gallery.querySelectorAll('figure'), photos);
});
