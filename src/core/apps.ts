/** App catalogue: names, keyboard shortcuts and icons (drawn here, no icon font). */
export type AppId = 'files' | 'terminal' | 'projects' | 'research' | 'publications' | 'lab' | 'about' | 'reader';

export interface AppDef {
  id: AppId;
  name: string;
  key?: string; // single-key shortcut on the desktop
  colors: [string, string];
  glyph: string; // SVG path data on a 24x24 grid, stroked
}

export const APPS: AppDef[] = [
  { id: 'files', name: 'Files', key: 'f', colors: ['#6cb6ff', '#3d5afe'],
    glyph: 'M3.5 7.5a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z M3.5 10.5h17' },
  { id: 'terminal', name: 'Terminal', key: 't', colors: ['#3a4152', '#151821'],
    glyph: 'M6 8l4 4-4 4 M12.5 16.5h5.5' },
  { id: 'projects', name: 'Projects', key: 'p', colors: ['#ffb36b', '#f2545b'],
    glyph: 'M12 3.8l7.5 4.2v8L12 20.2 4.5 16V8z M4.5 8L12 12.2 19.5 8 M12 12.2v8' },
  { id: 'research', name: 'Research', key: 'r', colors: ['#a78bfa', '#6d28d9'],
    glyph: 'M15.5 4.5c-2 0-2.6 1.6-3 4l-1.6 8c-.4 2.3-1 3.5-3 3.5 M8.5 10.5h7' },
  { id: 'publications', name: 'Publications', key: 'w', colors: ['#5eead4', '#0f8f8a'],
    glyph: 'M7 3.5h7l4 4v13H7z M14 3.5v4h4 M9.5 12h6 M9.5 15h6 M9.5 18h3.5' },
  { id: 'lab', name: 'Lab', key: 'l', colors: ['#67e8f9', '#2563eb'],
    glyph: 'M3.5 12c2-5 4-5 6 0s4 5 6 0 4-5 5 0 M3.5 19.5h17 M3.5 4.5v15' },
  { id: 'about', name: 'About', key: 'a', colors: ['#fda4af', '#db2777'],
    glyph: 'M12 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z M5 19.5c1.2-3.3 4-5 7-5s5.8 1.7 7 5' },
  { id: 'reader', name: 'Viewer', colors: ['#cbd5e1', '#64748b'],
    glyph: 'M7 3.5h7l4 4v13H7z M14 3.5v4h4' },
];

export const app = (id: string) => APPS.find((a) => a.id === id)!;

let uid = 0;
const NS = 'http://www.w3.org/2000/svg';

/** A gradient app tile, like a desktop icon theme. */
export function tile(id: string, size = 48): SVGElement {
  const a = app(id);
  const g = `g${++uid}`;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 48 48');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `
    <defs>
      <linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a.colors[0]}"/><stop offset="1" stop-color="${a.colors[1]}"/></linearGradient>
      <linearGradient id="${g}h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>
    </defs>
    <rect x="3" y="3" width="42" height="42" rx="11" fill="url(#${g})"/>
    <rect x="3" y="3" width="42" height="42" rx="11" fill="url(#${g}h)"/>
    <rect x="3.5" y="3.5" width="41" height="41" rx="10.5" fill="none" stroke="#fff" stroke-opacity=".18"/>
    <g transform="translate(10 10) scale(1.1667)" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <path d="${a.glyph}"/>
    </g>
    `;
  if (id === 'terminal') svg.querySelector('g path')!.setAttribute('stroke', '#8ef0c4');
  return svg;
}

/** The bare glyph, for small UI places (title bars, search results). */
export function glyph(id: string, size = 16): SVGElement {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `<path d="${app(id).glyph}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>`;
  return svg;
}
