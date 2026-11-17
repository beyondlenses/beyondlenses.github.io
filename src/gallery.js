import { packGallery, galleryRowStyle } from './gallery-layout.js';
import { createPhotoPosts } from './photo-posts.js';

export function initializeGalleries(root = document) {
  const galleries = [...root.querySelectorAll('[data-packed-gallery], [data-full-gallery]')].map((element) => ({
    element,
    figures: [...element.querySelectorAll('figure')],
    width: 0,
    maxHeight: 0,
    mode: null,
    positions: new Map(),
  }));
  if (!galleries.length) return;
  const measure = (gallery) => {
    const { element, figures } = gallery;
    const width = element.getBoundingClientRect().width;
    const maxHeight = Math.max(1, window.innerHeight - 140);
    const mode = window.matchMedia?.('(max-width: 700px), (max-height: 500px) and (pointer: coarse)').matches ? 'posts' : 'rows';
    if (width <= 0 || (Math.abs(width - gallery.width) < 1 && maxHeight === gallery.maxHeight && mode === gallery.mode)) return;
    const gap = parseFloat(getComputedStyle(element).columnGap) || 24;
    const photos = figures.map((figure) => {
      const image = figure.querySelector('img');
      return { width: Number(image.getAttribute('width')) || image.naturalWidth, height: Number(image.getAttribute('height')) || image.naturalHeight, wide: figure.classList.contains('photo-wide') };
    });
    return { gallery, width, maxHeight, gap, mode, rows: mode === 'posts' ? [] : packGallery(photos, { width, gap, maxHeight }), focused: element.contains(root.activeElement) ? root.activeElement : null };
  };
  const apply = ({ gallery, width, maxHeight, gap, mode, rows: packed, focused }) => {
    const { element, figures } = gallery;
    let restore;
    const rows = mode === 'posts' ? (() => {
      const result = createPhotoPosts(root, figures, gallery.positions);
      restore = result.restore;
      return result.posts;
    })() : packed.map((row) => {
      const wrapper = root.createElement('div');
      wrapper.className = `gallery-row${row.indices.length === 1 ? ' gallery-row-single' : ''}`;
      wrapper.setAttribute('style', galleryRowStyle(row, width, gap));
      wrapper.append(...row.indices.map((index) => figures[index]));
      return wrapper;
    });
    if (mode === 'rows' && gallery.mode === 'posts') for (const figure of figures) {
      for (const attribute of ['role', 'aria-roledescription', 'aria-label']) figure.removeAttribute(attribute);
    }
    element.setAttribute('data-gallery-mode', mode);
    element.replaceChildren(...(mode === 'rows' && element.getAttribute('data-full-gallery') !== null ? figures : rows));
    gallery.width = width;
    gallery.maxHeight = maxHeight;
    gallery.mode = mode;
    restore?.();
    focused?.focus({ preventScroll: true });
  };
  // Read all sizes before moving nodes so long albums avoid repeated reflows.
  const update = () => galleries.map(measure).filter(Boolean).forEach(apply);
  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      update();
    });
  };
  for (const gallery of galleries) for (const figure of gallery.figures) {
    const image = figure.querySelector('img');
    if (!image.getAttribute('width') || !image.getAttribute('height')) image.addEventListener('load', () => {
      gallery.width = 0;
      schedule();
    }, { once: true });
  }
  update();
  // Swapped web fonts can change caption wrapping without changing gallery width.
  root.fonts?.ready.then(() => {
    for (const gallery of galleries) if (gallery.mode === 'posts') gallery.width = 0;
    schedule();
  });
  if (typeof ResizeObserver === 'function') {
    const observer = new ResizeObserver(schedule);
    galleries.forEach(({ element }) => observer.observe(element));
  }
  window.addEventListener('resize', schedule);
}

if (typeof document !== 'undefined') initializeGalleries();
