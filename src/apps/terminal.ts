/** Terminal: kitty-like window with a real input, history and completion. */
import type { OS } from '../core/os';
import { Node, root } from '../core/vfs';
import { execute, complete, Out, registry } from '../core/shell';
import { fastfetch } from '../core/commands';
import { HOSTNAME, USER } from '../config';

const CHIPS = ['help', 'ls', 'projects', 'research', 'fastfetch', 'ising', 'contact'];

let count = 0;

export function openTerminal(os: OS) {
  let cwd: Node = root;
  const history: string[] = [];
  let cursor = 0, draft = '';
  const n = ++count;

  const body = document.createElement('div');
  body.className = 'term';
  const scroll = document.createElement('div');
  scroll.className = 'term-scroll';
  const log = document.createElement('div');
  log.className = 'term-log';
  log.setAttribute('role', 'log');
  log.setAttribute('aria-live', 'polite');
  const form = document.createElement('form');
  form.className = 'term-line';
  const prompt = document.createElement('label');
  prompt.className = 'prompt';
  const input = document.createElement('input');
  input.id = `term-in-${n}`;
  prompt.htmlFor = input.id;
  input.className = 'term-input';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.setAttribute('autocapitalize', 'off');
  input.setAttribute('aria-label', 'Command');
  input.enterKeyHint = 'go';
  form.append(prompt, input);
  scroll.append(log, form);

  const chips = document.createElement('div');
  chips.className = 'term-chips';
  for (const c of CHIPS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = c;
    b.addEventListener('click', () => run(c));
    chips.append(b);
  }
  const statusBar = document.createElement('div');
  statusBar.className = 'statusbar';
  body.append(scroll, chips, statusBar);

  const promptHTML = () => {
    const frag = document.createDocumentFragment();
    const s = (t: string, c: string) => Object.assign(document.createElement('span'), { className: c, textContent: t });
    frag.append(s(`${USER}@${HOSTNAME}`, 'p-user'), s(' ', ''), s(cwd.path, 'p-path'), s(' ❯', 'p-arrow'));
    return frag;
  };
  const refresh = () => {
    prompt.replaceChildren(promptHTML());
    statusBar.replaceChildren(
      Object.assign(document.createElement('span'), { className: 'sb-mode', textContent: 'tsh' }),
      Object.assign(document.createElement('span'), { textContent: cwd.path }),
      Object.assign(document.createElement('span'), { className: 'sb-right', textContent: `${registry.size} commands · tab to complete` }),
    );
    win.setLocation(cwd.path);
  };
  const bottom = () => { scroll.scrollTop = scroll.scrollHeight; };
  const line = (cls = '') => { const d = document.createElement('div'); d.className = `ln ${cls}`; log.append(d); return d; };
  const out: Out = {
    print(text = '', cls = '') { text.split('\n').forEach((t) => { line(cls).textContent = t || ' '; }); },
    rich(...parts) { const d = line(); d.append(...(parts as (string | globalThis.Node)[])); },
    clear() { log.replaceChildren(); },
  };

  function run(text: string) {
    const cmd = text.trim();
    const echo = line('echo');
    echo.append(promptHTML(), ' ' + cmd);
    if (cmd) {
      if (history[history.length - 1] !== cmd) history.push(cmd);
      execute(cmd, { os, out, cwd, history, setCwd: (x) => { cwd = x; }, exit: () => win.close() });
    }
    cursor = history.length;
    input.value = '';
    refresh();
    bottom();
  }

  form.addEventListener('submit', (e) => { e.preventDefault(); run(input.value); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (cursor === history.length) draft = input.value;
      cursor = Math.max(0, Math.min(history.length, cursor + (e.key === 'ArrowUp' ? -1 : 1)));
      input.value = cursor === history.length ? draft : history[cursor];
    } else if (e.key === 'Tab' && input.value.trim()) {
      e.preventDefault();
      const r = complete(input.value, cwd);
      input.value = r.line;
      if (r.options.length) { out.print(r.options.join('   '), 'dim'); bottom(); }
    } else if (e.key === 'l' && e.ctrlKey) { e.preventDefault(); out.clear(); }
    else if (e.key === 'c' && e.ctrlKey && input.selectionStart === input.selectionEnd) {
      e.preventDefault();
      const l = line('echo'); l.append(promptHTML(), ` ${input.value}^C`); input.value = ''; bottom();
    }
  });
  scroll.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('button, a, input')) return;
    if (!window.getSelection()?.toString()) input.focus({ preventScroll: true });
  });

  const win = os.wm.open({
    key: n === 1 ? 'terminal' : `terminal-${n}`, app: 'terminal', title: `${USER}@${HOSTNAME}: ~`, body, width: 760, height: 470,
    onFocus: () => { if (!os.wm.compact()) setTimeout(() => input.focus({ preventScroll: true })); },
    onClose: () => { if (n === count) count--; },
  });
  const ctx = { os, out, cwd, history, setCwd: () => {}, exit: () => win.close(), args: [] };
  fastfetch(ctx);
  out.print('');
  out.print('type help, or click a suggestion below', 'dim');
  refresh();
  if (!os.wm.compact()) input.focus({ preventScroll: true });
  const origSet = win.setLocation.bind(win);
  win.setLocation = (p: string) => { origSet(p); win.setTitle(`${USER}@${HOSTNAME}: ${p}`); };
  win.setLocation(cwd.path);
  return { win, run };
}
