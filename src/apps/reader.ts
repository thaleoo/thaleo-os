/** Viewer for any other Markdown file. */
import type { OS } from '../core/os';
import { Node, exists, title } from '../core/vfs';
import { render } from '../core/markdown';
import { h, pane } from './tui';

export function openReader(os: OS, n: Node) {
  const p = pane(n.path, 'pane-fill');
  const art = h('article', 'detail');
  art.append(h('h1', '', title(n)), render(n.body, os.openPath, exists));
  p.body.append(art);
  const body = h('div', 'viewer');
  body.append(p.el);
  return os.wm.open({ key: `view:${n.path}`, app: 'reader', title: n.name, body, width: 680, height: 480, location: n.path });
}
