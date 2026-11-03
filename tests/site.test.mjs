import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { build, loadContent, root, validateContent } from '../scripts/build.mjs';
import { escapeHtml, formatDate, renderHome, renderStory } from '../src/templates.mjs';
import { allPhotos } from '../src/templates.mjs';
import { planPhotoUpload } from '../scripts/upload-photos.mjs';

const content = await loadContent();
const fresh = () => structuredClone(content);

test('all trip content is valid and the featured story exists', () => {
  assert.doesNotThrow(() => validateContent(content.site, content.trips));
  assert.ok(content.trips.find((trip) => trip.slug === content.site.featuredTrip));
});

test('duplicate and unsafe slugs are rejected before pages can be overwritten', () => {
  const { site, trips } = fresh();
  trips.push(structuredClone(trips[0]));
  assert.throws(() => validateContent(site, trips), /duplicate trip slug/);
  trips.pop();
  trips[0].slug = '../outside';
  assert.throws(() => validateContent(site, trips), /Invalid or duplicate/);
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
  trip.chapters[0].photos.push(structuredClone(trip.cover));
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
  site.featuredTrip = trip.slug;
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
  site.featuredTrip = trip.slug;
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
  const trip = trips[0];
  site.featuredTrip = trip.slug;
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
  assert.equal(result.pages, content.trips.length + 3);
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
