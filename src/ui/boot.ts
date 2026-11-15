/** GRUB → systemd → lock screen. Skippable at every step; shown once per browser session. */
import { files } from '../core/vfs';
import { registry } from '../core/shell';
import { OS_NAME, OS_VERSION, SECTIONS } from '../config';
import { LOGO } from '../core/logo';
import { about } from '../core/vfs';
import { h } from '../apps/tui';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function clockText(d = new Date()) {
  return {
    time: d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    date: d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }),
  };
}

export async function boot(screen: HTMLElement, opts: { full: boolean }): Promise<void> {
  let skip = false;
  const onKey = () => { skip = true; };
  screen.addEventListener('pointerdown', onKey);
  window.addEventListener('keydown', onKey);
  const pause = async (ms: number) => { const end = Date.now() + ms; while (!skip && Date.now() < end) await wait(16); };

  if (opts.full) {
    // GRUB
    const grub = h('pre', 'grub');
    screen.replaceChildren(grub);
    const entries = [`${OS_NAME} ${OS_VERSION}`, `${OS_NAME} ${OS_VERSION} (recovery mode)`, 'UEFI firmware settings'];
    const w = 52;
    const frame = (s: number) =>
      `${' '.repeat(18)}GNU GRUB  version 2.12\n\n ┌${'─'.repeat(w)}┐\n` +
      entries.map((e, i) => ` │${i === 0 ? '▌' : ' '}${e.padEnd(w - 1)}│`).join('\n') +
      `\n${' │' + ' '.repeat(w) + '│\n'}`.repeat(3) +
      ` └${'─'.repeat(w)}┘\n\n   The highlighted entry will be executed automatically in ${s}s.`;
    grub.textContent = frame(1);
    await pause(900);

    // systemd
    if (!skip) {
      const log = h('pre', 'syslog');
      screen.replaceChildren(log);
      const lines = [
        `Welcome to ${OS_NAME} ${OS_VERSION}!`,
        '',
        `[  OK  ] Mounted /home/guest (${files().length} files).`,
        ...SECTIONS.map((s) => `[  OK  ] Indexed ~/${s.dir}.`),
        `[  OK  ] Started tsh shell (${registry.size} commands).`,
        '[  OK  ] Started window manager.',
        '[  OK  ] Reached target Graphical Interface.',
      ];
      for (const l of lines) {
        if (skip) break;
        const row = h('div');
        if (l.startsWith('[  OK  ]')) row.append('[', h('span', 'ok', '  OK  '), ']' + l.slice(8));
        else row.textContent = l || ' ';
        log.append(row);
        await pause(70);
      }
      await pause(250);
    }
  }

  // lock screen
  skip = false;
  screen.className = 'lock';
  const { time, date } = clockText();
  const t = h('div', 'lock-time', time);
  const d = h('div', 'lock-date', date);
  const avatar = h('pre', 'lock-avatar ff-logo', LOGO.join('\n'));
  const name = h('div', 'lock-name', about.meta.name);
  const go = h('button', 'lock-go', 'Enter');
  const hint = h('div', 'lock-hint', 'press any key or click to unlock');
  const user = h('div', 'lock-user');
  user.append(avatar, name, go);
  screen.replaceChildren(t, d, user, hint);
  const tick = setInterval(() => { t.textContent = clockText().time; }, 10000);
  requestAnimationFrame(() => screen.classList.add('in'));
  await new Promise<void>((resolve) => {
    const done = () => { window.removeEventListener('keydown', done); screen.removeEventListener('click', done); resolve(); };
    window.addEventListener('keydown', done);
    screen.addEventListener('click', done);
  });
  clearInterval(tick);
  screen.removeEventListener('pointerdown', onKey);
  window.removeEventListener('keydown', onKey);
  screen.classList.add('out');
  await wait(window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 450);
  screen.hidden = true;
  screen.className = '';
}
