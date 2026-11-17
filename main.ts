// Node 22 entrypoint. The submitted artifact needs no compiler, dependencies or network.
import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repository = dirname(fileURLToPath(import.meta.url));
const output = resolve(process.env.MAKEFUN_OUTPUT_DIR || '/output');
mkdirSync(output, { recursive: true });
for (const directory of ['game', 'screenshots']) {
  cpSync(join(repository, directory), join(output, directory), { recursive: true, dereference: false });
}
const dossier = buildDossier(output, { text_max_bytes: 163840 });
writeFileSync(join(output, 'dossier.json'), dossier);
console.log('Wickwarden: offline game, maker screenshots and deterministic dossier delivered.');
