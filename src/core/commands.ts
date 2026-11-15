/** Terminal commands. Each reads the real filesystem built from /content. */
import { register, registry, Ctx } from './shell';
import { Node, root, resolve, files, walk, label, title, about, items } from './vfs';
import { SECTIONS, STATUS, OS_NAME, OS_VERSION, HOSTNAME, USER, EMPTY_MESSAGE } from '../config';

import { LOGO } from './logo';

const el = (tag: string, cls = '', text = '') => Object.assign(document.createElement(tag), { className: cls, textContent: text });

function node(ctx: Ctx, arg: string | undefined, usage: string): Node {
  if (!arg) throw new Error(`missing operand — usage: ${usage}`);
  const n = resolve(ctx.cwd, arg);
  if (!n) throw new Error(`${arg}: no such file or directory`);
  return n;
}

function link(ctx: Ctx, n: Node, text = label(n)) {
  const b = el('button', n.kind === 'dir' ? 'link dir' : 'link', text);
  b.addEventListener('click', () => ctx.os.openPath(n.path));
  return b;
}

const status = (s = '') => el('span', `st st-${STATUS[s] ?? 'grey'}`, s);
const pad = (s: string, n: number) => s + ' '.repeat(Math.max(1, n - s.length));

export function fastfetch(ctx: Ctx) {
  const projects = items(SECTIONS[0]);
  const pubs = items(SECTIONS[2]).length;
  const up = Math.round((Date.now() - ctx.os.bootTime) / 1000);
  const m = about.meta;
  const info: [string, string][] = [
    ['OS', `${OS_NAME} ${OS_VERSION}`],
    ['Host', m.org],
    ['Kernel', 'biological-engineering'],
    ['Shell', `tsh ${OS_VERSION}`],
    ['Focus', m.focus],
    ['Stack', m.stack],
    ['Projects', `${projects.length} (${projects.filter((p) => p.meta.status === 'active').length} active)`],
    ['Papers', pubs ? String(pubs) : 'none yet'],
    ['Uptime', up < 60 ? `${up} s` : `${Math.floor(up / 60)} min`],
  ];
  const wrap = el('div', 'ff');
  const logo = el('pre', 'ff-logo', LOGO.join('\n'));
  const col = el('div', 'ff-info');
  col.append(el('div', 'ff-user', `${USER}@${HOSTNAME}`), el('div', 'ff-rule', '─'.repeat(USER.length + HOSTNAME.length + 1)));
  for (const [k, v] of info) {
    const r = el('div', 'ff-row');
    r.append(el('span', 'ff-key', k), el('span', '', v ?? ''));
    col.append(r);
  }
  const sw = el('div', 'ff-swatch');
  for (let i = 0; i < 8; i++) sw.append(el('span', `sw sw${i}`));
  col.append(sw);
  wrap.append(logo, col);
  ctx.out.rich(wrap);
}

