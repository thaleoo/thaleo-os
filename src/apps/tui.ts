/** Small builders for the TUI look: bordered panes with a title in the border, key hints. */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

export function pane(title: string, cls = ''): { el: HTMLElement; body: HTMLElement; setTitle: (t: string) => void } {
  const el = h('section', `pane ${cls}`);
  const t = h('span', 'pane-title', title);
  const body = h('div', 'pane-body');
  el.append(t, body);
  el.setAttribute('aria-label', title);
  return { el, body, setTitle: (s) => { t.textContent = s; el.setAttribute('aria-label', s); } };
}

/** "↑↓ select   ⏎ open" style footer. */
export function keys(...pairs: [string, string][]): HTMLElement {
  const bar = h('div', 'keys');
  for (const [k, what] of pairs) {
    const item = h('span', 'key');
    item.append(h('kbd', '', k), ' ' + what);
    bar.append(item);
  }
  return bar;
}

export function empty(message: string): HTMLElement {
  const box = h('div', 'empty');
  box.append(h('pre', 'empty-art', '┌──────┐\n│ ░░░░ │\n│ ░░   │\n└──────┘'), h('p', '', message));
  return box;
}
