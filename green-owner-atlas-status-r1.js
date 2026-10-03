(() => {
  "use strict";

  const VERSION = "GREEN-OWNER-ATLAS-STATUS-R1.1-DOM-FIX-20261004";
  if (document.documentElement.dataset.greenOwnerAtlasStatusFix === VERSION) return;
  document.documentElement.dataset.greenOwnerAtlasStatusFix = VERSION;

  const PILOT_SPECIES = new Set([
    "SP-PACHIRA-001",
    "SP-GP-0066",
    "SP-GP-0067",
    "SP-GP-0034",
    "SP-GP-0059",
    "SP-GP-0056",
    "SP-GP-0011",
    "SP-GP-0017",
    "SP-GP-0008",
    "SP-GP-0016"
  ]);

  const PILOT_MODELS = new Set([
    "CM-GP-0002",
    "CM-GP-0005",
    "CM-GP-0011",
    "CM-GP-0019",
    "CM-GP-0022"
  ]);

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function ensureStyle() {
    if ($("#green-owner-atlas-status-fix-style")) return;
    const style = document.createElement("style");
    style.id = "green-owner-atlas-status-fix-style";
    style.textContent = [
      ".green-atlas-status-fix{display:inline-flex;align-items:center;width:max-content;margin-top:4px;border-radius:999px;padding:2px 7px;font-size:10px;font-weight:800;line-height:1.45;white-space:nowrap}",
      ".green-atlas-status-fix--ready{background:#e6f3ea;color:#176744;border:1px solid #c8e3d1}",
      ".green-atlas-status-fix--pending{background:#fff7df;color:#80620a;border:1px solid #eadcaa}"
    ].join("");
    document.head.append(style);
  }

  function addBadge(row, kind) {
    if (!row?.cells || row.cells.length < 2) return;

    const code = (row.cells[0]?.textContent || "").trim();
    if (!code) return;

    // 画像付き一覧本体の描画完了後だけ処理する。
    const host = row.cells[1].querySelector(".green-atlas-name-text");
    if (!host) return;

    const pilot = kind === "species" ? PILOT_SPECIES.has(code) : PILOT_MODELS.has(code);
    const text = pilot ? "図鑑PILOT済" : "画像準備中";
    const cls = pilot ? "green-atlas-status-fix--ready" : "green-atlas-status-fix--pending";

    let badge = host.querySelector(".green-atlas-status-fix");
    if (!badge) {
      badge = document.createElement("span");
      host.append(badge);
    }

    const className = `green-atlas-status-fix ${cls}`;
    if (badge.className !== className) badge.className = className;
    if (badge.textContent !== text) badge.textContent = text;
    badge.title = pilot
      ? "代表画像と図鑑PILOT情報を準備済み"
      : "代表画像を順次準備中";
  }

  function decorate() {
    $$("#species-rows tr").forEach((row) => addBadge(row, "species"));
    $$("#container-model-rows tr").forEach((row) => addBadge(row, "models"));
  }

  let timer = null;
  function schedule(delay = 80) {
    clearTimeout(timer);
    timer = setTimeout(decorate, delay);
  }

  function boot() {
    ensureStyle();

    // 初期描画・遅延描画の双方を拾う。
    [0, 80, 200, 500, 1000, 1800].forEach((ms) => setTimeout(decorate, ms));

    const target = document.querySelector('[data-view-panel="assets"]') || document.body;
    const observer = new MutationObserver(() => schedule(100));
    observer.observe(target, { childList: true, subtree: true });

    // タブ切替・検索・ページ送り後にも再適用。
    document.addEventListener("click", (event) => {
      if (event.target.closest?.(
        '[data-asset-tab], #green-species-prev, #green-species-next, #green-model-prev, #green-model-next, #green-species-clear, #green-model-clear'
      )) {
        schedule(160);
      }
    });

    document.addEventListener("input", (event) => {
      if (["green-species-search", "green-model-search"].includes(event.target?.id)) schedule(120);
    });

    document.addEventListener("change", (event) => {
      if ([
        "green-species-category", "green-species-indoor",
        "green-model-type", "green-model-source"
      ].includes(event.target?.id)) schedule(120);
    });

    // 念のため初期15秒だけ定期再確認。描画順の違いを吸収する。
    let count = 0;
    const interval = setInterval(() => {
      decorate();
      count += 1;
      if (count >= 10) clearInterval(interval);
    }, 1500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(boot, 0), { once: true });
  } else {
    setTimeout(boot, 0);
  }
})();
