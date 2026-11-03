import { spawn } from 'node:child_process';
import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { allPhotos } from '../src/templates.mjs';
import { usesR2 } from '../src/photos.mjs';
import { loadContent, root } from './build.mjs';

export const photoRemote = 'r2:beyondlenses';

export async function planPhotoUpload({ projectRoot = root, slugs = [] } = {}) {
  const { site, trips } = await loadContent(projectRoot);
  const selectedTrips = slugs.length ? [...new Set(slugs)].map((slug) => {
    const trip = trips.find((candidate) => candidate.slug === slug);
    if (!trip) throw new Error(`Unknown album: ${slug}`);
    if (!usesR2(trip)) throw new Error(`${slug}: set photoStorage to r2 before uploading.`);
    return trip;
  }) : trips.filter(usesR2);
  if (!selectedTrips.length) throw new Error('No R2 albums selected.');

  const publicRoot = await realpath(path.join(projectRoot, 'public'));
  const files = [];
  const albums = [];
  for (const trip of selectedTrips) {
    const photos = allPhotos(trip);
    const manifest = JSON.parse(await readFile(path.join(projectRoot, 'content/selections', `${trip.slug}.json`), 'utf8'));
    const approved = new Set(manifest.photos.map((photo) => photo.src));
    const excluded = new Set((manifest.excludedPhotos || []).map((photo) => photo.src));
    let bytes = 0;
    for (const photo of photos) {
      if (!approved.has(photo.src) || excluded.has(photo.src)) throw new Error(`${trip.slug}: photograph is not approved for upload: ${photo.src}`);
      const source = await realpath(path.join(publicRoot, photo.src)).catch(() => null);
      if (!source || !source.startsWith(publicRoot + path.sep)) throw new Error(`Missing or invalid local WebP export: public${photo.src}`);
      const info = await stat(source);
      if (!info.isFile()) throw new Error(`Not a photograph file: public${photo.src}`);
      bytes += info.size;
      files.push(photo.src.slice(1));
    }
    albums.push({ slug: trip.slug, count: photos.length, bytes });
  }
  files.sort();
  return { remote: photoRemote, publicRoot, baseUrl: site.photoBaseUrl, files, albums };
}

function runRclone(args, files) {
  return new Promise((resolve, reject) => {
    const child = spawn('rclone', args, { stdio: ['pipe', 'inherit', 'inherit'] });
    child.on('error', reject);
    child.stdin.on('error', (error) => { if (error.code !== 'EPIPE') reject(error); });
    child.on('close', (code) => code === 0 ? resolve() : reject(new Error(`rclone ${args[0]} failed (exit ${code}).`)));
    child.stdin.end(`${files.join('\n')}\n`);
  });
}

export async function uploadPhotos({ projectRoot = root, slugs = [], planOnly = false, dryRun = false, checkOnly = false } = {}) {
  const plan = await planPhotoUpload({ projectRoot, slugs });
  for (const album of plan.albums) console.log(`${album.slug}: ${album.count} selected WebP files, ${(album.bytes / 1024 ** 2).toFixed(1)} MiB`);
  console.log(`Destination: ${plan.remote}/photos/<album>/`);
  if (planOnly) {
    console.log('Plan only: no network requests or uploads performed.');
    return plan;
  }
  const common = ['--files-from-raw', '-', '--contimeout', '15s', '--timeout', '1m', '--retries', '2', '--low-level-retries', '2'];
  if (!checkOnly) {
    // copy never deletes unrelated objects. The allowlist contains only the
    // currently selected WebP files, including each cover exactly once.
    await runRclone([
      'copy', plan.publicRoot, plan.remote, ...common, '--checksum',
      '--metadata-set', 'content-type=image/webp',
      '--metadata-set', 'cache-control=public,max-age=86400',
      '--stats', '10s', '--stats-one-line', '--stats-log-level', 'NOTICE',
      ...(dryRun ? ['--dry-run'] : []),
    ], plan.files);
  }
  if (!dryRun) {
    await runRclone(['check', plan.publicRoot, plan.remote, ...common, '--one-way'], plan.files);
    console.log(`Verified ${plan.files.length} WebP objects against the local exports.`);
  }
  return plan;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const flags = new Set(['--plan', '--dry-run', '--check']);
  try {
    for (const arg of args) if (arg.startsWith('-') && !flags.has(arg)) throw new Error(`Unknown option: ${arg}`);
    if (args.includes('--check') && args.includes('--dry-run')) throw new Error('Choose --check or --dry-run.');
    await uploadPhotos({ slugs: args.filter((arg) => !flags.has(arg)), planOnly: args.includes('--plan'), dryRun: args.includes('--dry-run'), checkOnly: args.includes('--check') });
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
