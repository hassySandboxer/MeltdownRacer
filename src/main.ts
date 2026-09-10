import "./style.css";
import { Simulation, type Mode } from "./simulation";
import { C } from "./config";
import { render } from "./rendering";
import { LocalRanking, japanDate, dailySeed } from "./ranking";
import { GameAudio } from "./audio";
const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
document.querySelector("#app")!.innerHTML = `
<header><a class="brand" href="./"><span class="brand-icon">M<span>↗</span></span><div>MELTDOWN<span class="brand-light">RACER</span><small>REACTOR CONTROL / ARCADE EXPERIMENT</small></div></a><div class="header-actions"><span class="local-dot">LOCAL SYSTEM</span><button id="sound" aria-pressed="false">音声 ON</button><button id="help">遊び方</button></div></header>
<main><div class="page-heading"><div><p class="eyebrow">CONTROL ROOM / 01</p><h1>臨界を、乗りこなせ。</h1><p class="intro">連鎖を育て、熱を逃がす。限界の手前が、ハイスコア。</p></div><div class="session"><span id="mode-label">SURVIVAL</span><strong id="clock">00:00</strong><button id="pause" disabled>一時停止</button></div></div>
<section class="score-strip" aria-label="運転成績"><div><label>TOTAL SCORE / 得点</label><strong id="score">000000</strong></div><div><label>NET OUTPUT / 正味出力</label><strong><span id="power">0</span><small>PU</small></strong></div><div><label>ENERGY / 累計発電</label><strong><span id="energy">0.000</span><small>EU</small></strong></div><div class="multiplier"><label>SCORE MULTIPLIER</label><strong id="multiplier">×1.00</strong></div></section>
<div class="game-layout"><section class="reactor-panel"><div class="panel-heading"><span><i class="status-dot"></i> REACTOR CORE</span><span id="state">STANDBY / 待機中</span></div><div class="core-wrap"><canvas id="core" width="560" height="560" aria-label="円形炉。緑の燃料、白い中性子、灰色の使用済み燃料。区画をクリックして補給先を選択。"></canvas><div class="core-tag tag-left">01<br><span>FISSION<br>CHAMBER</span></div><div class="core-tag tag-right">CORE<br><span id="fuel-count">0 CELLS</span></div><div id="overlay" class="overlay"><p class="eyebrow">WELCOME, OPERATOR</p><h2>連鎖反応を<br>あなたの手に。</h2><p>制御棒・冷却水・燃料を操り、<br>長く、熱く、発電を続けよう。</p><div class="mode-select"><button id="survival-mode" class="selected">生存モード</button><button id="daily-mode">日替わり 5分</button></div><button id="start" class="primary">運転を開始 <span>↗</span></button><small id="start-note">失敗するまで続く、生存チャレンジ</small></div></div><div class="legend"><span><i class="fuel-dot"></i>燃料</span><span><i class="neutron-dot"></i>中性子</span><span><i class="spent-dot"></i>使用済み</span><span><i class="rod-dot"></i>制御棒</span></div><div class="fever-track"><div><span id="fever-title">FEVER STANDBY</span><strong id="fever-time">0.0 s</strong></div><div class="track"><i id="fever-bar"></i></div><p id="hint">反応 1.8〜15 / 出力 12 以上を5秒維持でフィーバー</p></div></section>
<aside><section class="panel telemetry"><div class="panel-heading"><span>LIVE TELEMETRY</span><span class="dim">架空のゲーム指標</span></div>${[
  ["reaction", "反応の勢い", "/ s"],
  ["temperature", "炉温", "/ 150"],
  ["waterTemp", "水温", "/ 140"],
  ["water", "水位", "%"],
  ["pressure", "圧力", "/ 150"],
  ["danger", "設備危険度", "%"],
]
  .map(
    ([id, label, unit]) =>
      `<div class="meter ${id}"><div><label>${label}</label><strong id="${id}">0</strong><small>${unit}</small></div><div class="track"><i id="${id}-bar"></i></div></div>`,
  )
  .join("")}</section>
<section class="panel controls"><div class="panel-heading"><span>OPERATOR CONTROLS</span><span class="dim">手動操作</span></div><label class="control-label" for="rods">01 <b>制御棒</b><output id="rods-value">60%</output></label><input id="rods" type="range" min="0" max="100" value="60"><div class="range-caption"><span>引き抜く / 反応 ↑</span><span>挿入 / 反応 ↓</span></div><label class="control-label" for="flow">02 <b>冷却水の流量</b><output id="flow-value">42%</output></label><input id="flow" type="range" min="0" max="100" value="42"><div class="range-caption"><span>低流量 / 省電力</span><span>高流量 / 冷却 ↑</span></div><div class="control-label">03 <b>燃料補給</b><output id="refills">8 回</output></div><div class="sectors" aria-label="補給区画">${["左上", "右上", "左下", "右下"].map((x, i) => `<button data-sector="${i}" class="${i === 0 ? "selected" : ""}" aria-pressed="${i === 0}">${x}<span id="sector-${i}">0 使用済み</span></button>`).join("")}</div><button id="refill" class="refill" disabled>選択区画を補給 <span>↻</span></button><p class="keyboard">A / D 制御棒　 W / S 流量　 R 補給　 Space 停止</p></section></aside></div>
<section class="records panel"><div class="panel-heading"><span>PERSONAL BEST / ローカル記録</span><span class="dim">このブラウザに保存</span></div><div id="records"></div></section><footer><span>MELTDOWNRACER <b>v0.1</b> / LOCAL EDITION</span><span>架空のアーケードゲームです。実在の原子炉を再現するものではありません。</span></footer></main>
<dialog id="help-dialog"><div class="dialog-body"><p class="eyebrow">OPERATOR’S GUIDE</p><h2>熱と連鎖は、別のもの。</h2><p>白い中性子が緑の燃料に当たると、確率で分裂。熱と次の中性子を生みます。灰色の燃料は使用済みです。</p><ol><li><b>制御棒</b>を挿入すると中性子を吸収します。反応を抑えても、蓄積した熱はすぐには消えません。</li><li><b>冷却水</b>で炉温を下げ、水位を回復。ポンプにも電力が必要なため、流量を上げすぎると正味出力が下がります。</li><li><b>区画を選んで補給</b>すると使用済み燃料を交換。8回まで・12秒間隔で使えます。</li><li>反応 1.8〜15、出力 12 以上を5秒維持して<b>フィーバー</b>。安定倍率は最大3倍、高温倍率は最大2倍です。</li><li>炉温105または圧力100を超えると危険度が上昇。100%で設備破裂。開始20秒後から、低反応かつ炉温30未満が10秒続くと低温停止です。</li></ol><p>タブを離れると自動停止します。日替わりは日本時間の日付で共通シードを使用するローカル練習版です。</p><button id="close-help" class="primary">操作室に戻る</button></div></dialog>`;
let mode: Mode = "survival",
  s = new Simulation(7391),
  started = false,
  paused = false,
  selected = 0,
  runDate = japanDate();
