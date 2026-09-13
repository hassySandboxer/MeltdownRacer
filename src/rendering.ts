import { Simulation } from "./simulation";
import { C } from "./config";
export function render(
  canvas: HTMLCanvasElement,
  s: Simulation,
  sector: number,
  intense: boolean,
  motionTime = s.time,
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
  const luminous = s.fever > 0 && !s.ended;
  const t = intense ? motionTime : 0;
  const g = ctx.createRadialGradient(0, 0, 15, 0, 0, 240);
  g.addColorStop(0, luminous ? "#ecfcff" : "#14333b");
  g.addColorStop(.65, luminous ? "#99e3f5" : "#102b33");
  g.addColorStop(1, luminous ? "#319cc8" : "#07191f");
  ctx.fillStyle = g;
  ctx.fillRect(-240, -240, 480, 480);
  if (luminous) {
    // Broad cyan-white glow, without patterned highlights competing with fuel.
    ctx.save();
    const glow = ctx.createRadialGradient(-45, -60, 0, -45, -60, 230);
    glow.addColorStop(0, `rgba(255,255,255,${intense ? .16 + .06 * Math.sin(t * 1.6) : .14})`);
    glow.addColorStop(1, "#ffffff00");
    ctx.fillStyle = glow;
    ctx.fillRect(-240, -240, 480, 480);
    ctx.strokeStyle = "#d8fbff";
    ctx.lineWidth = 5;
    ctx.globalAlpha = intense ? .55 + .15 * Math.sin(t * 1.6) : .55;
    ctx.beginPath(); ctx.arc(0, 0, 231, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  const surface = 235 - s.water * 4.7;
  ctx.fillStyle = "#2786aa38";
  ctx.fillRect(-240, surface, 480, 480);
  ctx.beginPath();
  for (let x = -240; x <= 240; x += 4) {
    const y = surface + Math.sin(x * 0.04 + s.time * 2) * 3;
    if (x === -240) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = "#81eaff";
  ctx.lineWidth = 2;
  ctx.stroke();
  if (s.flow > 0 && s.tick > 0 && !s.ended)
    for (let i = 0; i < Math.ceil(s.flow / 7); i++) {
      const y = 235 - ((s.time * (15 + s.flow) + i * 37) % 470),
        x = -220 + ((i * 47) % 440);
      if (y < surface) continue;
      ctx.strokeStyle = "#6adfff65";
      ctx.lineWidth = 1 + s.flow / 60;
      ctx.beginPath();
      ctx.moveTo(x, y + 8 + s.flow * 0.15);
      ctx.lineTo(x, y);
      ctx.lineTo(x - 3, y + 5);
      ctx.moveTo(x, y);
      ctx.lineTo(x + 3, y + 5);
      ctx.stroke();
    }
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
    if (f.spent && f.flash > 0) {
      const age = 1 - f.flash / 0.45;
      const feverBurst = s.fever > 0 && intense;
      const count = intense ? (feverBurst ? 20 : 5) : 3;
      const radius = 4 + age * (feverBurst ? 46 : 12);
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - age);
      ctx.lineWidth = feverBurst ? 1.8 : 1;
      for (let j = 0; j < count; j++) {
        const angle = j * Math.PI * 2 / count + f.x * 0.03;
        const x = f.x + Math.cos(angle) * radius;
        const y = f.y + Math.sin(angle) * radius + (feverBurst ? age * age * 9 : 0);
        ctx.fillStyle = feverBurst ? `hsl(${j * 360 / count + f.y},100%,76%)` : "#e5ffb0";
        ctx.beginPath();
        ctx.arc(x, y, (feverBurst ? 2.4 : 1.5) * (1 - age * 0.6), 0, Math.PI * 2);
        ctx.fill();
        if (feverBurst) {
          ctx.strokeStyle = ctx.fillStyle;
          ctx.beginPath();
          // Radial comet trails with a slight falling arc, like tiny fireworks.
          const tail = Math.max(3, radius * 0.28);
          ctx.moveTo(x - Math.cos(angle) * tail, y - Math.sin(angle) * tail);
          ctx.lineTo(x, y);
          ctx.moveTo(x - 4, y); ctx.lineTo(x + 4, y);
          ctx.moveTo(x, y - 4); ctx.lineTo(x, y + 4);
          ctx.stroke();
        }
      }
      ctx.beginPath();
      ctx.arc(f.x, f.y, 3 + age * (feverBurst ? 34 : 8), 0, Math.PI * 2);
      ctx.strokeStyle = feverBurst ? "#fff2c8" : "#dbff9d";
      ctx.stroke();
      ctx.restore();
    }
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.spent ? 3 : 4.3, 0, Math.PI * 2);
    ctx.fillStyle = f.flash > 0.2 ? "#edffd0" : f.spent ? "#3b5059" : "#b7e984";
    ctx.fill();
    if (luminous && !f.spent) {
      ctx.strokeStyle = "#24472a";
      ctx.lineWidth = 1.7;
      ctx.stroke();
    }
    if (!f.spent) {
      ctx.fillStyle = "#e5ffb5";
      ctx.fillRect(f.x - 1, f.y - 2, 2, 2);
    }
  }
  for (const r of s.rodSites()) {
    ctx.beginPath();
    ctx.arc(r.x, r.y, C.rodRadius, 0, Math.PI * 2);
    ctx.fillStyle = r.active ? "#10101d" : "#8493a526";
    ctx.fill();
    ctx.strokeStyle = r.active ? "#f49ad1" : "#9ebbd348";
    ctx.lineWidth = r.active ? 1.5 : 0.7;
    ctx.stroke();
    if (r.active) {
      ctx.fillStyle = "#f0b2da";
      ctx.fillRect(r.x - 2, r.y - 2, 4, 4);
    }
  }
  const neutronColors = ["#e52a60", "#e97513", "#ba9300", "#008b52", "#007bc4", "#5749db", "#b824bd"];
  for (const n of s.neutrons) {
    const i = Math.floor((Math.atan2(n.vy, n.vx) + Math.PI) / (Math.PI * 2) * 7) % 7;
    const color = luminous ? neutronColors[i % neutronColors.length] : "#f4ffe5";
    ctx.beginPath();
    ctx.moveTo(n.x - n.vx * 0.065, n.y - n.vy * 0.065);
    ctx.lineTo(n.x, n.y);
    if (luminous) {
      ctx.strokeStyle = "#17304b";
      ctx.lineWidth = 3.8;
      ctx.stroke();
    }
    ctx.strokeStyle = luminous ? color : "#eaffc369";
    ctx.lineWidth = luminous ? 2.2 : 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(n.x, n.y, luminous ? 3 : 1.9, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    if (luminous) {
      ctx.strokeStyle = "#17304b"; ctx.lineWidth = 1.2; ctx.stroke();
    }
  }
  if (s.ended && s.danger >= 100) {
    ctx.fillStyle = "#ff693338";
    ctx.fillRect(-240, -240, 480, 480);
  }
  ctx.restore();
}
