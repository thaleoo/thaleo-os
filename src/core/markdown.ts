/**
 * Front matter + a small Markdown subset.
 *
 *   ---
 *   title: Cista          key: value pairs, one per line
 *   stack: Rust, Ratatui  comma lists are split where useful
 *   ---
 *   # heading, ## heading, paragraphs, - lists, ```code```,
 *   `inline code`, **bold**, [text](url), bare URLs and ~/paths.
 */
export type Meta = Record<string, string>;

export function frontMatter(src: string): { meta: Meta; body: string } {
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(src);
  if (!m) return { meta: {}, body: src.trim() };
  const meta: Meta = {};
  for (const line of m[1].split('\n')) {
    const kv = /^([\w-]+):\s*(.*)$/.exec(line.trim());
    if (kv) meta[kv[1]] = kv[2].trim();
  }
  return { meta, body: src.slice(m[0].length).trim() };
}

export const list = (v?: string) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : []);

type Opener = (path: string) => void;

const INLINE = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\[[^\]]+\]\([^)]+\))|(https?:\/\/[^\s)]+[^\s).,;])|(~\/[\w./-]*[\w/])/g;

export function inline(text: string, open: Opener, exists: (p: string) => boolean): DocumentFragment {
  const frag = document.createDocumentFragment();
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    const at = m.index ?? 0;
    const tok = m[0];
    if (m[5] && !exists(tok)) continue;
    frag.append(text.slice(last, at));
    if (m[1]) frag.append(Object.assign(document.createElement('code'), { textContent: tok.slice(1, -1) }));
    else if (m[2]) frag.append(Object.assign(document.createElement('strong'), { textContent: tok.slice(2, -2) }));
    else if (m[3] || m[4]) {
      const [, label, href] = m[3] ? /\[([^\]]+)\]\(([^)]+)\)/.exec(tok)! : [tok, tok.replace(/^https?:\/\/(www\.)?/, ''), tok];
      const a = Object.assign(document.createElement('a'), { href, textContent: label, target: '_blank', rel: 'noopener' });
      frag.append(a);
    } else {
      const b = Object.assign(document.createElement('button'), { className: 'link', textContent: tok });
      b.addEventListener('click', () => open(tok));
      frag.append(b);
    }
    last = at + tok.length;
  }
  frag.append(text.slice(last));
  return frag;
}

export function render(body: string, open: Opener, exists: (p: string) => boolean): HTMLElement {
  const root = document.createElement('div');
  root.className = 'md';
  const lines = body.split('\n');
  let i = 0;
  const add = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string) => {
    const e = document.createElement(tag);
    if (text !== undefined) e.append(inline(text, open, exists));
    root.append(e);
    return e;
  };
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (line.startsWith('```')) {
      const buf: string[] = [];
      for (i++; i < lines.length && !lines[i].startsWith('```'); i++) buf.push(lines[i]);
      i++;
      add('pre').textContent = buf.join('\n');
    } else if (/^#{1,3} /.test(line)) {
      add(line.startsWith('# ') ? 'h2' : 'h3', line.replace(/^#+ /, ''));
      i++;
    } else if (/^[-*] /.test(line)) {
      const ul = add('ul');
      for (; i < lines.length && /^[-*] /.test(lines[i]); i++) {
        const li = document.createElement('li');
        li.append(inline(lines[i].slice(2), open, exists));
        ul.append(li);
      }
    } else {
      const buf: string[] = [];
      for (; i < lines.length && lines[i].trim() && !/^(```|#{1,3} |[-*] )/.test(lines[i]); i++) buf.push(lines[i].trim());
      add('p', buf.join(' '));
    }
  }
  return root;
}
