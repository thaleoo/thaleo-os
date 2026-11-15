/** File manager in three Miller columns, like ranger: parent │ current │ preview. */
import type { OS } from '../core/os';
import { Node, root, resolve, label, title, exists } from '../core/vfs';
import { render } from '../core/markdown';
import { EMPTY_MESSAGE } from '../config';
import { h, keys } from './tui';

export function openFiles(os: OS, start?: string) {
  let dir: Node = root;
  let sel = 0;
  const startNode = start ? resolve(root, start) : null;
  if (startNode) dir = startNode.kind === 'dir' ? startNode : startNode.parent!;
  if (startNode?.kind === 'file') sel = dir.children.indexOf(startNode);

  const body = h('div', 'files');
  const path = h('div', 'files-path');
  const cols = h('div', 'files-cols');
  const colParent = h('ul', 'col col-parent');
  const colCur = h('ul', 'col col-cur');
  colCur.tabIndex = 0;
  colCur.setAttribute('role', 'listbox');
  colCur.setAttribute('aria-label', 'Current folder');
  const colPrev = h('div', 'col col-prev');
  cols.append(colParent, colCur, colPrev);
  const status = h('div', 'statusbar');
  body.append(path, cols, status, keys(['↑↓', 'move'], ['←', 'up'], ['→ ⏎', 'open']));

  const item = (n: Node, active: boolean, onClick: () => void) => {
    const li = h('li', `item ${n.kind}${active ? ' sel' : ''}`);
    li.append(h('span', 'item-ic', n.kind === 'dir' ? '▸' : '·'), h('span', '', label(n)));
    if (n.kind === 'dir') li.append(h('span', 'item-n', String(n.children.length)));
    li.addEventListener('click', onClick);
    return li;
  };

  function preview(n: Node | undefined) {
    colPrev.replaceChildren();
    if (!n) { colPrev.append(h('p', 'dim', EMPTY_MESSAGE)); return; }
    if (n.kind === 'dir') {
      if (!n.children.length) colPrev.append(h('p', 'dim', EMPTY_MESSAGE));
      const ul = h('ul');
      n.children.forEach((c) => ul.append(item(c, false, () => { dir = n; sel = n.children.indexOf(c); draw(); })));
      colPrev.append(ul);
    } else {
      const art = h('article', 'detail small');
      art.append(h('h1', '', title(n)));
      if (n.meta.summary) art.append(h('p', 'detail-sum', n.meta.summary));
      art.append(render(n.body, os.openPath, exists));
      colPrev.append(art);
    }
  }

  function draw() {
    sel = Math.max(0, Math.min(sel, dir.children.length - 1));
    const cur = dir.children[sel];
    path.replaceChildren();
    const chain: Node[] = [];
    for (let n: Node | null = dir; n; n = n.parent) chain.unshift(n);
    chain.forEach((n, i) => {
      if (i) path.append(h('span', 'dim', '/'));
      const b = h('button', 'crumb', n.name);
      b.addEventListener('click', () => { dir = n; sel = 0; draw(); });
      path.append(b);
    });
    if (cur?.kind === 'file') path.append(h('span', 'dim', '/'), h('span', 'crumb-file', cur.name));

    colParent.replaceChildren();
    if (dir.parent) dir.parent.children.forEach((c) => colParent.append(item(c, c === dir, () => { if (c.kind === 'dir') { dir = c; sel = 0; draw(); } else os.openPath(c.path); })));
    colCur.replaceChildren();
    if (!dir.children.length) colCur.append(h('li', 'dim item', EMPTY_MESSAGE));
    dir.children.forEach((c, i) => colCur.append(item(c, i === sel, () => {
      if (i === sel) open(); else { sel = i; draw(); }
    })));
    colCur.querySelector('.sel')?.scrollIntoView({ block: 'nearest' });
    preview(cur);
    status.replaceChildren(
      h('span', 'sb-mode', 'files'),
      h('span', '', cur ? cur.path : dir.path),
      h('span', 'sb-right', cur?.kind === 'file' ? `${cur.raw.split('\n').length - 1} lines` : `${dir.children.length} items`),
    );
    win?.setLocation(cur?.path ?? dir.path);
    win?.setTitle(`Files — ${dir.path}`);
  }

  function open() {
    const cur = dir.children[sel];
    if (!cur) return;
    if (cur.kind === 'dir') { dir = cur; sel = 0; draw(); } else os.openPath(cur.path);
  }
  function up() {
    if (!dir.parent) return;
    const from = dir;
    dir = dir.parent;
    sel = dir.children.indexOf(from);
    draw();
  }

  body.addEventListener('keydown', (e) => {
    const k = e.key;
    if (k === 'ArrowDown' || k === 'j') sel++;
    else if (k === 'ArrowUp' || k === 'k') sel--;
    else if (k === 'ArrowLeft' || k === 'h' || k === 'Backspace') { up(); e.preventDefault(); return; }
    else if (k === 'ArrowRight' || k === 'l' || k === 'Enter') { open(); e.preventDefault(); return; }
    else return;
    e.preventDefault();
    draw();
  });

  let win: ReturnType<OS['wm']['open']> | undefined;
  draw();
  win = os.wm.open({ key: 'files', app: 'files', title: `Files — ${dir.path}`, body, width: 900, height: 500,
    onFocus: () => { if (!os.wm.compact()) setTimeout(() => colCur.focus({ preventScroll: true })); } });
  return { win, go: (p: string) => { const n = resolve(root, p); if (!n) return; if (n.kind === 'dir') { dir = n; sel = 0; } else { dir = n.parent!; sel = dir.children.indexOf(n); } draw(); } };
}
