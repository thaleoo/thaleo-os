import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// The site builds to one self-contained index.html (fonts and content
// inlined), so it can be hosted anywhere, including GitHub Pages.
export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
  build: { assetsInlineLimit: 100_000_000, cssCodeSplit: false },
});
