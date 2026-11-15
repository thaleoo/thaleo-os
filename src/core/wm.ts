/**
 * Window manager.
 *
 * Windows live on one of four workspaces (a horizontal strip that slides).
 * They open, close, minimise to their dock icon and maximise with motion;
 * dragging to the top edge maximises, to a side edge tiles to that half.
 * Below 760px windows become full-screen panels, one at a time.
 */
export interface WinOptions {
  key: string;
  app: string;
  title: string;
  body: HTMLElement;
  width?: number;
  height?: number;
  location?: string;
  onClose?: () => void;
  onFocus?: () => void;
}

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const after = (el: HTMLElement, cls: string, ms: number, fn: () => void) => {
  if (reduced()) { fn(); return; }
  el.classList.add(cls);
  window.setTimeout(() => { el.classList.remove(cls); fn(); }, ms);
};

export const WORKSPACES = 4;

export class Win {
  el: HTMLElement;
  private titleEl: HTMLElement;
  minimized = false;
  maximized = false;
  tiled: 'left' | 'right' | null = null;
  location: string;
  ws: number;
  private saved = { left: '', top: '', width: '', height: '' };

  constructor(public wm: WindowManager, public opts: WinOptions, icon: SVGElement | null) {
    this.ws = wm.ws;
    this.location = opts.location ?? '';
    const el = (this.el = document.createElement('section'));
    el.className = 'win';
    el.dataset.app = opts.app;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', opts.title);
    el.tabIndex = -1;

    const bar = document.createElement('header');
    bar.className = 'win-bar';
    const back = document.createElement('button');
    back.className = 'win-back';
    back.setAttribute('aria-label', 'Back to home');
    back.textContent = '‹';
    back.addEventListener('click', () => this.close());
    const ic = document.createElement('span');
    ic.className = 'win-icon';
    if (icon) ic.append(icon);
    this.titleEl = document.createElement('span');
    this.titleEl.className = 'win-title';
    this.titleEl.textContent = opts.title;
    const ctl = document.createElement('span');
    ctl.className = 'win-ctl';
    const btn = (cls: string, name: string, fn: () => void) => {
      const b = document.createElement('button');
      b.className = `ctl ${cls}`;
      b.title = name;
      b.setAttribute('aria-label', `${name} window`);
      b.addEventListener('click', (e) => { e.stopPropagation(); fn(); });
      b.addEventListener('pointerdown', (e) => e.stopPropagation());
      ctl.append(b);
    };
    btn('ctl-min', 'Minimise', () => this.minimize());
    btn('ctl-max', 'Maximise', () => this.toggleMax());
    btn('ctl-close', 'Close', () => this.close());
    bar.append(back, ic, this.titleEl, ctl);

    const body = document.createElement('div');
    body.className = 'win-body';
    body.append(opts.body);
    const grip = document.createElement('div');
    grip.className = 'win-grip';
    el.append(bar, body, grip);

    el.addEventListener('pointerdown', () => this.focus(), true);
    bar.addEventListener('dblclick', () => this.toggleMax());
    this.dragMove(bar);
    this.dragResize(grip);
  }

