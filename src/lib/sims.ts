/** Numerical cores for the Lab. Small, dependency-free, and honest about what they compute. */

// ---------- 2D Ising model, Metropolis single-spin updates -------------------
export const T_CRITICAL = 2 / Math.log(1 + Math.SQRT2);

export class Ising {
  spins: Int8Array;
  sweeps = 0;
  constructor(public w: number, public h: number) {
    this.spins = new Int8Array(w * h);
    this.randomize();
  }
  randomize() {
    for (let i = 0; i < this.spins.length; i++) this.spins[i] = Math.random() < 0.5 ? 1 : -1;
    this.sweeps = 0;
  }
  private neighbours(x: number, y: number) {
    const { w, h, spins: s } = this;
    return s[((x + 1) % w) + y * w] + s[((x + w - 1) % w) + y * w] + s[x + ((y + 1) % h) * w] + s[x + ((y + h - 1) % h) * w];
  }
  /** One sweep = w*h attempted flips at temperature T (J = k_B = 1). */
  sweep(T: number) {
    const { w, h, spins } = this;
    const p4 = Math.exp(-4 / T), p8 = Math.exp(-8 / T);
    for (let n = 0; n < w * h; n++) {
      const x = (Math.random() * w) | 0, y = (Math.random() * h) | 0;
      const i = x + y * w;
      const dE = 2 * spins[i] * this.neighbours(x, y);
      if (dE <= 0 || Math.random() < (dE === 4 ? p4 : p8)) spins[i] = -spins[i] as 1 | -1;
    }
    this.sweeps++;
  }
  magnetization() {
    let m = 0;
    for (let i = 0; i < this.spins.length; i++) m += this.spins[i];
    return m / this.spins.length;
  }
  energy() {
    const { w, h, spins: s } = this;
    let e = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) e -= s[x + y * w] * (s[((x + 1) % w) + y * w] + s[x + ((y + 1) % h) * w]);
    return e / s.length;
  }
  /** Two lattice rows per text row, using half-block characters. */
  toText() {
    const { w, h, spins: s } = this;
    let out = '';
    for (let y = 0; y < h; y += 2) {
      for (let x = 0; x < w; x++) {
        const a = s[x + y * w] > 0, b = s[x + (y + 1) * w] > 0;
        out += a && b ? '█' : a ? '▀' : b ? '▄' : ' ';
      }
      out += '\n';
    }
    return out;
  }
}

// ---------- Lorenz system, RK4 ----------------------------------------------
export class Lorenz {
  v: [number, number, number] = [1, 1, 1.05];
  t = 0;
  constructor(public sigma = 10, public rho = 28, public beta = 8 / 3, public dt = 0.005) {}
  private f([x, y, z]: number[]): [number, number, number] {
    return [this.sigma * (y - x), x * (this.rho - z) - y, x * y - this.beta * z];
  }
  step() {
    const { v, dt } = this;
    const add = (a: number[], b: number[], k: number) => a.map((ai, i) => ai + k * b[i]);
    const k1 = this.f(v), k2 = this.f(add(v, k1, dt / 2)), k3 = this.f(add(v, k2, dt / 2)), k4 = this.f(add(v, k3, dt));
    this.v = v.map((vi, i) => vi + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i])) as [number, number, number];
    this.t += dt;
    return this.v;
  }
}

const RAMP = ' .:-=+*#%@';

/** Accumulates trajectory points on a character grid (x-z projection) and prints by density. */
export class DensityPlot {
  cells: Uint16Array;
  constructor(public cols: number, public rows: number) { this.cells = new Uint16Array(cols * rows); }
  clear() { this.cells.fill(0); }
  add(x: number, z: number) {
    const c = Math.floor(((x + 22) / 44) * this.cols), r = Math.floor((1 - (z - 2) / 48) * this.rows);
    if (c >= 0 && c < this.cols && r >= 0 && r < this.rows) this.cells[c + r * this.cols]++;
  }
  toText() {
    let out = '';
    for (let r = 0; r < this.rows; r++) {
      let line = '';
      for (let c = 0; c < this.cols; c++) {
        const n = this.cells[c + r * this.cols];
        line += n === 0 ? ' ' : RAMP[Math.min(RAMP.length - 1, 1 + Math.floor(Math.log2(n)))];
      }
      out += line.replace(/\s+$/, '') + '\n';
    }
    return out;
  }
}

