/** Activities overlay: search apps and every file. Ctrl+K or / to open, Esc to close. */
import type { OS } from '../core/os';
import { APPS, tile, glyph, AppId } from '../core/apps';
import { files, title } from '../core/vfs';
import { h } from '../apps/tui';

interface Hit { label: string; sub: string; icon: SVGElement; run: () => void }

export function launcher(os: OS, host: HTMLElement) {
  const overlay = h('div', 'launcher');
  overlay.hidden = true;
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', 'Search');
  const box = h('div', 'launcher-box');
  const input = Object.assign(h('input', 'launcher-input'), { placeholder: 'Search apps and files', type: 'search' });
  input.setAttribute('aria-label', 'Search apps and files');
  const grid = h('div', 'launcher-grid');
  const results = h('ul', 'launcher-results');
  results.setAttribute('role', 'listbox');
  box.append(input, grid, results);
  overlay.append(box);
  host.append(overlay);

  const launchable = APPS.filter((a) => a.id !== 'reader');
  for (const a of launchable) {
    const b = h('button', 'launcher-app');
    b.append(tile(a.id, 56), h('span', '', a.name));
    b.addEventListener('click', () => { close(); os.launch(a.id as AppId); });
    grid.append(b);
  }

  let hits: Hit[] = [];
  let sel = 0;
  function search() {
    const q = input.value.trim().toLowerCase();
    grid.hidden = q !== '';
    results.replaceChildren();
    if (!q) { hits = []; return; }
    hits = [
      ...launchable.filter((a) => a.name.toLowerCase().includes(q)).map((a) => ({ label: a.name, sub: 'application', icon: tile(a.id, 28), run: () => os.launch(a.id as AppId) })),
      ...files().filter((f) => (f.raw + f.path).toLowerCase().includes(q)).map((f) => ({ label: title(f), sub: f.path, icon: glyph('reader', 18), run: () => os.openPath(f.path) })),
    ].slice(0, 8);
    sel = 0;
    if (!hits.length) results.append(h('li', 'launcher-none', `nothing matches “${input.value.trim()}”`));
    hits.forEach((x, i) => {
      const li = h('li', `launcher-hit${i === sel ? ' sel' : ''}`);
      li.setAttribute('role', 'option');
      li.append(x.icon, h('span', 'hit-label', x.label), h('span', 'hit-sub', x.sub));
      li.addEventListener('click', () => { close(); x.run(); });
      results.append(li);
    });
  }
  const mark = () => [...results.children].forEach((li, i) => li.classList.toggle('sel', i === sel));

  input.addEventListener('input', search);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { sel = Math.min(hits.length - 1, sel + 1); mark(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); mark(); e.preventDefault(); }
    else if (e.key === 'Enter' && hits[sel]) { const x = hits[sel]; close(); x.run(); }
  });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  function open() { overlay.hidden = false; requestAnimationFrame(() => overlay.classList.add('in')); input.value = ''; search(); input.focus(); }
  function close() { overlay.classList.remove('in'); setTimeout(() => { overlay.hidden = true; }, 160); }
  return { open, close, toggle: () => (overlay.hidden ? open() : close()), isOpen: () => !overlay.hidden };
}
