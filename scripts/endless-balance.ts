import { Simulation } from "../src/simulation";
import { C } from "../src/config";
for (let seed = 1; seed <= 5; seed++) {
  const s = new Simulation(seed, "endless");
  while (!s.ended && s.time < 900) {
    if (s.tick % 60 === 0) {
      s.input({
        rods: s.temperature > 85 ? 90 : s.temperature < 50 ? 25 : 60,
        flow: s.temperature > 85 ? 90 : s.temperature < 45 ? 25 : 50,
      });
      if (s.refills < 2 && s.credits >= s.fuelPrice) s.input({ buyFuel: true });
      if (s.cooldown === 0 && s.refills > 0) {
        const counts = [0, 1, 2, 3].map(
          (i) => s.fuel.filter((f) => f.sector === i && f.spent).length,
        );
        const best = counts.indexOf(Math.max(...counts));
        if (counts[best] > 40) s.input({ refill: best });
      }
    }
    s.step();
  }
  console.log({
    seed,
    time: s.time,
    purchases: s.purchases,
    credits: Math.floor(s.credits),
    refills: s.refills,
    reason: s.reason || "15分継続",
  });
}
