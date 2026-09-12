import { test } from "node:test";
import assert from "node:assert/strict";
import { Simulation, playReplay, distanceToSegment } from "../src/simulation";
import { C } from "../src/config";
const advance = (s: Simulation, seconds: number) => {
  for (let i = 0; i < Math.round(seconds / C.dt); i++) s.step();
};
test("distributed rod count is monotone and balanced at every slider value", () => {
  const s = new Simulation(10);
  let previous = 0;
  for (let percent = 0; percent <= 100; percent++) {
    s.input({ rods: percent });
    const active = s.rodSites().filter((r) => r.active);
    assert.ok(active.length >= previous);
    assert.equal(active.length % 4, 0);
    previous = active.length;
    const quadrants = [0, 0, 0, 0];
    for (const r of active)
      quadrants[(r.y >= 0 ? 2 : 0) + (r.x >= 0 ? 1 : 0)]++;
    assert.ok(quadrants.every((n) => n === quadrants[0]));
    assert.equal(
      active.reduce((a, r) => a + r.x, 0),
      0,
    );
    assert.equal(
      active.reduce((a, r) => a + r.y, 0),
      0,
    );
  }
  assert.equal(previous, 64);
});
test("endless purchases spend credits, preserve score and energy, and replay", () => {
  const s = new Simulation(8, "endless");
  assert.equal(s.input({ buyFuel: true }), false);
  for (let i = 0; i < 3600 && !s.ended && s.credits < C.fuelPrice; i++)
    s.step();
  assert.ok(s.credits >= C.fuelPrice);
  const { score, energy, credits, refills } = s;
  assert.equal(s.input({ buyFuel: true }), true);
  assert.equal(s.refills, refills + 1);
  assert.ok(Math.abs(s.credits - (credits - C.fuelPrice)) < 1e-9);
  assert.equal(s.energy, energy);
  assert.equal(s.score, score);
  advance(s, 1);
  assert.deepEqual(playReplay(s.replay, s.tick), s);
  const normal = new Simulation(8);
  normal.credits = 10000;
  assert.equal(normal.input({ buyFuel: true }), false);
});
test("shop cannot bypass refill cooldown or charge a rejected combined action", () => {
  const s = new Simulation(1, "endless");
  s.credits = C.fuelPrice;
  s.refills = 0;
  s.cooldown = 5;
  assert.equal(s.input({ buyFuel: true, refill: 0 }), false);
  assert.equal(s.credits, C.fuelPrice);
  assert.equal(s.input({ buyFuel: true }), true);
  assert.equal(s.cooldown, 5);
  assert.equal(s.credits, 0);
  assert.equal(s.input({ buyFuel: true }), false);
  assert.equal(s.refills, 1);
  assert.equal(s.input({ refill: 0 }), false);
  s.ended = true;
  s.credits = C.fuelPrice;
  assert.equal(s.input({ buyFuel: true }), false);
  assert.equal(s.credits, C.fuelPrice);
});
test("endless mode continues after five minutes and earns credits from actual output", () => {
  const s = new Simulation(2, "endless");
  s.tick = 17999;
  s.temperature = 60;
  s.step();
  assert.equal(s.ended, false);
  assert.ok(s.time >= 300);
  assert.equal(s.credits, s.energy * C.creditsPerEU);
});
test("same seed and tick inputs reproduce exact results independently of render batching", () => {
  const a = new Simulation(123);
  for (let i = 0; i < 3600; i++) {
    if (i === 600) a.input({ flow: 65 });
    if (i === 1200) a.input({ rods: 55 });
    if (i === 2400) a.input({ refill: 0 });
    a.step();
  }
  const b = playReplay(a.replay, a.tick);
  assert.deepEqual(b, a);
  const c = new Simulation(123);
  let index = 0;
  for (let frame = 0; frame < 1200; frame++)
    for (let j = 0; j < 3; j++) {
      while (
        index < a.replay.inputs.length &&
        a.replay.inputs[index].tick === c.tick
      )
        c.input(a.replay.inputs[index++]);
      c.step();
    }
  assert.equal(c.score, a.score);
  assert.equal(c.energy, a.energy);
});
test("fuel fissions once; neutron budget and fuel accounting remain valid", () => {
  const s = new Simulation(74);
  advance(s, 200);
  assert.equal(s.fissions, s.fuel.filter((f) => f.spent).length);
  assert.ok(s.neutrons.length <= C.maxNeutrons);
  assert.ok(s.fissions > 20);
});
test("inserting rods suppresses chain reactions over multiple seeds", () => {
  let low = 0,
    high = 0;
  for (let i = 1; i <= 8; i++) {
    const a = new Simulation(i),
      b = new Simulation(i);
    a.input({ rods: 0 });
    b.input({ rods: 100 });
    advance(a, 25);
    advance(b, 25);
    low += a.fissions;
    high += b.fissions;
  }
  assert.ok(high < low * 0.8, `${high} vs ${low}`);
});
test("flow cools the core and restores water but consumes output", () => {
  const a = new Simulation(6),
    b = new Simulation(6);
  a.input({ flow: 0 });
  b.input({ flow: 100 });
  a.water = b.water = 50;
  advance(a, 10);
  advance(b, 10);
  assert.ok(b.temperature < a.temperature);
  assert.ok(b.water > a.water);
  assert.ok(b.power < a.power);
});
test("refill rejects empty areas and enforces cooldown and limited charges", () => {
  const s = new Simulation(1);
  assert.equal(s.input({ refill: 0 }), false);
  s.fuel.filter((f) => f.sector === 0).forEach((f) => (f.spent = true));
  assert.equal(s.input({ refill: 0 }), true);
  assert.equal(s.refills, 7);
  s.fuel[0].spent = true;
  assert.equal(s.input({ refill: 0 }), false);
  s.cooldown = 0;
  s.refills = 0;
  assert.equal(s.input({ refill: 0 }), false);
});
test("cold shutdown has startup and sustained-low-activity grace", () => {
  const s = new Simulation(1);
  s.fuel.forEach((f) => (f.spent = true));
  s.temperature = 20;
  advance(s, 25);
  assert.equal(s.ended, false);
  advance(s, 6);
  assert.equal(s.ended, true);
  assert.match(s.reason, /低温停止/);
});
test("overheat has recovery window and eventually ends the run", () => {
  const s = new Simulation(1);
  s.temperature = 145;
  s.input({ flow: 0 });
  advance(s, 1);
  assert.equal(s.ended, false);
  assert.ok(s.danger > 0);
  advance(s, 8);
  assert.equal(s.ended, true);
  assert.match(s.reason, /設備破裂/);
});
test("residual heat earns no risk multiplier", () => {
  const s = new Simulation(1);
  s.fuel.forEach((f) => (f.spent = true));
  s.temperature = 95;
  advance(s, 2);
  assert.equal(s.multiplier, 1);
});
test("swept circular-rod collision absorbs fast neutrons before further reaction", () => {
  const s = new Simulation(1);
  s.input({ rods: 100 });
  s.fuel.forEach((f) => (f.spent = true));
  const r = s.rodSites()[0];
  s.neutrons = [{ x: r.x - 10, y: r.y, vx: 1200, vy: 0, life: 2 }];
  s.step();
  assert.equal(s.absorbed, 1);
  assert.equal(s.neutrons.length, 0);
  assert.equal(s.fissions, 0);
  assert.equal(distanceToSegment(0, 1, -20, 0, 20, 0), 1);
});

test("daily run clears at five minutes", () => {
  const s = new Simulation(2, "daily");
  s.tick = 17999;
  s.temperature = 60;
  s.step();
  assert.ok(s.ended);
  assert.match(s.reason, /クリア/);
});