const audio = new GameAudio(),
  ranking = new LocalRanking();
const canvas = $<HTMLCanvasElement>("core");
let accumulator = 0,
  last = 0;
const formatTime = (t: number) =>
  `${Math.floor(t / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(t % 60)
    .toString()
    .padStart(2, "0")}`;
function records() {
  const rows = ranking
    .list()
    .filter(
      (r) => r.mode === mode && (mode !== "daily" || r.date === japanDate()),
    )
    .slice(0, 5);
  $("records").innerHTML = rows.length
    ? rows
        .map(
          (r, i) =>
            `<div class="record-row"><span>0${i + 1}</span><strong>${r.score.toLocaleString()}</strong><span>${r.energy.toFixed(3)} EU</span><span>FEVER ${r.fever.toFixed(1)} s</span><span>${formatTime(r.time)}</span></div>`,
        )
        .join("")
    : '<p class="empty-record">まだ記録はありません。最初の運転で、自己ベストを刻もう。</p>';
}
function chooseMode(m: Mode) {
  mode = m;
  $("survival-mode").classList.toggle("selected", m === "survival");
  $("daily-mode").classList.toggle("selected", m === "daily");
  $("start-note").textContent =
    m === "daily"
      ? `${japanDate()} JST・全員共通シード / ローカル練習`
      : "失敗するまで続く、生存チャレンジ";
  $("mode-label").textContent = m === "daily" ? "DAILY / 05:00" : "SURVIVAL";
  records();
}
$("survival-mode").onclick = () => chooseMode("survival");
$("daily-mode").onclick = () => chooseMode("daily");
function start() {
  runDate = japanDate();
  s = new Simulation(
    mode === "daily"
      ? dailySeed(runDate)
      : crypto.getRandomValues(new Uint32Array(1))[0],
    mode,
  );
  started = true;
  paused = false;
  accumulator = 0;
  $("overlay").hidden = true;
  $<HTMLButtonElement>("pause").disabled = false;
  $("pause").textContent = "一時停止";
  audio.start();
  for (const id of ["rods", "flow"])
    $<HTMLInputElement>(id).value = String(s[id as "rods" | "flow"]);
}
$("start").onclick = start;
function togglePause(force?: boolean) {
  if (!started || s.ended) return;
  paused = force ?? !paused;
  accumulator = 0;
  $("pause").textContent = paused ? "再開" : "一時停止";
  $("overlay").hidden = !paused;
  if (paused) {
    $("overlay").innerHTML =
      '<p class="eyebrow">SYSTEM PAUSED</p><h2>ひと息、冷静に。</h2><p>運転時間とシミュレーションは<br>停止しています。</p><button id="resume" class="primary">運転を再開 ↗</button>';
    $("resume").onclick = () => togglePause(false);
  }
}
$("pause").onclick = () => togglePause();
document.addEventListener("visibilitychange", () => {
  if (document.hidden) togglePause(true);
});
$("sound").onclick = () => {
  audio.muted = !audio.muted;
  $("sound").textContent = audio.muted ? "音声 OFF" : "音声 ON";
  $("sound").setAttribute("aria-pressed", String(audio.muted));
};
$("help").onclick = () => {
  if (started && !s.ended) togglePause(true);
  $<HTMLDialogElement>("help-dialog").showModal();
};
$("close-help").onclick = () => $<HTMLDialogElement>("help-dialog").close();
for (const id of ["rods", "flow"] as const)
  $<HTMLInputElement>(id).oninput = () => {
    if (started && !paused && !s.ended)
      s.input({ [id]: Number($<HTMLInputElement>(id).value) });
  };
