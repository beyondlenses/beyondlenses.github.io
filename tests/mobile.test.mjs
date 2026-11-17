import test from 'node:test';
import assert from 'node:assert/strict';
import { groupPhotoRuns, createPhotoPosts, photoPostHeight, photoGroupHeight } from '../src/photo-posts.js';
import { loadContent } from '../scripts/build.mjs';
import { renderStory, renderHome } from '../src/templates.mjs';

// Revisits and midnight boundaries must remain distinct, even at the same place.
test('mobile posts group only consecutive photos from the same dated location', () => {
  const at = (location, capturedOn = '2025-07-13') => ({ location, capturedOn });
  assert.deepEqual(groupPhotoRuns([at('A'), at('A'), at('B'), at('A'), at('A', '2025-07-14'), {}, {}]), [[0, 1], [2], [3], [4], [5], [6]]);
  assert.deepEqual(groupPhotoRuns(Array.from({ length: 19 }, () => at('A'))).map((run) => run.length), [8, 8, 3]);
  assert.deepEqual(groupPhotoRuns([]), []);
});

class Element {
  children = [];
  attributes = {};
  listeners = {};
  clientWidth = 390;
  scrollLeft = 0;
  textContent = '';
  style = { setProperty(name, value) { this[name] = value; } };
  append(...nodes) {
    for (const node of nodes) {
      if (node.parent) node.parent.children = node.parent.children.filter((child) => child !== node);
      node.parent = this;
      this.children.push(node);
    }
  }
  setAttribute(name, value) { this.attributes[name] = value; }
  getAttribute(name) { return this.attributes[name] ?? null; }
  addEventListener(name, callback) { this.listeners[name] = callback; }
  querySelector(name) { return this.children.find((child) => child.tag === name) || this.children.map((child) => child.querySelector(name)).find(Boolean); }
  scrollTo({ left, behavior }) { this.scrollLeft = left; this.behavior = behavior; this.listeners.scroll(); }
}

test('carousel swipes, dots and keyboard preserve source order and remembered position', (t) => {
  const globals = ['window', 'requestAnimationFrame'].map((name) => [name, globalThis[name]]);
  t.after(() => globals.forEach(([name, value]) => { if (value === undefined) delete globalThis[name]; else globalThis[name] = value; }));
  globalThis.window = { matchMedia: () => ({ matches: true }) };
  globalThis.requestAnimationFrame = (callback) => callback();
  const root = { createElement: (tag) => Object.assign(new Element(), { tag }) };
  const figures = Array.from({ length: 3 }, (_, i) => {
    const figure = root.createElement('figure');
    figure.setAttribute('data-photo-location', 'Kumortuli');
    figure.setAttribute('data-photo-date', '2021-10-02');
    figure.append(Object.assign(root.createElement('a'), { href: `/photo-${i}.webp` }));
    return figure;
  });
  const positions = new Map();
  let result = createPhotoPosts(root, figures, positions);
  result.restore();
  let [header, track, controls] = result.posts[0].children;
  assert.deepEqual(track.children, figures);
  assert.equal(header.children[1].textContent, '1 / 3');
  assert.equal(controls.children[0].disabled, true);
  assert.equal(controls.children[0].hidden, true);
  assert.equal(controls.children[2].hidden, false);
  track.scrollLeft = 390;
  track.listeners.scroll();
  assert.equal(header.children[1].textContent, '2 / 3');
  controls.children[1].children[2].listeners.click();
  assert.equal(track.scrollLeft, 780);
  assert.equal(track.behavior, 'instant', 'Reduced motion disables smooth scrolling');
  assert.equal(controls.children[2].disabled, true);
  assert.equal(controls.children[2].hidden, true);
  assert.equal(controls.children[0].hidden, false);
  result = createPhotoPosts(root, figures, positions);
  result.restore();
  [header, track] = result.posts[0].children;
  assert.equal(track.scrollLeft, 780, 'Resize keeps the current photograph');
  track.listeners.keydown({ target: track, key: 'Home', preventDefault() {} });
  assert.equal(track.scrollLeft, 0);
  track.listeners.keydown({ target: track, key: 'ArrowRight', preventDefault() {} });
  assert.equal(track.scrollLeft, 390);
  assert.deepEqual(track.children, figures, 'No duplicate image nodes');
});

