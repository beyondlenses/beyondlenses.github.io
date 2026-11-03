import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { allPhotos, escapeHtml, render404, renderCredits, renderHome, renderStory, renderStoryRedirect } from '../src/templates.mjs';
import { usesR2 } from '../src/photos.mjs';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const requireText = (value, label) => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be nonempty text.`);
};

const requireDate = (value, label) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${label} must be a date in YYYY-MM-DD format.`);
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error(`${label} is not a valid calendar date.`);
};

export function validateContent(site, trips) {
  for (const key of ['name', 'url', 'description', 'headline', 'introduction', 'about']) requireText(site[key], `site.${key}`);
  const siteUrl = new URL(site.url);
  if (siteUrl.protocol !== 'https:' || site.url !== siteUrl.origin) throw new Error('site.url must be an HTTPS origin without a trailing slash.');
  if (site.photoBaseUrl !== undefined) {
    requireText(site.photoBaseUrl, 'site.photoBaseUrl');
    const photoUrl = new URL(site.photoBaseUrl);
    if (photoUrl.protocol !== 'https:' || photoUrl.username || photoUrl.password || photoUrl.search || photoUrl.hash || photoUrl.hostname.endsWith('.r2.cloudflarestorage.com')) throw new Error('site.photoBaseUrl must be a public HTTPS base URL without credentials, a query, or a fragment; the private R2 S3 endpoint is not supported.');
  }
  if (!trips.length) throw new Error('Add at least one trip in content/trips/.');
  const slugs = new Set();
  for (const trip of trips) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(trip.slug) || slugs.has(trip.slug)) throw new Error(`Invalid or duplicate trip slug: ${trip.slug}`);
    slugs.add(trip.slug);
    for (const key of ['title', 'subtitle', 'country', 'location', 'category']) requireText(trip[key], `${trip.slug}.${key}`);
    const location = trip.mapLocation;
    if (!location || !Number.isFinite(location.latitude) || Math.abs(location.latitude) > 90 || !Number.isFinite(location.longitude) || Math.abs(location.longitude) > 180) throw new Error(`${trip.slug}.mapLocation needs a valid latitude and longitude.`);
    requireText(location.label, `${trip.slug}.mapLocation.label`);
    if (location.labelPosition !== undefined && (!Array.isArray(location.labelPosition) || location.labelPosition.length !== 2 || !location.labelPosition.every((value, index) => Number.isFinite(value) && value >= 30 && value <= [1170, 570][index]))) throw new Error(`${trip.slug}.mapLocation.labelPosition must be a point inside the atlas.`);
    if (trip.demo !== undefined && typeof trip.demo !== 'boolean') throw new Error(`${trip.slug}.demo must be true or false.`);
    if (trip.photoStorage !== undefined && !['local', 'r2'].includes(trip.photoStorage)) throw new Error(`${trip.slug}.photoStorage must be local or r2.`);
    if (usesR2(trip) && !site.photoBaseUrl) throw new Error(`${trip.slug}: R2 photographs require site.photoBaseUrl.`);
    if (trip.showChapterIndex !== undefined && typeof trip.showChapterIndex !== 'boolean') throw new Error(`${trip.slug}.showChapterIndex must be true or false.`);
    if (trip.startDate !== undefined || trip.endDate !== undefined) {
      requireDate(trip.startDate, `${trip.slug}.startDate`);
      requireDate(trip.endDate, `${trip.slug}.endDate`);
      if (trip.startDate > trip.endDate) throw new Error(`${trip.slug}: trip dates must be chronological.`);
    }
    if (!Number.isFinite(trip.order)) throw new Error(`${trip.slug}.order must be a number.`);
    if (!Array.isArray(trip.chapters) || !trip.chapters.length) throw new Error(`${trip.slug} needs at least one chapter.`);
    let previousDate;
    for (const chapter of trip.chapters) {
      requireText(chapter.title, `${trip.slug} chapter title`);
      if (chapter.location !== undefined) requireText(chapter.location, `${trip.slug} chapter location`);
      if (chapter.date !== undefined) {
        requireDate(chapter.date, `${trip.slug} chapter date`);
        if (previousDate && chapter.date < previousDate) throw new Error(`${trip.slug}: dated chapters must be chronological.`);
        if (trip.startDate && (chapter.date < trip.startDate || chapter.date > trip.endDate)) throw new Error(`${trip.slug}: chapter date falls outside the trip dates.`);
        previousDate = chapter.date;
      }
      if (!['full', 'pair', 'three', 'editorial'].includes(chapter.layout)) throw new Error(`${trip.slug}: gallery layout must be full, pair, three, or editorial.`);
      if (!Array.isArray(chapter.paragraphs) || !chapter.paragraphs.length) throw new Error(`${trip.slug}: chapter paragraphs must be a nonempty array.`);
      chapter.paragraphs.forEach((paragraph) => requireText(paragraph, `${trip.slug} paragraph`));
      if (!Array.isArray(chapter.photos) || !chapter.photos.length) throw new Error(`${trip.slug}: each chapter needs photographs.`);
      for (const image of chapter.photos) {
        if (chapter.date && image?.capturedOn !== undefined && image.capturedOn !== chapter.date) throw new Error(`${trip.slug}: photograph date does not match its chapter date.`);
      }
    }
    const imagePaths = new Set();
    for (const photo of allPhotos(trip)) {
      if (!photo || typeof photo !== 'object') throw new Error(`${trip.slug}: missing photo or cover.`);
      requireText(photo.alt, `${trip.slug} photo alt text`);
      if (photo.location !== undefined) requireText(photo.location, `${trip.slug} photo location`);
      if (photo.capturedOn !== undefined) {
        requireDate(photo.capturedOn, `${trip.slug} photo capturedOn`);
        if (trip.startDate && (photo.capturedOn < trip.startDate || photo.capturedOn > trip.endDate)) throw new Error(`${trip.slug}: photograph falls outside the trip dates.`);
      }
      if (trip.demo === false && imagePaths.has(photo.src)) throw new Error(`${trip.slug}: repeated photograph ${photo.src}`);
      imagePaths.add(photo.src);
      if (photo.wide !== undefined && typeof photo.wide !== 'boolean') throw new Error(`${trip.slug}: photo.wide must be true or false.`);
      if (photo.width !== undefined || photo.height !== undefined) {
        if (![photo.width, photo.height].every((dimension) => Number.isInteger(dimension) && dimension > 0)) throw new Error(`${trip.slug}: photo width and height must both be positive integers.`);
      }
      if (typeof photo.src !== 'string' || !/^\/(photos|images)\/[a-zA-Z0-9/_-]+\.(webp|jpe?g|png|avif)$/i.test(photo.src)) throw new Error(`${trip.slug}: photo.src must be a local /photos/ or /images/ path with a supported image extension.`);
      if (usesR2(trip) && (!photo.src.startsWith(`/photos/${trip.slug}/`) || !photo.src.endsWith('.webp'))) throw new Error(`${trip.slug}: R2 photos must be WebP files under /photos/${trip.slug}/.`);
      if (path.basename(photo.src) === 'do-not-add-this-persons-photo.webp') throw new Error(`${trip.slug}: a private exclusion reference cannot be published.`);
      if (photo.position && !/^(?:(?:left|right|top|bottom|center|\d{1,3}%)\s*){1,2}$/.test(photo.position)) throw new Error(`${trip.slug}: invalid image position.`);
      for (const key of ['creditUrl', 'licenseUrl']) {
        if (photo[key] && new URL(photo[key]).protocol !== 'https:') throw new Error(`${trip.slug}: ${key} must use HTTPS.`);
      }
      if (photo.creditUrl && !photo.credit) throw new Error(`${trip.slug}: creditUrl needs credit text.`);
      if (photo.license && (!photo.licenseUrl || !photo.credit || !photo.creditUrl)) throw new Error(`${trip.slug}: licensed photographs need credit, creditUrl, and licenseUrl.`);
    }
  }
  const routes = new Set(slugs);
  for (const trip of trips) {
    if (trip.legacySlugs === undefined) continue;
    if (!Array.isArray(trip.legacySlugs)) throw new Error(`${trip.slug}.legacySlugs must be an array.`);
    for (const slug of trip.legacySlugs) {
      if (typeof slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || routes.has(slug)) throw new Error(`Invalid or duplicate legacy slug: ${slug}`);
      routes.add(slug);
    }
  }
}

