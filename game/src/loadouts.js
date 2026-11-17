// Three candle disciplines and three honest difficulty presets, all available from the title.
export const DISCIPLINES = [
  { id: 'wick', name: 'Wick', subtitle: 'THE KEEPER', text: 'Steady fire. A balanced little flame.', color: '#ffd36e', apply: () => {} },
  { id: 'nettle', name: 'Nettle', subtitle: 'THE SCATTERWICK', text: 'Three thorn bolts. Slower, wider fire.', color: '#8de8bb', apply: (p) => { p.stats.bolts = 3;p.stats.damage = 6;p.stats.fireDelay = 0.28;p.stats.speed = 250; } },
  { id: 'glint', name: 'Glint', subtitle: 'THE QUICKSPARK', text: 'Leaping sparks. Swift feet. One less life.', color: '#bca3ff', apply: (p) => { p.stats.chain = 0.45;p.stats.speed = 300;p.stats.dashCooldown = 0.8;p.hp = 4;p.maxHp = 4; } },
];
export const DIFFICULTIES = [
  { id: 'story', name: 'Firefly', text: 'A forgiving first light', health: 0.75, speed: 0.85, drain: 0.7, score: 0.75 },
  { id: 'warden', name: 'Warden', text: 'The intended night', health: 1, speed: 1, drain: 1, score: 1 },
  { id: 'eclipse', name: 'Eclipse', text: 'Hungry shadows, richer scores', health: 1.35, speed: 1.15, drain: 1.3, score: 1.5 },
];
export function configureCandle(player, id) {
  const discipline = DISCIPLINES.find((d) => d.id === id) || DISCIPLINES[0];
  discipline.apply(player);player.discipline = discipline.id;player.color = discipline.color;
  return discipline;
}
