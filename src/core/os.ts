/** Glue between apps: open a path, launch an app. */
import { WindowManager } from './wm';
import { root, resolve } from './vfs';
import { SECTIONS } from '../config';
import { openTerminal } from '../apps/terminal';
import { openFiles } from '../apps/files';
import { openReader } from '../apps/reader';
import { openCollection } from '../apps/collection';
import { openAbout } from '../apps/about';
import { openLab, LabView } from '../apps/lab';
import type { AppId } from './apps';

export interface OS {
  wm: WindowManager;
  bootTime: number;
  openPath(path: string): void;
  launch(app: AppId, arg?: string): void;
}

export function createOS(area: HTMLElement): OS {
  const wm = new WindowManager(area);
  const live: Partial<Record<string, { go?: (x: string) => void }>> = {};
  const running = (key: string) => wm.wins.find((w) => w.opts.key === key);

  const os: OS = {
    wm,
    bootTime: Date.now(),
    openPath(path) {
      const n = resolve(root, path);
      if (!n) return;
      const sec = SECTIONS.find((s) => n.path === `~/${s.dir}` || n.parent?.path === `~/${s.dir}`);
      if (n.path === '~/about.md') return os.launch('about');
      if (sec) return os.launch(sec.dir as AppId, n.kind === 'file' ? n.path : undefined);
      if (n.kind === 'file') { openReader(os, n); return; }
      os.launch('files', n.path);
    },
    launch(app, arg) {
      const w = running(app);
      if (w) {
        if (arg) live[app]?.go?.(arg);
        wm.focus(w);
        return;
      }
      if (app === 'terminal') openTerminal(os);
      else if (app === 'files') live.files = openFiles(os, arg);
      else if (app === 'about') openAbout(os);
      else if (app === 'lab') live.lab = openLab(os, (arg as LabView) ?? 'ising');
      else {
        const sec = SECTIONS.find((s) => s.dir === app);
        if (sec) live[app] = openCollection(os, sec, arg);
      }
    },
  };
  return os;
}
