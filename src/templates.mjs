import { resolveTripPhotos } from './photos.mjs';
import { packGallery, galleryRowStyle } from './gallery-layout.js';
import { projectLocation, atlasSize, groupAtlasCountries, continentForCountry } from './atlas.mjs';

export const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);

const e = escapeHtml;
const number = (value) => String(value).padStart(2, '0');
const arrow = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12h15M13 5l7 7-7 7" stroke="currentColor" stroke-width="1.5"/></svg>';
const aperture = '<svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><circle cx="24" cy="24" r="20"/><circle cx="24" cy="24" r="7"/><path d="m24 4 11 21M41 14 28 35M41 35H17M24 44 13 23M7 34l13-21M7 13h24"/></svg>';
const tripPath = (trip) => `/stories/${trip.slug}/`;
export const allPhotos = (trip) => [trip.cover, ...trip.chapters.flatMap((chapter) => chapter.photos)];
const frameCount = (trip) => new Set(allPhotos(trip).map((photo) => photo.src)).size;

export function formatDate(value, { year = true } = {}) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'short', ...(year ? { year: 'numeric' } : {}), timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`));
}

const time = (value, options) => `<time datetime="${e(value)}">${formatDate(value, options)}</time>`;
const dateRange = (start, end) => start ? `${time(start)}${end && end !== start ? ` – ${time(end)}` : ''}` : '';
const photoContext = (image) => [image.capturedOn ? time(image.capturedOn) : '', e(image.location || '')].filter(Boolean).join(' <span aria-hidden="true">·</span> ');

function photo(photo, { lazy = true, className = '' } = {}) {
  const dimensions = photo.width && photo.height ? ` width="${photo.width}" height="${photo.height}"` : '';
  return `<img class="${className}" src="${e(photo.src)}" alt="${e(photo.alt)}"${dimensions} ${lazy ? 'loading="lazy"' : 'fetchpriority="high"'} decoding="async" style="object-position:${e(photo.position || 'center')}">`;
}

function header(compact = false) {
  return `<header class="site-header wrap">
    <a class="wordmark" href="/" aria-label="Beyond Lenses home">${aperture}<span>beyondlenses<span class="brand-period">.</span></span></a>
    ${compact ? '' : '<nav aria-label="Main navigation"><a href="/#journal">The journal</a><a href="/#about">Behind the lens</a></nav><span class="header-note">A personal photo journal <span aria-hidden="true">↗</span></span>'}
  </header>`;
}

function footer(site) {
  return `<footer class="site-footer wrap">
    <a class="footer-brand" href="/">${e(site.name)}<span class="brand-period">.</span></a>
    <span>Far from ordinary. Close to the heart.</span>
    <div><a href="/credits/">Photo credits</a><a href="#top">Back to top ↑</a></div>
  </footer>`;
}

function page(site, { title, description, path = '/', image, body, bodyClass = '', redirectTo }) {
  const canonical = `${site.url}${path}`;
  return `<!doctype html>
<html lang="en" id="top">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#f5f3ed">
  <title>${e(title)}</title>
  <meta name="description" content="${e(description)}">
  <link rel="canonical" href="${e(canonical)}">
  ${redirectTo ? `<meta http-equiv="refresh" content="0; url=${e(redirectTo)}">` : ''}
  <meta property="og:type" content="${path.startsWith('/stories/') ? 'article' : 'website'}">
  <meta property="og:site_name" content="${e(site.name)}">
  <meta property="og:title" content="${e(title)}">
  <meta property="og:description" content="${e(description)}">
  <meta property="og:url" content="${e(canonical)}">
  ${image ? `<meta property="og:image" content="${e(new URL(image, site.url).href)}">` : ''}
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/assets/styles.css">
  <script src="/assets/main.js" defer></script>
  ${bodyClass === 'story-page' ? '<script src="/assets/gallery.js" type="module"></script>' : ''}
</head>
<body class="${bodyClass}">
  <a class="skip-link" href="#main">Skip to content</a>
  ${header(bodyClass === 'home-page')}
  ${body}
  ${footer(site)}
