import "./style.css";
import { Simulation, type Mode } from "./simulation";
import { C } from "./config";
import { render } from "./rendering";
import { drawEffects, drawPlant } from "./effects";
import { LocalRanking, japanDate, dailySeed } from "./ranking";
import { GameAudio, musicScene } from "./audio";
import { maryMarkup, updateMary } from "./mary";
const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
document.querySelector("#app")!.innerHTML = `
<header><a class="brand" href="./"><span class="brand-orbit">♥</span><span class="pop-logo"><small>どきどき<span>☆</span></small>メルトダウン</span></a><div class="header-actions"><span class="local-dot">LOCAL SYSTEM</span><button id="sound" aria-pressed="false">音声 ON</button><button id="records-open">記録</button><button id="effects" aria-pressed="true">演出 ON</button><button id="help">?</button></div></header>
<main><div class="page-heading"><div><p class="eyebrow">CONTROL ROOM / 01</p><h1>かわいく発電。油断でドカン。</h1><p class="intro">連鎖を育て、熱を逃がす。限界の手前が、ハイスコア。</p></div><div class="session"><span id="mode-label">SURVIVAL</span><strong id="clock">00:00</strong><button id="speed" disabled title="シミュレーションを早送り">▶ ×1</button><button id="pause" disabled>停止</button></div></div>
<section class="score-strip" aria-label="運転成績"><div><label>TOTAL SCORE / 得点</label><strong id="score">000000</strong></div><div><label>NET OUTPUT / 正味出力</label><strong><span id="power">0</span><small>PU</small></strong></div><div><label>ENERGY / 累計発電</label><strong><span id="energy">0.000</span><small>EU</small></strong></div><div class="multiplier"><label>SCORE MULTIPLIER</label><strong id="multiplier">×1.00</strong></div></section>
<div class="game-layout"><section class="reactor-panel"><div class="panel-heading"><span><i class="status-dot"></i> REACTOR CORE</span><span id="state">STANDBY / 待機中</span></div><div class="core-wrap"><canvas id="core" width="560" height="560" aria-label="円形炉。緑の燃料、白い中性子、灰色の使用済み燃料。区画をクリックして補給先を選択。"></canvas>${maryMarkup}<div class="core-tag tag-left">01<br><span>FISSION<br>CHAMBER</span></div><div class="core-tag tag-right">CORE<br><span id="fuel-count">0 CELLS</span></div><div id="ready" class="ready-call" role="status" hidden></div><div id="overlay" class="overlay"><p class="eyebrow">SWEET LOOKS. SERIOUS REACTOR.</p><h2 class="title-logo"><small>どきどき<span>☆</span></small>メルトダウン</h2><div class="mascot" aria-hidden="true">◕‿◕<span>♥</span></div><p>めざせ臨界フィーバー！<br>かわいい顔して、冷却はシビア。</p><div class="mode-select"><button id="survival-mode" class="selected">生存モード</button><button id="daily-mode">日替わり 5分</button><button id="endless-mode">∞ ショップ</button></div><button id="start" class="primary">運転を開始 <span>↗</span></button><small id="start-note">失敗するまで続く、生存チャレンジ</small></div></div><div class="plant"><canvas id="plant" aria-label="冷却水槽、水流、蒸気配管と発電タービン"></canvas><div class="plant-readout"><span id="cooling-info"></span><span id="pump-info"></span></div></div><div class="legend"><span><i class="fuel-dot"></i>燃料</span><span><i class="neutron-dot"></i>中性子</span><span><i class="spent-dot"></i>使用済み</span><span><i class="rod-dot"></i>制御棒</span></div></section>
<aside><section class="panel telemetry"><div class="fever-track"><div><span id="fever-title">FEVER STANDBY</span><strong id="fever-time">0.0 s</strong></div><div class="track"><i id="fever-bar"></i></div><p id="hint">反応 1.8〜15 / 出力 12 以上を5秒維持でフィーバー</p></div><div class="panel-heading"><span>LIVE TELEMETRY</span><span class="dim">架空のゲーム指標</span></div>${[
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
<section class="panel controls"><div class="panel-heading"><span>OPERATOR CONTROLS</span><span class="dim">手動操作</span></div><div class="rod-heading"><b>制御棒の挿入数</b><output id="rods-value">50%</output></div><input id="rods" type="range" min="0" max="100" value="50" aria-label="制御棒の挿入数"><p class="rod-note" id="rod-count">32 / 64 本・4本ずつ均等に挿入</p><label class="control-label" for="flow">02 <b>冷却水の流量</b><output id="flow-value">42%</output></label><input id="flow" type="range" min="0" max="100" value="42"><div class="range-caption"><span>低流量 / 省電力</span><span>高流量 / 冷却 ↑</span></div><div class="control-label"><b>燃料補給</b><output id="refills">残り 8 / 8 回</output></div><p class="refill-rule">1回で選択区画の灰色燃料を交換・12秒間隔</p><div class="sectors" aria-label="補給区画">${["左上", "右上", "左下", "右下"].map((x, i) => `<button data-sector="${i}" class="${i === 0 ? "selected" : ""}" aria-pressed="${i === 0}">${x}<span id="sector-${i}">0 使用済み</span></button>`).join("")}</div><button id="refill" class="refill" disabled>選択区画を補給 <span>↻</span></button><div id="shop-panel" class="shop-panel" hidden><div><b>⚡ ねんりょう屋さん</b><output id="credits">0 ⚡</output></div><button id="buy-fuel" disabled>補給券 +1　120 ⚡</button><small>1 EU → 1,000 ⚡・購入ごとに +15 ⚡</small><p id="shop-message" role="status">発電で貯めて、補給券を買おう！</p></div><p class="keyboard">A / D 制御棒　 W / S 流量　 R 補給　 Space 停止</p></section></aside></div>
<dialog id="records-dialog"><button id="records-close">閉じる</button><section class="records panel"><div class="panel-heading"><span>PERSONAL BEST / ローカル記録</span><span class="dim">このブラウザに保存</span></div><div id="records"></div></section></dialog><footer><span>MELTDOWNRACER <b>v0.4</b> / LOCAL EDITION</span><span>架空のアーケードゲームです。実在の原子炉を再現するものではありません。</span></footer></main>
<canvas id="fx" aria-hidden="true"></canvas><dialog id="help-dialog"><div class="dialog-body"><p class="eyebrow">OPERATOR’S GUIDE</p><h2>熱と連鎖は、別のもの。</h2><p>白い中性子が緑の燃料に当たると、確率で分裂。熱と次の中性子を生みます。灰色の燃料は使用済みです。</p><ol><li><b>制御棒</b>は炉内に均等配置された64個の吸収点です。スライダーで0〜100%を選ぶと、上下左右の対称な4本組で挿入されます。黒い丸が挿入中、薄い丸が未挿入。A/Dキーでも操作できます。挿入すると中性子を吸収します。反応を抑えても、蓄積した熱はすぐには消えません。</li><li><b>冷却水</b>で炉温を下げ、水位を回復。ポンプにも電力が必要なため、流量を上げすぎると正味出力が下がります。</li><li><b>区画を選んで補給</b>すると使用済み燃料を交換。8回まで・12秒間隔で使えます。</li><li>反応 1.8〜15、出力 12 以上を5秒維持して<b>フィーバー</b>。安定倍率は最大3倍、高温倍率は最大2倍です。</li><li>炉温105または圧力100を超えると危険度が上昇。100%で設備破裂。開始20秒後から、低反応かつ炉温30未満が10秒続くと低温停止です。</li></ol><p>∞ショップモードは終了時間なし。発電1 EUごとに1,000⚡を獲得し、初回120⚡で区画補給券を1枚購入できます。購入するたびに15⚡ずつ値上がりします（120 → 135 → 150…）。新しい運転では初回価格に戻ります。補給の12秒待ち・過熱・低温停止は残ります。累計発電量やスコアは買い物で減りません。</p><p>▶ ×1ボタンで2倍・4倍・8倍の早送り。温度・反応・得点すべて同じ速度で進みます。燃料が減った後の待ち時間にも使えます。演出ボタンで強い光と揺れを抑えられます。</p><p>タブを離れると自動停止します。日替わりは日本時間の日付で共通シードを使用するローカル練習版です。</p><button id="close-help" class="primary">操作室に戻る</button></div></dialog>`;
// Keep a single set of controls and move only the fever panel on narrow screens.
const header = document.querySelector("header")!;
const actions = document.querySelector(".header-actions")!;
header.insertBefore(document.querySelector("h1")!, actions);
header.insertBefore(document.querySelector(".session")!, actions);
document.querySelector(".page-heading")!.remove();
const topInstruments = document.createElement("div");
topInstruments.className = "top-instruments";
const scoreStrip = document.querySelector(".score-strip")!;
scoreStrip.before(topInstruments);
topInstruments.append(scoreStrip);
const feverPanel = document.querySelector(".fever-track")!;
const mobileLayout = matchMedia("(max-width: 700px)");
function placeFever() {
  if (mobileLayout.matches) document.querySelector(".telemetry")!.prepend(feverPanel);
  else topInstruments.append(feverPanel);
}
mobileLayout.addEventListener("change", placeFever);
placeFever();
let mode: Mode = "survival",
  s = new Simulation(7391),
  started = false,
  paused = false,
  selected = 0,
  runDate = japanDate();
