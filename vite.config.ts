import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';

/**
 * Development only: lets the cutout test page (dev/cutout.html) save a
 * contact-sheet image into test-output/ so results can be reviewed at full
 * size. Never part of the deployed app.
 */
function devSaveEndpoint(): Plugin {
  return {
    name: 'dev-save-endpoint',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__save', (req, res) => {
        const name =
          new URL(req.url ?? '/', 'http://local').searchParams.get('name')?.replace(/[^\w.-]/g, '') ||
          'output.png';
        const chunks: Buffer[] = [];
        req.on('data', (c: Buffer) => chunks.push(c));
        req.on('end', () => {
          fs.mkdirSync('test-output', { recursive: true });
          fs.writeFileSync(path.join('test-output', name), Buffer.concat(chunks));
          res.end('saved');
        });
      });
    },
  };
}

export default defineConfig({
  // Relative paths so the built site works from any folder (e.g. GitHub Pages /repo-name/).
  base: './',
  build: {
    target: 'es2022', // allows top-level await; supported by Safari 15+
  },
  plugins: [devSaveEndpoint()],
});
