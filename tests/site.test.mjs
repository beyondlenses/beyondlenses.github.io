import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { build, latestPhotoDate, loadContent, root, validateContent } from '../scripts/build.mjs';
import { escapeHtml, formatDate, renderHome, renderStory } from '../src/templates.mjs';
import { allPhotos } from '../src/templates.mjs';
import { planPhotoUpload } from '../scripts/upload-photos.mjs';
import { continentForCountry, groupAtlasCountries, projectLocation } from '../src/atlas.mjs';

const content = await loadContent();
const fresh = () => structuredClone(content);

test('all trip content is valid without a featured story setting', () => {
  assert.doesNotThrow(() => validateContent(content.site, content.trips));
  assert.equal(content.site.featuredTrip, undefined);
});

test('albums use the latest selected photo date throughout the journal and map panels', () => {
  assert.deepEqual(content.trips.slice(0, 4).map(({ slug }) => slug), ['spiti', 'finland', 'portugal', 'japan']);
  const dates = content.trips.map((trip) => allPhotos(trip).map(({ capturedOn }) => capturedOn).filter(Boolean).sort().at(-1));
  assert.ok(dates.every(Boolean));
  assert.deepEqual(dates, [...dates].sort().reverse());
  const home = renderHome(content.site, content.trips);
  const journal = home.split('<div class="story-grid">')[1].split('</section>')[0];
  assert.deepEqual([...journal.matchAll(/class="card-link" href="\/stories\/([^/]+)\//g)].map((match) => match[1]), content.trips.map(({ slug }) => slug));
  for (const country of groupAtlasCountries(content.trips)) {
    const panel = home.split(`id="atlas-country-${country.id}"`)[1].split('</section>')[0];
    assert.deepEqual([...panel.matchAll(/data-atlas-album="([^"]+)"/g)].map((match) => match[1]), content.trips.filter((trip) => country.trips.includes(trip)).map(({ slug }) => slug));
  }
});

test('photo recency includes the cover and uses trip dates only for undated photos', () => {
  const trip = structuredClone(content.trips.find(({ slug }) => slug === 'japan'));
  trip.endDate = '2026-02-28';
  assert.equal(latestPhotoDate(trip), '2026-02-08');
  trip.cover.capturedOn = '2026-02-10';
  assert.equal(latestPhotoDate(trip), '2026-02-10');
  for (const photo of allPhotos(trip)) delete photo.capturedOn;
  assert.equal(latestPhotoDate(trip), '2026-02-28');
  delete trip.endDate;
  assert.equal(latestPhotoDate(trip), '');
});

test('Japan dates match the selected original-photo manifest in February 2026', async () => {
  const trip = content.trips.find(({ slug }) => slug === 'japan');
  const manifest = JSON.parse(await readFile(path.join(root, 'content/selections/japan.json'), 'utf8'));
  const dates = new Map(manifest.photos.map(({ src, capturedOn }) => [src, capturedOn]));
  assert.equal(trip.startDate, '2026-02-04');
  assert.equal(trip.endDate, '2026-02-08');
  assert.equal(allPhotos(trip).length, 37);
  for (const photo of allPhotos(trip)) assert.equal(photo.capturedOn, dates.get(photo.src));
  const story = renderStory(content.site, trip);
  assert.ok(story.includes('<time datetime="2026-02-08">8 Feb 2026</time>'));
});

test('the homepage opens with the map and groups Europe without combining its country albums', () => {
  const { site, trips } = fresh();
  const home = renderHome(site, trips);
  const map = home.match(/<svg class="atlas-map"[\s\S]*?<\/svg>/)?.[0];
  const groups = groupAtlasCountries(trips);
  const top = home.split('<body')[1].split('<section class="journal')[0];
  assert.ok(map?.includes('href="/images/world-atlas.svg"'));
  assert.ok(!home.includes('Featured story') && !home.includes('class="feature'));
  assert.ok(!home.includes('class="atlas-destinations"'));
  for (const removed of ['<nav', 'class="header-note"', 'class="intro', 'Places. People. Perspective.', 'Some places', 'Explore the map', 'An atlas of memories', 'A world of', 'class="atlas-tally"', 'Choose a country.']) assert.ok(!top.includes(removed), removed);
  const world = map.split('<g data-atlas-world>')[1].split('<g class="atlas-album-layer"')[0];
  assert.equal((world.match(/class="atlas-location"/g) || []).length, groups.length);
  assert.ok(!world.includes('/stories/'));
  const europe = groups.find((group) => group.id === 'europe');
  assert.deepEqual(europe.trips.map((trip) => trip.slug).sort(), ['britain', 'finland', 'france', 'germany', 'portugal']);
  const turkey = groups.find((group) => group.id === 'turkey');
  assert.deepEqual(turkey.trips.map((trip) => trip.slug), ['turkey']);
  assert.deepEqual(turkey.outlineIds, ['turkey']);
  assert.ok(!europe.aliases.includes('turkey'));
  assert.equal(continentForCountry('Turkey'), 'Asia');
  for (const id of europe.outlineIds) {
    assert.ok(map.includes(`/images/atlas-countries.svg#${id}`));
    assert.ok(!world.includes(`href="#atlas-country-${id}"`));
  }
  assert.deepEqual(trips, content.trips, 'Map grouping preserves the individual country metadata');
  for (const country of groups) {
    const id = `atlas-country-${country.id}`;
    assert.ok(world.includes(`href="#${id}"`));
    const panel = home.split(`<section class="atlas-country-panel" id="${id}"`)[1]?.split('</section>')[0];
    assert.ok(panel, `Country panel exists for ${country.name}`);
    assert.equal((panel.match(/class="atlas-album-card"/g) || []).length, country.trips.length);
    for (const trip of trips) assert.equal(panel.includes(`href="/stories/${trip.slug}/"`), country.trips.includes(trip));
    for (const trip of country.trips) {
      assert.ok(map.includes(`href="/stories/${trip.slug}/"`));
      assert.ok(map.includes(`aria-label="${escapeHtml(trip.mapLocation.label)}: ${escapeHtml(trip.title)}"`));
    }
  }
});

test('India uses one continuous mainland outline including all supplementary territories', async () => {
  const india = groupAtlasCountries(content.trips).find((group) => group.id === 'india');
  assert.deepEqual(india.outlineIds, ['india']);
  const home = renderHome(content.site, content.trips);
  const area = home.match(/<a class="atlas-country-area"[^>]*data-atlas-country="india"[\s\S]*?<\/a>/)[0];
  assert.equal((area.match(/<use /g) || []).length, 1);
  assert.ok(area.includes('href="/images/atlas-countries.svg#india"'));
  assert.ok(!home.includes('atlas-claimed') && !home.includes('Territory claimed but not controlled'));
  const territories = JSON.parse(await readFile(path.join(root, 'content/maps/india-territories.geojson'), 'utf8'));
  const outlines = await readFile(path.join(root, 'public/images/atlas-countries.svg'), 'utf8');
  assert.ok(!outlines.includes('id="india-claimed"'));
  const indiaSvg = outlines.split('<g id="india"')[1].split('</g>')[0];
  const rings = [...indiaSvg.matchAll(/d="([^"]+)"/g)].map((match) => {
    assert.equal((match[1].match(/M/g) || []).length, 1, 'No internal seam rings');
    return [...match[1].matchAll(/([\d.-]+),([\d.-]+)/g)].map((point) => [Number(point[1]), Number(point[2])]);
  });
  const contains = (ring, [x, y]) => {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
  const locations = [[79, 23], [94.1, 25.7], [74.31, 35.92], [73.47, 34.37], [79, 35], [76.7, 36.1], [77.15, 35.4]];
  assert.ok(rings.some((ring) => locations.every(([longitude, latitude]) => contains(ring, projectLocation(longitude, latitude)))), 'Mainland, northeast and northern territories share a single exterior path');
  for (const { properties, geometry } of territories.features) {
    const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
    for (const [longitude, latitude] of polygons.flat(2)) {
      const [x, y] = projectLocation(longitude, latitude);
      const px = x * india.view.scale + india.view.x, py = y * india.view.scale + india.view.y;
      assert.ok(px >= 0 && px <= 1200 && py >= 0 && py <= 600, `${properties.name} remains inside India's view`);
    }
  }
});

test('Asia South-east groups Singapore, Vietnam and Malaysia while preserving country links', () => {
  const trips = [
    { country: 'Singapore', slug: 'singapore', mapLocation: { longitude: 103.85, latitude: 1.29 } },
    { country: 'Vietnam', slug: 'vietnam', mapLocation: { longitude: 108.22, latitude: 16.06 } },
    { country: 'Malaysia', slug: 'malaysia', mapLocation: { longitude: 101.69, latitude: 3.14 } },
  ];
  const groups = groupAtlasCountries(trips);
  assert.equal(groups.length, 1);
  const region = groups[0];
  assert.equal(region.id, 'asia-south-east');
  assert.equal(region.label, 'Asia South-east');
  assert.deepEqual(region.trips, trips);
  assert.deepEqual(region.outlineIds, ['singapore', 'vietnam', 'malaysia']);
  assert.deepEqual(region.aliases, ['singapore', 'vietnam', 'malaysia']);
  const home = renderHome(content.site, content.trips);
  assert.ok(home.includes('href="#atlas-country-asia-south-east"'));
  assert.ok(home.includes('data-atlas-label="Asia South-east"'));
  for (const { slug } of trips) assert.ok(!home.includes(`id="atlas-country-${slug}"`));
});

test('the journal offers continent filters while cards retain their country labels', () => {
  const { site, trips } = fresh();
  const home = renderHome(site, trips);
  const filters = home.match(/<div class="filters"[\s\S]*?<\/div>/)[0];
  const continents = new Set(trips.map((trip) => continentForCountry(trip.country)));
  assert.ok(filters.includes('aria-label="Filter stories by continent"'));
  assert.deepEqual([...filters.matchAll(/data-filter="([^"]+)"/g)].map((match) => match[1]), ['all', ...continents]);
  assert.ok(!home.includes('data-country='));
  for (const trip of trips) {
    assert.ok(home.includes(`data-continent="${continentForCountry(trip.country)}"`));
    assert.ok(home.includes(`/ ${escapeHtml(trip.country)}</span>`));
  }
});

test('Around Ontario preserves the four collections and keeps the snowy Niagara concert together', async () => {
  const trip = content.trips.find((item) => item.slug === 'around-ontario');
  const manifest = JSON.parse(await readFile(path.join(root, 'content/selections/around-ontario.json'), 'utf8'));
  assert.equal(trip.title, 'Around Ontario');
  assert.equal(trip.showChapterIndex, false);
  assert.deepEqual([...trip.legacySlugs].sort(), ['algonquin', 'montreal', 'moosonee', 'niagara-falls']);
  assert.ok(trip.legacySlugs.every((slug) => !content.trips.some((item) => item.slug === slug)));
  assert.equal(allPhotos(trip).length, 101);
  assert.equal(manifest.selectedImageCount, 101);
  assert.equal(new Set(manifest.photos.map((photo) => photo.source)).size, 101);
  assert.deepEqual(new Set(manifest.photos.map((photo) => photo.src)), new Set(allPhotos(trip).map((photo) => photo.src)));
  assert.equal(manifest.photos.filter((photo) => photo.previousSrc).length, 95);
  assert.equal(manifest.photos.filter((photo) => photo.role === 'cover').length, 1);
  assert.equal(Object.values(manifest.dailyCounts).reduce((a, b) => a + b, 0), 101);
  const concert = trip.chapters.find((chapter) => chapter.title.includes('Lumineers'));
  assert.equal(concert.date, '2025-02-16');
  assert.match(concert.location, /Niagara Falls/);
  assert.equal(concert.photos.length, 13);
  assert.ok(concert.photos.every((photo) => photo.capturedOn === concert.date));
  assert.equal(trip.chapters[trip.chapters.indexOf(concert) - 1].title, 'Snow beside the falls');
  const toronto = content.trips.find((item) => item.slug === 'toronto');
  assert.equal(allPhotos(toronto).length, 129);
  assert.ok(!toronto.chapters.some((chapter) => chapter.title.includes('Lumineers')));
  assert.ok(allPhotos(toronto).some((photo) => photo.src.endsWith('/concert-lights.webp')));
});

test('country zoom frames keep every album’s pin visible', () => {
  for (const country of groupAtlasCountries(content.trips)) {
    assert.ok(country.view.scale > 1, `${country.label} zooms in`);
    for (const trip of country.trips) {
      const [x, y] = projectLocation(trip.mapLocation.longitude, trip.mapLocation.latitude);
      const px = x * country.view.scale + country.view.x, py = y * country.view.scale + country.view.y;
      assert.ok(px >= 0 && px <= 1200 && py >= 0 && py <= 600, `${trip.slug} pin remains in its country view`);
    }
  }
});

test('invalid or missing atlas coordinates fail before building a misleading map', () => {
  for (const location of [undefined, { latitude: 91, longitude: 0 }, { latitude: 0, longitude: -181 }, { latitude: '43', longitude: -79 }]) {
    const { site, trips } = fresh();
    trips[0].mapLocation = location;
    assert.throws(() => validateContent(site, trips), /mapLocation needs a valid latitude and longitude/);
  }
  for (const labelPosition of [[-10, 20], [500, 900], [20], ['100', 200]]) {
    const { site, trips } = fresh();
    trips[0].mapLocation.labelPosition = labelPosition;
    assert.throws(() => validateContent(site, trips), /labelPosition must be a point inside the atlas/);
  }
});

test('duplicate and unsafe slugs are rejected before pages can be overwritten', () => {
  const { site, trips } = fresh();
  trips.push(structuredClone(trips[0]));
  assert.throws(() => validateContent(site, trips), /duplicate trip slug/);
  trips.pop();
  trips[0].slug = '../outside';
  assert.throws(() => validateContent(site, trips), /Invalid or duplicate/);
});

test('legacy album routes cannot overwrite active pages or escape the stories directory', () => {
  for (const aliases of ['old-trip', ['../outside'], ['old-trip', 'old-trip'], [content.trips[1].slug]]) {
    const { site, trips } = fresh();
    trips[0].legacySlugs = aliases;
    assert.throws(() => validateContent(site, trips), /legacySlugs must be an array|Invalid or duplicate legacy slug/);
  }
});

test('photo paths cannot reference outside files or remote hosts', () => {
  for (const source of ['/photos/../secret.jpg', 'https://example.com/image.jpg', '/photos/picture.svg']) {
    const { site, trips } = fresh();
    trips[0].cover.src = source;
    assert.throws(() => validateContent(site, trips), /photo.src/);
  }
});

test('photographs require alt text and complete license links', () => {
  const { site, trips } = fresh();
  trips[0].cover.alt = '';
  assert.throws(() => validateContent(site, trips), /alt text/);
  trips[0].cover.alt = 'An accessible description';
  trips[0].cover.license = 'CC BY-SA 4.0';
  delete trips[0].cover.licenseUrl;
  assert.throws(() => validateContent(site, trips), /licensed photographs/);
});

test('trip text is rendered as text rather than executable HTML', () => {
  const { site, trips } = fresh();
  const unsafe = '<script>alert("hello")</script>';
  trips[0].title = unsafe;
  trips[0].mapLocation.label = unsafe;
  trips[0].chapters[0].paragraphs[0] = unsafe;
  for (const html of [renderHome(site, trips), renderStory(site, trips[0], trips[1])]) {
    assert.ok(!html.includes(unsafe));
    assert.ok(html.includes(escapeHtml(unsafe)));
  }
});

test('capture dates render as calendar dates with semantic time elements and place labels', () => {
  const { site, trips } = fresh();
  const trip = trips[0];
  trip.startDate = '2025-04-26';
  trip.endDate = '2025-05-10';
  trip.chapters[0].date = '2025-04-26';
  trip.chapters[0].location = 'İstanbul & the coast';
  trip.chapters[0].photos[0].capturedOn = '2025-04-26';
  trip.chapters[0].photos[0].location = 'A <quiet> courtyard';
  const html = renderStory(site, trip, null);
  assert.equal(formatDate('2025-04-26'), '26 Apr 2025');
  assert.ok(html.includes('<time datetime="2025-04-26">26 Apr 2025</time>'));
  assert.ok(html.includes('İstanbul &amp; the coast'));
  assert.ok(html.includes('A &lt;quiet&gt; courtyard'));
  assert.ok(html.includes('id="chapters"'));
  assert.ok(html.includes('href="#chapters"'));
  trip.showChapterIndex = false;
  const withoutIndex = renderStory(site, trip, null);
  assert.ok(!withoutIndex.includes('id="chapters"'));
  assert.ok(!withoutIndex.includes('href="#chapters"'));
  assert.ok(withoutIndex.includes('<time datetime="2025-04-26">26 Apr 2025</time>'));
});

test('impossible dates and reversed trip ranges are rejected', () => {
  const { site, trips } = fresh();
  trips[0].startDate = '2025-02-30';
  trips[0].endDate = '2025-05-10';
  assert.throws(() => validateContent(site, trips), /valid calendar date/);
  trips[0].startDate = '2025-05-11';
  assert.throws(() => validateContent(site, trips), /trip dates must be chronological/);
});

test('photos cannot be classified under a different day or out-of-order chapter', () => {
  const { site, trips } = fresh();
  const trip = trips[0];
  trip.startDate = '2025-04-26';
  trip.endDate = '2025-05-10';
  trip.chapters[0].date = '2025-04-27';
  for (const photo of trip.chapters[0].photos) photo.capturedOn = '2025-04-27';
  trip.chapters[0].photos[0].capturedOn = '2025-04-28';
  assert.throws(() => validateContent(site, trips), /photograph date does not match/);
  trip.chapters[0].photos[0].capturedOn = '2025-04-27';
  trip.chapters[1].date = '2025-04-26';
  assert.throws(() => validateContent(site, trips), /dated chapters must be chronological/);
  trip.chapters[1].date = '2025-05-11';
  assert.throws(() => validateContent(site, trips), /chapter date falls outside/);
});

test('published original-photo albums reject repeated photographs', () => {
  const { site, trips } = fresh();
  const trip = trips[0];
  trip.demo = false;
  trip.chapters[0].photos.push(structuredClone(trip.chapters[0].photos[0]));
  assert.throws(() => validateContent(site, trips), /repeated photograph/);
});

test('R2 albums require a public HTTPS base URL and WebP object paths', () => {
  const { site, trips } = fresh();
  const trip = trips[0];
  trip.photoStorage = 'r2';
  delete site.photoBaseUrl;
  assert.throws(() => validateContent(site, trips), /R2 photographs require site.photoBaseUrl/);
  for (const base of ['http://images.example.test', 'https://user:secret@images.example.test', 'https://images.example.test/?token=secret', 'https://images.example.test/#fragment', 'https://account.r2.cloudflarestorage.com']) {
    site.photoBaseUrl = base;
    assert.throws(() => validateContent(site, trips), /public HTTPS/);
  }
  site.photoBaseUrl = 'https://images.example.test';
  trip.cover.src = '/photos/japan/example.jpg';
  assert.throws(() => validateContent(site, trips), /R2 photos must be WebP/);
  trip.cover.src = '/photos/another-trip/example.webp';
  assert.throws(() => validateContent(site, trips), /R2 photos must be WebP/);
});

test('R2 covers, galleries, viewer links, and sharing previews use the public URL', () => {
  const { site, trips } = fresh();
  site.photoBaseUrl = 'https://images.example.test/media/';
  const trip = trips[0];
  trip.photoStorage = 'r2';
  const original = structuredClone(trip);
  const cover = `https://images.example.test/media${trip.cover.src}`;
  const home = renderHome(site, trips);
  const story = renderStory(site, trip, trips[1]);
  const nextStory = renderStory(site, trips[1], trip);
  for (const html of [home, story]) {
    assert.ok(html.includes(`property="og:image" content="${cover}"`));
    assert.ok(html.includes(`src="${cover}"`));
    assert.ok(!html.includes(`${site.url}https://`));
  }
  for (const photo of trip.chapters.flatMap((chapter) => chapter.photos)) {
    const url = `https://images.example.test/media${photo.src}`;
    assert.ok(story.includes(`src="${url}"`));
    assert.ok(story.includes(`href="${url}" data-photo`));
  }
  assert.ok(nextStory.includes(`src="${cover}"`));
  assert.deepEqual(trip, original, 'Rendering preserves local source paths in content');
});

async function r2Fixture(t, { exports = false } = {}) {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), 'beyondlenses-r2-'));
  t.after(() => rm(projectRoot, { recursive: true, force: true }));
  const { site, trips } = fresh();
  const trip = trips[0];
  trip.photoStorage = 'r2';
  trip.chapters = [trip.chapters[0]];
  trip.chapters[0].photos = [trip.chapters[0].photos[0]];
  site.photoBaseUrl = 'https://images.example.test';
  await mkdir(path.join(projectRoot, 'content/trips'), { recursive: true });
  await mkdir(path.join(projectRoot, 'content/selections'), { recursive: true });
  await mkdir(path.join(projectRoot, 'public/photos'), { recursive: true });
  await cp(path.join(root, 'src'), path.join(projectRoot, 'src'), { recursive: true });
  await writeFile(path.join(projectRoot, 'content/site.json'), JSON.stringify(site));
  await writeFile(path.join(projectRoot, 'content/trips/selected.json'), JSON.stringify(trip));
  const manifest = { photos: allPhotos(trip).map(({ src }) => ({ src })) };
  await writeFile(path.join(projectRoot, 'content/selections', `${trip.slug}.json`), JSON.stringify(manifest));
  if (exports) for (const photo of allPhotos(trip)) {
    const destination = path.join(projectRoot, 'public', photo.src);
    await mkdir(path.dirname(destination), { recursive: true });
    await cp(path.join(root, 'public', photo.src), destination);
  }
  await writeFile(path.join(projectRoot, 'public/photos/unselected.webp'), 'not selected');
  await writeFile(path.join(projectRoot, 'public/photos/do-not-add-this-persons-photo.webp'), 'private reference');
  return { projectRoot, trip, site, manifest };
}

test('a fresh checkout builds R2 albums without downloading or bundling photos', async (t) => {
  const { projectRoot, trip, site } = await r2Fixture(t);
  await build({ projectRoot });
  const output = path.join(projectRoot, 'dist');
  assert.equal(await stat(path.join(output, 'photos')).catch(() => null), null);
  const html = await readFile(path.join(output, `stories/${trip.slug}/index.html`), 'utf8');
  assert.ok(html.includes(`src="${site.photoBaseUrl}${trip.cover.src}"`));
  assert.ok((await stat(path.join(output, 'assets/styles.css'))).isFile());
});

test('the upload plan includes only selected WebP objects and honors exclusions', async (t) => {
  const { projectRoot, trip, manifest } = await r2Fixture(t, { exports: true });
  const plan = await planPhotoUpload({ projectRoot, slugs: [trip.slug] });
  assert.equal(plan.remote, 'r2:beyondlenses');
  assert.deepEqual(plan.files, allPhotos(trip).map((photo) => photo.src.slice(1)).sort());
  assert.equal(plan.albums[0].count, 2);
  assert.ok(plan.albums[0].bytes > 0);
  assert.ok(plan.files.every((file) => file.endsWith('.webp')));
  await assert.rejects(planPhotoUpload({ projectRoot, slugs: ['missing-album'] }), /Unknown album/);
  manifest.excludedPhotos = [{ src: trip.cover.src }];
  await writeFile(path.join(projectRoot, 'content/selections', `${trip.slug}.json`), JSON.stringify(manifest));
  await assert.rejects(planPhotoUpload({ projectRoot }), /not approved for upload/);
  manifest.excludedPhotos = [];
  await writeFile(path.join(projectRoot, 'content/selections', `${trip.slug}.json`), JSON.stringify(manifest));
  await rm(path.join(projectRoot, 'public', trip.cover.src));
  await assert.rejects(planPhotoUpload({ projectRoot }), /Missing or invalid local WebP/);
});

test('content loading fails clearly when photographs are missing', async (t) => {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), 'beyondlenses-missing-'));
  t.after(() => rm(projectRoot, { recursive: true, force: true }));
  await cp(path.join(root, 'content'), path.join(projectRoot, 'content'), { recursive: true });
  await assert.rejects(loadContent(projectRoot), /Missing photograph: public\//);
});