export async function loadContent(projectRoot = root) {
  const site = JSON.parse(await readFile(path.join(projectRoot, 'content/site.json'), 'utf8'));
  const files = (await readdir(path.join(projectRoot, 'content/trips'))).filter((file) => file.endsWith('.json')).sort();
  const trips = await Promise.all(files.map(async (file) => JSON.parse(await readFile(path.join(projectRoot, 'content/trips', file), 'utf8'))));
  validateContent(site, trips);
  trips.sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug));
  for (const image of trips.filter((trip) => !usesR2(trip)).flatMap(allPhotos)) {
    const filename = path.join(projectRoot, 'public', image.src);
    if (!(await stat(filename).catch(() => null))?.isFile()) throw new Error(`Missing photograph: public${image.src}`);
  }
  return { site, trips };
}

export async function build({ projectRoot = root, output = path.join(projectRoot, 'dist') } = {}) {
  const { site, trips } = await loadContent(projectRoot);
  await rm(output, { recursive: true, force: true });
  await mkdir(path.join(output, 'assets'), { recursive: true });
  const unpublishedFiles = new Set(['.gitkeep', 'do-not-add-this-persons-photo.webp']);
  const publicRoot = path.join(projectRoot, 'public');
  await cp(publicRoot, output, { recursive: true, filter: (source) => source !== path.join(publicRoot, 'photos') && !unpublishedFiles.has(path.basename(source)) });
  // Publish only album selections, so unused or removed photos stay out of dist/.
  const selectedPhotos = new Set(trips.filter((trip) => !usesR2(trip)).flatMap(allPhotos).map((photo) => photo.src).filter((source) => source.startsWith('/photos/')));
  for (const source of selectedPhotos) {
    const destination = path.join(output, source);
    await mkdir(path.dirname(destination), { recursive: true });
    await cp(path.join(publicRoot, source), destination);
  }
  for (const filename of ['styles.css', 'main.js']) await cp(path.join(projectRoot, 'src', filename), path.join(output, 'assets', filename));
  await writeFile(path.join(output, '.nojekyll'), '');
  const pages = new Map([
    ['index.html', renderHome(site, trips)],
    ['credits/index.html', renderCredits(site, trips)],
    ['404.html', render404(site)],
    ...trips.map((trip, index) => [`stories/${trip.slug}/index.html`, renderStory(site, trip, trips.length > 1 ? trips[(index + 1) % trips.length] : null)]),
    ...trips.flatMap((trip) => (trip.legacySlugs || []).map((slug) => [`stories/${slug}/index.html`, renderStoryRedirect(site, trip)])),
  ]);
  for (const [filename, html] of pages) {
    await mkdir(path.dirname(path.join(output, filename)), { recursive: true });
    await writeFile(path.join(output, filename), html);
  }
  const urls = ['/', '/credits/', ...trips.map((trip) => `/stories/${trip.slug}/`)];
  await writeFile(path.join(output, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((url) => `<url><loc>${escapeHtml(site.url + url)}</loc></url>`).join('')}</urlset>\n`);
  await writeFile(path.join(output, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${site.url}/sitemap.xml\n`);
  return { pages: pages.size, trips: trips.length, output };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const result = await build();
    console.log(`Built ${result.pages} pages and ${result.trips} stories → dist/`);
  } catch (error) {
    console.error(`Build failed: ${error.message}`);
    process.exitCode = 1;
  }
}
