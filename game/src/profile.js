// Local-only campaign memories. Progress is a trophy, never a paid or time-gated advantage.
const KEY = 'wickwarden.garden-journal.v1';
export function readJournal() {
  try { return { runs: 0, victories: 0, seals: [], candles: [], ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
  catch { return { runs: 0, victories: 0, seals: [], candles: [] }; }
}
export function recordJourney(game) {
  const journal = readJournal();journal.runs++;
  if (game.phase === 'won') journal.victories++;
  journal.seals = [...new Set([...journal.seals, ...game.realmSeals])];
  if (game.phase === 'won') journal.candles = [...new Set([...journal.candles, game.discipline.id + ':' + game.difficulty.id])];
  try { localStorage.setItem(KEY, JSON.stringify(journal)); } catch { /* A private browser still plays normally. */ }
  return journal;
}
