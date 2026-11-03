import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { build, loadContent, root, validateContent } from '../scripts/build.mjs';
import { escapeHtml, renderHome, renderStory } from '../src/templates.mjs';

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

test('content loading fails clearly when photographs are missing', async (t) => {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), 'beyondlenses-missing-'));
  t.after(() => rm(projectRoot, { recursive: true, force: true }));
  await cp(path.join(root, 'content'), path.join(projectRoot, 'content'), { recursive: true });
  await assert.rejects(loadContent(projectRoot), /Missing photograph: public\//);
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
