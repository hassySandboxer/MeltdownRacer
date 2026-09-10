import { test } from "node:test";
import assert from "node:assert/strict";
import {
  Simulation,
  playReplay,
  segmentRect,
  distanceToSegment,
} from "../src/simulation";
import { C } from "../src/config";
const advance = (s: Simulation, seconds: number) => {
  for (let i = 0; i < Math.round(seconds / C.dt); i++) s.step();
};
test("four rods move independently and common control gives equal insertion depth", () => {
  const s = new Simulation(10);
  s.input({ rod: { index: 2, depth: 15 } });
  assert.deepEqual(s.rodDepths, [60, 60, 15, 60]);
  s.rodRects().forEach((r, i) =>
    assert.ok(Math.abs(r.h / (-r.y * 2) - s.rodDepths[i] / 100) < 1e-12),
  );
  s.input({ rods: 35 });
  assert.deepEqual(s.rodDepths, [35, 35, 35, 35]);
  assert.equal(s.input({ rod: { index: 4, depth: 50 } }), false);
  assert.equal(s.input({ rod: { index: 0, depth: NaN } }), false);
});
test("independent rod inputs replay without sharing mutable input objects", () => {
  const s = new Simulation(8);
  const rod = { index: 0, depth: 90 };
  s.input({ rod });
  rod.depth = 0;
  advance(s, 3);
  s.input({ rod: { index: 3, depth: 10 } });
  advance(s, 10);
  assert.deepEqual(playReplay(s.replay, s.tick), s);
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
test("swept collision catches fast travel through a rod and fuel", () => {
  assert.equal(
    segmentRect(-20, 0, 20, 0, { x: -2, y: -10, w: 4, h: 20 }),
    true,
  );
  assert.equal(
    segmentRect(-20, 30, 20, 30, { x: -2, y: -10, w: 4, h: 20 }),
    false,
  );
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
