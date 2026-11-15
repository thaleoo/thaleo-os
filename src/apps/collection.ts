/**
 * Collection: the TUI list/detail view used by Projects, Research and
 * Publications. It reads the section's folder; an empty folder shows EMPTY_MESSAGE.
 */
import type { OS } from '../core/os';
import { Node, items, title, exists } from '../core/vfs';
import { render, list } from '../core/markdown';
import { Section, STATUS, EMPTY_MESSAGE } from '../config';
import { h, pane, keys, empty } from './tui';

const tone = (s?: string) => `st-${STATUS[s ?? ''] ?? 'grey'}`;

function detail(os: OS, n: Node): HTMLElement {
  const wrap = h('article', 'detail');
  wrap.append(h('h1', '', title(n)));
  if (n.meta.summary) wrap.append(h('p', 'detail-sum', n.meta.summary));
  const meta = h('div', 'detail-meta');
  if (n.meta.status) meta.append(h('span', `st ${tone(n.meta.status)}`, n.meta.status));
  if (n.meta.date) meta.append(h('span', 'tag', n.meta.date));
  if (n.meta.venue) meta.append(h('span', 'tag', n.meta.venue));
  for (const s of list(n.meta.stack)) meta.append(h('span', 'tag', s));
  if (meta.childElementCount) wrap.append(meta);
  wrap.append(render(n.body, os.openPath, exists));
  const links = h('div', 'detail-links');
  for (const k of ['repo', 'link', 'pdf', 'doi']) {
    const url = n.meta[k];
    if (!url) continue;
    const a = Object.assign(h('a', 'btn', `${k} ↗`), { href: url, target: '_blank', rel: 'noopener' });
    links.append(a);
  }
  if (links.childElementCount) wrap.append(links);
  return wrap;
}

export function openCollection(os: OS, sec: Section, start?: string) {
  const all = items(sec);
  const body = h('div', 'coll');
  if (!all.length) {
    const p = pane(`${sec.dir} (0)`, 'pane-fill');
    p.body.append(empty(EMPTY_MESSAGE));
    body.append(p.el);
    const win = os.wm.open({ key: sec.dir, app: sec.dir, title: sec.title, body, width: 720, height: 440, location: `~/${sec.dir}` });
    return { win, go: () => {} };
  }

  const left = pane(`${sec.dir} (${all.length})`, 'coll-list');
  const right = pane('', 'coll-detail');
  const ul = h('ul', 'rows');
  ul.setAttribute('role', 'listbox');
  ul.setAttribute('aria-label', sec.title);
  ul.tabIndex = 0;
  left.body.append(ul);
  body.append(left.el, right.el, keys(['↑↓', 'select'], ['⏎', 'open link'], ['esc', 'back']));

  let sel = Math.max(0, all.findIndex((n) => n.path === start));
  const rows = all.map((n, i) => {
    const li = h('li', 'row');
    li.setAttribute('role', 'option');
    li.append(h('span', `dot ${tone(n.meta.status)}`), h('span', 'row-title', title(n)), h('span', 'row-aside', n.meta.date ?? n.meta.status ?? ''));
    li.addEventListener('click', () => { select(i); body.classList.add('show-detail'); });
    ul.append(li);
    return li;
  });

  function select(i: number) {
    sel = (i + all.length) % all.length;
    rows.forEach((r, k) => { r.classList.toggle('sel', k === sel); r.setAttribute('aria-selected', String(k === sel)); });
    rows[sel].scrollIntoView({ block: 'nearest' });
    right.setTitle(all[sel].name);
    const d = detail(os, all[sel]);
    if (os.wm.compact()) {
      const back = h('button', 'btn back', '‹ all');
      back.addEventListener('click', () => body.classList.remove('show-detail'));
      d.prepend(back);
    }
    right.body.replaceChildren(d);
    right.body.scrollTop = 0;
    win?.setLocation(all[sel].path);
  }

  body.addEventListener('keydown', (e) => {
    if ((e.target as HTMLElement).matches('input')) return;
    if (e.key === 'ArrowDown' || e.key === 'j') { e.preventDefault(); select(sel + 1); }
    else if (e.key === 'ArrowUp' || e.key === 'k') { e.preventDefault(); select(sel - 1); }
    else if (e.key === 'Enter') { const a = right.body.querySelector<HTMLAnchorElement>('.detail-links a'); a?.click(); }
    else if (e.key === 'Escape') body.classList.remove('show-detail');
  });

  let win: ReturnType<OS['wm']['open']> | undefined;
  select(sel);
  win = os.wm.open({ key: sec.dir, app: sec.dir, title: sec.title, body, width: 860, height: 500, location: all[sel].path,
    onFocus: () => { if (!os.wm.compact()) setTimeout(() => ul.focus({ preventScroll: true })); } });
  if (start) body.classList.add('show-detail');
  return { win, go: (path: string) => { const i = all.findIndex((n) => n.path === path); if (i >= 0) { select(i); body.classList.add('show-detail'); } } };
}
