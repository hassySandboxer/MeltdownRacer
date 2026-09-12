// All values are fictional arcade units, not real reactor operating conditions.
export const VERSION = "0.3.0";
export const CONFIG_VERSION = 3;
export const C = {
  dt: 1 / 60,
  radius: 235,
  fuelRadius: 5,
  cell: 24,
  neutronSpeed: 108,
  neutronLife: 7,
  maxNeutrons: 600,
  fissionProbability: 0.52,
  heatPerFission: 1.05,
  sourceInterval: 0.8,
  startupSeconds: 20,
  feverSeconds: 5,
  feverGrace: 2,
  refills: 8,
  refillCooldown: 12,
  dailySeconds: 300,
  rodRadius: 7.5,
  fuelPrice: 120,
  creditsPerEU: 1000,
} as const;
export const clamp = (n: number, lo = 0, hi = 100) =>
  Math.max(lo, Math.min(hi, n));
