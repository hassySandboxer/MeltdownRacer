import { Simulation } from "./simulation";
import { clamp } from "./config";

export const maryMarkup = `<div id="mary-companion" class="mary-companion" data-mood="idle" role="img" aria-label="計器を眺める作業員メアリ">
  <div class="mary-caption" aria-hidden="true">ふむふむ…</div>
  <div class="mary-stage" aria-hidden="true"><div class="mary-sprite"></div><span class="mary-cheer">♪ ✦</span></div>
  <div class="mary-console" aria-hidden="true">${["発電", "炉温", "圧力"].map((label, i) => `<div class="mary-dial"><svg viewBox="0 0 60 48"><path d="M9 35 A24 24 0 1 1 51 35" fill="#fffaf1" stroke="#94aabf" stroke-width="4"/><path d="M40 6 A24 24 0 0 1 54 24" fill="none" stroke="#ef92ab" stroke-width="4"/><path d="M10 24h5 M19 9l3 5 M40 9l-3 5 M49 24h-5" stroke="#9889a5" stroke-width="2"/><g class="mary-needle" data-dial="${i}"><path d="M30 28V10" stroke="#82649e" stroke-width="3" stroke-linecap="round"/></g><circle cx="30" cy="28" r="4" fill="#e799b7"/></svg><span>${label}</span></div>`).join("")}</div>
</div>`;

export function updateMary(el: HTMLElement, s: Simulation, paused: boolean, intense: boolean) {
  // Danger takes priority over celebration; ended runs settle down.
  const mood = s.ended ? "rest" : s.danger >= 40 ? "panic" : s.fever > 0 ? "fever" : "idle";
  const caption = s.ended ? "おつかれさま…" : mood === "panic" ? "あわわ！冷やして〜" : mood === "fever" ? "発電さいこー！" : "ふむふむ…";
  if (el.dataset.mood !== mood || !el.dataset.ready) {
    el.dataset.mood = mood;
    el.dataset.ready = "true";
    el.querySelector(".mary-caption")!.textContent = caption;
    el.setAttribute("aria-label", `作業員メアリ：${caption}`);
  }
  el.classList.toggle("mary-still", !intense || s.ended);
  el.classList.toggle("mary-paused", paused);
  const values = [Math.max(0, s.power) / 200, s.temperature / 150, s.pressure / 150];
  el.querySelectorAll<SVGElement>(".mary-needle").forEach((needle, i) => {
    needle.style.setProperty("--dial-angle", `${-120 + clamp(values[i], 0, 1) * 240}deg`);
  });
}