test('unused photographs and private reference images are not published', async (t) => {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), 'beyondlenses-selection-'));
  t.after(() => rm(projectRoot, { recursive: true, force: true }));
  const { site, trips } = fresh();
  const trip = trips.find((trip) => trip.photoStorage !== 'r2');
  trip.chapters = [trip.chapters[0]];
  trip.chapters[0].photos = [trip.chapters[0].photos[0]];
  await mkdir(path.join(projectRoot, 'content/trips'), { recursive: true });
  await mkdir(path.join(projectRoot, 'public/photos'), { recursive: true });
  await cp(path.join(root, 'src'), path.join(projectRoot, 'src'), { recursive: true });
  await writeFile(path.join(projectRoot, 'content/site.json'), JSON.stringify(site));
  await writeFile(path.join(projectRoot, 'content/trips/selected.json'), JSON.stringify(trip));
  for (const photo of [trip.cover, ...trip.chapters[0].photos]) {
    const destination = path.join(projectRoot, 'public', photo.src);
    await mkdir(path.dirname(destination), { recursive: true });
    await cp(path.join(root, 'public', photo.src), destination);
  }
  for (const filename of ['unused.webp', 'do-not-add-this-persons-photo.webp']) {
    await writeFile(path.join(projectRoot, 'public/photos', filename), 'unpublished fixture');
  }
  const output = path.join(projectRoot, 'dist');
  await build({ projectRoot, output });
  assert.ok((await stat(path.join(output, trip.cover.src))).isFile());
  assert.ok((await stat(path.join(output, trip.chapters[0].photos[0].src))).isFile());
  for (const filename of ['unused.webp', 'do-not-add-this-persons-photo.webp']) {
    assert.equal(await stat(path.join(output, 'photos', filename)).catch(() => null), null);
  }
  trip.cover.src = '/photos/do-not-add-this-persons-photo.webp';
  assert.throws(() => validateContent(site, [trip]), /private exclusion reference/);
});