  private dragMove(handle: HTMLElement) {
    handle.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || this.wm.compact()) return;
      const area = this.wm.area.getBoundingClientRect();
      let start = { x: this.el.offsetLeft, y: this.el.offsetTop };
      const ox = e.clientX, oy = e.clientY;
      let snap: 'max' | 'left' | 'right' | null = null;
      let moved = false;
      handle.setPointerCapture(e.pointerId);
      const move = (ev: PointerEvent) => {
        if (!moved && Math.hypot(ev.clientX - ox, ev.clientY - oy) < 4) return;
        if (!moved && (this.maximized || this.tiled)) {
          // pull a maximised or tiled window off its edge, centred under the pointer
          const w = parseFloat(this.saved.width) || 680;
          this.restoreGeometry();
          start = { x: ev.clientX - area.left - w / 2 - (ev.clientX - ox), y: -(ev.clientY - oy) };
        }
        moved = true;
        this.el.style.left = `${Math.min(Math.max(start.x + ev.clientX - ox, 80 - this.el.offsetWidth), area.width - 80)}px`;
        this.el.style.top = `${Math.min(Math.max(start.y + ev.clientY - oy, 0), area.height - 40)}px`;
        const x = ev.clientX - area.left, y = ev.clientY - area.top;
        snap = y < 6 ? 'max' : x < 6 ? 'left' : x > area.width - 6 ? 'right' : null;
        this.wm.preview(snap);
      };
      const up = () => {
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', up);
        handle.removeEventListener('pointercancel', up);
        this.wm.preview(null);
        if (snap === 'max') this.toggleMax(true);
        else if (snap) this.tile(snap);
      };
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', up);
      handle.addEventListener('pointercancel', up);
    });
  }

  private dragResize(grip: HTMLElement) {
    grip.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || this.wm.compact() || this.maximized) return;
      e.stopPropagation();
      const s = { w: this.el.offsetWidth, h: this.el.offsetHeight, x: e.clientX, y: e.clientY };
      grip.setPointerCapture(e.pointerId);
      const move = (ev: PointerEvent) => {
        this.el.style.width = `${Math.max(360, s.w + ev.clientX - s.x)}px`;
        this.el.style.height = `${Math.max(240, s.h + ev.clientY - s.y)}px`;
      };
      const up = () => { grip.removeEventListener('pointermove', move); grip.removeEventListener('pointerup', up); };
      grip.addEventListener('pointermove', move);
      grip.addEventListener('pointerup', up);
    });
  }

  private saveGeometry() {
    if (this.maximized || this.tiled) return;
    const s = this.el.style;
    this.saved = { left: s.left, top: s.top, width: s.width, height: s.height };
  }
  private restoreGeometry() {
    this.maximized = false;
    this.tiled = null;
    this.el.classList.remove('maximized', 'tiled-left', 'tiled-right');
    Object.assign(this.el.style, this.saved);
  }
  private animateGeometry(fn: () => void) {
    if (!reduced()) {
      this.el.classList.add('morph');
      window.setTimeout(() => this.el.classList.remove('morph'), 260);
    }
    fn();
  }

  setTitle(t: string) { this.opts.title = t; this.titleEl.textContent = t; this.el.setAttribute('aria-label', t); this.wm.changed(); }
  setLocation(p: string) { this.location = p; this.wm.changed(); }
  focus() { this.wm.focus(this); }

  toggleMax(force?: boolean) {
    const on = force ?? !this.maximized;
    this.animateGeometry(() => {
      if (on) { this.saveGeometry(); this.tiled = null; this.el.classList.remove('tiled-left', 'tiled-right'); this.maximized = true; this.el.classList.add('maximized'); }
      else this.restoreGeometry();
    });
  }
  tile(side: 'left' | 'right') {
    this.animateGeometry(() => {
      this.saveGeometry();
      this.maximized = false;
      this.el.classList.remove('maximized', 'tiled-left', 'tiled-right');
      this.tiled = side;
      this.el.classList.add(`tiled-${side}`);
    });
  }

  minimize() {
    const target = this.wm.dockTarget(this.opts.app);
    const r = this.el.getBoundingClientRect();
    if (target) {
      this.el.style.setProperty('--mx', `${target.x + target.width / 2 - (r.left + r.width / 2)}px`);
      this.el.style.setProperty('--my', `${target.y + target.height / 2 - (r.top + r.height / 2)}px`);
    }
    this.minimized = true;
    after(this.el, 'minimizing', 240, () => this.el.classList.add('minimized'));
    this.wm.focusTop();
  }
  restore() {
    if (!this.minimized) return;
    this.minimized = false;
    this.el.classList.remove('minimized');
    after(this.el, 'restoring', 240, () => {});
  }
  close() { this.wm.remove(this); }
}

export class WindowManager {
  wins: Win[] = [];
  active: Win | null = null;
  ws = 0;
  private z = 10;
  private listeners: (() => void)[] = [];
  private mq = window.matchMedia('(max-width: 760px)');
  private strip: HTMLElement;
  private spaces: HTMLElement[] = [];
  private ghost: HTMLElement;
  dockTarget: (app: string) => DOMRect | null = () => null;
  iconFor: (app: string) => SVGElement | null = () => null;

