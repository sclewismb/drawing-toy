import { defineConfig } from 'vite';

export default defineConfig({
  // Relative paths so the built site works from any folder (e.g. GitHub Pages /repo-name/).
  base: './',
  build: {
    target: 'es2022', // allows top-level await; supported by Safari 15+
  },
});
