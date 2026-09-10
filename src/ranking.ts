import { VERSION } from "./config";
import type { Mode, Simulation } from "./simulation";
export type RecordEntry = {
  score: number;
  energy: number;
  fever: number;
  time: number;
  mode: Mode;
  date: string;
  version: string;
};
// Replace this interface with an HTTP client when online rankings are introduced.
export interface RankingClient {
  list(): RecordEntry[];
  save(s: Simulation, date: string): boolean;
}
export class LocalRanking implements RankingClient {
  list(): RecordEntry[] {
    try {
      const data: unknown = JSON.parse(
        localStorage.getItem("meltdown-racer.records") || "[]",
      );
      return Array.isArray(data)
        ? data
            .filter(
              (r) => r && r.version === VERSION && Number.isFinite(r.score),
            )
            .slice(0, 50)
        : [];
    } catch {
      return [];
    }
  }
  save(s: Simulation, date: string) {
    try {
      const rows = [
        ...this.list(),
        {
          score: Math.floor(s.score),
          energy: s.energy,
          fever: s.bestFever,
          time: s.time,
          mode: s.mode,
          date,
          version: VERSION,
        },
      ];
      localStorage.setItem(
        "meltdown-racer.records",
        JSON.stringify(rows.sort((a, b) => b.score - a.score).slice(0, 50)),
      );
      return true;
    } catch {
      return false;
    }
  }
}
export function japanDate() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export function dailySeed(date: string) {
  return (
    [...date].reduce(
      (h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619),
      2166136261,
    ) >>> 0
  );
}
