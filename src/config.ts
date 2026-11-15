/**
 * Site configuration: the one file to touch besides /content.
 *
 * - SECTIONS: folders under /content that the system knows about. A section
 *   exists even when its folder is empty; then it shows EMPTY_MESSAGE.
 * - STATUS: colours for the `status:` field used in front matter.
 */
export const OS_NAME = 'thaleo-os';
export const OS_VERSION = '2.0';
export const HOSTNAME = 'thaleo-os';
export const USER = 'guest';

export const EMPTY_MESSAGE = 'empty for now — work in progress';

export interface Section {
  dir: string; // folder under /content
  title: string;
  /** How items are ordered: by `order:` (ascending) or by `date:` (newest first). */
  sort: 'order' | 'date';
}

export const SECTIONS: Section[] = [
  { dir: 'projects', title: 'Projects', sort: 'order' },
  { dir: 'research', title: 'Research', sort: 'order' },
  { dir: 'publications', title: 'Publications', sort: 'date' },
];

/** status value → colour token (see --st-* in styles/tokens.css). */
export const STATUS: Record<string, string> = {
  active: 'green',
  published: 'green',
  'in development': 'amber',
  ongoing: 'amber',
  preprint: 'amber',
  studying: 'blue',
  exploring: 'violet',
  academic: 'grey',
  concept: 'violet',
  initiative: 'pink',
};