test('generated pages have working local assets, navigation, and chapter anchors', async (t) => {
  const output = await mkdtemp(path.join(os.tmpdir(), 'beyondlenses-build-'));
  t.after(() => rm(output, { recursive: true, force: true }));
  const result = await build({ output });
  assert.equal(result.pages, content.trips.length + 3 + content.trips.reduce((sum, trip) => sum + (trip.legacySlugs || []).length, 0));
  const sitemap = await readFile(path.join(output, 'sitemap.xml'), 'utf8');
  for (const trip of content.trips) for (const slug of trip.legacySlugs || []) {
    const redirect = await readFile(path.join(output, `stories/${slug}/index.html`), 'utf8');
    assert.ok(redirect.includes(`<meta http-equiv="refresh" content="0; url=/stories/${trip.slug}/">`));
    assert.ok(redirect.includes(`<link rel="canonical" href="${content.site.url}/stories/${trip.slug}/">`));
    assert.ok(!sitemap.includes(`/stories/${slug}/`));
  }
  const walk = async (directory) => {
    const files = [];
    for (const item of await readdir(directory, { withFileTypes: true })) {
      const filename = path.join(directory, item.name);
      if (item.isDirectory()) files.push(...await walk(filename));
      else files.push(filename);
    }
    return files;
  };
  const files = await walk(output);
  assert.ok(!files.some((filename) => filename.endsWith('.gitkeep')));
  assert.ok(!files.some((filename) => filename.endsWith('do-not-add-this-persons-photo.webp')));
  assert.ok(files.includes(path.join(output, 'sitemap.xml')));
  assert.ok(files.includes(path.join(output, '.nojekyll')));
  for (const filename of files.filter((file) => file.endsWith('.html'))) {
    const html = await readFile(filename, 'utf8');
    const route = path.relative(output, filename).split(path.sep).join('/');
    assert.equal((html.match(/<h1[\s>]/g) || []).length, 1, `One main heading: ${route}`);
    for (const [, link] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const url = new URL(link.replaceAll('&amp;', '&'), `${content.site.url}/${route}`);
      if (url.origin !== content.site.url) continue;
      let destination = path.join(output, decodeURIComponent(url.pathname));
      const info = await stat(destination).catch(() => null);
      assert.ok(info, `${route}: ${link} exists`);
      if (info.isDirectory()) destination = path.join(destination, 'index.html');
      assert.ok((await stat(destination)).isFile(), `${route}: ${link} resolves to a file`);
      if (url.hash) {
        const target = await readFile(destination, 'utf8');
        assert.ok(target.includes(`id="${decodeURIComponent(url.hash.slice(1))}"`), `${route}: ${link} has an anchor`);
      }
    }
  }
});
