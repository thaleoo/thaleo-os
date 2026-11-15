/** Lab: three live numerical systems in a btop-like layout. */
import type { OS } from '../core/os';
import { Ising, Lorenz, DensityPlot, T_CRITICAL, zetaText } from '../lib/sims';
import { h, pane, keys } from './tui';

export type LabView = 'ising' | 'lorenz' | 'zeta';

export function openLab(os: OS, initial: LabView = 'ising') {
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const body = h('div', 'lab');
  body.tabIndex = -1;

  // ---- Ising -------------------------------------------------------------
  const pI = pane('ising · metropolis', 'lab-ising');
  const sim = new Ising(64, 40);
  let T = 2.0;
  const scrI = h('pre', 'lab-scr grad');
  scrI.setAttribute('aria-hidden', 'true');
  const readI = h('div', 'lab-read');
  const ctl = h('div', 'lab-ctl');
  const slider = Object.assign(h('input'), { type: 'range', min: '1', max: '4', step: '0.01', value: String(T), id: 'lab-t' });
  const lab = Object.assign(h('label', 'dim', 'T'), { htmlFor: 'lab-t' });
  const tc = h('button', 'btn', 'T_c');
  const reset = h('button', 'btn', 'reset');
  ctl.append(lab, slider, tc, reset);
  slider.addEventListener('input', () => { T = parseFloat(slider.value); drawI(); });
  tc.addEventListener('click', () => { T = +T_CRITICAL.toFixed(3); slider.value = String(T); drawI(); });
  reset.addEventListener('click', () => { sim.randomize(); drawI(); });
  pI.body.append(scrI, readI, ctl);
  const meter = (v: number, w = 16) => '█'.repeat(Math.round(v * w)).padEnd(w, '░');
  function drawI() {
    scrI.textContent = sim.toText();
    const m = Math.abs(sim.magnetization());
    const phase = T < T_CRITICAL - 0.02 ? 'ordered' : T > T_CRITICAL + 0.02 ? 'disordered' : 'critical';
    readI.textContent = `T ${T.toFixed(2)}  |m| ${meter(m)} ${m.toFixed(2)}  ${phase}`;
  }
  for (let i = 0; i < 30; i++) sim.sweep(T);

  // ---- Lorenz ------------------------------------------------------------
  const pL = pane('lorenz · rk4', 'lab-lorenz');
  let sys = new Lorenz();
  const plot = new DensityPlot(56, 18);
  const scrL = h('pre', 'lab-scr grad');
  scrL.setAttribute('aria-hidden', 'true');
  const readL = h('div', 'lab-read');
  pL.body.append(scrL, readL);
  const stepL = (n: number) => { for (let i = 0; i < n; i++) { const [x, , z] = sys.step(); plot.add(x, z); } };
  function drawL() {
    scrL.textContent = plot.toText();
    const [x, y, z] = sys.v;
    readL.textContent = `t ${sys.t.toFixed(1).padStart(5)}  (${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)})`;
  }
  stepL(still ? 20000 : 1200);

  // ---- zeta --------------------------------------------------------------
  const pZ = pane('ζ(½ + it) · borwein', 'lab-zeta');
  const { text, zeros } = zetaText(56, 8, 50);
  const scrZ = h('pre', 'lab-scr grad', text);
  scrZ.setAttribute('aria-hidden', 'true');
  const readZ = h('div', 'lab-read', `zeros  ${zeros.slice(0, 5).map((z) => z.toFixed(3)).join('  ')} …`);
  pZ.body.append(scrZ, readZ);

  const grid = h('div', 'lab-grid');
  grid.append(pI.el, pL.el, pZ.el);
  body.append(grid, keys(['←→', 'temperature'], ['space', 'pause'], ['r', 'reset']));

  const panes: Record<LabView, HTMLElement> = { ising: pI.el, lorenz: pL.el, zeta: pZ.el };
  function go(v: string) {
    Object.entries(panes).forEach(([k, el]) => el.classList.toggle('hot', k === v));
    panes[v as LabView]?.scrollIntoView({ block: 'nearest' });
  }

  let running = !still;
  body.addEventListener('keydown', (e) => {
    if ((e.target as HTMLElement).matches('input')) return;
    if (e.key === ' ') { running = !running; e.preventDefault(); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      T = Math.min(4, Math.max(1, T + (e.key === 'ArrowLeft' ? -0.05 : 0.05)));
      slider.value = String(T); drawI(); e.preventDefault();
    } else if (e.key === 'r') { sim.randomize(); sys = new Lorenz(); plot.clear(); drawI(); drawL(); }
  });

  let raf = 0, last = 0;
  const loop = (now: number) => {
    raf = requestAnimationFrame(loop);
    if (!running || now - last < 66 || win.minimized || document.hidden) return;
    last = now;
    sim.sweep(T); sim.sweep(T); drawI();
    if (sys.t < 300) { stepL(30); drawL(); }
  };

  drawI(); drawL(); go(initial);
  const win = os.wm.open({ key: 'lab', app: 'lab', title: 'Lab', body, width: 940, height: 560, onClose: () => cancelAnimationFrame(raf),
    onFocus: () => { if (!os.wm.compact()) setTimeout(() => body.focus({ preventScroll: true })); } });
  raf = requestAnimationFrame(loop);
  return { win, go };
}
