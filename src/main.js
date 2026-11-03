const atlas = document.querySelector('[data-atlas]');
if (atlas) {
  const countryLinks = [...atlas.querySelectorAll('[data-atlas-country]')];
  const albumLinks = [...atlas.querySelectorAll('[data-atlas-album]')];
  const panels = [...atlas.querySelectorAll('[data-atlas-panel]')];
  const layers = [...atlas.querySelectorAll('[data-atlas-layer]')];
  const world = atlas.querySelector('[data-atlas-world]');
  const geography = atlas.querySelector('[data-atlas-geography]');
  const back = atlas.querySelector('[data-atlas-back]');
  const heading = atlas.querySelector('[data-atlas-heading]');
  const description = atlas.querySelector('[data-atlas-description]');
  const status = atlas.querySelector('[data-atlas-status]');
  const caption = atlas.querySelector('[data-atlas-caption]');
  const worldHeading = heading.innerHTML;
  const worldDescription = description.textContent;
  const worldCaption = caption.textContent;
  let selected = null;
  let returnFocus = null;
  let baseCaption = worldCaption;

  const showCountry = (id, { focus = true, source = null } = {}) => {
    const panel = panels.find((item) => item.dataset.atlasPanel === id);
    if (id && !panel) return;
    selected = id;
    atlas.classList.toggle('is-country', Boolean(panel));
    world.toggleAttribute('hidden', Boolean(panel));
    back.hidden = !panel;
    geography.style.transform = panel ? panel.dataset.atlasTransform : 'matrix(1,0,0,1,0,0)';
    for (const item of panels) item.hidden = item !== panel;
    for (const layer of layers) layer.toggleAttribute('hidden', layer.dataset.atlasLayer !== id);
    for (const link of countryLinks) {
      const current = Boolean(panel && link.dataset.atlasCountry === id);
      link.classList.toggle('is-selected', current);
      link.setAttribute('aria-expanded', String(current));
      if (current) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    }
    if (panel) {
      const count = Number(panel.dataset.atlasCount);
      const albums = `${count} ${count === 1 ? 'album' : 'albums'}`;
      heading.textContent = panel.dataset.atlasLabel;
      baseCaption = `${panel.dataset.atlasLabel} · ${albums}. Choose a location or an album below.`;
      description.textContent = `Zoomed map of ${panel.dataset.atlasLabel}. Locations link to the ${albums} listed below the map.`;
      returnFocus = source && source.getAttribute('tabindex') !== '-1' ? source : countryLinks.find((link) => link.dataset.atlasCountry === id && link.getAttribute('tabindex') !== '-1');
      if (focus) panel.querySelector('h3').focus({ preventScroll: true });
    } else {
      heading.innerHTML = worldHeading;
      baseCaption = worldCaption;
      description.textContent = worldDescription;
      if (focus) returnFocus?.focus({ preventScroll: true });
    }
    caption.textContent = baseCaption;
    status.textContent = panel ? `${panel.dataset.atlasLabel} selected. ${panel.dataset.atlasCount} ${Number(panel.dataset.atlasCount) === 1 ? 'album is' : 'albums are'} available below the map.` : 'World map. Choose a country to explore.';
  };

  for (const link of countryLinks) {
    link.addEventListener('click', (event) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      showCountry(link.dataset.atlasCountry, { source: link });
    });
  }
  back.addEventListener('click', () => showCountry(null));
  atlas.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && selected) {
      event.preventDefault();
      showCountry(null);
    }
  });

  const links = [...countryLinks, ...albumLinks];
  const highlight = (link) => {
    for (const item of links) item.classList.toggle('is-active', Boolean(link && (link.dataset.atlasAlbum ? item.dataset.atlasAlbum === link.dataset.atlasAlbum : item.dataset.atlasCountry === link.dataset.atlasCountry)));
    const panel = link?.dataset.atlasCountry ? panels.find((item) => item.dataset.atlasPanel === link.dataset.atlasCountry) : null;
    caption.textContent = link?.dataset.atlasTitle || (panel ? `${panel.dataset.atlasLabel} · ${panel.dataset.atlasCount} ${Number(panel.dataset.atlasCount) === 1 ? 'album' : 'albums'}` : baseCaption);
  };
  for (const link of links) {
    link.addEventListener('pointerenter', () => highlight(link));
    link.addEventListener('pointerleave', () => highlight(links.includes(document.activeElement) ? document.activeElement : null));
    link.addEventListener('focus', () => highlight(link));
    link.addEventListener('blur', (event) => highlight(links.includes(event.relatedTarget) ? event.relatedTarget : null));
  }
  const initialCountry = window.location.hash.startsWith('#atlas-country-') ? window.location.hash.slice('#atlas-country-'.length) : null;
  showCountry(panels.some((panel) => panel.dataset.atlasPanel === initialCountry) ? initialCountry : null, { focus: false });
}

const filterBar = document.querySelector('.filters');
if (filterBar) {
  filterBar.hidden = false;
  const cards = [...document.querySelectorAll('[data-country]')];
  const status = document.querySelector('[data-filter-status]');
  filterBar.addEventListener('click', (event) => {
    const button = event.target.closest('[data-filter]');
    if (!button) return;
    const country = button.dataset.filter;
    for (const item of filterBar.querySelectorAll('button')) item.setAttribute('aria-pressed', String(item === button));
    for (const card of cards) card.hidden = country !== 'all' && card.dataset.country !== country;
    const count = cards.filter((card) => !card.hidden).length;
    status.textContent = `${count} ${count === 1 ? 'story' : 'stories'} shown${country === 'all' ? '' : ` from ${country}`}.`;
  });
}

const progress = document.querySelector('.reading-progress');
if (progress) {
  let scheduled = false;
  const update = () => {
    const distance = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.transform = `scaleX(${distance > 0 ? Math.min(1, Math.max(0, window.scrollY / distance)) : 0})`;
    scheduled = false;
  };
  const schedule = () => {
    if (!scheduled) { scheduled = true; requestAnimationFrame(update); }
  };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  window.addEventListener('load', schedule);
  update();
}

const viewer = document.querySelector('.lightbox');
if (viewer && typeof viewer.showModal === 'function') {
  const photos = [...document.querySelectorAll('[data-photo]')];
  const image = viewer.querySelector('.lightbox-image');
  const caption = viewer.querySelector('[data-viewer-caption]');
  const count = viewer.querySelector('[data-viewer-count]');
  let index = 0;
  const show = (next) => {
    index = (next + photos.length) % photos.length;
    const link = photos[index];
    image.src = link.href;
    image.alt = link.querySelector('img').alt;
    caption.textContent = link.dataset.caption;
    count.textContent = `${index + 1} / ${photos.length}`;
  };
  photos.forEach((link, photoIndex) => link.addEventListener('click', (event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    show(photoIndex);
    viewer.showModal();
    document.documentElement.classList.add('viewer-open');
  }));
  viewer.querySelector('.lightbox-close').addEventListener('click', () => viewer.close());
  viewer.querySelector('.lightbox-prev').addEventListener('click', () => show(index - 1));
  viewer.querySelector('.lightbox-next').addEventListener('click', () => show(index + 1));
  viewer.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      show(index + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  viewer.addEventListener('close', () => document.documentElement.classList.remove('viewer-open'));
  viewer.addEventListener('click', (event) => { if (event.target === viewer) viewer.close(); });
}
