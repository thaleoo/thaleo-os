# thaleo-os

My personal site, built as a small Linux desktop: boot, lock screen, windows,
dock, workspaces, a terminal and TUI-style apps.

```
npm install
npm run dev      # http://localhost:5173
npm run build    # → dist/index.html (one self-contained file)
```

Pushing to `main` deploys to GitHub Pages (Settings → Pages → Source: GitHub Actions).

## Editing content

Everything shown on the site lives in `content/`. No code changes needed.

```
content/
  about.md            profile, links, short bio
  projects/*.md       one file per project
  research/*.md       one file per research interest
  publications/*.md   one file per paper (empty folder → "empty for now")
```

**Add a publication** — create `content/publications/my-paper.md`:

```md
---
title: Title of the paper
summary: One line about it
date: 2027-03
venue: Journal or arXiv
status: published        # or: preprint
pdf: https://...
doi: https://doi.org/...
---

Two or three sentences. Optional.
```

**Add a project** — create `content/projects/name.md`:

```md
---
title: Name
summary: One line
status: active           # active · in development · ongoing · academic · concept · initiative
stack: Rust, Python
repo: https://github.com/...
order: 1                 # position in the list
---

Short description. `- bullets`, ```code blocks```, **bold** and links work.
```

The file appears in its app, in the file manager, in the terminal (`ls`,
`cat`, `grep`) and in search. Delete the file to remove it.

## Changing the system

- `src/config.ts` — sections, status colours, the empty message, OS name
- `src/core/apps.ts` — app names, icons, shortcuts
- `src/core/commands.ts` — terminal commands
- `src/styles/tokens.css` — colours and fonts

To add a whole new section (say `talks/`): add a line to `SECTIONS` in
`config.ts`, an entry in `APPS` with the same id, and create the folder.
