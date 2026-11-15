/** Dock: app tiles with magnification, running indicators and a launch bounce. */
import type { OS } from '../core/os';
import { APPS, tile, AppId } from '../core/apps';

const DOCK: AppId[] = ['files', 'terminal', 'projects', 'research', 'publications', 'lab', 'about'];

export function dock(os: OS, host: HTMLElement, openLauncher: () => void) {
  const bar = document.createElement('div');
  bar.className = 'dock-bar';
  const buttons = new Map<string, HTMLButtonElement>();
  for (const id of DOCK) {
    const a = APPS.find((x) => x.id === id)!;
    const b = document.createElement('button');
    b.className = 'dock-item';
    b.setAttribute('aria-label', a.name);
    b.dataset.label = a.name + (a.key ? `  ${a.key}` : '');
    b.append(tile(id, 46), Object.assign(document.createElement('span'), { className: 'dock-dot' }));
    b.addEventListener('click', () => {
      const w = os.wm.wins.find((x) => x.opts.app === id);
      if (w && os.wm.active === w) { w.minimize(); return; }
      if (!w) { b.classList.remove('bounce'); void b.offsetWidth; b.classList.add('bounce'); }
      os.launch(id);
    });
    buttons.set(id, b);
    bar.append(b);
  }
  bar.append(Object.assign(document.createElement('span'), { className: 'dock-sep' }));
  const grid = document.createElement('button');
  grid.className = 'dock-item dock-grid';
  grid.setAttribute('aria-label', 'Show applications');
  grid.dataset.label = 'Search  ctrl k';
  grid.innerHTML = '<svg viewBox="0 0 48 48" width="46" height="46" aria-hidden="true"><rect x="3" y="3" width="42" height="42" rx="11" fill="rgba(255,255,255,.08)" stroke="rgba(255,255,255,.18)"/>' +
    [14, 24, 34].flatMap((x) => [14, 24, 34].map((y) => `<circle cx="${x}" cy="${y}" r="2.6" fill="#e6e9f2"/>`)).join('') + '</svg>';
  grid.addEventListener('click', openLauncher);
  bar.append(grid);
  host.append(bar);

  // magnification: scale by a Gaussian of the horizontal distance to the pointer
  const items = [...bar.querySelectorAll<HTMLElement>('.dock-item')];
  const fine = window.matchMedia('(hover: hover) and (prefers-reduced-motion: no-preference)');
  bar.addEventListener('pointermove', (e) => {
    if (!fine.matches) return;
    for (const it of items) {
      const r = it.getBoundingClientRect();
      const d = (e.clientX - (r.left + r.width / 2)) / 70;
      it.style.setProperty('--s', (1 + 0.38 * Math.exp(-d * d)).toFixed(3));
    }
  });
  bar.addEventListener('pointerleave', () => items.forEach((it) => it.style.setProperty('--s', '1')));

  os.wm.dockTarget = (app) => (buttons.get(app === 'reader' ? 'files' : app) ?? grid).getBoundingClientRect();
  os.wm.onChange(() => {
    for (const [id, b] of buttons) {
      const open = os.wm.wins.some((w) => w.opts.app === id || (id === 'files' && w.opts.app === 'reader'));
      b.classList.toggle('running', open);
      b.classList.toggle('current', os.wm.active?.opts.app === id);
    }
  });
}
