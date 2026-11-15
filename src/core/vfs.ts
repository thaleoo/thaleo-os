/**
 * Virtual filesystem built from /content at build time.
 * Add a .md file → it appears in the terminal, the file manager and its app.
 */
import { SECTIONS, Section } from '../config';
import { frontMatter, Meta } from './markdown';

export interface Node {
  name: string;
  path: string; // "~/projects/cista.md"
  kind: 'dir' | 'file';
  parent: Node | null;
  children: Node[];
  raw: string;
  meta: Meta;
  body: string;
}

const sources = import.meta.glob('/content/**/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

const dir = (name: string, parent: Node | null): Node => ({
  name, path: parent ? `${parent.path}/${name}` : '~', kind: 'dir', parent, children: [], raw: '', meta: {}, body: '',
});

export const root = dir('~', null);

function ensureDir(parts: string[]): Node {
  let d = root;
  for (const p of parts) {
    let next = d.children.find((c) => c.kind === 'dir' && c.name === p);
    if (!next) { next = dir(p, d); d.children.push(next); }
    d = next;
  }
  return d;
}

SECTIONS.forEach((s) => ensureDir([s.dir])); // sections exist even when empty

for (const [file, raw] of Object.entries(sources)) {
  const parts = file.replace(/^\/content\//, '').split('/');
  const parent = ensureDir(parts.slice(0, -1));
  const { meta, body } = frontMatter(raw);
  const name = parts[parts.length - 1];
  parent.children.push({ name, path: `${parent.path}/${name}`, kind: 'file', parent, children: [], raw: raw.trim() + '\n', meta, body });
}

const sectionOf = (d: Node) => SECTIONS.find((s) => `~/${s.dir}` === d.path);

function sortDir(d: Node) {
  const s = sectionOf(d);
  d.children.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'dir' ? 1 : -1;
    if (s?.sort === 'date') return (b.meta.date ?? '').localeCompare(a.meta.date ?? '');
    const oa = Number(a.meta.order ?? 99), ob = Number(b.meta.order ?? 99);
    return oa - ob || a.name.localeCompare(b.name);
  });
  d.children.forEach(sortDir);
}
sortDir(root);
// Home order: about first, then sections in config order.
root.children.sort((a, b) => rank(a) - rank(b));
function rank(n: Node) {
  if (n.name === 'about.md') return -1;
  const i = SECTIONS.findIndex((s) => s.dir === n.name);
  return i < 0 ? 50 : i;
}

export function resolve(cwd: Node, input: string): Node | null {
  let p = input.trim();
  let n = cwd;
  if (p.startsWith('~')) { n = root; p = p.slice(1); } else if (p.startsWith('/')) n = root;
  for (const part of p.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') { n = n.parent ?? n; continue; }
    if (n.kind !== 'dir') return null;
    const next = n.children.find((c) => c.name === part);
    if (!next) return null;
    n = next;
  }
  return n;
}

export const exists = (p: string) => resolve(root, p) !== null;
export const label = (n: Node) => (n.kind === 'dir' ? `${n.name}/` : n.name);
export const title = (n: Node) => n.meta.title ?? n.meta.name ?? n.name.replace(/\.md$/, '');

export function walk(n: Node, f: (x: Node) => void) { f(n); n.children.forEach((c) => walk(c, f)); }
export function files(from: Node = root): Node[] {
  const out: Node[] = [];
  walk(from, (x) => { if (x.kind === 'file') out.push(x); });
  return out;
}

export const about = resolve(root, '~/about.md')!;
export const section = (s: Section) => resolve(root, `~/${s.dir}`)!;
export const items = (s: Section) => section(s).children.filter((c) => c.kind === 'file');
