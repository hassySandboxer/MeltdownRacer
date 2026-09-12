import { Simulation } from "./simulation";

export const maryMarkup = `<div id="mary-companion" class="mary-companion" data-mood="idle" role="img" aria-label="計器を眺める作業員メアリ">
  <div class="mary-caption" aria-hidden="true">ふむふむ…</div>
  <div class="mary-stage" aria-hidden="true"><div class="mary-sprite"></div><span class="mary-cheer">♪ ✦</span></div>

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
}
