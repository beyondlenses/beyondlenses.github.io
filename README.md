# Beyond Lenses

A personal travel photo journal inspired by the spacious photo essays on
[Exposure](https://exposure.co/). Includes a featured story, country filters,
chapter-based trip pages, a keyboard-accessible photo viewer, photo credits,
social preview metadata, and a sitemap. Works on mobile and without JavaScript;
JavaScript adds filters, the viewer, and reading progress.

The Japan album contains **37 curated original photographs** in six chapters.
**tesekkuler turkey** contains **189 original photographs** organized into 15
daily sections from **26 April to 10 May 2025**, with date and location labels.
**The long road to Spiti** contains **151 original photographs** in nine daily
sections from **15–23 September 2026**, following the journey through Shimla,
Kinnaur, Spiti, Chandratal, and Manali.
**Australia** contains **130 original photographs** in 13 dated sections from
**10–18 November 2025**, covering Melbourne, Williamstown, St Kilda,
Westerfolds Park, and the Great Ocean Road.
**Britain (UK)** contains **176 original photographs** in 17 dated sections from
**10–18 August 2025**, following Glasgow, Edinburgh, and London.
Turkey, Spiti, Australia, and Britain photos are served from Cloudflare R2; their local WebP exports
are ignored by Git. The existing Japan photographs remain in the repository.
Gros Morne still uses credited stock photography and sample text.

## Run locally

Requires Node.js 18 or later; `.node-version` selects Node 24 for deployment.
There are no third-party dependencies and no installation step.

```sh
npm run dev       # Build, serve at http://localhost:8000, and watch for edits.
npm test          # Validate content, rendering, and generated local links.
npm run build    # Generate the complete static website in dist/.
npm run preview  # Serve an existing build at http://localhost:8000.
```

After an edit, wait for “Rebuilt” in the terminal and refresh the browser.
Set `PORT=8080 npm run dev` to use another port.

## Structure

```text
content/
  site.json              Brand, introduction, site URL, featured trip
  trips/*.json           One file per trip: chapters, photographs, captions
  selections/*.json      Curated source-to-export mappings and selection notes
public/
  photos/<trip>/         Local WebP exports for R2; ignored except tracked Japan images
  images/demo/           Stock photographs used in the sample collections
  favicon.svg            Site icon
src/
  templates.mjs          Static HTML layouts
  styles.css             Responsive editorial design
  main.js                Progressive browser interactions
  photos.mjs             Resolve R2 image URLs for rendering
scripts/                 Dependency-free build and local preview server
tests/                   Node.js tests
.github/workflows/       GitHub Pages build and deployment
dist/                    Generated website; ignored by Git
```

## Cloudflare R2 photographs

The configured rclone remote is `r2:beyondlenses`. Public images use
`photoBaseUrl` in `content/site.json`, currently
`https://pub-79c03de5fd8c44e7b28cd2d564567e3e.r2.dev`.
This is a public bucket URL, separate from the private S3 upload endpoint.
See [Cloudflare's public bucket documentation](https://developers.cloudflare.com/r2/buckets/public-buckets/).

Set `photoStorage` to `r2` in each new album. Keep its `src` paths in the form
`/photos/<slug>/<date>-<area>/<name>.webp`; these become the R2 object keys
without the leading slash. The renderer adds the public base URL to covers,
gallery images, viewer links, next-story cards, and sharing previews.

Run from this repository with rclone installed and the `r2` remote configured:

```sh
rclone lsd r2:beyondlenses              # Inspect the configured bucket.
npm run photos:plan -- turkey spiti    # Check the selected local WebP exports.
npm run photos:upload -- turkey spiti  # Copy selected files, then verify checksums.
npm run photos:check -- turkey spiti   # Verify without uploading.
```

Omit album arguments to select all R2 albums. The uploader reads the active
album selections and manifests, rejects excluded or missing files, and copies
only selected WebP files. It leaves unrelated R2 objects untouched. Uploads
use `image/webp` and a one-day public cache lifetime. `--dry-run` previews rclone
changes but still needs network access; `photos:plan` works entirely locally.

**Upload and verify photos before pushing album content.** GitHub Actions builds
the HTML without local R2 photos, rclone, or R2 credentials; it does not upload
or download the images. Only the public URL and source manifests are tracked.
Keep rclone credentials outside the repository. Existing local albums continue
to work with `photoStorage: "local"` or no storage field.

## Add your photographs and a new trip

Follow [Image Addition Guidelines](image-add-guideline.md) for the agreed
selection, people, date/location, and album layout preferences.

1. Export web-sized JPEG, WebP, PNG, or AVIF copies into
   `public/photos/<trip-slug>/`. Prefer lowercase names with hyphens, for example
   `public/photos/japan/kyoto-evening.webp`. Aim for 1,600–2,400 pixels on the
   long edge and roughly 200–600 KB per image. Keep camera originals and ZIP
   downloads outside this repository or in the ignored `originals/` directory.
   New exports stay local and are uploaded to R2 rather than added to Git.
2. Copy an existing file in `content/trips/`. Set a unique lowercase `slug`,
   `title`, `subtitle`, `country`, `location`, `category`, and numerical `order`.
   Lower `order` values appear first. The slug determines `/stories/<slug>/`.
3. Set `demo` to `false` and `photoStorage` to `r2`. Replace the cover and chapter photographs with paths
   such as `/photos/japan/kyoto-evening.webp`; paths are relative to `public/`.
   Add descriptive `alt` text and optional `caption`. Supply the exported image’s
   `width` and `height` in pixels to reserve space while it loads. Remove the stock `credit`,
   `creditUrl`, `license`, and `licenseUrl` fields when replacing a photograph
   with your own. Retain those fields for any stock photographs you keep.
4. Each chapter needs a `title`, a `paragraphs` array, a `layout` (`full`, `pair`,
   `three`, or `editorial`), and a `photos` array. The `editorial` layout preserves
   the original framing in two columns; set a photo’s `wide` to `true` to span
   both columns. Paragraphs and captions are plain text.
   `cover.position` optionally controls cropping, for example `center 55%`.
5. Create `content/selections/<slug>.json` with the source mappings and approved
   photo paths. Upload with `npm run photos:upload -- <slug>`. Update
   `content/site.json` if changing the introduction or `featuredTrip` slug.
   Run `npm test` and `npm run build`, then review the local preview.

For a trip organized by date, add `startDate` and `endDate` (`YYYY-MM-DD`) to
the trip, a `date` and `location` to each chapter, and `capturedOn` and `location`
to each photograph. Set `showChapterIndex` to `false` to omit the top day index;
dates and places remain visible in section headings, the gallery, and the photo viewer. Photos must match their chapter’s
date and fall within the trip dates; dated chapters must be chronological.

All trip files in `content/trips/` are published. Keep unfinished drafts outside
that directory. Missing photographs, duplicate slugs, and invalid content fail
the build with an error. Delete unused demo images after replacing them.

## Japan selection and exports

The 37 photographs were selected after reviewing all 1,202 JPEGs in the sibling
`../dumps/japan/` folder. Similar bursts were compared, with one preferred frame
kept per selected view. Blurred, obstructed, accidental, and repeated frames
were omitted. The album covers the coast, Asakusa, Tokyo at night, Nikkō, snow
in Tokyo, and Shibuya Crossing. Its cover is not repeated in the galleries.

`content/selections/japan.json` records each original filename, SHA-256 digest,
export path, and selection reason. The originals stay outside this repository.
Only the optimized WebP copies in `public/photos/japan/` are published.

To reproduce the exports, use Python 3.9+ with Pillow installed:

```sh
python3 scripts/export-photos.py --source ../dumps/japan
npm run build
```

The exporter verifies source hashes, corrects EXIF orientation, and resizes to
2,000 pixels on the long edge (2,400 for the cover). It preserves colour and
framing, omits EXIF/XMP from the web copies, and leaves originals unchanged.
Python and Pillow are only needed to re-export photos, not to build or deploy
the website.

## Turkey selection and itinerary

The Turkey album uses 189 selections from the 455 JPEGs in `../dumps/turkey/`.
Daily selections have 6–21 distinct photographs, generally around ten or more.
The balloon cover belongs to 6 May and is not repeated in that day’s gallery.
Web copies are stored under `public/photos/turkey/<date>-<area>/`.
They are uploaded to `r2:beyondlenses/photos/turkey/` and served from R2.

Dates come from the camera-local EXIF capture timestamps. Place labels use
GPS, visual landmarks, and route context from `../dumps/Turkey25.xlsx`. Actual
photo dates take precedence over planned activities: for example, the Kaş day
was photographed on 1 May and Kekova–Demre on 2 May. Broader regional labels
are used where an exact venue cannot be established.

`content/selections/turkey.json` records the source mapping, capture dates,
location evidence, daily counts, and differences from the itinerary. The
spreadsheet itself is not copied into the repository or website.

```sh
python3 scripts/export-photos.py --selection content/selections/turkey.json --source ../dumps/turkey
npm run photos:upload -- turkey
npm run build
```

As with Japan, the exports preserve framing and colour and leave originals
unchanged. Images load lazily as visitors scroll. Dates and locations appear
within the sections; the top day index is disabled for this album.

Local people, crowds, craftspeople, performances, and some personal photographs
are permitted for the owner's later review. Favor architecture, landscapes,
details, and candid scenes over posed personal portraits. The specifically named
`cistern-portrait.webp` remains excluded. The selection manifest records omitted
photos. Turkey's local exports stay out of Git and the Pages build; only active
selections are uploaded to R2.

## Spiti selection and exports

The Spiti album uses 151 selections from the 765 JPEGs in `../dumps/spiti/`.
It follows the same dated editorial layout as Turkey, with a day index, visible
date and place labels, and the photo viewer. The Key Monastery cover is not
repeated in the gallery. Short arrival and return days have fewer photographs.

Capture dates come from camera-local EXIF timestamps. Location labels use
visible landmarks and signs, capture order, and GPS-tagged phone photographs;
broader valley or route labels are used where a precise site is uncertain.
`content/selections/spiti.json` records source filenames, SHA-256 digests,
selection reasons, capture timestamps, place-label evidence, and daily counts.

The selection contains scenery, architecture, wildlife, food, and details,
with a few candid street, village, visitor, and personal photographs for review.
`peoplePhotoSources` in the selection manifest lists these additional frames.
The two source videos and the
20 Delhi photographs from 24–25 September are outside this photo essay.
The local `do-not-add-this-persons-photo.webp` exclusion reference is ignored
by Git and excluded from generated website output.

```sh
python3 scripts/export-photos.py --selection content/selections/spiti.json --source ../dumps/spiti
npm run photos:upload -- spiti
npm run build
```

WebP exports live in `public/photos/spiti/<date>-<area>/`. They preserve colour
and framing, correct EXIF orientation, and omit EXIF/XMP. Camera originals stay
unchanged outside the repository. The exports are ignored by Git, uploaded to
`r2:beyondlenses/photos/spiti/`, and served from the public R2 URL.

## Australia and Britain selections

Australia’s 130 photographs were selected from all 2,077 JPEGs in
`../dumps/australia/`. The 176 Britain photographs were selected from all 830
JPEGs in `../dumps/UK/`. Both collections were reviewed in chronological contact
sheets, followed by larger views of shortlisted frames. Similar bursts,
duplicate views, blurred or obstructed frames, receipts, travel documents, and
conference records were omitted. The 84 Australia videos and 27 UK videos are
outside these still-photo albums. No archives were extracted for these additions.

Dates use camera-local EXIF timestamps: the selected Victoria photographs use
`+11:00`, and the Britain selections use `+01:00`. This keeps late Australian
evenings on their actual local dates. Place labels use visible landmarks,
signs and capture order, with GPS support where available in the Australia
collection. Broader district labels are used when the exact venue is uncertain.
The short Glasgow and final Melbourne sections reflect the smaller number of
distinct suitable photographs on those days.

Both albums retain the editorial galleries, date and place labels, and image
viewer, with the top chapter index disabled. Each cover appears only once in
its album count and is not repeated in a gallery. Personal photographs and
local-life selections are listed in each manifest’s `peoplePhotoSources` for
later review. Original photographs remain untouched outside the repository.

`content/selections/australia.json` and `content/selections/britain.json` record
source filenames and SHA-256 hashes, capture times and offsets, location evidence,
daily and chapter counts, omissions, and export settings. WebP copies preserve
framing and colour, correct EXIF orientation, and omit EXIF/XMP metadata. They
live in `public/photos/australia/` and `public/photos/britain/`, are ignored by Git,
and are served from the corresponding R2 paths.

```sh
python3 scripts/export-photos.py --selection content/selections/australia.json --source ../dumps/australia
python3 scripts/export-photos.py --selection content/selections/britain.json --source ../dumps/UK
npm run photos:upload -- australia britain
npm run photos:check -- australia britain
npm test
npm run build
```

Representative exports checked include `twelve-apostles-coast.webp`,
`black-swans.webp`, `two-little-penguins.webp`, `kangaroos-grazing.webp`,
`tower-bridge-on-the-thames.webp`, `university-at-blue-hour.webp`,
`fan-vaulting.webp`, and `st-pauls-at-night.webp`.

## Publish at beyondlenses.github.io

Git is initialized locally on `main`, with `origin` pointing to
`git@github.com:beyondlenses/beyondlenses.github.io.git`. That account name is
required for this exact address. If you use another account,
change `content/site.json` to its `https://<account>.github.io` origin and name
the repository `<account>.github.io`.

In the repository’s **Settings → Pages → Build and deployment**, choose
**GitHub Actions**. Then run from this directory:

```sh
git add .
git commit -m "Create Beyond Lenses photo journal"
git push -u origin main
```

The included workflow tests pull requests and publishes pushes to `main`.
It uploads only `dist/`, keeping source, tests, and originals out of the website.
You can also run it manually from **Actions → Build and publish photo journal
→ Run workflow**, selecting `main`. No deployment secret or personal access
token is required; the workflow uses GitHub's built-in token and Pages actions.
This project targets an account site at `/`; it is not configured for a project
site under a repository subpath. No custom-domain `CNAME` is needed.
See [GitHub’s Pages instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)
and [custom workflow guide](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Stock photograph credits

- `gros-morne-valley.webp`: [David W Enstrom](https://commons.wikimedia.org/wiki/File:Gros_Morne_National_Park_-_Western_Brook_Pond.jpg),
  [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
- `gros-morne-water.webp`: [Siderd](https://commons.wikimedia.org/wiki/File:Western_Brook_Pond_4.jpg),
  [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).

The Wikimedia preview derivatives were resized and converted to WebP and are
distributed under CC BY-SA 4.0. The layout may crop them responsively. Credit
and license links are also published on story pages and at `/credits/`.
