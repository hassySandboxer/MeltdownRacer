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
export function drawPlant(canvas: HTMLCanvasElement, s: Simulation, motion: number, intense: boolean) {
  const { c, w, h } = context(canvas);
  c.save();
  c.scale(w / 620, h / 64);
  const t = s.time,
    waterY = 52 - s.water * 0.38,
    gross = Math.max(0, (s.temperature - 22) * 1.8),
    generation = s.tick > 0 && !s.ended ? clamp(gross / 180, 0, 1) : 0;
  c.font = "10px sans-serif";
  c.fillStyle = "#78617f";
  c.fillText("冷却水", 12, 12);
  c.fillText("炉 → 蒸気", 225, 12);
  c.fillText("タービン → 発電", 419, 12);
  c.strokeStyle = "#74aeb6";
  c.lineWidth = 2;
  c.strokeRect(12, 17, 80, 38);
  c.fillStyle = "#9bdedc";
  c.fillRect(14, waterY, 76, 53 - waterY);
  c.beginPath();
  for (let x = 14; x < 91; x++) {
    const y = waterY + Math.sin(x * 0.2 + t * 2) * 1.5;
    if (x === 14) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  c.strokeStyle = "#eaffff";
  c.stroke();
  c.fillStyle = "#376971";
  c.font = "bold 12px monospace";
  c.fillText(Math.round(s.water) + "%", 36, 43);
  const pipe = (
    x1: number,
    x2: number,
    y: number,
    color: string,
    amount: number,
  ) => {
    c.strokeStyle = "#d5c9df";
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
  pipe(94, 226, 36, "#599eb3", s.tick && !s.ended ? s.flow / 100 : 0);
  c.fillStyle = "#dcd4ee";
  c.fillRect(228, 22, 54, 30);
  c.fillStyle = s.temperature > 90 ? "#b64d63" : "#527c68";
  c.fillText(Math.round(s.temperature) + "", 242, 42);
  pipe(284, 436, 36, "#fff8ee", generation);
  for (let i = 0; i < Math.ceil(generation * 13); i++) {
    const x = 290 + ((i * 31 + t * (25 + generation * 60)) % 140),
      y = 33 - Math.sin(i + t * 2) * 6;
    c.fillStyle = "#a38bbc65";
    c.beginPath();
    c.arc(x, y, 3 + generation * 3, 0, Math.PI * 2);
    c.fill();
  }
  c.save();
  const heat = clamp((generation - 0.25) / 0.75, 0, 1);
  const turbineColor = `hsl(${185 * (1 - heat)}, ${45 + heat * 45}%, ${65 - heat * 7}%)`;
  const hop = intense ? Math.abs(Math.sin(motion * (3 + generation * 7))) * generation * 7 : 0;
  c.translate(460, 37 - hop);
  if (intense) {
    c.shadowColor = turbineColor;
    c.shadowBlur = generation * 12;
  }
  c.strokeStyle = turbineColor;
  c.lineWidth = 2;
  c.beginPath();
  c.arc(0, 0, 21, 0, Math.PI * 2);
  c.stroke();
  c.rotate(motion * (2 + generation * 13));
  for (let i = 0; i < 8; i++) {
    c.rotate(Math.PI / 4);
    c.fillStyle = turbineColor;
    c.beginPath();
    c.moveTo(3, -2);
    c.lineTo(17, -7);
    c.lineTo(17, 2);
    c.lineTo(4, 4);
    c.fill();
  }
  c.fillStyle = "#fff1f2";
  c.beginPath();
  c.arc(0, 0, 5, 0, Math.PI * 2);
  c.fill();
  c.restore();
  pipe(483, 536, 37, "#65af91", generation);
  for (let i = 0; i < 9; i++) {
    c.fillStyle = generation > i / 9 ? "#70b796" : "#dfd5e8";
    c.fillRect(546 + i * 7, 39 - i * 3, 4, 7 + i * 3);
  }
  c.fillStyle = "#5e7567";
  c.font = "9px monospace";
  c.fillText(Math.round(gross) + " PU", 548, 60);
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
  if (!s.ended && s.fever > 0 && s.tick > 0 && !paused) {
    const t = performance.now() / 1000;
    const hue = intense ? (t * 100) % 360 : 310;
    const rainbow = c.createLinearGradient(0, 0, w, h);
    for (let i = 0; i <= 7; i++)
      rainbow.addColorStop(
        i / 7,
        "hsla(" +
          ((hue + (i * 360) / 7) % 360) +
          ",100%,65%," +
          (intense ? 0.9 : 0.35) +
          ")",
      );
    // Draw the game border itself as waves; the browser chrome stays untouched.
    const border = (inset: number, amplitude: number) => {
      c.beginPath();
      for (let edge = 0; edge < 4; edge++) {
        const length = edge % 2 ? h - inset * 2 : w - inset * 2;
        const steps = Math.ceil(length / 12);
        for (let j = 0; j <= steps; j++) {
          const along = j / steps * length;
          const wave = Math.sin(along * .035 + t * 3 + edge * 1.7) * amplitude * Math.sin(j / steps * Math.PI);
          const x = edge === 0 ? inset + along : edge === 1 ? w - inset + wave : edge === 2 ? w - inset - along : inset + wave;
          const y = edge === 0 ? inset + wave : edge === 1 ? inset + along : edge === 2 ? h - inset + wave : h - inset - along;
          if (edge === 0 && j === 0) c.moveTo(x, y); else c.lineTo(x, y);
        }
      }
      c.closePath();
      c.stroke();
    };
    c.strokeStyle = rainbow;
    c.lineWidth = intense ? 6 : 3;
    border(12, intense ? 6 : 0);
    if (intense) {
      c.globalAlpha = .3;
      border(22, 8);
      c.globalAlpha = 1;
      const colors = ["#ff78ae", "#ffac62", "#ffe66c", "#71e7ae", "#6ed5ff", "#9c98ff", "#e695ff"];
      const count = Math.min(120, Math.max(45, Math.round(w * h / 11000)));
      for (let i = 0; i < count; i++) {
        const x = ((i * 137.51) % w + Math.sin(t * 1.2 + i) * 26 + w) % w;
        const y = (i * 83.7 + t * (36 + i % 7 * 8)) % (h + 24) - 12;
        c.save();
        c.translate(x, y);
        c.rotate(t * (1 + i % 3) + i);
        c.scale(Math.max(.25, Math.abs(Math.cos(t * 2 + i))), 1);
        c.globalAlpha = .7;
        c.fillStyle = colors[i % 7];
        c.fillRect(-3, -5, 4 + i % 3, 7 + i % 5);
        c.restore();
      }
      const glow = c.createRadialGradient(
        w / 2,
        h / 2,
        Math.min(w, h) * 0.35,
        w / 2,
        h / 2,
        Math.max(w, h) * 0.65,
      );
      glow.addColorStop(0, "transparent");
      glow.addColorStop(1, "hsla(" + hue + ",100%,60%,.27)");
      c.fillStyle = glow;
      c.fillRect(0, 0, w, h);
    }
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
