# Beyond Lenses

A personal travel photo journal inspired by the spacious photo essays on
[Exposure](https://exposure.co/). Includes a featured story, country filters,
chapter-based trip pages, a keyboard-accessible photo viewer, photo credits,
social preview metadata, and a sitemap. Works on mobile and without JavaScript;
JavaScript adds filters, the viewer, and reading progress.

The Japan album contains **37 curated original photographs** from the Japan
trip, arranged in six chapters. Gros Morne still uses credited stock photography
and sample text.

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
  photos/<trip>/         Your optimized photographs; these ARE tracked by Git
  images/demo/           Stock photographs used in the sample collections
  favicon.svg            Site icon
src/
  templates.mjs          Static HTML layouts
  styles.css             Responsive editorial design
  main.js                Progressive browser interactions
scripts/                 Dependency-free build and local preview server
tests/                   Node.js tests
.github/workflows/       GitHub Pages build and deployment
dist/                    Generated website; ignored by Git
```

## Add your photographs and a new trip

1. Export web-sized JPEG, WebP, PNG, or AVIF copies into
   `public/photos/<trip-slug>/`. Prefer lowercase names with hyphens, for example
   `public/photos/japan/kyoto-evening.webp`. Aim for 1,600–2,400 pixels on the
   long edge and roughly 200–600 KB per image. Keep camera originals and ZIP
   downloads outside this repository or in the ignored `originals/` directory.
2. Copy an existing file in `content/trips/`. Set a unique lowercase `slug`,
   `title`, `subtitle`, `country`, `location`, `category`, and numerical `order`.
   Lower `order` values appear first. The slug determines `/stories/<slug>/`.
3. Set `demo` to `false`. Replace the cover and chapter photographs with paths
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
5. Update `content/site.json` to customize the introduction and select the
   `featuredTrip` slug. Run `npm test` and review the local preview.

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
