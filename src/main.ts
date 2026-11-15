import './styles/fonts.css';
import './styles/tokens.css';
import './styles/desktop.css';
import './styles/window.css';
import './styles/apps.css';
import './core/commands';
import { createOS } from './core/os';
import { APPS, tile, AppId } from './core/apps';
import { root, about, title, label } from './core/vfs';
import { WORKSPACES } from './core/wm';
import { boot, clockText } from './ui/boot';
import { wallpaper } from './ui/wallpaper';
import { dock } from './ui/dock';
import { launcher } from './ui/launcher';
import { h } from './apps/tui';
import { OS_NAME } from './config';

const $ = (id: string) => document.getElementById(id)!;

function desktop() {
  const shell = $('shell');
  shell.hidden = false;
  const area = $('area');
  wallpaper($('wall'));
  const os = createOS(area);
  const { wm } = os;
  wm.iconFor = (id) => tile(id, 18);
  const search = launcher(os, document.body);

  // ---- top panel ----------------------------------------------------------
  const panel = $('panel');
  const act = h('button', 'pn-act');
  act.append(h('span', 'pn-logo', 'θ'), h('span', 'pn-act-label', 'Activities'));
  act.title = 'Search (Ctrl K)';
  act.addEventListener('click', () => search.toggle());
  const spaces = h('div', 'pn-ws');
  spaces.setAttribute('aria-label', 'Workspaces');
  const wsBtns = Array.from({ length: WORKSPACES }, (_, i) => {
    const b = h('button', 'ws-dot');
    b.setAttribute('aria-label', `Workspace ${i + 1}`);
    b.title = `Workspace ${i + 1}  (ctrl alt ← →)`;
    b.addEventListener('click', () => wm.workspace(i));
    spaces.append(b);
    return b;
  });
  const left = h('div', 'pn-left');
  const appName = h('span', 'pn-app');
  left.append(act, spaces, appName);
  const clock = h('button', 'pn-clock');
  clock.addEventListener('click', () => os.launch('about'));
  const right = h('div', 'pn-right');
  const where = h('span', 'pn-where');
  const userBtn = h('button', 'pn-user', 'guest');
  userBtn.setAttribute('aria-haspopup', 'menu');
  const menu = h('div', 'pn-menu');
  menu.hidden = true;
  menu.setAttribute('role', 'menu');
  const item = (text: string, fn: () => void) => {
    const b = h('button', '', text);
    b.setAttribute('role', 'menuitem');
    b.addEventListener('click', () => { menu.hidden = true; fn(); });
    menu.append(b);
  };
  item('About this system', () => os.launch('terminal'));
  item('Show desktop', () => wm.showDesktop());
  item('Lock screen', () => relock());
  item('Restart', () => { try { sessionStorage.removeItem('booted'); } catch { /* ignore */ } location.reload(); });
  userBtn.addEventListener('click', (e) => { e.stopPropagation(); menu.hidden = !menu.hidden; });
  document.addEventListener('click', () => { menu.hidden = true; });
  right.append(where, userBtn, menu);
  panel.append(left, clock, right);
  const tickClock = () => { const c = clockText(); clock.textContent = `${c.date.split(' ').slice(0, 3).join(' ')}  ${c.time}`; };
  tickClock();
  setInterval(tickClock, 15000);

  // ---- desktop icons ------------------------------------------------------
  const icons = $('icons');
  for (const n of root.children) {
    const appId = n.name === 'about.md' ? 'about' : (n.name as AppId);
    if (!APPS.some((a) => a.id === appId)) continue;
    const b = h('button', 'icon');
    b.append(tile(appId, 52), h('span', '', label(n)));
    b.addEventListener('dblclick', () => os.openPath(n.path));
    b.addEventListener('click', (e) => { if (e.detail === 1 && (wm.compact() || matchMedia('(hover: none)').matches)) os.openPath(n.path); });
    b.addEventListener('keydown', (e) => { if (e.key === 'Enter') os.openPath(n.path); });
    b.title = `${title(n)} — double-click to open`;
    icons.append(b);
  }

  // ---- phone home screen --------------------------------------------------
  const home = $('home');
  const hc = h('div', 'home-clock');
  const hd = h('div', 'home-date');
  const hn = h('div', 'home-name', `${about.meta.name} — ${about.meta.focus}`);
  const hg = h('div', 'home-grid');
  for (const a of APPS.filter((x) => x.id !== 'reader')) {
    const b = h('button', 'home-app');
    b.append(tile(a.id, 60), h('span', '', a.name));
    b.addEventListener('click', () => os.launch(a.id as AppId));
    hg.append(b);
  }
  home.append(hc, hd, hn, hg);
  const tickHome = () => { const c = clockText(); hc.textContent = c.time; hd.textContent = c.date; };
  tickHome();
  setInterval(tickHome, 15000);

  dock(os, $('dock'), () => search.toggle());

  wm.onChange(() => {
    wsBtns.forEach((b, i) => { b.classList.toggle('on', i === wm.ws); b.classList.toggle('used', wm.used(i)); });
    const a = wm.active;
    appName.textContent = a ? APPS.find((x) => x.id === a.opts.app)?.name ?? '' : OS_NAME;
    where.textContent = a?.location ?? '~';
    document.body.classList.toggle('has-window', !!a);
  });
  wm.changed();

  // ---- keyboard -----------------------------------------------------------
  window.addEventListener('keydown', (e) => {
    const t = e.target as HTMLElement;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); search.toggle(); return; }
    if (e.ctrlKey && e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { e.preventDefault(); wm.workspace(wm.ws + (e.key === 'ArrowLeft' ? -1 : 1)); return; }
    if (e.ctrlKey || e.metaKey || e.altKey || search.isOpen() || t.matches('input, textarea, select')) {
      if (e.key === 'Escape' && t.matches('input') && !search.isOpen()) t.blur();
      return;
    }
    // inside a window, keys belong to the app; only Escape-free globals pass
    if (t.closest('.win')) return;
    const appKey = APPS.find((a) => a.key === e.key);
    if (appKey) { e.preventDefault(); os.launch(appKey.id as AppId); return; }
    if (e.key === '/') { e.preventDefault(); search.open(); }
    else if (/^[1-4]$/.test(e.key)) wm.workspace(+e.key - 1);
  });
  window.addEventListener('keydown', (e) => {
    // window-level globals that work even with focus inside a window
    if (e.altKey && e.key === 'F4') { e.preventDefault(); wm.active?.close(); }
    if (e.altKey && e.key === '`') { e.preventDefault(); wm.cycle(); }
  });

  // ---- lock ---------------------------------------------------------------
  async function relock() {
    const screen = $('boot');
    screen.hidden = false;
    await boot(screen, { full: false });
  }

  // ---- first view ---------------------------------------------------------
  if (!wm.compact()) os.launch('terminal');
}

async function start() {
  const screen = $('boot');
  let seen = false;
  try { seen = sessionStorage.getItem('booted') === '1'; sessionStorage.setItem('booted', '1'); } catch { /* no storage */ }
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (seen || reduced) { screen.hidden = true; desktop(); return; }
  desktop();
  await boot(screen, { full: true });
}

start();
