const width = 1200;
const height = 600;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const initialAtlasView = () => ({ scale: 1, x: 0, y: 0 });

export function boundAtlasView(view) {
  const scale = clamp(view.scale, 1, 5);
  return { scale, x: clamp(view.x, 0, width - width / scale), y: clamp(view.y, 0, height - height / scale) };
}

// Points are fractions of the visible map. Keep the touched place under the fingers.
export function pinchAtlas(view, ratio, from, to = from) {
  const scale = clamp(view.scale * ratio, 1, 5);
  return boundAtlasView({
    scale,
    x: view.x + from.x * width / view.scale - to.x * width / scale,
    y: view.y + from.y * height / view.scale - to.y * height / scale,
  });
}

export function initializeAtlasZoom(root = document) {
  const atlas = root.querySelector('[data-atlas]');
  if (!atlas) return;
  const viewport = atlas.querySelector('.atlas-viewport');
  const map = atlas.querySelector('.atlas-map');
  const controls = [...atlas.querySelectorAll('[data-map-zoom]')];
  const status = atlas.querySelector('[data-map-zoom-status]');
  let view = initialAtlasView();
  let gesture = null;
  let lastMove = 0;
  let pending = false;
  viewport.setAttribute('data-map-ready', '');
  const paint = () => {
    map.setAttribute('viewBox', `${view.x} ${view.y} ${width / view.scale} ${height / view.scale}`);
    viewport.setAttribute('data-zoomed', String(view.scale > 1));
    controls.forEach((button) => { button.disabled = button.dataset.mapZoom === 'out' ? view.scale === 1 : button.dataset.mapZoom === 'in' ? view.scale === 5 : view.scale === 1; });
    status.textContent = `Map zoom ${Math.round(view.scale * 100)}%`;
    pending = false;
  };
  const schedule = () => {
    if (!pending) { pending = true; requestAnimationFrame(paint); }
  };
  const reset = () => { view = initialAtlasView(); schedule(); };
  const point = (touch) => {
    const rect = map.getBoundingClientRect();
    // SVG meet scaling can leave side gutters on a short landscape phone.
    const unit = Math.min(rect.width / width, rect.height / height);
    const left = rect.left + (rect.width - width * unit) / 2;
    const top = rect.top + (rect.height - height * unit) / 2;
    return { x: (touch.clientX - left) / (width * unit), y: (touch.clientY - top) / (height * unit) };
  };
  const midpoint = (touches) => ({ clientX: (touches[0].clientX + touches[1].clientX) / 2, clientY: (touches[0].clientY + touches[1].clientY) / 2 });
  const distance = (touches) => Math.hypot(touches[1].clientX - touches[0].clientX, touches[1].clientY - touches[0].clientY);
  const start = (event) => {
    const touches = event.touches;
    if (touches.length === 2) {
      event.preventDefault();
      gesture = { view: { ...view }, point: point(midpoint(touches)), distance: Math.max(1, distance(touches)), count: 2 };
      lastMove = Date.now();
    } else if (touches.length === 1 && view.scale > 1) gesture = { view: { ...view }, point: point(touches[0]), count: 1 };
    else gesture = null;
  };
  viewport.addEventListener('touchstart', start, { passive: false });
  viewport.addEventListener('touchmove', (event) => {
    if (!gesture || event.touches.length !== gesture.count) return;
    const next = point(gesture.count === 2 ? midpoint(event.touches) : event.touches[0]);
    if (gesture.count === 1 && Math.hypot(next.x - gesture.point.x, next.y - gesture.point.y) < .008) return;
    event.preventDefault();
    view = pinchAtlas(gesture.view, gesture.count === 2 ? distance(event.touches) / gesture.distance : 1, gesture.point, next);
    lastMove = Date.now();
    schedule();
  }, { passive: false });
  viewport.addEventListener('touchend', (event) => { if (event.touches.length) start(event); else gesture = null; }, { passive: false });
  viewport.addEventListener('touchcancel', () => { gesture = null; });
  viewport.addEventListener('click', (event) => {
    if (Date.now() - lastMove < 400) { event.preventDefault(); event.stopPropagation(); }
  }, true);
  viewport.addEventListener('wheel', (event) => {
    if (!event.ctrlKey) return;
    event.preventDefault();
    view = pinchAtlas(view, Math.exp(-event.deltaY * .01), point(event));
    schedule();
  }, { passive: false });
  viewport.addEventListener('keydown', (event) => {
    if (event.target !== viewport) return;
    if (['+', '=', '-'].includes(event.key)) view = pinchAtlas(view, event.key === '-' ? 1 / 1.5 : 1.5, { x: .5, y: .5 });
    else if (event.key === '0' || event.key === 'Home') view = initialAtlasView();
    else if (view.scale > 1 && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) view = boundAtlasView({ ...view, x: view.x + (event.key === 'ArrowLeft' ? -80 : event.key === 'ArrowRight' ? 80 : 0) / view.scale, y: view.y + (event.key === 'ArrowUp' ? -80 : event.key === 'ArrowDown' ? 80 : 0) / view.scale });
    else return;
    event.preventDefault();
    schedule();
  });
  for (const button of controls) button.addEventListener('click', () => {
    view = button.dataset.mapZoom === 'reset' ? initialAtlasView() : pinchAtlas(view, button.dataset.mapZoom === 'in' ? 1.5 : 1 / 1.5, { x: .5, y: .5 });
    schedule();
  });
  atlas.addEventListener('click', (event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (event.target.closest('[data-atlas-country], [data-atlas-back]') && !event.defaultPrevented) reset();
    // Country links intentionally prevent navigation, but still reset local pinch zoom.
    else if (event.target.closest('[data-atlas-country]') && Date.now() - lastMove >= 400) reset();
  });
  atlas.addEventListener('keydown', (event) => { if (event.key === 'Escape') reset(); });
  paint();
}
