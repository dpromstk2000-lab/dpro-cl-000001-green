(() => {
  "use strict";

  const VERSION = "GREEN-OWNER-ATLAS-STATUS-R1.0-20261003";
  if (document.documentElement.dataset.greenOwnerAtlasStatus === VERSION) return;
  document.documentElement.dataset.greenOwnerAtlasStatus = VERSION;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  let speciesByCode = new Map();
  let modelByCode = new Map();
  let timer = null;

  function ensureStyle() {
    if ($("#green-owner-atlas-status-style")) return;
    const style = document.createElement("style");
    style.id = "green-owner-atlas-status-style";
    style.textContent = [
      ".green-atlas-status{display:inline-flex;align-items:center;margin-top:4px;border-radius:999px;padding:2px 7px;font-size:10px;font-weight:800;line-height:1.45;white-space:nowrap}",
      ".green-atlas-status--ready{background:#e6f3ea;color:#176744;border:1px solid #c8e3d1}",
      ".green-atlas-status--pending{background:#fff7df;color:#80620a;border:1px solid #eadcaa}",
      ".green-atlas-status--partial{background:#eef4f1;color:#45675a;border:1px solid #d5e1da}"
    ].join("");
    document.head.append(style);
  }

  function statusFor(item) {
    const meta = item?.metadata || {};
    const image = meta.atlas_image_status || "";
    const content = meta.atlas_content_status || "";
    if (image === "ready_pilot" && content === "ready_pilot") {
      return { text: "図鑑PILOT済", cls: "green-atlas-status--ready" };
    }
    if (image === "ready_pilot") {
      return { text: "画像PILOT済", cls: "green-atlas-status--partial" };
    }
    if (content === "ready_pilot") {
      return { text: "説明PILOT済", cls: "green-atlas-status--partial" };
    }
    return { text: "画像準備中", cls: "green-atlas-status--pending" };
  }

  function putBadge(row, item) {
    if (!row || !item || !row.cells || row.cells.length < 2) return;
    const host = row.cells[1].querySelector(".green-atlas-name-text") || row.cells[1];
    const info = statusFor(item);
    let badge = host.querySelector(".green-atlas-status");
    if (!badge) {
      badge = document.createElement("span");
      badge.className = "green-atlas-status";
      host.append(badge);
    }
    const nextClass = `green-atlas-status ${info.cls}`;
    if (badge.className !== nextClass) badge.className = nextClass;
    if (badge.textContent !== info.text) badge.textContent = info.text;
    const file = item?.metadata?.atlas_generation_file || "";
    badge.title = file ? `図鑑画像: ${file}` : info.text;
  }

  function decorate() {
    $$("#species-rows tr").forEach((row) => {
      const code = (row.cells?.[0]?.textContent || "").trim();
      putBadge(row, speciesByCode.get(code));
    });
    $$("#container-model-rows tr").forEach((row) => {
      const code = (row.cells?.[0]?.textContent || "").trim();
      putBadge(row, modelByCode.get(code));
    });
  }

  async function refresh() {
    if (!window.Green?.api) {
      setTimeout(refresh, 250);
      return;
    }
    try {
      const [speciesResult, modelResult] = await Promise.all([
        window.Green.api("/api/admin/plant-species"),
        window.Green.api("/api/admin/container-models")
      ]);
      const species = speciesResult?.data?.items || [];
      const models = modelResult?.data?.items || [];
      speciesByCode = new Map(species.map((item) => [item.species_code, item]));
      modelByCode = new Map(models.map((item) => [item.model_code, item]));
      decorate();
    } catch (_) {
      // Owner本体の表示は止めない。次の画面更新で再試行する。
    }
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      decorate();
      refresh();
    }, 120);
  }

  function bind() {
    document.addEventListener("click", (event) => {
      if (event.target.closest?.('[data-asset-tab], #green-species-prev, #green-species-next, #green-model-prev, #green-model-next')) {
        schedule();
      }
    });
    const root = document.querySelector('[data-view-panel="assets"]') || document.body;
    const observer = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(decorate, 80);
    });
    observer.observe(root, { childList: true, subtree: true });
  }

  function boot() {
    ensureStyle();
    bind();
    refresh();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(boot, 0), { once: true });
  } else {
    setTimeout(boot, 0);
  }
})();
