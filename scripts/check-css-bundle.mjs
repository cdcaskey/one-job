#!/usr/bin/env node
// Mantine's CSS imports (styles.css, notifications/styles.css) fail
// silently if one gets dropped — the app still builds and renders,
// just unstyled. Proof, not vibes: grep the emitted CSS bundle for a
// Mantine-only custom property that can only be there if the real
// stylesheets made it into the build.
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const ASSETS_DIR = path.join('dist', 'assets');
const MARKER = '--mantine-color-body';

const cssFiles = readdirSync(ASSETS_DIR).filter((f) => f.endsWith('.css'));

if (cssFiles.length === 0) {
  console.error(`[check-css-bundle] no CSS files found in ${ASSETS_DIR}`);
  process.exit(1);
}

const found = cssFiles.some((f) => readFileSync(path.join(ASSETS_DIR, f), 'utf8').includes(MARKER));

if (!found) {
  console.error(
    `[check-css-bundle] ${MARKER} not found in any of ${cssFiles.join(', ')} — Mantine's styles.css likely isn't being imported`,
  );
  process.exit(1);
}

console.log(`[check-css-bundle] ${MARKER} found — Mantine styles are in the build`);