export function lorenzText(cols: number, rows: number, steps = 30000): string {
  const sys = new Lorenz(), plot = new DensityPlot(cols, rows);
  for (let i = 0; i < steps; i++) { const [x, , z] = sys.step(); if (i > 300) plot.add(x, z); }
  return plot.toText();
}

// ---------- Riemann zeta on the critical line, Borwein's algorithm -----------
const N = 64;
const D = (() => {
  // d_k = n * sum_{i<=k} (n+i-1)! 4^i / ((n-i)! (2i)!)
  const d = new Float64Array(N + 1);
  let term = 1 / N, sum = 0; // i = 0: (n-1)!/n! = 1/n
  for (let i = 0; i <= N; i++) {
    sum += term;
    d[i] = N * sum;
    term *= (4 * (N + i) * (N - i)) / ((2 * i + 1) * (2 * i + 2));
  }
  return d;
})();

/** zeta(1/2 + it) as [re, im]; accurate to ~1e-9 for 0 <= t <= 60. */
export function zetaCritical(t: number): [number, number] {
  let re = 0, im = 0;
  for (let k = 0; k < N; k++) {
    const c = ((k % 2 ? -1 : 1) * (D[k] - D[N])) / Math.sqrt(k + 1);
    const a = t * Math.log(k + 1);
    re += c * Math.cos(a);
    im -= c * Math.sin(a);
  }
  re /= -D[N]; im /= -D[N];
  // divide eta(s) by (1 - 2^(1-s)),  2^(1-s) = sqrt(2) * (cos(t ln2) - i sin(t ln2))
  const a = t * Math.LN2, dr = 1 - Math.SQRT2 * Math.cos(a), di = Math.SQRT2 * Math.sin(a);
  const den = dr * dr + di * di;
  return [(re * dr + im * di) / den, (im * dr - re * di) / den];
}

export const zetaAbs = (t: number) => Math.hypot(...zetaCritical(t));

/** Zeros of zeta(1/2+it) in (a, b): local minima of |zeta| refined by golden-section search. */
export function zetaZeros(a: number, b: number): number[] {
  const zeros: number[] = [], h = 0.05, g = (Math.sqrt(5) - 1) / 2;
  let p0 = zetaAbs(a), p1 = zetaAbs(a + h);
  for (let t = a + 2 * h; t <= b; t += h) {
    const p2 = zetaAbs(t);
    if (p1 < p0 && p1 < p2 && p1 < 0.2) {
      let lo = t - 2 * h, hi = t;
      for (let i = 0; i < 40; i++) {
        const x1 = hi - g * (hi - lo), x2 = lo + g * (hi - lo);
        if (zetaAbs(x1) < zetaAbs(x2)) hi = x2; else lo = x1;
      }
      const z = (lo + hi) / 2;
      if (zetaAbs(z) < 1e-4) zeros.push(z);
    }
    p0 = p1; p1 = p2;
  }
  return zeros;
}

/** Column plot of |zeta(1/2+it)| with the zeros marked underneath. */
export function zetaText(cols: number, rows: number, tMax: number): { text: string; zeros: number[] } {
  const vals: number[] = [];
  for (let c = 0; c < cols; c++) vals.push(zetaAbs(((c + 0.5) / cols) * tMax));
  const top = 4;
  const zeros = zetaZeros(1, tMax);
  let out = '';
  for (let r = rows - 1; r >= 0; r--) {
    const label = r === rows - 1 ? `${top.toFixed(0)} ` : r === Math.round(rows / 2) - 1 ? '2 ' : '  ';
    let line = label + '│';
    for (let c = 0; c < cols; c++) {
      const hgt = (Math.min(vals[c], top) / top) * rows;
      line += hgt >= r + 1 ? '█' : hgt >= r + 0.5 ? '▄' : ' ';
    }
    out += line.replace(/\s+$/, '') + '\n';
  }
  out += '0 └' + '─'.repeat(cols) + '\n';
  const marks = new Array(cols).fill(' ');
  zeros.forEach((z) => { marks[Math.min(cols - 1, Math.floor((z / tMax) * cols))] = '^'; });
  out += '   ' + marks.join('').replace(/\s+$/, '') + '\n';
  const axis = new Array(cols + 4).fill(' ');
  for (let t = 0; t <= tMax; t += 10) {
    const s = String(t), at = 3 + Math.min(cols - s.length, Math.round((t / tMax) * cols));
    for (let i = 0; i < s.length; i++) axis[at + i] = s[i];
  }
  out += axis.join('').replace(/\s+$/, '') + '   t\n';
  return { text: out, zeros };
}
