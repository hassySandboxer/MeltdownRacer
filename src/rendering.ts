import { Simulation } from "./simulation";
import { C } from "./config";
export function render(
  canvas: HTMLCanvasElement,
  s: Simulation,
  sector: number,
) {
  const size = canvas.clientWidth,
    dpr = Math.min(devicePixelRatio || 1, 2);
  if (canvas.width !== Math.round(size * dpr)) {
    canvas.width = Math.round(size * dpr);
    canvas.height = canvas.width;
  }
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(
    canvas.width / 560,
    0,
    0,
    canvas.height / 560,
    canvas.width / 2,
    canvas.height / 2,
  );
  ctx.clearRect(-280, -280, 560, 560);
  ctx.strokeStyle = "#29434c";
  ctx.lineWidth = 1;
  for (let i = 0; i < 80; i++) {
    const a = (i / 80) * Math.PI * 2;
    const r = i % 5 ? 255 : 251;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    ctx.lineTo(Math.cos(a) * 260, Math.sin(a) * 260);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(0, 0, 244, 0, Math.PI * 2);
  ctx.strokeStyle = s.danger > 10 ? "#ff7858" : s.fever ? "#c6f77c" : "#478c94";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, C.radius, 0, Math.PI * 2);
  ctx.clip();
  const g = ctx.createRadialGradient(0, 0, 20, 0, 0, 240);
  g.addColorStop(0, "#14333b");
  g.addColorStop(1, "#07191f");
  ctx.fillStyle = g;
  ctx.fillRect(-240, -240, 480, 480);
  ctx.fillStyle = "#3393a716";
  ctx.fillRect(-240, 235 - s.water * 4.7, 480, 480);
  ctx.fillStyle = "#bbee7710";
  ctx.fillRect(sector % 2 ? 0 : -240, sector >= 2 ? 0 : -240, 240, 240);
  ctx.setLineDash([3, 8]);
  ctx.strokeStyle = "#50838a38";
  ctx.beginPath();
  ctx.moveTo(-235, 0);
  ctx.lineTo(235, 0);
  ctx.moveTo(0, -235);
  ctx.lineTo(0, 235);
  ctx.stroke();
  ctx.setLineDash([]);
  for (let i = 0; i < 16; i++) {
    const x = Math.sin(i * 8.3) * 216,
      y = 240 - ((s.time * (8 + s.flow * 0.3) + i * 37) % 480);
    ctx.strokeStyle = "#79dce528";
    ctx.beginPath();
    ctx.arc(x, y, 1.5 + (i % 3), 0, Math.PI * 2);
    ctx.stroke();
  }
  for (const f of s.fuel) {
    if (f.flash > 0) {
      ctx.beginPath();
      ctx.arc(f.x, f.y, 5 + (1 - f.flash / 0.45) * 13, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(212,255,146,${f.flash})`;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.spent ? 3 : 4.3, 0, Math.PI * 2);
    ctx.fillStyle = f.flash > 0.2 ? "#edffd0" : f.spent ? "#3b5059" : "#b7e984";
    ctx.fill();
    if (!f.spent) {
      ctx.fillStyle = "#e5ffb5";
      ctx.fillRect(f.x - 1, f.y - 2, 2, 2);
    }
  }
  for (const r of s.rodRects()) {
    if (!r.h) continue;
    ctx.fillStyle = "#779095";
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = "#bac8bd";
    ctx.fillRect(r.x + 2, r.y, 3, r.h);
    ctx.fillStyle = "#eeb66b";
    ctx.fillRect(r.x, r.y + r.h - 6, r.w, 6);
    ctx.fillStyle = "#243b44";
    for (let y = r.y + 8; y < r.y + r.h - 6; y += 12)
      ctx.fillRect(r.x + 7, y, 6, 3);
  }
  ctx.lineWidth = 1;
  for (const n of s.neutrons) {
    ctx.strokeStyle = "#eaffc369";
    ctx.beginPath();
    ctx.moveTo(n.x - n.vx * 0.045, n.y - n.vy * 0.045);
    ctx.lineTo(n.x, n.y);
    ctx.stroke();
    ctx.fillStyle = "#f4ffe5";
    ctx.beginPath();
    ctx.arc(n.x, n.y, 1.9, 0, Math.PI * 2);
    ctx.fill();
  }
  if (s.ended && s.danger >= 100) {
    ctx.fillStyle = "#ff693338";
    ctx.fillRect(-240, -240, 480, 480);
  }
  ctx.restore();
}
