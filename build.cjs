/* Copies the static pages into dist/ so Vercel has something to publish.

   The functions cannot live in api/ from here - GitHub's web uploader only
   writes to the repository root, and there is no git on this machine. So the
   three functions sit at the root and vercel.json points /api/* at them, and
   this build puts the pages alongside in the output directory. */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'dist');

const PAGES = [
  'donutsmp-store-gate.html',
  'donutsmp-checkout-layout.html',
  'donutsmp-checkout-flow.html',
  'donutsmp-payment-step.html',
  'pickaxe.svg',
  'README.md'
];

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

for (const name of PAGES) {
  fs.copyFileSync(path.join(ROOT, name), path.join(OUT, name));
}

console.log(`built ${PAGES.length} files into dist/`);
