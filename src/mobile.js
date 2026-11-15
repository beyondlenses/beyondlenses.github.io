import { initializeAtlasZoom } from './atlas-zoom.js';

initializeAtlasZoom();

const drawers = [...document.querySelectorAll('.nav-drawer')];
if (drawers.length && typeof drawers[0].showModal === 'function') {
  const openers = new Map();
  for (const link of document.querySelectorAll('[data-open-drawer]')) {
    link.addEventListener('click', (event) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const drawer = document.getElementById(link.dataset.openDrawer);
      if (!drawer) return;
      event.preventDefault();
      openers.set(drawer, link);
      drawer.showModal();
      document.documentElement.classList.add('drawer-open');
    });
  }
  for (const drawer of drawers) {
    drawer.querySelector('[data-close-drawer]').addEventListener('click', () => drawer.close());
    drawer.addEventListener('click', (event) => {
      if (event.target === drawer) {
        const bounds = drawer.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) drawer.close();
      }
      if (event.target.closest('.drawer-sections a')) drawer.close();
    });
    drawer.addEventListener('close', () => {
      document.documentElement.classList.remove('drawer-open');
      openers.get(drawer)?.focus({ preventScroll: true });
    });
  }
  const search = document.querySelector('[data-album-search]');
  const options = [...document.querySelectorAll('[data-album-option]')];
  search?.addEventListener('input', () => {
    const query = search.value.trim().toLocaleLowerCase();
    for (const option of options) option.hidden = !option.dataset.search.includes(query);
    const count = options.filter((option) => !option.hidden).length;
    document.querySelector('[data-album-empty]').hidden = count > 0;
    document.querySelector('[data-album-status]').textContent = `${count} ${count === 1 ? 'album' : 'albums'} found.`;
  });
}

// Full text remains available without JavaScript; the compact treatment is mobile only.
for (const text of document.querySelectorAll('[data-expandable]')) {
  if (text.textContent.trim().length < 180) continue;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'show-more';
  button.textContent = 'Show more';
  button.setAttribute('aria-expanded', 'false');
  text.id ||= `description-${[...document.querySelectorAll('[data-expandable]')].indexOf(text) + 1}`;
  button.setAttribute('aria-controls', text.id);
  text.classList.add('is-collapsed');
  text.after(button);
  button.addEventListener('click', () => {
    const expanded = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(expanded));
    button.textContent = expanded ? 'Show less' : 'Show more';
    text.classList.toggle('is-collapsed', !expanded);
  });
}

// Horizontal gestures browse the enlarged photo; vertical scrolling and pinch zoom stay native.
const stage = document.querySelector('.lightbox-stage');
if (stage) {
  let start;
  stage.addEventListener('touchstart', (event) => {
    start = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
  }, { passive: true });
  stage.addEventListener('touchmove', (event) => { if (event.touches.length !== 1) start = null; }, { passive: true });
  stage.addEventListener('touchend', (event) => {
    if (!start || !event.changedTouches.length) return;
    const dx = event.changedTouches[0].clientX - start.x;
    const dy = event.changedTouches[0].clientY - start.y;
    start = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5 && (window.visualViewport?.scale || 1) <= 1) stage.querySelector(dx < 0 ? '.lightbox-next' : '.lightbox-prev').click();
  }, { passive: true });
  stage.addEventListener('touchcancel', () => { start = null; }, { passive: true });
}
