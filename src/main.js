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
