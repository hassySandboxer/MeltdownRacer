// Text stays selectable and readable at any screen size; reuse the game's Mary artwork.
export const tutorialMarkup = `
<div class="comic-heading"><p class="eyebrow">メアリと覚える！</p><h2 id="help-title">４コマでわかる遊び方</h2><p>かわいく発電。油断でドカン。</p></div>
<ol class="tutorial-comic">
<li class="comic-panel comic-power"><span class="comic-number" aria-hidden="true">1</span><h3>制御棒と水量を調整して発電しよう！</h3><div class="comic-scene" aria-hidden="true"><div class="comic-props"><b>⚡ 発電！</b><div class="comic-slider">制御棒 <i></i></div><div class="comic-slider water-slider">水の流量 <i></i></div></div><div class="comic-mary"></div><span class="comic-speech">いい感じに調整♪</span></div><p>制御棒で反応を調整。冷却水の流量を上げると炉が冷え、水位も回復するよ。</p></li>
<li class="comic-panel comic-fuel"><span class="comic-number" aria-hidden="true">2</span><h3>燃料はどんどん減る。補給しよう！</h3><div class="comic-scene" aria-hidden="true"><div class="comic-props"><b>ぱちっ！</b><div class="comic-pellets"><i></i><span>→ ✧ →</span><i class="used"></i></div><strong class="comic-refill">補給 ↻</strong></div><div class="comic-mary"></div><span class="comic-speech">灰色になったら交換！</span></div><p>分裂した燃料は灰色の使用済みに。区画を選んで「補給」で交換しよう。</p></li>
<li class="comic-panel comic-fever"><span class="comic-number" aria-hidden="true">3</span><h3>フィーバーで一気にスコアアップ！</h3><div class="comic-scene" aria-hidden="true"><div class="comic-props"><b>FEVER!</b><strong class="comic-score">×2 → ×3!</strong><span>✦ ★ ✧ ★ ✦</span></div><div class="comic-mary"></div><span class="comic-speech">発電さいこー！</span></div><p>反応と出力を安定させてフィーバー突入！キープして高得点を狙おう。</p></li>
<li class="comic-panel comic-boom"><span class="comic-number" aria-hidden="true">4</span><h3>でも炉温と水量に注意！大爆発するよ！</h3><div class="comic-scene" aria-hidden="true"><div class="comic-props"><b>ドカーン！</b><strong>炉温 ↑　水位 ↓</strong><span>危険度 100%…！</span></div><div class="comic-mary"></div><span class="comic-speech">ケホケホ…油断した〜</span></div><p>炉温・圧力が高いと危険度が上昇。制御棒と冷却で、爆発する前に落ち着かせよう！</p></li>
</ol>`;
export const TUTORIAL_KEY = "meltdown-tutorial-seen-v1";
