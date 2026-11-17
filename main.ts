// Node 22 entrypoint. The submitted artifact needs no compiler, dependencies or network.
import { cpSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repository = dirname(fileURLToPath(import.meta.url));
const output = resolve(process.env.MAKEFUN_OUTPUT_DIR || '/output');
const screenshots = readdirSync(join(repository, 'screenshots')).filter((name) => !name.startsWith('.'));
if (screenshots.length < 3 || screenshots.length > 4) {
  throw new Error('The game must ship three or four real browser screenshots.');
}
mkdirSync(output, { recursive: true });
for (const directory of ['game', 'screenshots']) {
  cpSync(join(repository, directory), join(output, directory), { recursive: true, dereference: false });
}
const dossier = buildDossier(output, {
  text_max_bytes: 163840,
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
  screenshots: { max: 4, max_bytes: 262144 },
});
writeFileSync(join(output, 'dossier.json'), dossier);
console.log('Wickwarden: offline game, maker screenshots and deterministic dossier delivered.');
