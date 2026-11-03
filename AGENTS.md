# Repository Guidelines

## Project Structure

This checkout contains the Node.js static website for `beyondlenses.github.io`.
GitHub Pages hosts the website; Cloudflare R2 hosts new album photographs.

- `content/trips/`: album metadata, chapters, captions, and photo paths.
- `content/selections/`: approved source mappings, hashes, exclusions, and counts.
- `src/`, `scripts/`, `tests/`: rendering, build/upload tools, and Node.js tests.
- `public/photos/`: local exports; new photos are ignored by Git.
- `dist/`: generated website; ignored by Git.

## Photo Selection & Organization

Read [image-add-guideline.md](image-add-guideline.md) before creating an album.
Preserve originals in `../dumps/<slug>/`. Select distinct, sharp photographs;
aim for about ten per day/location, with quality taking priority over quantity.
Do not repeat the cover in the gallery. Local people and some personal photos
are allowed; honor explicit exclusions and prefer scenic alternatives to posed
portraits. Use actual camera-local dates and supported location labels.
Set `showChapterIndex: false` for new albums.

## Cloudflare R2 Workflow

For new albums, set `photoStorage: "r2"`. Export only selected WebP derivatives
to `public/photos/<slug>/<date>-<area>/`. Keep `src` values as
`/photos/<slug>/…`; rendering adds `photoBaseUrl` from `content/site.json`.
Use the existing public URL and configured `r2:beyondlenses` rclone remote.
Keep originals, private references, itineraries, and credentials out of R2.

Replace `<slug>` before running:

```sh
python3 scripts/export-photos.py --selection content/selections/<slug>.json --source ../dumps/<slug>
npm run photos:plan -- <slug>
npm run photos:upload -- <slug>
```

The uploader copies approved WebP files and verifies checksums. Use
`npm run photos:check -- <slug>` to verify again. Upload successfully before
pushing album changes. GitHub Actions builds without downloading R2 images.

## Style & Validation

Use two-space indentation in JavaScript/JSON, four spaces in Python, lowercase
hyphenated slugs, descriptive filenames, and accurate alt text. Preserve the
existing editorial layout and original image framing. No formatter is configured.

Run `npm test` and `npm run build` for functional changes. Use `npm run dev` to
review covers, galleries, and mobile layouts. Update album counts and README.

## Git & GitHub Handoff

Track album JSON, selection manifests, code, configuration, and documentation.
Stage these changes for the owner to commit and push unless asked to do those
steps. Inspect `git diff --cached --stat`; never force-add ignored photo exports
or credentials. Existing tracked Japan images may remain in Git.
Use short imperative commit subjects. Preserve configured GPG signing.
If uploads or signing are blocked, report the failure and exact remaining
commands; do not claim completion or bypass signing.
