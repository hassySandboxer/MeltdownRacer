import { Simulation } from "../src/simulation";
let early = 0,
  minimum = Infinity,
  maximum = 0,
  fevers = 0;
for (let seed = 1; seed <= 50; seed++) {
  const s = new Simulation(seed);
  while (s.time < 600 && !s.ended) s.step();
  minimum = Math.min(minimum, s.time);
  maximum = Math.max(maximum, s.time);
  if (s.time < 30) early++;
  if (s.bestFever > 0) fevers++;
}
console.log("50 seeds, default controls, no refill", {
  early,
  minimum,
  maximum,
  fevers,
});
for (let seed = 1; seed <= 5; seed++) {
  const s = new Simulation(seed, "daily");
  while (!s.ended) {
    if (s.tick % 60 === 0) {
      s.input({
        rods: s.temperature > 85 ? 90 : s.temperature < 50 ? 25 : 60,
        flow: s.temperature > 85 ? 90 : s.temperature < 45 ? 25 : 50,
      });
      if (s.cooldown === 0 && s.refills > 0) {
        const counts = [0, 1, 2, 3].map(
          (j) => s.fuel.filter((f) => f.sector === j && f.spent).length,
        );
        const best = counts.indexOf(Math.max(...counts));
        if (counts[best] > 40) s.input({ refill: best });
      }
    }
    s.step();
  }
  console.log("Feedback policy", {
    seed,
    time: s.time,
    score: Math.floor(s.score),
    fever: s.bestFever,
    reason: s.reason,
  });
}