test('album and section pickers resolve public R2 covers and retain fallback links', async () => {
  const { site, trips } = await loadContent();
  const trip = trips.find(({ slug }) => slug === 'sikkim');
  const html = renderStory(site, trip, trips[0], trips);
  assert.ok(html.includes('aria-label="Quick navigation"'));
  assert.ok(html.includes('data-open-drawer="album-drawer"'));
  assert.ok(html.includes('data-open-drawer="section-drawer"'));
  assert.equal((html.match(/data-album-option /g) || []).length, trips.length);
  assert.equal((html.match(/aria-current="page"/g) || []).length, 1);
  for (let i = 0; i < trip.chapters.length; i += 1) assert.ok(html.includes(`href="#chapter-${i + 1}"`));
  const albumPicker = html.split('id="album-drawer"')[1].split('</dialog>')[0];
  assert.ok(!albumPicker.includes('src="/photos/spiti/'));
  assert.ok(albumPicker.includes(site.photoBaseUrl));
  assert.ok(html.includes('data-expandable'));
  assert.ok(renderHome(site, trips).includes('href="/#journal" data-open-drawer="album-drawer"'));
});


test('uniform groups keep their shape while mixed groups share a screen-bounded frame', () => {
  assert.equal(photoPostHeight(2000, 1000, 390, 844), 195);
  assert.equal(photoPostHeight(1000, 2000, 390, 844), 624);
  assert.equal(photoPostHeight(2000, 1500, 390, 844), 292.5);
  assert.equal(photoPostHeight(2000, 3000, 844, 390), 170);
  assert.equal(photoGroupHeight([{ width: 2000, height: 1000 }, { width: 1000, height: 500 }], 390, 844), 195);
  assert.equal(photoGroupHeight([{ width: 1000, height: 2000 }, { width: 500, height: 1000 }], 390, 844), 624);
  assert.equal(photoGroupHeight([{ width: 2000, height: 1000 }, { width: 1000, height: 2000 }], 390, 844), 292.5);
  assert.equal(photoGroupHeight([{ width: 2000, height: 1000 }, { width: 1000, height: 2000 }], 844, 390), 170);
  assert.equal(photoGroupHeight([{}, {}], 390, 844), 292.5);
  assert.equal(photoGroupHeight([], 390, 844), 0);
});

test('home album shortcuts have concise location labels and accessible full names', async () => {
  const { site, trips } = await loadContent();
  const html = renderHome(site, trips);
  const grid = html.split('<div class="album-regions"')[1].split('<section class="about"')[0];
  assert.equal((grid.match(/class="card-location"/g) || []).length, trips.length);
  assert.ok(html.includes('id="album-grid" tabindex="-1"'));
  assert.ok(html.includes('aria-label="Map zoom"'));
  for (const trip of trips) {
    const label = trip.mapLocation.label.replaceAll('&', '&amp;');
    assert.ok(grid.includes(`class="card-location">${label}</span>`));
  }
});


test('mixed-shape swipes keep the image, captions and following content stationary', (t) => {
  const globals = ['window', 'requestAnimationFrame'].map((name) => [name, globalThis[name]]);
  t.after(() => globals.forEach(([name, value]) => { if (value === undefined) delete globalThis[name]; else globalThis[name] = value; }));
  globalThis.window = { innerHeight: 844, matchMedia: () => ({ matches: true }) };
  globalThis.requestAnimationFrame = (callback) => callback();
  const root = { createElement: (tag) => Object.assign(new Element(), { tag }) };
  const captionHeights = [40, 20];
  const figures = [[2000, 1000], [1000, 2000]].map(([width, height], i) => {
    const figure = root.createElement('figure');
    figure.setAttribute('data-photo-location', 'A lakeside stop');
    const link = Object.assign(root.createElement('a'), { href: `/frame-${i}.webp` });
    const image = root.createElement('img');
    image.setAttribute('width', width);
    image.setAttribute('height', height);
    link.append(image);
    const caption = root.createElement('figcaption');
    caption.getBoundingClientRect = () => ({ height: captionHeights[i] });
    figure.append(link, caption);
    return figure;
  });
  const { posts, restore } = createPhotoPosts(root, figures);
  restore();
  const post = posts[0];
  const [, track, controls] = post.children;
  assert.equal(post.style['--post-image-height'], '292.5px');
  assert.equal(track.style.height, '332.5px');
  controls.children[2].listeners.click();
  assert.equal(post.style['--post-image-height'], '292.5px');
  assert.equal(track.style.height, '332.5px');
  captionHeights[1] = 80;
  post.listeners.click({ target: { closest: () => true } });
  assert.equal(track.style.height, '372.5px', 'Explicit caption expansion reserves enough room');
  controls.children[0].listeners.click();
  assert.equal(track.style.height, '372.5px', 'Swiping back retains the expanded group height');
  track.clientWidth = 320;
  restore();
  assert.equal(post.style['--post-image-height'], '240px');
  assert.equal(track.style.height, '320px', 'A viewport resize recalculates the common frame');
});
