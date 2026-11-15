/** About: a profile card in the style of fastfetch. */
import type { OS } from '../core/os';
import { about, exists, items } from '../core/vfs';
import { render, list } from '../core/markdown';
import { SECTIONS, STATUS } from '../config';
import { LOGO } from '../core/logo';
import { h, pane } from './tui';

export function openAbout(os: OS) {
  const m = about.meta;
  const body = h('div', 'about');
  const card = pane('about.md', 'pane-fill');
  const top = h('div', 'about-top');
  top.append(h('pre', 'ff-logo about-logo', LOGO.join('\n')));
  const id = h('div', 'about-id');
  id.append(h('h1', '', m.name), h('p', 'dim', m.alias), h('p', 'about-role', `${m.role} · ${m.org}`));
  const tags = h('div', 'detail-meta');
  list(m.stack).forEach((s) => tags.append(h('span', 'tag', s)));
  id.append(tags);
  top.append(id);

  const bio = render(about.body, os.openPath, exists);
  const focus = h('div', 'about-focus');
  focus.append(h('span', 'dim', 'focus'), ' ' + m.focus);

  const now = h('div', 'about-now');
  now.append(h('span', 'dim', 'now'));
  items(SECTIONS[0]).filter((p) => ['active', 'in development', 'ongoing'].includes(p.meta.status)).forEach((p) => {
    const b = h('button', 'chip');
    b.append(h('span', `dot st-${STATUS[p.meta.status] ?? 'grey'}`), p.meta.title);
    b.addEventListener('click', () => os.openPath(p.path));
    now.append(b);
  });

  const links = h('div', 'detail-links');
  for (const k of ['github', 'linkedin', 'orcid']) if (m[k]) links.append(Object.assign(h('a', 'btn', `${k} ↗`), { href: m[k], target: '_blank', rel: 'noopener' }));

  card.body.append(top, bio, focus, now, links);
  body.append(card.el);
  return os.wm.open({ key: 'about', app: 'about', title: 'About', body, width: 640, height: 500, location: '~/about.md' });
}
