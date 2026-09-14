import { Simulation } from "./simulation";

export const maryMarkup = `<div id="mary-companion" class="mary-companion" data-mood="idle" role="img" aria-label="計器を眺める作業員メアリ">
  <div class="mary-stage" aria-hidden="true"><div class="mary-sprite"></div><span class="soot-puff"></span><span class="soot-puff second"></span><span class="mary-cheer">♪ ✦</span></div>
  <div class="mary-caption" aria-hidden="true">ふむふむ…</div>
</div>`;

export function updateMary(el: HTMLElement, s: Simulation, paused: boolean, intense: boolean) {
  // Danger takes priority over celebration; ended runs settle down.
  const mood = s.ended ? (s.danger >= 100 ? "soot" : "rest") : s.danger >= 40 ? "panic" : s.fever > 0 ? "fever" : "idle";
  const caption = mood === "soot" ? "ケホッ…ケホケホ…" : s.ended ? "おつかれさま…" : mood === "panic" ? "あわわ！冷やして〜" : mood === "fever" ? "発電さいこー！" : "ふむふむ…";
  if (el.dataset.mood !== mood || !el.dataset.ready) {
    el.dataset.mood = mood;
    el.dataset.ready = "true";
    el.querySelector(".mary-caption")!.textContent = caption;
    el.setAttribute("aria-label", `作業員メアリ：${caption}`);
  }
  el.classList.toggle("mary-still", !intense || (s.ended && mood !== "soot"));
  el.classList.toggle("mary-paused", paused);
}
