/** Wallpaper: a slow gradient field with the Lorenz attractor traced over it. */
import { Lorenz } from '../lib/sims';

export function wallpaper(host: HTMLElement) {
  const canvas = document.createElement('canvas');
  canvas.className = 'wall-trace';
  canvas.setAttribute('aria-hidden', 'true');
  host.append(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let sys = new Lorenz(), drawn = 0, raf = 0;
  const TOTAL = 26000;

  const project = (x: number, z: number) => {
    const w = canvas.width, hgt = canvas.height, s = Math.min(w / 70, hgt / 62);
    return [w * 0.66 + x * s, hgt * 0.92 - z * s];
  };
  function size() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = host.clientWidth * dpr;
    canvas.height = host.clientHeight * dpr;
    ctx!.lineWidth = 0.7 * dpr;
    ctx!.globalCompositeOperation = 'lighter';
    sys = new Lorenz();
    drawn = 0;
  }
  function draw(n: number) {
    const c = ctx!;
    let [x0, , z0] = sys.v;
    for (let i = 0; i < n && drawn < TOTAL; i++, drawn++) {
      const [x, , z] = sys.step();
      const [a, b] = project(x0, z0), [p, q] = project(x, z);
      const k = drawn / TOTAL;
      c.strokeStyle = `hsla(${190 + 90 * k}, 90%, 70%, 0.10)`;
      c.beginPath(); c.moveTo(a, b); c.lineTo(p, q); c.stroke();
      x0 = x; z0 = z;
    }
  }
  const loop = () => { draw(60); if (drawn < TOTAL) raf = requestAnimationFrame(loop); };
  size();
  if (still) draw(TOTAL); else raf = requestAnimationFrame(loop);
  let t = 0;
  window.addEventListener('resize', () => {
    clearTimeout(t);
    t = window.setTimeout(() => { cancelAnimationFrame(raf); size(); draw(TOTAL); }, 200);
  });
}
