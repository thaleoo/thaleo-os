/** Shell: tokeniser, command registry, tab completion. Commands live in commands.ts. */
import { Node, resolve, label } from './vfs';
import type { OS } from './os';

export interface Out {
  print(text?: string, cls?: string): void;
  rich(...parts: (Node | string | globalThis.Node)[]): void;
  clear(): void;
}

export interface Ctx {
  os: OS;
  out: Out;
  args: string[];
  cwd: Node;
  setCwd(n: Node): void;
  history: string[];
  exit(): void;
}

export interface Command {
  name: string;
  summary: string;
  usage?: string;
  hidden?: boolean;
  run(ctx: Ctx): void;
}

export const registry = new Map<string, Command>();
export const register = (...cmds: Command[]) => cmds.forEach((c) => registry.set(c.name, c));

export function tokenize(line: string): string[] {
  const out: string[] = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  for (let m; (m = re.exec(line)); ) out.push(m[1] ?? m[2] ?? m[3]);
  return out;
}

export function execute(line: string, ctx: Omit<Ctx, 'args'>) {
  const [name, ...args] = tokenize(line);
  if (!name) return;
  const cmd = registry.get(name);
  if (!cmd) { ctx.out.print(`tsh: command not found: ${name}`, 'err'); return; }
  try { cmd.run({ ...ctx, args }); } catch (e) { ctx.out.print(`${name}: ${(e as Error).message}`, 'err'); }
}

export function complete(line: string, cwd: Node): { line: string; options: string[] } {
  const tokens = line.split(/\s+/);
  const last = tokens[tokens.length - 1];
  let options: string[];
  let head = '';
  if (tokens.length === 1) options = [...registry.values()].filter((c) => !c.hidden && c.name.startsWith(last)).map((c) => c.name).sort();
  else {
    const cut = last.lastIndexOf('/');
    head = cut >= 0 ? last.slice(0, cut + 1) : '';
    const dir = resolve(cwd, head || '.');
    const stem = last.slice(cut + 1);
    options = dir && dir.kind === 'dir' ? dir.children.filter((c) => c.name.startsWith(stem)).map(label) : [];
  }
  if (!options.length) return { line, options: [] };
  let common = options[0];
  for (const o of options) while (!o.startsWith(common)) common = common.slice(0, -1);
  tokens[tokens.length - 1] = head + (options.length === 1 && !common.endsWith('/') ? common + ' ' : common);
  return { line: tokens.join(' '), options: options.length > 1 ? options : [] };
}
