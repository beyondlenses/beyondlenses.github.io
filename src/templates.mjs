import { resolveTripPhotos } from './photos.mjs';

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

function header() {
  return `<header class="site-header wrap">
    <a class="wordmark" href="/" aria-label="Beyond Lenses home">${aperture}<span>beyondlenses<span class="brand-period">.</span></span></a>
    <nav aria-label="Main navigation"><a href="/#journal">The journal</a><a href="/#about">Behind the lens</a></nav>
    <span class="header-note">A personal photo journal <span aria-hidden="true">↗</span></span>
  </header>`;
}

function footer(site) {
  return `<footer class="site-footer wrap">
    <a class="footer-brand" href="/">${e(site.name)}<span class="brand-period">.</span></a>
    <span>Far from ordinary. Close to the heart.</span>
    <div><a href="/credits/">Photo credits</a><a href="#top">Back to top ↑</a></div>
  </footer>`;
}

function page(site, { title, description, path = '/', image, body, bodyClass = '' }) {
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
</head>
<body class="${bodyClass}">
  <a class="skip-link" href="#main">Skip to content</a>
  ${header()}
  ${body}
  ${footer(site)}
</body>
</html>\n`;
}

function card(trip, index) {
  return `<article class="story-card" data-country="${e(trip.country)}">
    <a class="card-link" href="${tripPath(trip)}">
      <div class="card-image">${photo(trip.cover)}<span class="image-label">${e(trip.category)}</span><span class="card-arrow">${arrow}</span></div>
      <div class="card-meta"><span>${number(index + 1)} / ${e(trip.country)}</span><span>${number(frameCount(trip))} frames${trip.demo ? ' · Sample story' : ''}</span></div>
      ${trip.startDate ? `<p class="card-dates">${dateRange(trip.startDate, trip.endDate)}</p>` : ''}
      <h3>${e(trip.title)}</h3><p>${e(trip.subtitle)}</p>
    </a>
  </article>`;
}

export function renderHome(site, trips) {
  trips = trips.map((trip) => resolveTripPhotos(site, trip));
  const featured = trips.find((trip) => trip.slug === site.featuredTrip);
  const countries = [...new Set(trips.map((trip) => trip.country))];
  return page(site, {
    title: `${site.name} — A personal travel journal`, description: site.description, image: featured.cover.src,
    body: `<main id="main">
      <section class="intro wrap" aria-labelledby="intro-heading">
        <div><p class="eyebrow"><span class="small-star" aria-hidden="true">✳</span> Places. People. Perspective.</p><h1 id="intro-heading">${e(site.headline).replace('stay with you.', '<em>stay with you.</em>')}</h1></div>
        <div class="intro-note"><p>${e(site.introduction)}</p><a class="text-link" href="#journal">Explore the journal ${arrow}</a></div>
      </section>
      <section class="feature wrap" aria-label="Featured story">
        <a class="feature-link" href="${tripPath(featured)}">
          ${photo(featured.cover, { lazy: false, className: 'feature-image' })}
          <div class="feature-shade"></div>
          <span class="feature-kicker">Featured story <span aria-hidden="true">—</span> ${e(featured.country)}</span>
          <div class="feature-bottom"><div><p class="eyebrow">${e(featured.location)}</p><h2>${e(featured.title)}</h2><p class="feature-subtitle">${e(featured.subtitle)}</p></div><span class="feature-cta"><span>Step into the story</span><span class="round-arrow">${arrow}</span></span></div>
          <span class="feature-index">01 / ${number(trips.length)}</span>
        </a>
        <div class="feature-caption"><span>A place. A moment. A story.</span><span>Scroll a little. Travel a little. ↓</span></div>
      </section>
      <section class="journal wrap" id="journal" aria-labelledby="journal-heading">
        <div class="section-topline"><p class="eyebrow">01 — The journal</p><span>${number(trips.length)} stories & counting</span></div>
        <div class="journal-heading"><h2 id="journal-heading">Elsewhere, <em>remembered.</em></h2><p>Some memories deserve<br>more than a camera roll.</p></div>
        <div class="filters" aria-label="Filter stories by country" hidden><button type="button" data-filter="all" aria-pressed="true">All places <sup>${number(trips.length)}</sup></button>${countries.map((country) => `<button type="button" data-filter="${e(country)}" aria-pressed="false">${e(country)} <sup>${number(trips.filter((trip) => trip.country === country).length)}</sup></button>`).join('')}</div>
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

const credit = (photo) => photo.credit ? `<span class="photo-credit">Photo: ${photo.creditUrl ? `<a href="${e(photo.creditUrl)}">${e(photo.credit)}</a>` : e(photo.credit)}${photo.license ? ` · <a href="${e(photo.licenseUrl)}">${e(photo.license)}</a>` : ''}</span>` : '';

function galleryPhoto(image) {
  const classes = [image.wide ? 'photo-wide' : '', image.height > image.width ? 'photo-portrait' : ''].filter(Boolean).join(' ');
  const viewerCaption = [image.caption || image.alt, image.capturedOn ? formatDate(image.capturedOn) : '', image.location].filter(Boolean).join(' · ');
  return `<figure class="${classes}"><a class="gallery-photo" href="${e(image.src)}" data-photo data-caption="${e(viewerCaption)}" aria-label="Enlarge: ${e(image.alt)}">${photo(image)}<span class="enlarge-mark" aria-hidden="true">↗</span></a><figcaption><span class="caption-copy"><span>${e(image.caption || '')}</span>${image.capturedOn || image.location ? `<span class="photo-context">${photoContext(image)}</span>` : ''}</span>${credit(image)}</figcaption></figure>`;
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
        ${trip.chapters.map((chapter, index) => `<section class="chapter" id="chapter-${index + 1}"><div class="prose"><p class="eyebrow">${number(index + 1)} — ${e(chapter.location || 'Field notes')}</p><h2>${e(chapter.title)}</h2>${chapter.date ? `<p class="chapter-date">${time(chapter.date)} <span aria-hidden="true">·</span> ${chapter.photos.length} photographs</p>` : ''}${chapter.paragraphs.map((paragraph) => `<p>${e(paragraph)}</p>`).join('')}</div><div class="gallery gallery-${e(chapter.layout)} wrap">${chapter.photos.map(galleryPhoto).join('')}</div>${chapter.date && trip.showChapterIndex !== false ? '<div class="chapter-return wrap"><a href="#chapters">Back to the day index ↑</a></div>' : ''}</section>`).join('')}
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
    title: `Photo credits — ${site.name}`, description: 'The photographers behind the sample collections.', path: '/credits/',
    body: `<main class="credits-page wrap" id="main"><p class="eyebrow">With thanks</p><h1>Through another <em>lens.</em></h1><p class="credits-intro">The sample collections use photographs from the sources below. These are preview images, not the journal owner’s travel photographs.</p><div class="credit-grid">${images.map((image) => `<article>${photo(image)}<h2>${e(image.credit)}</h2><p>${e(image.alt)}</p>${credit(image)}${image.license === 'CC BY-SA 4.0' ? '<p class="credit-change">Preview derivative: resized and converted to WebP; displayed with responsive cropping. Licensed under CC BY-SA 4.0.</p>' : ''}</article>`).join('')}</div><a class="text-link" href="/">Back to the journal ${arrow}</a></main>`,
  });
}

export function render404(site) {
  return page(site, {
    title: `A little off the path — ${site.name}`, description: 'Find your way back to the journal.', path: '/404.html',
    body: `<main class="not-found wrap" id="main"><p class="eyebrow">404 — An unexpected detour</p><h1>A little off <em>the path.</em></h1><p>This page hasn’t found its way into the journal.</p><a class="text-link" href="/">Let’s head back ${arrow}</a></main>`,
  });
}
