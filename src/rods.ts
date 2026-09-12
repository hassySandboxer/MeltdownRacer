// A top-down array. Insert in quarter-turn symmetric groups, never top to bottom.
export type RodSite = { x: number; y: number };
const rotate = ({ x, y }: RodSite): RodSite[] => [
  { x, y },
  { x: -y, y: x },
  { x: -x, y: -y },
  { x: y, y: -x },
];
const candidates: RodSite[] = [];
for (const x of [20, 65, 110, 155])
  for (const y of [20, 65, 110, 155]) candidates.push({ x, y });
const ordered: RodSite[] = [];
while (candidates.length) {
  let best = 0,
    bestDistance = -1;
  candidates.forEach((p, i) => {
    const distance = ordered.length
      ? Math.min(...ordered.map((q) => (p.x - q.x) ** 2 + (p.y - q.y) ** 2))
      : -((p.x - 110) ** 2 + (p.y - 110) ** 2);
    if (distance > bestDistance || i === 0) {
      best = i;
      bestDistance = distance;
    }
  });
  ordered.push(...rotate(candidates.splice(best, 1)[0]));
}
export const ROD_SITES: readonly RodSite[] = ordered;
export function insertedRodCount(percent: number) {
  return (
    Math.round(
      (Math.max(0, Math.min(100, percent)) / 100) * (ROD_SITES.length / 4),
    ) * 4
  );
}
