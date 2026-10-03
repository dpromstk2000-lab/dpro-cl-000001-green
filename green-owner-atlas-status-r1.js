(() => {
  "use strict";

  const VERSION = "GREEN-OWNER-ATLAS-STATUS-R1.2-METADATA-20261004";
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

  const READY_STATUSES = new Set(["ready_pilot", "ready_generated"]);
  let speciesStatusByCode = new Map();
  let modelStatusByCode = new Map();
  let statusLoaded = false;

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

  function itemStatus(code, kind) {
    const apiStatus = kind === "species"
      ? speciesStatusByCode.get(code)
      : modelStatusByCode.get(code);
    if (apiStatus) return apiStatus;

    const pilot = kind === "species" ? PILOT_SPECIES.has(code) : PILOT_MODELS.has(code);
    return pilot ? "ready_pilot" : "pending_generation";
  }

  function addBadge(row, kind) {
    if (!row?.cells || row.cells.length < 2) return;

    const code = (row.cells[0]?.textContent || "").trim();
    if (!code) return;

    // 画像付き一覧本体の描画完了後だけ処理する。
    const host = row.cells[1].querySelector(".green-atlas-name-text");
    if (!host) return;

    const status = itemStatus(code, kind);
    const ready = READY_STATUSES.has(status);
    const text = status === "ready_pilot"
      ? "図鑑PILOT済"
      : ready
        ? "図鑑画像済"
        : "画像準備中";
    const cls = ready ? "green-atlas-status-fix--ready" : "green-atlas-status-fix--pending";

    let badge = host.querySelector(".green-atlas-status-fix");
    if (!badge) {
      badge = document.createElement("span");
      host.append(badge);
    }

    const className = `green-atlas-status-fix ${cls}`;
    if (badge.className !== className) badge.className = className;
    if (badge.textContent !== text) badge.textContent = text;
    badge.dataset.atlasImageStatus = status;
    badge.title = status === "ready_pilot"
      ? "代表画像と図鑑PILOT情報を準備済み"
      : status === "ready_generated"
        ? "代表画像を準備済み"
        : "代表画像を順次準備中";
  }

  function decorate() {
    $$("#species-rows tr").forEach((row) => addBadge(row, "species"));
    $$("#container-model-rows tr").forEach((row) => addBadge(row, "models"));
  }

  async function refreshStatuses() {
    if (statusLoaded || !window.Green?.api) return;
    try {
      const [speciesResult, modelResult] = await Promise.all([
        window.Green.api("/api/admin/plant-species"),
        window.Green.api("/api/admin/container-models")
      ]);

      const species = speciesResult?.data?.items || [];
      const models = modelResult?.data?.items || [];

      speciesStatusByCode = new Map(
        species
          .map((item) => [item?.species_code, item?.metadata?.atlas_image_status])
          .filter(([code, status]) => Boolean(code && status))
      );
      modelStatusByCode = new Map(
        models
          .map((item) => [item?.model_code, item?.metadata?.atlas_image_status])
          .filter(([code, status]) => Boolean(code && status))
      );
      statusLoaded = true;
      decorate();
    } catch (_) {
      // API取得に失敗した場合は既存PILOT判定へ安全にフォールバックする。
    }
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

    // Green APIの準備順差を吸収し、metadata statusを正本として取得する。
    [0, 300, 1000, 2500].forEach((ms) => {
      setTimeout(() => { void refreshStatuses(); }, ms);
    });

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