register(
  {
    name: 'help', summary: 'list commands',
    run({ out }) {
      for (const c of registry.values()) if (!c.hidden) out.print(`  ${pad(c.usage ?? c.name, 20)}${c.summary}`);
      out.print('');
      out.print('tab completes · ↑↓ history · names are clickable', 'dim');
    },
  },
  {
    name: 'ls', summary: 'list a directory', usage: 'ls [path]',
    run(ctx) {
      const n = ctx.args[0] ? node(ctx, ctx.args[0], 'ls [path]') : ctx.cwd;
      const kids = n.kind === 'dir' ? n.children : [n];
      if (!kids.length) { ctx.out.print(EMPTY_MESSAGE, 'dim'); return; }
      const row = el('div', 'ln');
      kids.forEach((c) => row.append(link(ctx, c), '   '));
      ctx.out.rich(row);
    },
  },
  {
    name: 'cd', summary: 'change directory', usage: 'cd [path]',
    run(ctx) {
      const n = ctx.args[0] ? node(ctx, ctx.args[0], 'cd [path]') : root;
      if (n.kind !== 'dir') throw new Error(`not a directory: ${ctx.args[0]}`);
      ctx.setCwd(n);
    },
  },
  { name: 'pwd', summary: 'current directory', run: (ctx) => ctx.out.print(ctx.cwd.path) },
  {
    name: 'cat', summary: 'print a file', usage: 'cat <file>',
    run(ctx) {
      const n = node(ctx, ctx.args[0], 'cat <file>');
      if (n.kind === 'dir') throw new Error(`${ctx.args[0]}: is a directory`);
      ctx.out.print(n.raw.replace(/\n$/, ''));
    },
  },
  {
    name: 'open', summary: 'open in a window', usage: 'open <path>',
    run: (ctx) => ctx.os.openPath(node(ctx, ctx.args[0], 'open <path>').path),
  },
  {
    name: 'tree', summary: 'directory tree', usage: 'tree [path]',
    run(ctx) {
      const start = ctx.args[0] ? node(ctx, ctx.args[0], 'tree [path]') : ctx.cwd;
      ctx.out.rich(link(ctx, start, start.path));
      const rec = (n: Node, prefix: string) => n.children.forEach((c, i) => {
        const last = i === n.children.length - 1;
        ctx.out.rich(el('span', 'dim', prefix + (last ? '└── ' : '├── ')), link(ctx, c));
        if (c.kind === 'dir') {
          if (!c.children.length) ctx.out.print(prefix + (last ? '    ' : '│   ') + '└── (empty)', 'dim');
          rec(c, prefix + (last ? '    ' : '│   '));
        }
      });
      rec(start, '');
    },
  },
  {
    name: 'grep', summary: 'search all files', usage: 'grep <text>',
    run(ctx) {
      const q = ctx.args.join(' ').toLowerCase();
      if (!q) throw new Error('usage: grep <text>');
      let hits = 0;
      for (const f of files(ctx.cwd)) f.raw.split('\n').forEach((line, i) => {
        const at = line.toLowerCase().indexOf(q);
        if (at < 0) return;
        hits++;
        ctx.out.rich(link(ctx, f, f.path), el('span', 'dim', `:${i + 1}  `), line.slice(0, at), el('mark', '', line.slice(at, at + q.length)), line.slice(at + q.length));
      });
      if (!hits) ctx.out.print(`no matches for "${q}"`, 'dim');
    },
  },
  {
    name: 'find', summary: 'find by name', usage: 'find <name>', hidden: true,
    run(ctx) {
      const q = (ctx.args[0] ?? '').toLowerCase();
      walk(root, (x) => { if (x !== root && x.name.toLowerCase().includes(q)) ctx.out.rich(link(ctx, x, x.path)); });
    },
  },
  { name: 'whoami', summary: 'about me', run: (ctx) => ctx.os.launch('about') },
  { name: 'fastfetch', summary: 'system info', run: fastfetch },
  { name: 'neofetch', summary: 'system info', hidden: true, run: fastfetch },
  ...SECTIONS.map((s) => ({
    name: s.dir, summary: `list ${s.title.toLowerCase()}`,
    run(ctx: Ctx) {
      const list = items(s);
      if (!list.length) { ctx.out.print(EMPTY_MESSAGE, 'dim'); return; }
      for (const f of list) ctx.out.rich(link(ctx, f, pad(title(f), 24)), status(f.meta.status ?? f.meta.date), el('span', 'dim', '  ' + (f.meta.summary ?? '')));
    },
  })),
  {
    name: 'contact', summary: 'links',
    run(ctx) {
      for (const k of ['github', 'linkedin', 'orcid']) {
        const url = about.meta[k];
        if (!url) continue;
        ctx.out.rich(el('span', 'dim', pad(k, 10)), Object.assign(el('a', '', url.replace(/^https?:\/\/(www\.)?/, '')), { href: url, target: '_blank', rel: 'noopener' }));
      }
    },
  },
  { name: 'ising', summary: 'Ising model, live', run: (ctx) => ctx.os.launch('lab', 'ising') },
  { name: 'lorenz', summary: 'Lorenz attractor, live', run: (ctx) => ctx.os.launch('lab', 'lorenz') },
  { name: 'zeta', summary: 'zeros of ζ(½+it)', run: (ctx) => ctx.os.launch('lab', 'zeta') },
  { name: 'history', summary: 'past commands', hidden: true, run: (ctx) => ctx.history.forEach((h, i) => ctx.out.print(`${String(i + 1).padStart(4)}  ${h}`)) },
  { name: 'echo', summary: 'print text', hidden: true, run: (ctx) => ctx.out.print(ctx.args.join(' ')) },
  { name: 'date', summary: 'date', hidden: true, run: (ctx) => ctx.out.print(new Date().toString()) },
  { name: 'uname', summary: 'system name', hidden: true, run: (ctx) => ctx.out.print(ctx.args.includes('-a') ? `${OS_NAME} ${HOSTNAME} ${OS_VERSION} web ${navigator.platform || 'unknown'}` : OS_NAME) },
  { name: 'sudo', summary: '', hidden: true, run: (ctx) => ctx.out.print(`${USER} is not in the sudoers file. This incident will be reported.`, 'err') },
  { name: 'clear', summary: 'clear screen', run: (ctx) => ctx.out.clear() },
  { name: 'exit', summary: 'close terminal', run: (ctx) => ctx.exit() },
);
