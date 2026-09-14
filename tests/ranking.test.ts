import { test } from "node:test";
import assert from "node:assert/strict";
import { LocalRanking } from "../src/ranking";
import { Simulation } from "../src/simulation";
test("saving current scores retains previous-version records", () => {
  let data = JSON.stringify([
    {
      version: "0.1.0",
      score: 1234,
      energy: 1,
      fever: 10,
      time: 30,
      mode: "survival",
      date: "2026-09-10",
    },
  ]);
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: () => data,
      setItem: (_key: string, value: string) => {
        data = value;
      },
    },
  });
  try {
    const ranking = new LocalRanking();
    assert.equal(ranking.list().length, 0);
    assert.equal(ranking.save(new Simulation(1), "2026-09-10"), true);
    assert.equal(ranking.list().length, 1);
    assert.equal(
      JSON.parse(data).find((r: { version: string }) => r.version === "0.1.0")
        .score,
      1234,
    );
  } finally {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});
