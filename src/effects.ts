import { Simulation } from "./simulation";
import { clamp } from "./config";
function context(canvas: HTMLCanvasElement) {
  const w = canvas.clientWidth,
    h = canvas.clientHeight,
    dpr = Math.min(devicePixelRatio || 1, 2);
  if (
    canvas.width !== Math.round(w * dpr) ||
    canvas.height !== Math.round(h * dpr)
  ) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  const c = canvas.getContext("2d")!;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, w, h);
  return { c, w, h };
}
export function drawPlant(canvas: HTMLCanvasElement, s: Simulation) {
  const { c, w, h } = context(canvas);
  c.save();
  c.scale(w / 620, h / 64);
  const t = s.time,
    waterY = 52 - s.water * 0.38,
    gross = Math.max(0, (s.temperature - 22) * 1.8),
    generation = s.tick > 0 && !s.ended ? clamp(gross / 180, 0, 1) : 0;
  c.font = "10px sans-serif";
  c.fillStyle = "#9fcedb";
  c.fillText("冷却水", 12, 12);
  c.fillText("炉 → 蒸気", 225, 12);
  c.fillText("タービン → 発電", 419, 12);
  c.strokeStyle = "#5ca4b6";
  c.lineWidth = 2;
  c.strokeRect(12, 17, 80, 38);
  c.fillStyle = "#238dab";
  c.fillRect(14, waterY, 76, 53 - waterY);
  c.beginPath();
  for (let x = 14; x < 91; x++) {
    const y = waterY + Math.sin(x * 0.2 + t * 2) * 1.5;
    if (x === 14) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  c.strokeStyle = "#a5f4ff";
  c.stroke();
  c.fillStyle = "#ebfbff";
  c.font = "bold 12px monospace";
  c.fillText(Math.round(s.water) + "%", 36, 43);
  const pipe = (
    x1: number,
    x2: number,
    y: number,
    color: string,
    amount: number,
  ) => {
    c.strokeStyle = "#203e4a";
    c.lineWidth = 10;
    c.beginPath();
    c.moveTo(x1, y);
    c.lineTo(x2, y);
    c.stroke();
    if (amount > 0) {
      c.strokeStyle = color;
      c.lineWidth = 2 + amount * 4;
      c.setLineDash([7 + amount * 10, 13 - amount * 6]);
      c.lineDashOffset = -t * (12 + amount * 90);
      c.stroke();
      c.setLineDash([]);
    }
  };
  pipe(94, 226, 36, "#5be1ff", s.tick && !s.ended ? s.flow / 100 : 0);
  c.fillStyle = "#29434b";
  c.fillRect(228, 22, 54, 30);
  c.fillStyle = s.temperature > 90 ? "#ffa45f" : "#caeb87";
  c.fillText(Math.round(s.temperature) + "", 242, 42);
  pipe(284, 436, 36, "#dcf5ff", generation);
  for (let i = 0; i < Math.ceil(generation * 13); i++) {
    const x = 290 + ((i * 31 + t * (25 + generation * 60)) % 140),
      y = 33 - Math.sin(i + t * 2) * 6;
    c.fillStyle = "#d6f7ff60";
    c.beginPath();
    c.arc(x, y, 3 + generation * 3, 0, Math.PI * 2);
    c.fill();
  }
  c.save();
  c.translate(460, 37);
  c.strokeStyle = "#6cb3bd";
  c.lineWidth = 2;
  c.beginPath();
  c.arc(0, 0, 21, 0, Math.PI * 2);
  c.stroke();
  c.rotate(t * (2 + generation * 13));
  for (let i = 0; i < 8; i++) {
    c.rotate(Math.PI / 4);
    c.fillStyle = generation > 0.7 ? "#e3ffa4" : "#8dd4dd";
    c.beginPath();
    c.moveTo(3, -2);
    c.lineTo(17, -7);
    c.lineTo(17, 2);
    c.lineTo(4, 4);
    c.fill();
  }
  c.fillStyle = "#0d2730";
  c.beginPath();
  c.arc(0, 0, 5, 0, Math.PI * 2);
  c.fill();
  c.restore();
  pipe(483, 536, 37, "#cdff83", generation);
  for (let i = 0; i < 9; i++) {
    c.fillStyle = generation > i / 9 ? "#c5f57a" : "#25444c";
    c.fillRect(546 + i * 7, 47 - i * 3, 4, 7 + i * 3);
  }
  c.fillStyle = "#dbf6bc";
  c.font = "9px monospace";
  c.fillText(Math.round(gross) + " PU", 548, 61);
  c.restore();
}
export function drawEffects(
  canvas: HTMLCanvasElement,
  s: Simulation,
  blast: number,
  intense: boolean,
  paused: boolean,
) {
  const { c, w, h } = context(canvas);
  if (!s.ended && s.multiplier >= 2 && s.tick > 0 && !paused) {
    const pulse = intense ? 0.13 + 0.12 * Math.sin(s.time * Math.PI * 3) : 0.07;
    const color = s.multiplier >= 4 ? "255,171,83" : "185,255,113";
    const g = c.createRadialGradient(
      w / 2,
      h / 2,
      Math.min(w, h) * 0.25,
      w / 2,
      h / 2,
      Math.max(w, h) * 0.7,
    );
    g.addColorStop(0, `rgba(${color},0)`);
    g.addColorStop(1, `rgba(${color},${pulse})`);
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    c.strokeStyle = `rgba(${color},${intense ? 0.5 + pulse : 0.3})`;
    c.lineWidth = 5;
    c.strokeRect(3, 3, w - 6, h - 6);
  }
  if (blast < 0 || blast > 3.1) return;
  const t = blast,
    cx = w * 0.45,
    cy = h * 0.48,
    scale = Math.max(w, h) / 900;
  c.fillStyle = `rgba(15,4,1,${Math.min(0.7, t * 0.4)})`;
  c.fillRect(0, 0, w, h);
  c.save();
  if (intense)
    c.translate(
      Math.sin(t * 63) * Math.max(0, 1 - t) * 15,
      Math.cos(t * 51) * Math.max(0, 1 - t) * 12,
    );
  const radius = (40 + Math.pow(t, 0.55) * 500) * scale;
  const g = c.createRadialGradient(cx, cy, 0, cx, cy, radius);
  g.addColorStop(0, `rgba(255,252,210,${Math.max(0, 1 - t * 0.5)})`);
  g.addColorStop(0.2, `rgba(255,185,48,${Math.max(0, 1 - t * 0.3)})`);
  g.addColorStop(0.6, `rgba(243,66,12,${Math.max(0, 0.8 - t * 0.23)})`);
  g.addColorStop(1, "rgba(40,0,0,0)");
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  // Expanding, overlapping fire clouds make the blast occupy the whole view.
  for (let i = 0; i < 28; i++) {
    const a = i * 2.39996,
      travel = (30 + (i % 7) * 35) * Math.pow(t, 0.65) * scale;
    const x = cx + Math.cos(a) * travel,
      y = cy + Math.sin(a) * travel * 0.7 - t * t * 28 * scale;
    const r = (22 + (i % 5) * 12) * (0.4 + Math.min(t, 1.8)) * scale;
    const fire = c.createRadialGradient(x - r * 0.2, y - r * 0.2, 0, x, y, r);
    const alpha = Math.max(0, 1 - t / 3);
    fire.addColorStop(0, `rgba(255,244,159,${alpha})`);
    fire.addColorStop(0.35, `rgba(255,157,22,${alpha})`);
    fire.addColorStop(0.72, `rgba(205,44,8,${alpha * 0.85})`);
    fire.addColorStop(1, "rgba(25,6,0,0)");
    c.fillStyle = fire;
    c.fillRect(x - r, y - r, r * 2, r * 2);
  }
  for (let ring = 0; ring < 3; ring++) {
    const r = Math.max(0, t - ring * 0.12) * 800 * scale;
    c.strokeStyle = `rgba(255,224,152,${Math.max(0, 0.8 - t * 0.4)})`;
    c.lineWidth = (8 - ring * 2) * scale;
    c.beginPath();
    c.ellipse(cx, cy, r, r * 0.7, 0, 0, Math.PI * 2);
    c.stroke();
  }
  for (let i = 0; i < 130; i++) {
    const a = i * 2.39996,
      v = (70 + ((i * 53) % 420)) * scale,
      x = cx + Math.cos(a) * v * t,
      y = cy + Math.sin(a) * v * t + 90 * t * t * scale;
    c.fillStyle = i % 3 ? "#ffb43c" : "#fffbd7";
    c.globalAlpha = Math.max(0, 1 - t / 3);
    c.fillRect(x, y, (2 + (i % 5)) * scale, (2 + (i % 3)) * scale);
  }
  c.globalAlpha = 1;
  c.restore();
  if (intense && t < 0.18) {
    c.fillStyle = `rgba(255,245,200,${(1 - t / 0.18) * 0.75})`;
    c.fillRect(0, 0, w, h);
  }
  c.textAlign = "center";
  c.font = `800 ${Math.min(w * 0.09, 70)}px sans-serif`;
  c.fillStyle = "#fff0cd";
  c.shadowColor = "#e64c00";
  c.shadowBlur = 20;
  c.fillText("MELTDOWN", w / 2, h * 0.47);
  c.shadowBlur = 0;
  c.font = "12px sans-serif";
  c.fillText("設備破裂 — 連鎖を制御できなかった", w / 2, h * 0.47 + 34);
}