</body>
</html>\n`;
}

function card(trip, index) {
  return `<article class="story-card" data-continent="${e(continentForCountry(trip.country))}">
    <a class="card-link" href="${tripPath(trip)}">
      <div class="card-image">${photo(trip.cover)}<span class="image-label">${e(trip.category)}</span><span class="card-arrow">${arrow}</span></div>
      <div class="card-meta"><span>${number(index + 1)} / ${e(trip.country)}</span><span>${number(frameCount(trip))} frames${trip.demo ? ' · Sample story' : ''}</span></div>
      ${trip.startDate ? `<p class="card-dates">${dateRange(trip.startDate, trip.endDate)}</p>` : ''}
      <h3>${e(trip.title)}</h3><p>${e(trip.subtitle)}</p>
    </a>
  </article>`;
}

function atlasMarker({ href, label, badge, x, y, position, attributes, description, country = false }) {
  const [labelX, labelY] = position || [x + 90, y - 40];
  const width = Math.max(104, label.length * 7.4 + 49);
  const left = labelX - width / 2;
  const edge = labelX < x ? labelX + width / 2 : labelX - width / 2;
  return `<a class="atlas-location" href="${href}" ${attributes} aria-label="${e(description)}">
    <title>${e(description)}</title>
    <path class="atlas-leader" d="M${edge.toFixed(1)},${labelY}L${(edge + (x - edge) * .55).toFixed(1)},${labelY}L${x.toFixed(1)},${y.toFixed(1)}"/>
    <circle class="atlas-halo" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="12"/>
    <circle class="atlas-pin" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4"/>
    <g class="atlas-label"><rect x="${left.toFixed(1)}" y="${labelY - 19}" width="${width.toFixed(1)}" height="38" rx="19"/><text x="${(left + 15).toFixed(1)}" y="${labelY + 4}"><tspan class="atlas-label-number">${number(badge)}</tspan><tspan dx="9">${e(label)}</tspan><tspan class="atlas-label-arrow" dx="10">${country ? '+' : '↗'}</tspan></text></g>
  </a>`;
}

function travelAtlas(trips) {
  const countries = groupAtlasCountries(trips);
  const countLabel = (count) => `${count} ${count === 1 ? 'album' : 'albums'}`;
  return `<section class="atlas wrap" id="atlas" data-atlas aria-labelledby="atlas-heading">
    <div class="atlas-panel">
      <h2 class="sr-only" id="atlas-heading" data-atlas-heading>Travel map</h2>
      <div class="atlas-controls"><button class="atlas-back" type="button" data-atlas-back hidden>← World map</button></div>
      <div class="atlas-viewport" role="region" aria-label="Travel map" tabindex="0"><svg class="atlas-map" viewBox="0 0 ${atlasSize.width} ${atlasSize.height}" role="group" aria-labelledby="atlas-map-title atlas-map-description">
        <title id="atlas-map-title">Explore the travel albums by destination</title>
        <desc id="atlas-map-description" data-atlas-description>Select a destination on the map to explore its albums.</desc>
        <defs><radialGradient id="atlas-ocean"><stop stop-color="#2c4b42"/><stop offset="1" stop-color="#19372f"/></radialGradient><pattern id="atlas-grain" width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".45" fill="#e3dfc4" opacity=".08"/></pattern></defs>
        <rect width="1200" height="600" fill="url(#atlas-ocean)" aria-hidden="true"/>
        <g class="atlas-geography" data-atlas-geography aria-hidden="true">
          <image href="/images/world-atlas.svg" width="1200" height="600"/>
          <g class="atlas-country-shapes">${countries.filter((country) => country.outlineIds.length).map((country) => `<a class="atlas-country-area" href="#atlas-country-${e(country.id)}" data-atlas-country="${e(country.id)}" tabindex="-1">${country.outlineIds.map((id) => `<use href="/images/atlas-countries.svg#${e(id)}"/>`).join('')}</a>`).join('')}</g>
          <image href="/images/atlas-lakes.svg" width="1200" height="600" pointer-events="none"/>
        </g>
        <rect width="1200" height="600" fill="url(#atlas-grain)" pointer-events="none" aria-hidden="true"/>
        <g data-atlas-world>
          <g class="atlas-oceans" aria-hidden="true"><text x="168" y="420">Pacific Ocean</text><text x="546" y="305" text-anchor="middle" font-size="12" letter-spacing="2">Atlantic<tspan x="546" dy="19">Ocean</tspan></text><text x="755" y="400">Indian Ocean</text></g>
          <g class="atlas-compass" transform="translate(72 496)" aria-hidden="true"><circle r="26"/><path d="M0-36V36M-36 0H36M-18-18L18 18M-18 18L18-18"/><path d="M0-27L6 0 0 27-6 0Z" fill="#e0c6a2"/><path d="M-27 0L0-6 27 0 0 6Z"/><text y="-45" text-anchor="middle">N</text></g>
          ${countries.map((country) => {
            const [x, y] = projectLocation(country.longitude, country.latitude);
            return atlasMarker({ href: `#atlas-country-${e(country.id)}`, label: country.label, badge: country.trips.length, x, y, position: country.labelPosition, country: true, attributes: `data-atlas-country="${e(country.id)}" aria-controls="atlas-country-${e(country.id)}"`, description: `Explore ${country.label}: ${countLabel(country.trips.length)}` });
          }).join('')}
        </g>
        ${countries.map((country) => `<g class="atlas-album-layer" data-atlas-layer="${e(country.id)}" hidden>${country.trips.map((trip, index) => {
          const { label, latitude, longitude, labelPosition } = trip.mapLocation;
          const [x, y] = projectLocation(longitude, latitude);
          return atlasMarker({ href: tripPath(trip), label, badge: index + 1, x: x * country.view.scale + country.view.x, y: y * country.view.scale + country.view.y, position: country.albumLabelPositions[trip.slug] || labelPosition, attributes: `data-atlas-album="${e(trip.slug)}" data-atlas-title="${e(trip.title)}"`, description: `${label}: ${trip.title}` });
        }).join('')}</g>`).join('')}
      </svg></div>
      <p class="sr-only" data-atlas-caption>Select a destination to explore its albums.</p>
      <div class="atlas-country-panels">${countries.map((country) => `<section class="atlas-country-panel" id="atlas-country-${e(country.id)}" data-atlas-panel="${e(country.id)}" data-atlas-aliases="${e(country.aliases.join(' '))}" data-atlas-label="${e(country.label)}" data-atlas-count="${country.trips.length}" data-atlas-transform="matrix(${country.view.scale.toFixed(5)},0,0,${country.view.scale.toFixed(5)},${country.view.x.toFixed(3)},${country.view.y.toFixed(3)})" aria-labelledby="atlas-country-heading-${e(country.id)}">
        <div class="atlas-country-heading"><div><p class="eyebrow">${e(country.label)}</p><h3 id="atlas-country-heading-${e(country.id)}" tabindex="-1">Choose an <em>album.</em></h3></div><p>${countLabel(country.trips.length)} · ${country.trips.reduce((sum, trip) => sum + frameCount(trip), 0)} photographs</p></div>
        <div class="atlas-album-grid">${country.trips.map((trip, index) => `<a class="atlas-album-card" href="${tripPath(trip)}" data-atlas-album="${e(trip.slug)}" data-atlas-title="${e(trip.title)}"><div class="atlas-album-image">${photo(trip.cover)}<span aria-hidden="true">↗</span></div><div class="atlas-album-copy"><p>${number(index + 1)} <span aria-hidden="true">/</span> ${e(trip.mapLocation.label)}</p><h4>${e(trip.title)}</h4><span>${frameCount(trip)} photographs${trip.startDate ? ` · ${dateRange(trip.startDate, trip.endDate)}` : ''}</span></div></a>`).join('')}</div>
      </section>`).join('')}</div>
      <p class="sr-only" data-atlas-status aria-live="polite"></p>
    </div>
    <div class="atlas-footnote"><span>Every pin, a place remembered.</span><a href="https://www.naturalearthdata.com/">Map made with Natural Earth</a></div>
  </section>`;
}

export function renderHome(site, trips) {
  trips = trips.map((trip) => resolveTripPhotos(site, trip));
  const continents = [...new Set(trips.map((trip) => continentForCountry(trip.country)))];
  return page(site, {
    title: `${site.name} — A personal travel journal`, description: site.description, image: trips[0].cover.src, bodyClass: 'home-page',
    body: `<main id="main">
      <h1 class="sr-only">${e(site.name)}</h1>
      ${travelAtlas(trips)}
      <section class="journal wrap" id="journal" aria-labelledby="journal-heading">
        <div class="section-topline"><p class="eyebrow">01 — The journal</p><span>${number(trips.length)} stories & counting</span></div>
        <div class="journal-heading"><h2 id="journal-heading">Elsewhere, <em>remembered.</em></h2><p>Some memories deserve<br>more than a camera roll.</p></div>
        <div class="filters" aria-label="Filter stories by continent" hidden><button type="button" data-filter="all" aria-pressed="true">All places <sup>${number(trips.length)}</sup></button>${continents.map((continent) => `<button type="button" data-filter="${e(continent)}" aria-pressed="false">${e(continent)} <sup>${number(trips.filter((trip) => continentForCountry(trip.country) === continent).length)}</sup></button>`).join('')}</div>
        <p class="sr-only" data-filter-status aria-live="polite"></p>
        <div class="story-grid">${trips.map(card).join('')}</div>
        ${trips.some((trip) => trip.demo) ? '<p class="sample-note">Sample stories use stock photography. <a href="/credits/">See photo credits</a>.</p>' : ''}
      </section>
      <section class="about" id="about" aria-labelledby="about-heading"><div class="about-inner wrap">
        <div class="about-mark" aria-hidden="true">${aperture}<span>Always<br>looking closer.</span></div>
        <div><p class="eyebrow">02 — Behind the lens</p><h2 id="about-heading">Collect moments.<br><em>Keep the feeling.</em></h2><p class="about-copy">${e(site.about)}</p><a class="text-link" href="#journal">There’s a story in every journey ${arrow}</a></div>
      </div></section>
    </main>`,
  });
}

export function renderStoryRedirect(site, trip) {
  const destination = tripPath(trip);
  return page(site, {
    title: `${trip.title} — ${site.name}`, description: trip.subtitle, path: destination,
    redirectTo: destination,
    body: `<main class="credits-page wrap" id="main"><h1>This album has moved.</h1><p>These photographs are now together in <a class="text-link" href="${destination}">${e(trip.title)} ${arrow}</a>.</p></main>`,
  });
}

const credit = (photo) => photo.credit ? `<span class="photo-credit">Photo: ${photo.creditUrl ? `<a href="${e(photo.creditUrl)}">${e(photo.credit)}</a>` : e(photo.credit)}${photo.license ? ` · <a href="${e(photo.licenseUrl)}">${e(photo.license)}</a>` : ''}</span>` : '';

function galleryPhoto(image) {
  const classes = [image.wide ? 'photo-wide' : '', image.height > image.width ? 'photo-portrait' : ''].filter(Boolean).join(' ');
  const viewerCaption = [image.caption || image.alt, image.capturedOn ? formatDate(image.capturedOn) : '', image.location].filter(Boolean).join(' · ');
  return `<figure class="${classes}"><a class="gallery-photo" href="${e(image.src)}" data-photo data-caption="${e(viewerCaption)}" aria-label="Enlarge: ${e(image.alt)}">${photo(image)}<span class="enlarge-mark" aria-hidden="true">↗</span></a><figcaption><span class="caption-copy"><span>${e(image.caption || '')}</span>${image.capturedOn || image.location ? `<span class="photo-context">${photoContext(image)}</span>` : ''}</span>${credit(image)}</figcaption></figure>`;
}

function gallery(chapter) {
  if (chapter.layout === 'full') return `<div class="gallery gallery-full wrap">${chapter.photos.map(galleryPhoto).join('')}</div>`;
  const width = 1200;
  const rows = packGallery(chapter.photos, { width }).map((row) => `<div class="gallery-row${row.indices.length === 1 ? ' gallery-row-single' : ''}" style="${galleryRowStyle(row, width)}">${row.indices.map((index) => galleryPhoto(chapter.photos[index])).join('')}</div>`).join('');
  return `<div class="gallery gallery-packed wrap" data-packed-gallery>${rows}</div>`;
}

export function renderStory(site, trip, nextTrip) {
  trip = resolveTripPhotos(site, trip);
  nextTrip = resolveTripPhotos(site, nextTrip);
  return page(site, {
    title: `${trip.title} — ${site.name}`, description: trip.subtitle, path: tripPath(trip), image: trip.cover.src, bodyClass: 'story-page',
    body: `<div class="reading-progress" aria-hidden="true"></div><main id="main">
      <article>
        <header class="story-intro wrap"><a class="back-link" href="/#journal">← Back to the journal</a><p class="eyebrow">${e(trip.country)} <span aria-hidden="true">/</span> ${e(trip.category)}</p><h1>${e(trip.title)}</h1><p class="story-subtitle">${e(trip.subtitle)}</p><div class="story-details"><span>${e(trip.location)}</span>${trip.startDate ? `<span>${dateRange(trip.startDate, trip.endDate)}</span>` : ''}<span>${number(frameCount(trip))} photographs</span><span>${trip.demo ? 'Sample story' : 'A photo essay'}</span></div></header>
        <div class="story-cover wrap">${photo(trip.cover, { lazy: false })}<div class="cover-credit">${trip.cover.capturedOn || trip.cover.location ? `<span class="photo-context">${photoContext(trip.cover)}</span>` : ''}${credit(trip.cover)}</div></div>
        ${trip.demo ? '<aside class="demo-notice prose">You’re viewing a sample story with stock photography. Personal photographs and field notes will make their home here.</aside>' : ''}
        ${trip.showChapterIndex === false ? '' : `<nav id="chapters" class="chapter-nav wrap${trip.chapters.some((chapter) => chapter.date) ? ' chapter-nav-dated' : ''}" aria-label="Chapters">${trip.chapters.map((chapter, index) => `<a href="#chapter-${index + 1}">${chapter.date ? `<span class="chapter-nav-date">${time(chapter.date, { year: false })}</span>` : number(index + 1)} <span>${e(chapter.title)}</span></a>`).join('')}</nav>`}
        ${trip.chapters.map((chapter, index) => `<section class="chapter" id="chapter-${index + 1}"><div class="prose"><p class="eyebrow">${number(index + 1)} — ${e(chapter.location || 'Field notes')}</p><h2>${e(chapter.title)}</h2>${chapter.date ? `<p class="chapter-date">${time(chapter.date)} <span aria-hidden="true">·</span> ${chapter.photos.length} ${chapter.photos.length === 1 ? 'photograph' : 'photographs'}</p>` : ''}${chapter.paragraphs.map((paragraph) => `<p>${e(paragraph)}</p>`).join('')}</div>${gallery(chapter)}${chapter.date && trip.showChapterIndex !== false ? '<div class="chapter-return wrap"><a href="#chapters">Back to the day index ↑</a></div>' : ''}</section>`).join('')}
        <div class="story-end prose"><span aria-hidden="true">✳</span><p>Until the next journey.</p><a class="text-link" href="/#journal">Back to all stories ${arrow}</a></div>
      </article>
      ${nextTrip ? `<section class="next-story wrap"><p class="eyebrow">Keep wandering</p><a href="${tripPath(nextTrip)}"><div>${photo(nextTrip.cover)}</div><span><span class="eyebrow">${e(nextTrip.country)}</span><h2>${e(nextTrip.title)}</h2><span class="text-link">Read the next story ${arrow}</span></span></a></section>` : ''}
    </main>
    <dialog class="lightbox" aria-label="Photo viewer" aria-describedby="viewer-help"><p class="sr-only" id="viewer-help">Use the left and right arrow keys to browse photographs. Press Escape to close.</p><button class="lightbox-close" type="button" aria-label="Close photo viewer">Close <span aria-hidden="true">×</span></button><div class="lightbox-stage"><button class="lightbox-prev" type="button" aria-label="Previous photograph">←</button><img class="lightbox-image" alt=""><button class="lightbox-next" type="button" aria-label="Next photograph">→</button></div><div class="lightbox-caption"><p data-viewer-caption></p><span data-viewer-count aria-live="polite"></span></div></dialog>`,
  });
}

export function renderCredits(site, trips) {
  trips = trips.map((trip) => resolveTripPhotos(site, trip));
  const images = [...new Map(trips.flatMap(allPhotos).filter((image) => image.credit).map((image) => [image.src, image])).values()];
  return page(site, {
    title: `Photo credits — ${site.name}`, description: 'The photographs behind the journal.', path: '/credits/',
    body: `<main class="credits-page wrap" id="main"><p class="eyebrow">Behind the photographs</p><h1>Photo <em>credits.</em></h1><p class="credits-intro">${images.length ? 'Source and license information for credited photographs appears below.' : 'The journal uses original travel photographs from the owner’s collections.'}</p><div class="credit-grid">${images.map((image) => `<article>${photo(image)}<h2>${e(image.credit)}</h2><p>${e(image.alt)}</p>${credit(image)}${image.license === 'CC BY-SA 4.0' ? '<p class="credit-change">Preview derivative: resized and converted to WebP; displayed with responsive cropping. Licensed under CC BY-SA 4.0.</p>' : ''}</article>`).join('')}</div><a class="text-link" href="/">Back to the journal ${arrow}</a></main>`,
  });
}

export function render404(site) {
  return page(site, {
    title: `A little off the path — ${site.name}`, description: 'Find your way back to the journal.', path: '/404.html',
    body: `<main class="not-found wrap" id="main"><p class="eyebrow">404 — An unexpected detour</p><h1>A little off <em>the path.</em></h1><p>This page hasn’t found its way into the journal.</p><a class="text-link" href="/">Let’s head back ${arrow}</a></main>`,
  });
}
