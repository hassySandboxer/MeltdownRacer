import { C, clamp, VERSION, CONFIG_VERSION } from "./config";
import { ROD_SITES, insertedRodCount } from "./rods";
export type Mode = "survival" | "daily" | "endless";
export type Fuel = {
  x: number;
  y: number;
  spent: boolean;
  flash: number;
  sector: number;
};
export type Neutron = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
};
export type Input = {
  tick: number;
  rods?: number;
  buyFuel?: boolean;
  flow?: number;
  refill?: number;
};
export type Replay = {
  version: string;
  configVersion: number;
  seed: number;
  mode: Mode;
  inputs: Input[];
};
export class Simulation {
  tick = 0;
  rods = 50;
  credits = 0;
  purchases = 0;
  flow = 42;
  temperature = 32;
  waterTemp = 20;
  water = 100;
  pressure = 8;
  danger = 0;
  reaction = 0;
  power = 0;
  energy = 0;
  score = 0;
  fever = 0;
  bestFever = 0;
  stable = 0;
  unstable = 0;
  cold = 0;
  multiplier = 1;
  refills = C.refills as number;
  cooldown = 0;
  fissions = 0;
  absorbed = 0;
  escaped = 0;
  ended = false;
  reason = "";
  fuel: Fuel[] = [];
  neutrons: Neutron[] = [];
  replay: Replay;
  private rng: number;
  private source = 0;
  private grid = new Map<string, number[]>();
  constructor(
    public seed: number,
    public mode: Mode = "survival",
  ) {
    this.rng = seed >>> 0 || 1;
    this.replay = {
      version: VERSION,
      configVersion: CONFIG_VERSION,
      seed,
      mode,
      inputs: [],
    };
    for (let y = -210; y <= 210; y += 20)
      for (let x = -210; x <= 210; x += 20) {
        const px = x + (this.random() - 0.5) * 7,
          py = y + (this.random() - 0.5) * 7;
        if (Math.hypot(px, py) > C.radius - 15) continue;
        const f = {
          x: px,
          y: py,
          spent: false,
          flash: 0,
          sector: (py >= 0 ? 2 : 0) + (px >= 0 ? 1 : 0),
        };
        const key = this.key(px, py);
        const bucket = this.grid.get(key) || [];
        bucket.push(this.fuel.length);
        this.grid.set(key, bucket);
        this.fuel.push(f);
      }
  }
  get time() {
    return this.tick * C.dt;
  }
  get remainingFuel() {
    return this.fuel.filter((f) => !f.spent).length;
  }
  private random() {
    let t = (this.rng += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  private key(x: number, y: number) {
    return `${Math.floor(x / C.cell)},${Math.floor(y / C.cell)}`;
  }
  input(action: Omit<Input, "tick">) {
    if (this.ended) return false;
    if (action.buyFuel && action.refill !== undefined) return false;
    if (action.buyFuel) {
      if (this.mode !== "endless" || this.credits < C.fuelPrice) return false;
      this.credits -= C.fuelPrice;
      this.refills++;
      this.purchases++;
    }
    if (action.refill !== undefined) {
      if (
        !Number.isInteger(action.refill) ||
        action.refill < 0 ||
        action.refill > 3 ||
        this.refills <= 0 ||
        this.cooldown > 0
      )
        return false;
      const spent = this.fuel.filter(
        (f) => f.sector === action.refill && f.spent,
      );
      if (!spent.length) return false;
      spent.forEach((f) => {
        f.spent = false;
        f.flash = 0.5;
      });
      this.refills--;
      this.cooldown = C.refillCooldown;
    }
    if (action.rods !== undefined && Number.isFinite(action.rods))
      this.rods = clamp(action.rods);
    if (action.flow !== undefined && Number.isFinite(action.flow))
      this.flow = clamp(action.flow);
    this.replay.inputs.push({
      ...action,
      tick: this.tick,
    });
    return true;
  }
  rodSites() {
    const count = insertedRodCount(this.rods);
    return ROD_SITES.map((r, i) => ({ ...r, active: i < count }));
  }
  private emit(x: number, y: number) {
    // Shared gameplay limit: excess neutrons escape, on every device equally.
    if (this.neutrons.length >= C.maxNeutrons) {
      this.escaped++;
      return;
    }
    const a = this.random() * Math.PI * 2;
    this.neutrons.push({
      x,
      y,
      vx: Math.cos(a) * C.neutronSpeed,
      vy: Math.sin(a) * C.neutronSpeed,
      life: C.neutronLife,
    });
  }
  step() {
    if (this.ended) return;
    const dt = C.dt;
    this.tick++;
    this.cooldown = Math.max(0, this.cooldown - dt);
    let split = 0;
    this.source -= dt;
    if (this.source <= 0) {
      this.source = this.time < C.startupSeconds ? 0.65 : C.sourceInterval;
      const live = this.fuel.filter((f) => !f.spent);
      if (live.length) {
        const f = live[Math.floor(this.random() * live.length)];
        this.emit(f.x - 8, f.y);
      }
    }
    const rods = this.rodSites().filter((r) => r.active);
    const current = this.neutrons;
    this.neutrons = [];
    for (const n of current) {
      const ox = n.x,
        oy = n.y;
      n.x += n.vx * dt;
      n.y += n.vy * dt;
      n.life -= dt;
      if (n.life <= 0 || Math.hypot(n.x, n.y) >= C.radius) {
        this.escaped++;
        continue;
      }
      if (
        rods.some(
          (r) => distanceToSegment(r.x, r.y, ox, oy, n.x, n.y) <= C.rodRadius,
        )
      ) {
        this.absorbed++;
        continue;
      }
      let hit = false;
      for (
        let cy = Math.floor((Math.min(oy, n.y) - C.fuelRadius) / C.cell);
        cy <= Math.floor((Math.max(oy, n.y) + C.fuelRadius) / C.cell) && !hit;
        cy++
      ) {
        for (
          let cx = Math.floor((Math.min(ox, n.x) - C.fuelRadius) / C.cell);
          cx <= Math.floor((Math.max(ox, n.x) + C.fuelRadius) / C.cell) && !hit;
          cx++
        ) {
          for (const id of this.grid.get(`${cx},${cy}`) || []) {
            const f = this.fuel[id];
            if (
              f.spent ||
              distanceToSegment(f.x, f.y, ox, oy, n.x, n.y) > C.fuelRadius
            )
              continue;
            hit = true;
            if (this.random() < C.fissionProbability) {
              f.spent = true;
              f.flash = 0.45;
              split++;
              this.fissions++;
              for (let j = 0; j < 2; j++) this.emit(f.x, f.y);
            } else this.absorbed++;
            break;
          }
        }
      }
      if (!hit) {
        if (this.neutrons.length < C.maxNeutrons) this.neutrons.push(n);
        else this.escaped++;
      }
    }
    this.fuel.forEach((f) => (f.flash = Math.max(0, f.flash - dt)));
    this.reaction += ((split / dt - this.reaction) * dt) / 3;
    const cooling =
      (0.8 + this.flow * 0.072) * (0.2 + (0.8 * this.water) / 100);
    this.temperature = clamp(
      this.temperature +
        split * C.heatPerFission -
        ((cooling * (this.temperature - 15)) / 65) * dt,
      0,
      150,
    );
    this.waterTemp = clamp(
      this.waterTemp +
        ((this.temperature - this.waterTemp) * 0.065 - this.flow * 0.016) * dt,
      0,
      140,
    );
    const evaporation =
      Math.max(0, this.waterTemp - 48) * 0.055 +
      Math.max(0, this.temperature - 85) * 0.025;
    this.water = clamp(
      this.water + (this.flow * 0.018 - evaporation - 0.08) * dt,
    );
    this.pressure = clamp(
      this.pressure +
        (this.waterTemp * 0.65 + evaporation * 20 - this.pressure) * 0.16 * dt,
      0,
      150,
    );
    this.power =
      Math.max(0, (this.temperature - 22) * 1.8) - (3 + this.flow * 0.38);
    const active =
      this.reaction >= 1.8 && this.reaction <= 15 && this.power >= 12;
    if (active) {
      this.stable += dt;
      this.unstable = 0;
    } else {
      this.unstable += dt;
      if (this.unstable > C.feverGrace) {
        this.stable = 0;
        this.fever = 0;
      }
    }
    if (this.stable >= C.feverSeconds) this.fever += dt;
    this.bestFever = Math.max(this.bestFever, this.fever);
    const stableBonus = this.fever > 0 ? Math.min(3, 1.5 + this.fever / 30) : 1;
    const riskBonus = active
      ? 1 + clamp((this.temperature - 75) / 30, 0, 1)
      : 1;
    this.multiplier = stableBonus * riskBonus;
    const generated = (Math.max(0, this.power) * dt) / 3600;
    this.energy += generated;
    if (this.mode === "endless") this.credits += generated * C.creditsPerEU;
    this.score += Math.max(0, this.power) * this.multiplier * dt;
    const hazard = Math.max(this.temperature - 105, this.pressure - 100);
    this.danger = clamp(
      this.danger + (hazard > 0 ? 3 + hazard * 0.45 : -7) * dt,
    );
    if (
      this.time > C.startupSeconds &&
      this.reaction < 0.7 &&
      this.temperature < 30
    )
      this.cold += dt;
    else this.cold = Math.max(0, this.cold - dt * 2);
    if (this.danger >= 100)
      this.finish("設備破裂 — 蓄積熱と圧力が限界に達しました");
    else if (this.cold >= 10)
      this.finish("低温停止 — 連鎖反応と発電を維持できませんでした");
    else if (this.mode === "daily" && this.time >= C.dailySeconds)
      this.finish("チャレンジクリア — 5分間の運転を完走しました");
  }
  private finish(reason: string) {
    this.ended = true;
    this.reason = reason;
  }
}
export function distanceToSegment(
  x: number,
  y: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
) {
  const dx = bx - ax,
    dy = by - ay;
  const t = clamp(
    ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1),
    0,
    1,
  );
  return Math.hypot(x - ax - t * dx, y - ay - t * dy);
}
export function playReplay(replay: Replay, ticks: number) {
  if (replay.version !== VERSION || replay.configVersion !== CONFIG_VERSION)
    throw new Error("Unsupported replay version");
  const s = new Simulation(replay.seed, replay.mode);
  let index = 0;
  for (let i = 0; i < ticks && !s.ended; i++) {
    while (index < replay.inputs.length && replay.inputs[index].tick === s.tick)
      s.input(replay.inputs[index++]);
    s.step();
  }
  return s;
}
