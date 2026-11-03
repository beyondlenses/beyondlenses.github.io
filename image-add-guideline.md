# Image Addition Guidelines

Use these preferences when creating the next Beyond Lenses album. Paths below
are relative to the `beyondlenses.github.io/` repository.

## Review the originals

- Read photos from `../dumps/<album>/`. Preserve original files, filenames, and
  metadata; write web exports separately. Incomplete `.crdownload` files are
  not usable archives.
- Inventory the collection and review every photograph using contact sheets.
  Open shortlisted frames at a larger size before deciding on quality.
- Use supplied itineraries, including spreadsheets, to understand the route.
  Keep those documents, booking details, and original downloads outside the site.

## Choose distinct, good photographs

- Aim for **around ten photographs per day/location, or more** when there are
  enough strong, distinct images. Keep shorter sections when suitable choices
  are limited; avoid padding them with weak or repeated views.
- Favor landscapes, architecture, interiors, wildlife, food, details, and candid
  daily life. Vary subjects and viewpoints to tell the story of the journey.
- Omit blurred, badly exposed, obstructed, accidental, and uninteresting frames.
  Compare similar bursts and keep the strongest frame. Different filenames or
  crops do not make essentially the same photograph a new scene.
- Choose a strong cover and do not repeat it in the gallery. Include it once
  in the album total and its capture day's selection count.
- Use the owner's trip photos when available. Stock photos are placeholders
  only when requested; retain attribution and license information for them.

## People and personal photographs

- **Local people and visible faces are allowed.** Include markets, street
  scenes, craftspeople, food vendors, crowds, and performances where they add
  to the story. Do not reject a good scene simply because people appear in it.
- Some personal photographs are permitted for the owner to review and delete
  later. Favor scenic or candid alternatives over posed personal portraits.
  When replacing a portrait, look for a good view of the same place or activity.
- Respect explicit photo exclusions. The named `cistern-portrait.webp` remains
  excluded. Never publish `do-not-add-this-persons-photo.webp`, a local private
  reference. Use explicit filenames and source mappings for exclusions; do not
  identify or match people by their faces.
- List personal/people selections in the manifest's `peoplePhotoSources`, as
  in the Spiti album, to make later review and removal straightforward.

## Organize by actual dates and locations

- Use camera-local EXIF capture dates, rather than assuming UTC filenames
  represent the local day. Check timezone differences when mixing cameras.
- Establish locations using GPS, visible landmarks, signs, capture order, and
  itinerary context. Actual photo evidence takes precedence over planned dates.
  Use a broader place label when the exact site is uncertain; do not invent it.
- Keep chapters and photos chronological, grouping each day by its locations.
  Display dates and places in the section headings and photo labels.
- Set `showChapterIndex` to `false` for new albums: omit the table/day index at
  the top while retaining dates and locations within the sections.
- Preserve the requested album title. Write short, factual captions and a few
  restrained paragraphs about the scenes actually selected.

## Create content and web exports

Use the existing editorial photo essay layout and these locations:

| Purpose | Path |
| --- | --- |
| Album content | `content/trips/<slug>.json` |
| Source mapping and review notes | `content/selections/<slug>.json` |
| Local web exports, ignored by Git | `public/photos/<slug>/<YYYY-MM-DD>-<area>/` |
| Cloudflare R2 objects | `r2:beyondlenses/photos/<slug>/<YYYY-MM-DD>-<area>/` |

Use lowercase hyphenated slugs and descriptive names such as
`stone-courtyard.webp`. Set `demo: false`, `photoStorage: "r2"`, trip `startDate`/`endDate`, chapter
`date`/`location`, and photo `capturedOn`/`location`. Include accurate `alt`,
exported `width`/`height`, and optional captions. Prefer `layout: "editorial"`
to preserve framing; use `wide: true` selectively.

Record original filenames, SHA-256 hashes, export paths, cover/gallery roles,
export settings, selection reasons, date/location evidence, omissions, and
daily counts in the selection manifest. Export WebP at about 2,000 pixels on
the long edge, or 2,400 for the cover, using quality 82–86. Preserve framing
and colour, correct EXIF orientation, and omit EXIF/XMP from published copies.

**Use Cloudflare R2 for all new albums.** Keep the content and manifest `src`
paths as `/photos/<slug>/…`; the site adds `photoBaseUrl` from `content/site.json`
when rendering. Upload through the configured `r2:beyondlenses` rclone remote.
Only selected WebP exports belong there. Keep originals, exclusion references,
itineraries, and credentials out of the bucket and Git.

```sh
python3 scripts/export-photos.py --selection content/selections/<slug>.json --source ../dumps/<slug>
npm run photos:plan -- <slug>
npm run photos:upload -- <slug>
npm test
npm run build
npm run dev
```

Replace `<slug>` before running. Exporting requires Python and Pillow; uploading
requires the configured rclone remote and network access. The upload command
copies only active selections and verifies remote checksums. The website build
requires Node.js and no third-party packages or local R2 images.

## Review and remove selections

Check the cover, mobile and desktop layouts, image viewer, chronology, captions,
duplicates, and photo counts. Update README album details and manifest counts.
Keep unfinished album JSON outside `content/trips/`; every trip there is built.

When removing a photo, remove its album reference and active manifest entry,
delete its web export, and replace the cover if necessary. Keep the original
untouched and record explicit exclusions. For an uploaded R2 image, delete its
exact object key as well; `photos:upload` does not delete remote objects. Rebuild
and check that no page references it. R2 photos are not bundled in `dist/`.

Upload and verify each album before pushing the website changes. Commit album
content, selection manifests, documentation, and source changes; leave new local
WebP exports out of Git. Existing tracked Japan photographs remain unchanged.