function selectSector(i: number) {
  selected = i;
  document.querySelectorAll<HTMLButtonElement>("[data-sector]").forEach((b) => {
    b.classList.toggle("selected", Number(b.dataset.sector) === i);
    b.setAttribute("aria-pressed", String(Number(b.dataset.sector) === i));
  });
}
document
  .querySelectorAll<HTMLButtonElement>("[data-sector]")
  .forEach((b) => (b.onclick = () => selectSector(Number(b.dataset.sector))));
canvas.onclick = (e) => {
  const r = canvas.getBoundingClientRect();
  selectSector(
    (e.clientY - r.top >= r.height / 2 ? 2 : 0) +
      (e.clientX - r.left >= r.width / 2 ? 1 : 0),
  );
};
$("refill").onclick = () => {
  if (started && !paused) s.input({ refill: selected });
};
window.addEventListener("keydown", (e) => {
  if (
    $<HTMLDialogElement>("help-dialog").open ||
    (e.target instanceof HTMLElement &&
      ["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName))
  )
    return;
  if (e.code === "Space") {
    if (e.target instanceof HTMLButtonElement) return;
    e.preventDefault();
    togglePause();
    return;
  }
  if (!started || paused || s.ended) return;
  const k = e.key.toLowerCase();
  if (k === "r") s.input({ refill: selected });
  if (k === "a" || k === "d") s.input({ rods: s.rods + (k === "d" ? 5 : -5) });
  if (k === "w" || k === "s") s.input({ flow: s.flow + (k === "w" ? 5 : -5) });
  for (const id of ["rods", "flow"] as const)
    $<HTMLInputElement>(id).value = String(s[id]);
});
function finish() {
  const saved = ranking.save(s, runDate);
  records();
  $<HTMLButtonElement>("pause").disabled = true;
  $("overlay").hidden = false;
  $("overlay").innerHTML =
    `<p class="eyebrow">${s.danger >= 100 ? "CONTAINMENT LOST" : s.mode === "daily" && s.time >= 300 ? "CHALLENGE COMPLETE" : "SESSION COMPLETE"}</p><h2>${Math.floor(s.score).toLocaleString()}<small> POINTS</small></h2><p>${s.reason}</p><div class="result-stats"><span>${s.energy.toFixed(3)} EU<br><small>累計発電</small></span><span>${s.bestFever.toFixed(1)} s<br><small>最長フィーバー</small></span><span>${formatTime(s.time)}<br><small>運転時間</small></span></div><button id="retry" class="primary">もう一度、挑戦する ↗</button><button id="export" class="text-button">リプレイを保存 ↓</button><small>${saved ? "記録をこのブラウザに保存しました" : "保存領域が利用できないため記録は未保存です"}</small>`;
  $("retry").onclick = start;
  $("export").onclick = () => {
    const blob = new Blob(
      [JSON.stringify({ ...s.replay, totalTicks: s.tick }, null, 2)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `meltdown-replay-${s.seed}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
}
function updateUI() {
  $("clock").textContent = formatTime(s.time);
  $("score").textContent = Math.floor(s.score).toString().padStart(6, "0");
  $("power").textContent = s.power.toFixed(0);
  $("energy").textContent = s.energy.toFixed(3);
  $("multiplier").textContent = `×${s.multiplier.toFixed(2)}`;
  for (const id of [
    "reaction",
    "temperature",
    "waterTemp",
    "water",
    "pressure",
    "danger",
  ] as const) {
    $(id).textContent = s[id].toFixed(id === "reaction" ? 1 : 0);
    const max =
      id === "reaction"
        ? 20
        : id === "temperature" || id === "pressure"
          ? 150
          : id === "waterTemp"
            ? 140
            : 100;
    $(id + "-bar").style.width = `${Math.min(100, (s[id] / max) * 100)}%`;
  }
  for (const id of ["rods", "flow"] as const) {
    $(id + "-value").textContent = `${s[id]}%`;
    $<HTMLInputElement>(id).disabled = !started || paused || s.ended;
  }
  $("state").textContent = s.ended
    ? "OFFLINE / 運転終了"
    : paused
      ? "PAUSED / 一時停止"
      : !started
        ? "STANDBY / 待機中"
        : s.danger > 0
          ? "WARNING / 危険域"
          : s.fever
            ? "FEVER / 臨界キープ"
            : s.time < 20
              ? "STARTUP / 立ち上げ"
              : "ONLINE / 運転中";
  document.body.classList.toggle("fever", s.fever > 0 && !s.ended);
  $("fuel-count").textContent = `${s.remainingFuel} / ${s.fuel.length} CELLS`;
  $("fever-title").textContent = s.fever
    ? "FEVER ACTIVE / 臨界キープ"
    : "FEVER STANDBY";
  $("fever-time").textContent = `${s.fever.toFixed(1)} s`;
  $("fever-bar").style.width =
    `${Math.min(100, (s.stable / C.feverSeconds) * 100)}%`;
  $("hint").textContent =
    s.danger > 0
      ? "危険度上昇中：制御棒を挿入し、冷却水を増やそう"
      : s.water < 30
        ? "水位低下：冷却能力が落ちています。流量を増やそう"
        : s.cold > 0
          ? `低温停止まで ${(10 - s.cold).toFixed(1)} 秒：制御棒を引き抜き、燃料を確認`
          : s.fever
            ? "臨界キープ！反応と正味出力を保って倍率アップ"
            : "反応 1.8〜15 / 出力 12 以上を5秒維持でフィーバー";
  $("refills").textContent = `${s.refills} 回`;
  let count = 0;
  for (let i = 0; i < 4; i++) {
    const n = s.fuel.filter((f) => f.sector === i && f.spent).length;
    $("sector-" + i).textContent = `${n} 使用済み`;
    if (i === selected) count = n;
  }
  $<HTMLButtonElement>("refill").disabled =
    !started ||
    paused ||
    s.ended ||
    s.refills === 0 ||
    s.cooldown > 0 ||
    count === 0;
  $("refill").innerHTML =
    s.cooldown > 0
      ? `補給準備中 ${s.cooldown.toFixed(1)} s`
      : `選択区画を補給 <span>↻</span>`;
}
function frame(now: number) {
  const elapsed = Math.min((now - last) / 1000, 0.1);
  last = now;
  if (started && !paused && !s.ended) {
    accumulator += elapsed;
    while (accumulator >= C.dt && !s.ended) {
      s.step();
      accumulator -= C.dt;
      if (s.ended) finish();
    }
    audio.update(s.time, s.fever > 0, s.danger > 0);
  }
  updateUI();
  render(canvas, s, selected);
  requestAnimationFrame(frame);
}
records();
requestAnimationFrame(frame);
