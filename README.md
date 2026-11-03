# Beyond Lenses

A personal travel photo journal inspired by the spacious photo essays on
[Exposure](https://exposure.co/). Includes a world map of the albums, country filters,
chapter-based trip pages, a keyboard-accessible photo viewer, photo credits,
social preview metadata, and a sitemap. Works on mobile and without JavaScript;
JavaScript adds linked map highlights, filters, the viewer, and reading progress.

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
**Malaysia** contains **113 original photographs** in ten dated sections from
**12 October–25 November 2019**, covering Melaka, Kuala Lumpur and Batu Caves,
George Town, Penang National Park, Penang Hill, and Langkawi.
The Europe collections add **187 original photographs**, grouped by country:

| Album | Photographs | Dates | Places |
| --- | ---: | --- | --- |
| Germany | 15 | 25–26 April 2024 | Dagstuhl and Saarbrücken |
| France | 76 | 26–27 April 2024 | Lorraine, Metz and Paris |
| Portugal | 61 | 17–27 July 2026 | Lisbon |
| Finland | 35 | 28–30 July 2026 | Helsinki |

The Atlanta, California and Vietnam collections add **340 original photographs**:

| Album | Photographs | Dates | Places |
| --- | ---: | --- | --- |
| Atlanta | 97 | 23 August–23 December 2025 | Georgia Tech, Sweet Auburn, downtown and Piedmont Park |
| California | 97 | 8 April–7 May 2023 | Berkeley, Sibley, San Francisco, Sausalito and Bolinas |
| Vietnam | 146 | 27 May–1 June 2023 | Mỹ Sơn, Hội An, Huế, Ninh Bình, Sa Pa and Hà Nội |

The Canada collections contain **367 original photographs**:

| Album | Photographs | Dates |
| --- | ---: | --- |
| Daily life in Toronto | 129 | 28 July 2024–13 April 2025 |
| Montreal | 3 | 27 July 2024 |
| Algonquin and Arrowhead | 33 | 13–14 October 2024 |
| Moosonee and the Polar Bear Express | 38 | 25–26 December 2024 |
| Niagara Falls in winter | 21 | 16–17 February 2025 |
| The quiet of Gros Morne | 80 | 24–27 May 2024 |
| Vancouver | 63 | 21–26 February 2024 |

**Dubai** adds **94 original photographs** from **28 December 2023**, covering
Downtown Dubai, Jumeirah, Al Fahidi, Al Seef and Dubai Creek. The site contains
**21 albums across 14 countries**.

All albums except Japan use Cloudflare R2; their local WebP exports are ignored
by Git. The existing Japan photographs remain in the repository. Gros Morne’s
stock placeholders and sample text have been replaced with original photographs.

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
  site.json              Brand, introduction, site URL, public photo URL
  trips/*.json           One file per trip: chapters, photographs, captions
  selections/*.json      Curated source-to-export mappings and selection notes
public/
  photos/<trip>/         Local WebP exports for R2; ignored except tracked Japan images
  images/world-atlas.svg Locally hosted Natural Earth coastlines
  images/atlas-*.svg     Country outlines and lakes for the atlas
  favicon.svg            Site icon
src/
  templates.mjs          Static HTML layouts
  atlas.mjs              Shared map projection for coastlines and album locations
  styles.css             Responsive editorial design
  main.js                Progressive browser interactions
  photos.mjs             Resolve R2 image URLs for rendering
scripts/                 Dependency-free build and local preview server
tests/                   Node.js tests
.github/workflows/       GitHub Pages build and deployment
dist/                    Generated website; ignored by Git
```

## Homepage travel atlas

The forest-green atlas starts with countries. Selecting a country or its name
zooms the map into that country’s destinations, reveals its clickable album
locations, and shows its album cover cards. A country with one album follows
the same flow. The country menu stays available for switching; **World map**
and **Escape** return to the overview and restore keyboard focus.

Countries and album counts come from the current trip content. Canada’s view
frames Vancouver and its eastern destinations; Malaysia’s view frames the
peninsula.
Mobile layouts provide large country links and stacked album cards. Hovering or
focusing an album highlights its map marker and cover card together. Reduced
motion preferences disable the transition. Without JavaScript, country links
jump to the corresponding collection of album cards below the world map.

Every trip has a `mapLocation` with a short `label`, representative `latitude`
and `longitude`, and optional `labelPosition: [x, y]` for its callout in the
**zoomed country view**, on a 1200 × 600 canvas. `src/atlas.mjs` defines the
country centres, world-label positions, geographic frames and outline codes;
new countries without a definition still receive a marker and an automatic
frame. Markers identify an album’s principal destination rather than every stop
along its route. The build validates coordinates and labels. Homepage sharing
metadata uses the first album’s cover; `featuredTrip` is no longer used.

The map assets are bundled locally, with no map service, runtime download,
API key or additional package. They use the public-domain Natural Earth 50m
[land](https://github.com/nvkelso/natural-earth-vector/blob/v5.1.2/geojson/ne_50m_land.geojson),
[countries](https://github.com/nvkelso/natural-earth-vector/blob/v5.1.2/geojson/ne_50m_admin_0_countries.geojson)
and [lakes](https://github.com/nvkelso/natural-earth-vector/blob/v5.1.2/geojson/ne_50m_lakes.geojson)
datasets, version 5.1.2, in the Natural Earth 1 projection. See
[Natural Earth’s terms](https://www.naturalearthdata.com/about/terms-of-use/)
and the [projection formula](https://github.com/d3/d3-geo/blob/main/src/projection/naturalEarth1.js).

To regenerate the assets, download those GeoJSON files outside the repository:

```sh
node scripts/generate-atlas.mjs /path/to/ne_50m_land.geojson /path/to/ne_50m_admin_0_countries.geojson /path/to/ne_50m_lakes.geojson
npm test
npm run build
```

World, Canada and Malaysia map artwork was rendered and visually checked.
Tests cover country selection, zoom frames, country-specific album links,
single-album countries, country switching, World map and Escape controls,
focus restoration, hash links, modified clicks, highlights and local assets.
Interactive browser preview remains unavailable in the sandbox; use
`npm run dev` for the desktop and mobile browser review.

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
   Add its `mapLocation` label and coordinates as described above.
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
   `content/site.json` if changing the introduction or site details.
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

## Canada selections

All 1,419 JPEGs in `../dumps/canada/` and all 623 JPEGs in
`../dumps/gros-morne/` were reviewed in chronological contact sheets. Shortlisted
frames were reviewed at a larger size. Repeated bursts, weak or obstructed
frames, screenshots, travel records and undated imports were omitted. The 122
Canada videos and five Gros Morne videos remain outside these still-photo
albums. No archives were extracted, and originals remain untouched.

Toronto follows selected days through summer, autumn, winter and spring. The
folder provides only three photographs from Montreal; these form a short album
with a separate cover. That source contained no established Vancouver photographs;
the separate Vancouver collection is documented below. Orillia, Arrowhead and
Algonquin are grouped into one autumn trip;
Niagara Falls and the journey to Moosonee have their own albums.

Phone dates use camera-local EXIF times and recorded offsets. The Gros Morne
Nikon D5300 clock is eight hours ahead of the matching Newfoundland phone
photographs. Subtracting eight hours aligns the lookout, metal footbridge and
Western Brook Pond scenes across cameras, and keeps evening pictures on their
actual local dates. The manifest records the raw timestamps, correction and
paired-photo evidence. The original files and their metadata are unchanged.

Place labels use GPS where available, visible signs, landmarks and capture order.
Montreal is GPS-confirmed; Arrowhead’s Big Bend and the Algonquin visitor centre
are supported by photographed signs. Uncertain stops use broader labels such as
Northern Ontario, the Algonquin area or the Moose River area. The foggy Gros
Morne walk retains a broad park label instead of an unconfirmed trail name.

Each album uses dated editorial galleries with the top chapter index disabled.
Covers appear once, outside the galleries. The six selection manifests record
source hashes, dates, evidence, counts, omissions and export settings; their
`peoplePhotoSources` lists make personal and local-life photographs easy to
review. Exports preserve framing and colour, correct orientation, and omit
EXIF/XMP metadata. The two old stock WebP files have been removed, and the
credits page now describes the original collections.

```sh
# The five Ontario/Quebec albums share the canada source folder.
python3 scripts/export-photos.py --selection content/selections/toronto.json --source ../dumps/canada
python3 scripts/export-photos.py --selection content/selections/montreal.json --source ../dumps/canada
python3 scripts/export-photos.py --selection content/selections/algonquin.json --source ../dumps/canada
python3 scripts/export-photos.py --selection content/selections/moosonee.json --source ../dumps/canada
python3 scripts/export-photos.py --selection content/selections/niagara-falls.json --source ../dumps/canada
python3 scripts/export-photos.py --selection content/selections/gros-morne.json --source ../dumps/gros-morne
npm run photos:upload -- toronto montreal algonquin moosonee niagara-falls gros-morne
npm run photos:check -- toronto montreal algonquin moosonee niagara-falls gros-morne
npm test
npm run build
```

Validation decoded all 304 exports and checked their original SHA-256 hashes,
local dates, dimensions, stripped metadata, unique sources, cover use, manifest
counts and chapter chronology. All 16 site tests pass; the build produces 14
pages and 11 stories, with no generated references to the removed stock files.
Representative exports opened include `toronto-skyline.webp`,
`montreal-city-view.webp`, `big-bend-in-autumn.webp`,
`polar-bear-express-carriage.webp`, `horseshoe-falls-in-blue.webp`, and
`western-brook-pond-valley.webp`, plus gallery samples from each album.
Interactive browser preview was unavailable in the sandbox.

The local upload plan contains exactly the 304 selected WebP files. The R2
upload attempt failed before transferring files because the sandbox denied
rclone’s DNS socket. Run the upload and verification commands above from an
environment with network access before committing and pushing the albums.

## Malaysia selection and exports

Malaysia uses **113 selections** from the **634 still images** in
`../dumps/malaysia/`, reviewed in chronological contact sheets. A shortlist of
128 frames received a larger review. The album follows eight photographed days
across **12–13 October, 2–3 November, and 22–25 November 2019** in ten dated
sections. The single transit photograph from 21 November, metadata-free copies,
the screenshot, repeated bursts, weaker frames and 28 videos are omitted.

The sections cover Melaka, Kuala Lumpur and Batu Caves, George Town, Penang’s
coastal forest and hill paths, Kuah, Gunung Machinchang, and the Kilim waterways.
Dates come from camera-local EXIF: 111 use `DateTimeOriginal`, and two camera
panoramas use `Image DateTime`, corroborated by their original filenames.
Malaysia’s +08:00 offset is inferred and supported by GPS UTC timestamps where
usable. Place labels use original GPS,
visible landmarks, signs and capture order. Broader labels avoid relying on
stale boat-route GPS fixes to name individual caves. Official landmark
references are recorded in `content/selections/malaysia.json`.

The SkyBridge cover appears once, outside the galleries. The selection manifest
records source filenames and SHA-256 hashes, export settings, date/location
evidence, omitted sources, daily and section counts, and people photographs for
later review. Originals remain intact. WebP copies preserve colour and framing,
correct EXIF orientation, and omit EXIF/XMP. They stay out of Git and `dist/`;
the album renders their configured R2 URLs.

```sh
python3 scripts/export-photos.py --selection content/selections/malaysia.json --source ../dumps/malaysia
npm run photos:plan -- malaysia
npm run photos:upload -- malaysia
npm run photos:check -- malaysia
npm test
npm run build
```

Validation checked all 113 source hashes, EXIF dates, decoded WebP files,
dimensions, preserved framing, stripped metadata, unique sources, cover use,
omissions, chronology and manifest counts. Representative exports opened were
`skybridge-above-the-forest.webp`, `pink-reflections-at-blue-hour.webp`,
`children-and-the-bicycle.webp`, and `mangrove-roots-in-the-water.webp`.
The upload plan contains exactly 113 WebP files, totalling 36.2 MiB.
`npm test` and `npm run build` pass; the build produces 15 pages and 12 stories.

The R2 upload attempt transferred no files: the sandbox denied rclone’s DNS
socket. Browser preview was also blocked when the local server could not bind
its socket. Upload and verify with the commands above from an environment with
network access before pushing the album content; use `npm run dev` there for
desktop and mobile review.

## Europe country albums and exports

The Europe sources are grouped into **Germany, France, Portugal and Finland**,
with cities and locations retained as dated sections within each country album.
Germany has 15 photographs in two sections; France has 76 in eight sections;
Portugal has 61 in eleven sections; Finland has 35 in five sections.
The four Europe countries have atlas outlines and zoom frames; the existing
coastlines and lake assets are unchanged.

All **451 still images** from `../dumps/europe_24/` and **526 still images** from
`../dumps/Europe_26/` were reviewed in thirteen contact sheets. A shortlist of
205 frames received a larger review. The owner confirmed `Europe_26` as the
Portugal/Finland source; its actual **July 2026** dates are preserved. Every
selected photograph uses camera-local EXIF `DateTimeOriginal` and its recorded
offset: +02:00 for Germany/France, +01:00 for Portugal, and +03:00 for Finland.

`Europe II-1-001.zip` passed `unzip -t` for all 457 entries and its file listing
matches the 451 JPEGs and six videos already extracted in `europe_24/`. No
archive was renamed or extracted during this update. No source archive was
available for the already extracted `Europe_26/` collection; its 16 videos are
outside the still-photo albums. All originals remain intact.

GPS, landmarks, signs and capture order establish the country and place labels.
The train-window fields before Metz are in Lorraine, France. Conference slides,
certificates, receipts, hotel records, long flight sequences, repeated bursts
and weak or obstructed frames are omitted. The manifests explicitly distinguish
frames used in another country album from unused frames in the shared source.
No photograph is repeated across these four albums; covers appear once.

```sh
python3 scripts/export-photos.py --selection content/selections/germany.json --source ../dumps/europe_24
python3 scripts/export-photos.py --selection content/selections/france.json --source ../dumps/europe_24
python3 scripts/export-photos.py --selection content/selections/portugal.json --source ../dumps/Europe_26
python3 scripts/export-photos.py --selection content/selections/finland.json --source ../dumps/Europe_26
npm run photos:plan -- germany france portugal finland
npm run photos:upload -- germany france portugal finland
npm run photos:check -- germany france portugal finland
npm test
npm run build
```

Validation checked all 187 original hashes, capture dates and offsets, decoded
WebP files, dimensions, preserved framing, stripped EXIF/XMP, unique sources,
cover use, omissions, chronological sections and manifest counts. The upload
plan contains exactly the 187 selected WebP files, totalling 76.4 MiB.
The site tests pass and the build produces 19 pages and 16 stories.
Representative exports opened include the four covers, plus
`a-hare-on-the-path.webp` and `stone-figures-and-a-glowing-lamp.webp`.

The R2 upload attempt transferred no files because the sandbox denied rclone’s
DNS socket. Run the upload and check commands above from an environment with
network access before pushing. Use `npm run dev` there to review desktop and
mobile layouts; the sandbox also blocks the local preview server socket.

## Atlanta, California and Vietnam selections

The three albums contain **340 photographs** in 58 dated sections. These additions
brought the site to **19 albums across 13 countries**. Atlanta and California appear within
United States; Vietnam has its own country view. Both countries have local
atlas outlines and zoom frames.

All **325 Atlanta JPEGs**, **400 California JPEGs and 15 HEICs**, and **980
Vietnam JPEGs** were reviewed in 24 chronological contact sheets. Larger
reviews compared 504 candidates. Vietnam's three additional RAW embedded
previews repeat music and river scenes; the RAW originals are retained outside
the website. Each selected cover was inspected at 1600 pixels and appears
only once in its album total.

Dates use camera-local EXIF timestamps. Atlanta's recorded offsets change
from −04:00 to −05:00; California records −07:00. Vietnam's phone photographs
record +07:00 where available. Nikon and unoffset timestamps are retained as
recorded without assuming synchronized camera clocks. California GPS, visible
landmarks, readable signs and capture context support location labels. Broader
labels are used where an exact site cannot be established. No source archive
for these three collections was present, so validation covered their existing
extracted originals. No original was changed or renamed.

The manifests record source hashes, export settings, complete omissions,
capture-date evidence, chapter and daily counts, and people scenes for later
review. Repeated bursts, weak or blurred frames, most posed portraits and
routine travel/work records are omitted. Only selected WebP copies are exported
to `public/photos/atlanta/`, `public/photos/california/` and
`public/photos/vietnam/`; they remain ignored by Git.

```sh
python3 scripts/export-photos.py --selection content/selections/atlanta.json --source ../dumps/Atlanta
python3 scripts/export-photos.py --selection content/selections/california.json --source ../dumps/california
python3 scripts/export-photos.py --selection content/selections/vietnam.json --source ../dumps/vietnam
npm run photos:plan -- atlanta california vietnam
npm run photos:upload -- atlanta california vietnam
npm run photos:check -- atlanta california vietnam
npm test
npm run build
```

The upload plan contains exactly 340 WebP files, totalling **155.7 MiB**.
Validation checked original hashes, local capture dates and offsets, decoded
exports, dimensions, framing, preserved colour profiles, stripped EXIF/XMP,
distinct sources, cover use, complete omissions and manifest counts. Site tests
pass, and the build produces 22 pages and 19 stories. Representative exports
checked include the three covers, `lit-lakeside-pavilion.webp`,
`sea-lions-at-pier-39.webp` and `terraces-beside-the-river.webp`. World, United
States and Vietnam map artwork was rendered and visually checked.

The R2 upload attempt transferred no files because the sandbox blocked the DNS
socket. **Run the upload and check commands above with network access before
pushing.** Interactive browser review is also pending because the sandbox
blocks Chrome; use `npm run dev` to review desktop/mobile galleries and the
photo viewer after uploading.

## Vancouver and Dubai selections

The two albums add **157 photographs** in 19 dated sections:

| Album | Photographs | Sections | Dates |
| --- | ---: | ---: | --- |
| Vancouver | 63 | 8 | 21–26 February 2024 |
| Dubai | 94 | 11 | 28 December 2023 |

All **338 Vancouver JPEGs** and **389 Dubai JPEGs** were inventoried with full
decode attempts and reviewed in ten chronological contact sheets. Larger
reviews compared 135 Vancouver and 153 Dubai candidates; both covers were
checked at 1600 pixels and appear once. Vancouver's `DSC_0630.JPG` fails full
JPEG decoding and is explicitly excluded. The other 726 JPEGs decode
successfully. The 97 Vancouver MOVs and six Dubai MP4s remain outside the
still-photo albums. No completed source archive or itinerary was present.

The owner confirmed that Vancouver's Nikon remained set to India time.
Converting **Asia/Kolkata (+05:30) to America/Vancouver (−08:00)** subtracts
13 hours 30 minutes and moves these photographs to the preceding local day.
The manifests retain the original camera timestamp alongside the corrected
local timestamp, timezone and evidence. Dubai's selected photographs retain
their recorded +04:00 local times. Pre-arrival and outbound flight sequences,
private travel records, repeated views and weaker frames are omitted.

Vancouver's harbour, Gastown and Whistler landmarks support specific labels;
unidentified forest trails, lake and inlet use broader Vancouver-area labels.
Dubai GPS, visible landmarks and capture order support its neighbourhoods.
Canada's atlas view now includes its western and eastern albums, with adjusted
labels. The UAE has a country outline, zoom view and Dubai marker.

Only selected WebP derivatives are exported, preserving framing and colour,
correcting orientation, and stripping EXIF/XMP. Originals remain intact.
Manifests record hashes, complete omissions, people scenes and daily counts.
The local exports remain ignored by Git.

```sh
python3 scripts/export-photos.py --selection content/selections/vancouver.json --source ../dumps/Vancouver
python3 scripts/export-photos.py --selection content/selections/dubai.json --source ../dumps/dubai
npm run photos:plan -- vancouver dubai
npm run photos:upload -- vancouver dubai
npm run photos:check -- vancouver dubai
npm test
npm run build
```

Validation checked all 157 original hashes, corrected local dates and offsets,
decoded WebP files, dimensions, framing, colour profiles, stripped EXIF/XMP,
unique sources, single cover use, corrupt-file exclusion, complete omissions
and manifest counts. The upload plan contains exactly 157 selected files,
totalling **48.3 MiB**. Site tests pass and the build produces 24 pages and
21 stories in an isolated copy of the committed site plus these album changes.
Separate homepage and Ontario-album edits were in progress during validation.
Representative exports opened include both covers,
`fern-lined-path.webp`, `light-over-the-forested-valley.webp`,
`mosque-at-dusk.webp` and `brass-coffee-pots.webp`. World, Canada and UAE map
artwork was rendered and visually checked.

The R2 upload transferred no files because the sandbox blocked its DNS socket.
**Run the upload and check commands above with network access before pushing.**
Interactive desktop/mobile gallery and photo-viewer review remains pending;
the sandbox blocks the local preview server and Chrome sockets. Use
`npm run dev` in an environment that permits them after uploading.

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