  constructor(public area: HTMLElement) {
    this.strip = document.createElement('div');
    this.strip.className = 'ws-strip';
    for (let i = 0; i < WORKSPACES; i++) {
      const s = document.createElement('div');
      s.className = 'ws';
      s.setAttribute('aria-label', `Workspace ${i + 1}`);
      this.spaces.push(s);
      this.strip.append(s);
    }
    this.ghost = document.createElement('div');
    this.ghost.className = 'snap-ghost';
    area.append(this.strip, this.ghost);
    this.mq.addEventListener('change', () => this.changed());
  }

  compact() { return this.mq.matches; }
  onChange(fn: () => void) { this.listeners.push(fn); }
  changed() { this.listeners.forEach((f) => f()); }

  preview(snap: 'max' | 'left' | 'right' | null) {
    this.ghost.className = snap ? `snap-ghost on ${snap}` : 'snap-ghost';
  }

  open(opts: WinOptions): Win {
    const found = this.wins.find((w) => w.opts.key === opts.key);
    if (found) { this.focus(found); return found; }
    const win = new Win(this, opts, this.iconFor(opts.app));
    const a = this.area.getBoundingClientRect();
    const w = Math.min(opts.width ?? 720, a.width - 32);
    const h = Math.min(opts.height ?? 480, a.height - 32);
    const n = this.wins.filter((x) => x.ws === this.ws).length;
    const left = Math.round(Math.max(16, (a.width - w) / 2 + (n % 4) * 32 - 48));
    const top = Math.round(Math.max(16, (a.height - h) / 2 + (n % 4) * 28 - 40));
    Object.assign(win.el.style, { width: `${w}px`, height: `${h}px`, left: `${left}px`, top: `${top}px` });
    this.wins.push(win);
    this.spaces[this.ws].append(win.el);
    after(win.el, 'opening', 220, () => {});
    this.focus(win);
    return win;
  }

  place(win: Win, left: number, top: number) { win.el.style.left = `${left}px`; win.el.style.top = `${top}px`; }

  focus(win: Win) {
    if (win.ws !== this.ws) this.workspace(win.ws);
    win.restore();
    if (this.active !== win) {
      this.active?.el.classList.remove('focused');
      this.active = win;
      win.el.classList.add('focused');
      win.el.style.zIndex = String(++this.z);
      win.opts.onFocus?.();
    }
    this.changed();
  }

  focusTop() {
    this.active?.el.classList.remove('focused');
    this.active = null;
    const top = this.wins.filter((w) => !w.minimized && w.ws === this.ws).sort((a, b) => +b.el.style.zIndex - +a.el.style.zIndex)[0];
    if (top) this.focus(top); else this.changed();
  }

  workspace(n: number) {
    if (this.compact()) return;
    n = (n + WORKSPACES) % WORKSPACES;
    if (n === this.ws) return;
    this.ws = n;
    this.strip.style.transform = `translateX(${-n * 100}%)`;
    this.active?.el.classList.remove('focused');
    this.active = null;
    const top = this.wins.filter((w) => !w.minimized && w.ws === n).sort((a, b) => +b.el.style.zIndex - +a.el.style.zIndex)[0];
    if (top) this.focus(top); else this.changed();
  }
  used(n: number) { return this.wins.some((w) => w.ws === n); }

  showDesktop() {
    this.wins.filter((w) => w.ws === this.ws && !w.minimized).forEach((w) => { w.minimized = true; w.el.classList.add('minimized'); });
    this.active?.el.classList.remove('focused');
    this.active = null;
    this.changed();
  }

  cycle() {
    const open = this.wins.filter((w) => !w.minimized && w.ws === this.ws);
    if (open.length < 2 || !this.active) return;
    this.focus(open[(open.indexOf(this.active) + 1) % open.length]);
  }

  remove(win: Win) {
    win.opts.onClose?.();
    this.wins = this.wins.filter((w) => w !== win);
    if (this.active === win) { this.active = null; this.focusTop(); } else this.changed();
    after(win.el, 'closing', 160, () => win.el.remove());
  }
}
