import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../src/theme.js', import.meta.url), 'utf8');

function fixture({ saved = null, dark = false, blocked = false, loading = false } = {}) {
  const listeners = {};
  const attributes = {};
  const root = { dataset: {} };
  const button = { hidden: true, setAttribute(name, value) { attributes[name] = value; }, addEventListener(name, callback) { this[name] = callback; } };
  const metas = [{ content: '#161b18' }, { content: '#f5f3ed' }];
  const system = { matches: dark, addEventListener(name, callback) { this[name] = callback; } };
  const storage = { value: saved, getItem() { if (blocked) throw Error('Storage blocked'); return this.value; }, setItem(key, value) { if (blocked) throw Error('Storage blocked'); this.value = value; } };
  const document = {
    documentElement: root, readyState: loading ? 'loading' : 'complete',
    querySelector: () => button, querySelectorAll: () => metas,
    addEventListener(name, callback) { listeners[name] = callback; },
  };
  const window = { localStorage: storage, matchMedia: () => system, addEventListener(name, callback) { listeners[name] = callback; } };
  vm.runInNewContext(source, { document, window });
  return { root, button, attributes, metas, storage, system, listeners };
}

test('theme follows device changes until the visitor makes a manual choice', () => {
  const f = fixture({ dark: true });
  assert.equal(f.root.dataset.theme, 'dark');
  assert.equal(f.attributes['aria-pressed'], 'true');
  assert.equal(f.button.hidden, false);
  f.system.matches = false;
  f.system.change();
  assert.equal(f.root.dataset.theme, 'light');
  assert.equal(f.storage.value, null, 'Following the device does not create a manual preference');
  f.button.click();
  assert.equal(f.root.dataset.theme, 'dark');
  assert.equal(f.storage.value, 'dark');
  f.system.change();
  assert.equal(f.root.dataset.theme, 'dark', 'A device change cannot override a manual choice');
});

test('a saved choice applies before first paint and persists across pages', () => {
  const f = fixture({ saved: 'light', dark: true, loading: true });
  assert.equal(f.root.dataset.theme, 'light');
  assert.ok(f.metas.every((meta) => meta.content === '#f5f3ed'));
  f.listeners.DOMContentLoaded();
  assert.equal(f.attributes['aria-pressed'], 'false');
  assert.equal(f.button.title, 'Switch to dark theme');
  f.button.click();
  assert.equal(f.attributes['aria-pressed'], 'true');
  assert.equal(f.button.title, 'Switch to light theme');
  assert.ok(f.metas.every((meta) => meta.content === '#161b18'));
  assert.equal(fixture({ saved: f.storage.value }).root.dataset.theme, 'dark');
  f.button.click();
  assert.equal(f.storage.value, 'light');
});

test('theme switching works when storage is blocked and ignores invalid saved values', () => {
  const f = fixture({ dark: true, blocked: true });
  f.button.click();
  assert.equal(f.root.dataset.theme, 'light');
  assert.equal(f.attributes['aria-pressed'], 'false');
  assert.equal(fixture({ saved: 'invalid', dark: true }).root.dataset.theme, 'dark');
});

test('a change in another tab is reflected, and clearing preferences restores the device theme', () => {
  const f = fixture({ saved: 'dark' });
  f.listeners.storage({ key: 'unrelated', newValue: 'light' });
  assert.equal(f.root.dataset.theme, 'dark');
  f.listeners.storage({ key: 'beyondlenses-theme', newValue: 'light' });
  assert.equal(f.root.dataset.theme, 'light');
  f.system.matches = true;
  f.listeners.storage({ key: null, newValue: null });
  assert.equal(f.root.dataset.theme, 'dark');
  f.system.matches = false;
  f.system.change();
  assert.equal(f.root.dataset.theme, 'light');
});
