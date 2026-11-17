// Run before the stylesheet so a saved choice is applied before the first paint.
(() => {
  const key = 'beyondlenses-theme';
  const root = document.documentElement;
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  const valid = (value) => value === 'dark' || value === 'light' ? value : null;
  let choice = null;
  try { choice = valid(window.localStorage.getItem(key)); } catch { /* Storage can be unavailable in private browsing. */ }
  let button;
  const apply = () => {
    const theme = choice || (system.matches ? 'dark' : 'light');
    root.dataset.theme = theme;
    for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
      meta.content = theme === 'dark' ? '#161b18' : '#f5f3ed';
    }
    if (button) {
      button.setAttribute('aria-pressed', String(theme === 'dark'));
      button.title = `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`;
    }
  };
  apply();
  const initialize = () => {
    button = document.querySelector('[data-theme-toggle]');
    if (!button) return;
    button.hidden = false;
    button.addEventListener('click', () => {
      choice = root.dataset.theme === 'dark' ? 'light' : 'dark';
      try { window.localStorage.setItem(key, choice); } catch { /* The switch still works for this page. */ }
      apply();
    });
    apply();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
  system.addEventListener('change', apply);
  window.addEventListener('storage', (event) => {
    if (event.key !== key && event.key !== null) return;
    choice = valid(event.newValue);
    apply();
  });
})();