let plantMotion = 0;
let readyRemaining = 0;
let speed = 1,
  blastStart = -1,
  resultShown = false;
let intense = !matchMedia("(prefers-reduced-motion: reduce)").matches;
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
  $("survival-mode")?.classList.toggle("selected", m === "survival");
  $("daily-mode")?.classList.toggle("selected", m === "daily");
  $("endless-mode")?.classList.toggle("selected", m === "endless");
  document.body.classList.toggle("endless", m === "endless");
  $("shop-panel").hidden = m !== "endless";
  if ($("start-note")) $("start-note").textContent =
    m === "daily"
      ? `${japanDate()} JST・全員共通シード / ローカル練習`
      : m === "endless"
        ? "発電でお買い物！補給を買い足して長く運転"
        : "失敗するまで続く、生存チャレンジ";
  $("mode-label").textContent =
    m === "daily"
      ? "DAILY / 05:00"
      : m === "endless"
        ? "ENDLESS ∞"
        : "SURVIVAL";
  records();
}
$("survival-mode").onclick = () => chooseMode("survival");
$("daily-mode").onclick = () => chooseMode("daily");
$("endless-mode").onclick = () => chooseMode("endless");
function start() {
  runDate = japanDate();
  s = new Simulation(
    mode === "daily"
      ? dailySeed(runDate)
      : crypto.getRandomValues(new Uint32Array(1))[0],
    mode,
  );
  started = true;
  readyRemaining = 2;
  $("overlay").classList.remove("result");
  paused = false;
  accumulator = 0;
  speed = 1;
  plantMotion = 0;
  blastStart = -1;
  resultShown = false;
  $("overlay").hidden = true;
  $<HTMLButtonElement>("pause").disabled = false;
  $("pause").textContent = "一時停止";
  audio.start();
  $("shop-message").textContent = "発電で貯めて、補給券を買おう！";
  syncControls();
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
function syncControls() {
  $<HTMLInputElement>("rods").value = String(s.rods);
  $<HTMLInputElement>("flow").value = String(s.flow);
}
$<HTMLInputElement>("rods").oninput = () => {
  if (started && !paused && !s.ended && readyRemaining <= 0)
    s.input({ rods: Number($<HTMLInputElement>("rods").value) });
};
$("buy-fuel").onclick = () => {
  if (!started || paused || s.ended || readyRemaining > 0) return;
  if (s.input({ buyFuel: true }))
    $("shop-message").textContent = "補給券を購入！区画を選んで使ってね。";
};
$<HTMLInputElement>("flow").oninput = () => {
  if (started && !paused && !s.ended && readyRemaining <= 0)
    s.input({ flow: Number($<HTMLInputElement>("flow").value) });
};
$("speed").onclick = () => {
  speed = speed === 8 ? 1 : speed * 2;
};
$("effects").onclick = () => {
  intense = !intense;
};
$("records-open").onclick = () => {
  togglePause(true);
  records();
  $<HTMLDialogElement>("records-dialog").showModal();
};
$("records-close").onclick = () =>
  $<HTMLDialogElement>("records-dialog").close();
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
  if (started && !paused && readyRemaining <= 0) s.input({ refill: selected });
};
window.addEventListener("keydown", (e) => {
  if (
    document.querySelector("dialog[open]") ||
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
  if (!started || paused || s.ended || readyRemaining > 0) return;
  const k = e.key.toLowerCase();
  if (k === "r") s.input({ refill: selected });
  if (k === "a" || k === "d") s.input({ rods: s.rods + (k === "d" ? 5 : -5) });
  if (k === "w" || k === "s") s.input({ flow: s.flow + (k === "w" ? 5 : -5) });
  syncControls();
});
function finish() {
  $("overlay").classList.add("result");
  const saved = ranking.save(s, runDate);
  records();
  $<HTMLButtonElement>("pause").disabled = true;
  $("overlay").hidden = false;
  $("overlay").innerHTML =
    `<p class="eyebrow">${s.danger >= 100 ? "CONTAINMENT LOST" : s.mode === "daily" && s.time >= 300 ? "CHALLENGE COMPLETE" : "SESSION COMPLETE"}</p><h2>${Math.floor(s.score).toLocaleString()}<small> POINTS</small></h2><p>${s.reason}</p><div class="result-stats"><span>${s.energy.toFixed(3)} EU<br><small>累計発電</small></span><span>${s.bestFever.toFixed(1)} s<br><small>最長フィーバー</small></span><span>${formatTime(s.time)}<br><small>運転時間</small></span></div><label class="next-mode-label" for="next-mode">次の運転モード</label><select id="next-mode"><option value="survival">生存モード</option><option value="daily">日替わり 5分</option><option value="endless">∞ ショップ</option></select><button id="retry" class="primary">もう一度、挑戦する ↗</button><button id="export" class="text-button">リプレイを保存 ↓</button><small>${saved ? "記録をこのブラウザに保存しました" : "保存領域が利用できないため記録は未保存です"}</small>`;
  $<HTMLSelectElement>("next-mode").value = s.mode;
  $("retry").onclick = () => {
    chooseMode($<HTMLSelectElement>("next-mode").value as Mode);
    start();
  };
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
  const level = Math.max(0, Math.min(5, s.multiplier - 1));
  const multiplier = $("multiplier");
  multiplier.style.setProperty("--boost", String(1 + level * 0.07));
  multiplier.style.setProperty("--hop", `${2 + level * 1.8}px`);
  multiplier.style.setProperty("--bounce-duration", `${900 - level * 60}ms`);
  multiplier.classList.toggle("bouncing", started && !s.ended && intense && level > 0);
  multiplier.style.animationPlayState = paused ? "paused" : "running";
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
  $("rods-value").textContent = s.rods + "%";
  $<HTMLInputElement>("rods").disabled = !started || paused || s.ended || readyRemaining > 0;
  const rodCount = s.rodSites().filter((r) => r.active).length;
  $("rod-count").textContent = rodCount + " / 64 本・4本ずつ均等に挿入";
  $("buy-fuel").textContent = `補給券 +1　${s.fuelPrice} ⚡`;
  $("credits").textContent = Math.floor(s.credits) + " ⚡";
  $<HTMLButtonElement>("buy-fuel").disabled =
    !started || paused || s.ended || readyRemaining > 0 || s.credits < s.fuelPrice;
  $("flow-value").textContent = s.flow + "%";
  $<HTMLInputElement>("flow").disabled = !started || paused || s.ended || readyRemaining > 0;
  $("speed").textContent = "▶ ×" + speed;
  $<HTMLButtonElement>("speed").disabled = !started || s.ended;
  $("effects").textContent = intense ? "演出 ON" : "演出 OFF";
  $("effects").setAttribute("aria-pressed", String(intense));
  $("cooling-info").textContent =
    "水位 " + Math.round(s.water) + "% · 流量 " + s.flow + "%";
  $("pump-info").textContent =
    "ポンプ −" + (3 + s.flow * 0.38).toFixed(0) + " PU";
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
  document.body.classList.toggle("fever", s.fever > 0 && !s.ended && !paused);
  document.body.classList.toggle("gentle", !intense);
  $("fuel-count").textContent = `${s.remainingFuel} / ${s.fuel.length} CELLS`;
  $("fever-title").textContent = s.ended
    ? "SESSION COMPLETE"
    : s.fever
      ? "FEVER ACTIVE / 臨界キープ"
      : "FEVER STANDBY";
  $("fever-time").textContent = `${s.fever.toFixed(1)} s`;
  $("fever-bar").style.width =
    `${Math.min(100, (s.stable / C.feverSeconds) * 100)}%`;
  $("hint").textContent = s.ended
    ? s.reason
    : s.danger > 0
      ? "危険度上昇中：制御棒を挿入し、冷却水を増やそう"
      : s.water < 30
        ? "水位低下：冷却能力が落ちています。流量を増やそう"
        : s.cold > 0
          ? `低温停止まで ${(10 - s.cold).toFixed(1)} 秒：制御棒を引き抜き、燃料を確認`
          : s.fever
            ? "臨界キープ！反応と正味出力を保って倍率アップ"
            : "反応 1.8〜15 / 出力 12 以上を5秒維持でフィーバー";
  $("refills").textContent =
    s.mode === "endless"
      ? `補給券 ${s.refills} 枚`
      : `残り ${s.refills} / ${C.refills} 回`;
  let count = 0;
  for (let i = 0; i < 4; i++) {
    const n = s.fuel.filter((f) => f.sector === i && f.spent).length;
    $("sector-" + i).textContent = `${n} 使用済み`;
    if (i === selected) count = n;
  }
  $<HTMLButtonElement>("refill").disabled =
    !started ||
    readyRemaining > 0 ||
    paused ||
    s.ended ||
    s.refills === 0 ||
    s.cooldown > 0 ||
    count === 0;
  $("refill").innerHTML =
    s.refills === 0
      ? s.mode === "endless"
        ? "補給券をショップで購入してね"
        : "補給終了：8回使用済み"
      : s.cooldown > 0
        ? `補給準備中 ${s.cooldown.toFixed(1)} s`
        : `選択区画を補給 <span>↻</span>`;
}
function frame(now: number) {
  let feverFissions = 0;
  const elapsed = Math.min((now - last) / 1000, 0.1);
  last = now;
  if (started && !paused && !s.ended && readyRemaining > 0) {
    readyRemaining = Math.max(0, readyRemaining - elapsed);
  }
  $("ready").hidden = readyRemaining <= 0 || paused;
  $("ready").textContent = readyRemaining > 0.65 ? "よーい…" : "スタート！";
  $("ready").classList.toggle("go", readyRemaining <= 0.65);
  if (started && !paused && !s.ended && readyRemaining <= 0) {
    accumulator += elapsed * speed;
    while (accumulator >= C.dt && !s.ended) {
      const beforeFissions = s.fissions;
      s.step();
      if (s.fever > 0) feverFissions += s.fissions - beforeFissions;
      accumulator -= C.dt;
      if (s.ended) {
        if (s.danger >= 100) {
          blastStart = now;
          audio.explode();
        } else {
          finish();
          resultShown = true;
        }
      }
    }
  }
  audio.update(
    musicScene(s),
    started && !paused && !document.hidden && readyRemaining <= 0,
    blastStart < 0 || now - blastStart > 1200,
  );
  if (!s.ended) audio.feverFission(feverFissions);
  updateUI();
  updateMary($("mary-companion"), s, paused, intense);
  render(canvas, s, selected, intense, plantMotion);
  if (started && !paused && !s.ended && readyRemaining <= 0) plantMotion += elapsed;
  drawPlant($<HTMLCanvasElement>("plant"), s, plantMotion, intense);
  drawEffects(
    $<HTMLCanvasElement>("fx"),
    s,
    blastStart < 0 ? -1 : (now - blastStart) / 1000,
    intense,
    paused,
  );
  if (blastStart >= 0 && !resultShown && now - blastStart > 3000) {
    finish();
    resultShown = true;
  }
  requestAnimationFrame(frame);
}
records();
requestAnimationFrame(frame);
