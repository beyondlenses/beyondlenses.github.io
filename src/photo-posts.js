// A run ends at a location/date change. Never combine separated visits or chapters.
export function groupPhotoRuns(photos, maxSize = 8) {
  const runs = [];
  for (let index = 0; index < photos.length; index += 1) {
    const photo = photos[index];
    const key = photo.location ? `${photo.capturedOn || ''}\n${photo.location}` : null;
    const last = runs.at(-1);
    if (key && last?.key === key && last.indices.length < maxSize) last.indices.push(index);
    else runs.push({ key, indices: [index] });
  }
  return runs.map(({ indices }) => indices);
}

export function photoPostHeight(width, height, containerWidth, viewportHeight) {
  const ratio = width > 0 && height > 0 ? height / width : 3 / 4;
  return Math.min(containerWidth * ratio, Math.max(100, viewportHeight - 220));
}

export function photoGroupHeight(photos, containerWidth, viewportHeight) {
  if (!photos.length) return 0;
  const ratios = photos.map(({ width, height }) => width > 0 && height > 0 ? width / height : 4 / 3);
  const uniform = ratios.every((ratio) => Math.abs(ratio - ratios[0]) < .01);
  // Mixed shapes share a landscape frame. Contain each image without cropping.
  return photoPostHeight(uniform ? ratios[0] : 4 / 3, 1, containerWidth, viewportHeight);
}

export function createPhotoPosts(root, figures, positions = new Map()) {
  const descriptors = figures.map((figure) => ({ location: figure.getAttribute('data-photo-location'), capturedOn: figure.getAttribute('data-photo-date') }));
  const initializers = [];
  const element = (tag, className, text) => {
    const node = root.createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const posts = groupPhotoRuns(descriptors).map((indices) => {
    const first = figures[indices[0]];
    const key = first.querySelector('a').href;
    const post = element('div', 'photo-post');
    const header = element('div', 'photo-post-heading');
    header.append(element('span', 'photo-post-location', descriptors[indices[0]].location || 'Along the way'));
    const count = element('span', 'photo-post-count');
    header.append(count);
    const track = element('div', 'photo-post-track');
    track.tabIndex = 0;
    track.setAttribute('role', 'group');
    track.setAttribute('aria-roledescription', 'carousel');
    track.setAttribute('aria-label', `${descriptors[indices[0]].location || 'Photographs'}: ${indices.length} ${indices.length === 1 ? 'photograph' : 'photographs'}`);
    for (const [offset, index] of indices.entries()) {
      figures[index].setAttribute('role', 'group');
      figures[index].setAttribute('aria-roledescription', 'slide');
      figures[index].setAttribute('aria-label', `${offset + 1} of ${indices.length}`);
      track.append(figures[index]);
    }
    post.append(header, track);
    let current = Math.min(positions.get(key) || 0, indices.length - 1);
    const dots = [];
    const previous = element('button', 'photo-post-arrow photo-post-previous', '‹');
    const next = element('button', 'photo-post-arrow photo-post-next', '›');
    const fitGroup = () => {
      if (!track.clientWidth) return;
      const photos = indices.map((index) => figures[index].querySelector('img')).filter(Boolean).map((image) => ({
        width: Number(image.getAttribute('width')) || image.naturalWidth,
        height: Number(image.getAttribute('height')) || image.naturalHeight,
      }));
      if (!photos.length) return;
      const height = photoGroupHeight(photos, track.clientWidth, window.innerHeight);
      post.style.setProperty('--post-image-height', `${height}px`);
      const captionHeight = Math.max(...indices.map((index) => figures[index].querySelector('figcaption')?.getBoundingClientRect().height || 0));
      track.style.height = `${height + captionHeight}px`;
    };
    const update = () => {
      current = Math.max(0, Math.min(indices.length - 1, Math.round(track.scrollLeft / (track.clientWidth || 1))));
      count.textContent = `${current + 1} / ${indices.length}`;
      dots.forEach((dot, index) => {
        dot.setAttribute('aria-current', index === current ? 'true' : 'false');
      });
      previous.disabled = current === 0;
      next.disabled = current === indices.length - 1;
      previous.hidden = previous.disabled;
      next.hidden = next.disabled;
      positions.set(key, current);
    };
    const go = (index) => {
      track.scrollTo({ left: Math.max(0, Math.min(indices.length - 1, index)) * track.clientWidth, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    };
    if (indices.length > 1) {
      const controls = element('div', 'photo-post-controls');
      previous.type = next.type = 'button';
      previous.setAttribute('aria-label', 'Previous photograph in this group');
      next.setAttribute('aria-label', 'Next photograph in this group');
      previous.addEventListener('click', () => go(current - 1));
      next.addEventListener('click', () => go(current + 1));
      const pagination = element('div', 'photo-post-dots');
      for (let index = 0; index < indices.length; index += 1) {
        const dot = element('button', 'photo-post-dot');
        dot.type = 'button';
        dot.setAttribute('aria-label', `Show photograph ${index + 1} of ${indices.length}`);
        dot.addEventListener('click', () => go(index));
        dots.push(dot);
        pagination.append(dot);
      }
      controls.append(previous, pagination, next);
      post.append(controls);
    } else count.hidden = true;
    post.addEventListener('click', (event) => {
      if (event.target.closest('.show-more')) requestAnimationFrame(fitGroup);
    });
    let scheduled = false;
    track.addEventListener('scroll', () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => { scheduled = false; update(); });
    }, { passive: true });
    track.addEventListener('keydown', (event) => {
      if (event.target !== track || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      go(event.key === 'Home' ? 0 : event.key === 'End' ? indices.length - 1 : current + (event.key === 'ArrowRight' ? 1 : -1));
    });
    initializers.push(() => {
      track.scrollLeft = current * track.clientWidth;
      fitGroup();
      update();
    });
    return post;
  });
  return { posts, restore: () => initializers.forEach((initialize) => initialize()) };
}
