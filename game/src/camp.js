// Camp purchases spend banked wax, competing with future supplies. One purchase per night.
export const CAMP_STOCK = [
  { id: 'lantern', name: 'Hearthwatch', key: 'z', base: 45, text: 'Build a hearth turret. Stacks with Beacon Shard.', apply: (g) => { g.hearth.beacon += 0.75; } },
  { id: 'mending', name: 'Fresh Tallow', key: 'x', base: 26, text: 'Mend 2 lives and restore 30 hearth light.', apply: (g) => { g.player.hp = Math.min(g.player.maxHp, g.player.hp + 2);g.hearth.light = Math.min(g.hearth.maxLight, g.hearth.light + 30); } },
  { id: 'seeds', name: 'Lantern Seeds', key: 'c', base: 28, text: 'Two lanterns. Plant with F; weave burning light lines.', apply: (g) => { g.wardSeeds += 2; } },
];
export const campPrice = (game, item) => item.base + (game.purchases[item.id] || 0) * (item.id === 'lantern' ? 35 : 12);
export function purchaseSupply(game, id) {
  const item = CAMP_STOCK.find((s) => s.id === id);
  if (game.phase !== 'upgrade' || !item || game.campBought || game.wax < campPrice(game, item)) return false;
  game.wax -= campPrice(game, item);game.purchases[id] = (game.purchases[id] || 0) + 1;
  item.apply(game);game.campBought = id;return true;
}
