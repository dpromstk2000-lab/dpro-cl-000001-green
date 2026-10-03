(() => {
  "use strict";

  const VERSION = "GREEN-OWNER-SPECIES-LIST-R1.0-20261003";
  if (document.documentElement.dataset.greenOwnerSpeciesList === VERSION) return;
  document.documentElement.dataset.greenOwnerSpeciesList = VERSION;

  const PAGE_SIZE = 25;
  let page = 1;
  let speciesByCode = new Map();
  let observerTimer = null;
  let applying = false;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function activeSpeciesTab() {
    return $('[data-asset-tab="species"]')?.classList.contains("is-active");
  }

  function assetsView() {
    return $('[data-view-panel="assets"]');
  }

  function sharedToolbar() {
    const view = assetsView();
    return view ? Array.from(view.children).find((el) => el.classList?.contains("owner-toolbar")) : null;
  }

  function speciesWrap() {
    return $('[data-asset-table="species"]');
  }

  function speciesRows() {
    return $("#species-rows");
  }

  function ensureStyle() {
    if ($("#green-owner-species-list-style")) return;
    const style = document.createElement("style");
    style.id = "green-owner-species-list-style";
    style.textContent = [
      ".green-species-tools{display:grid;grid-template-columns:minmax(220px,1.7fr) minmax(150px,.8fr) minmax(140px,.7fr) auto;gap:10px;align-items:end;margin:0 0 12px}",
      ".green-species-tools label{display:grid;gap:5px;font-weight:700;color:#315445}",
      ".green-species-tools input,.green-species-tools select{min-height:42px;border:1px solid #cfded5;border-radius:10px;background:#fff;padding:8px 10px;font:inherit;color:#173d2b}",
      ".green-species-pager{display:flex;align-items:center;justify-content:center;gap:10px;padding:14px 0 2px}",
      ".green-species-count{min-width:190px;text-align:center;font-weight:700;color:#315445}",
      ".green-species-page-status{font-weight:700;color:#173d2b}",
      ".green-species-hidden{display:none!important}",
      "@media(max-width:820px){.green-species-tools{grid-template-columns:1fr 1fr}.green-species-tools .green-species-search{grid-column:1/-1}.green-species-tools button{width:100%}.green-species-count{min-width:0}.green-species-pager{flex-wrap:wrap}}"
    ].join("");
    document.head.append(style);
  }

  function ensureUi() {
    const wrap = speciesWrap();
    if (!wrap) return null;

    let tools = $("#green-species-tools");
    if (!tools) {
      tools = document.createElement("div");
      tools.id = "green-species-tools";
      tools.className = "green-species-tools";
      tools.innerHTML =
        '<label class="green-species-search">検索<input id="green-species-search" placeholder="品種コード・植物名・分類"></label>' +
        '<label>分類<select id="green-species-category"><option value="">すべて</option></select></label>' +
        '<label>屋内外<select id="green-species-indoor"><option value="">すべて</option><option value="indoor">屋内</option><option value="outdoor">屋外</option><option value="both">両方</option></select></label>' +
        '<button type="button" class="btn btn--secondary" id="green-species-clear">条件をクリア</button>';
      wrap.parentNode.insertBefore(tools, wrap);
    }

    let pager = $("#green-species-pager");
    if (!pager) {
      pager = document.createElement("div");
      pager.id = "green-species-pager";
      pager.className = "green-species-pager";
      pager.innerHTML =
        '<button type="button" class="btn btn--secondary btn--small" id="green-species-prev">← 前へ</button>' +
        '<span class="green-species-count" id="green-species-count">全0件</span>' +
        '<span class="green-species-page-status" id="green-species-page-status">1 / 1ページ</span>' +
        '<button type="button" class="btn btn--secondary btn--small" id="green-species-next">次へ →</button>';
      wrap.insertAdjacentElement("afterend", pager);
    }

    const header = wrap.querySelector("thead th:nth-child(5)");
    if (header) header.textContent = "対応サイズ";

    return { tools, pager };
  }

  function filteredRows() {
    const tbody = speciesRows();
    if (!tbody) return [];

    const search = ($("#green-species-search")?.value || "").trim().toLowerCase();
    const category = $("#green-species-category")?.value || "";
    const indoor = $("#green-species-indoor")?.value || "";

    return $$("tr", tbody).filter((row) => {
      const cells = row.cells;
      if (!cells || cells.length < 6) return false;
      const code = (cells[0]?.textContent || "").trim();
      const name = (cells[1]?.textContent || "").trim();
      const rowCategory = (cells[2]?.textContent || "").trim();
      const rowIndoorText = (cells[3]?.textContent || "").trim();
      const rowIndoor = rowIndoorText === "屋内" ? "indoor" : rowIndoorText === "屋外" ? "outdoor" : rowIndoorText === "両方" ? "both" : "";

      const hitSearch = !search || [code, name, rowCategory].some((v) => v.toLowerCase().includes(search));
      const hitCategory = !category || rowCategory === category;
      const hitIndoor = !indoor || rowIndoor === indoor;
      return hitSearch && hitCategory && hitIndoor;
    });
  }

  function sizeLabel(item) {
    const sizes = Array.isArray(item?.metadata?.hq_sizes) ? item.metadata.hq_sizes.filter(Boolean) : [];
    if (sizes.length) {
      const order = { L: 1, M: 2, S: 3 };
      return Array.from(new Set(sizes)).sort((a, b) => (order[a] || 9) - (order[b] || 9)).join("・");
    }
    return item?.default_size_code || "指定なし";
  }

  function applySizeLabels() {
    const tbody = speciesRows();
    if (!tbody) return;
    $$("tr", tbody).forEach((row) => {
      if (!row.cells || row.cells.length < 6) return;
      const code = (row.cells[0]?.textContent || "").trim();
      const item = speciesByCode.get(code);
      row.cells[4].textContent = sizeLabel(item);
      row.cells[4].title = item?.metadata?.hq_catalog ? "本社公開カタログ上の対応サイズ" : "登録済みサイズ";
    });
  }

  function escHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function populateCategories() {
    const select = $("#green-species-category");
    if (!select) return;
    const selected = select.value;
    const categories = Array.from(new Set(
      Array.from(speciesByCode.values()).map((item) => item.category).filter(Boolean)
    )).sort((a, b) => String(a).localeCompare(String(b), "ja"));
    select.innerHTML = '<option value="">すべて</option>' + categories.map((v) => '<option value="' + escHtml(v) + '">' + escHtml(v) + '</option>').join("");
    if (categories.includes(selected)) select.value = selected;
  }

  function renderPage(resetPage = false) {
    if (applying) return;
    applying = true;
    try {
      ensureStyle();
      const ui = ensureUi();
      if (!ui) return;

      const speciesActive = activeSpeciesTab();
      ui.tools.hidden = !speciesActive;
      ui.pager.hidden = !speciesActive;
      const shared = sharedToolbar();
      if (shared) shared.hidden = speciesActive;

      if (!speciesActive) return;

      applySizeLabels();

      const tbody = speciesRows();
      if (!tbody) return;
      const allRows = $$("tr", tbody);
      allRows.forEach((row) => row.classList.add("green-species-hidden"));

      const rows = filteredRows();
      if (resetPage) page = 1;
      const total = rows.length;
      const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
      if (page > pages) page = pages;
      if (page < 1) page = 1;

      const start = (page - 1) * PAGE_SIZE;
      const end = Math.min(start + PAGE_SIZE, total);
      rows.slice(start, end).forEach((row) => row.classList.remove("green-species-hidden"));

      const count = $("#green-species-count");
      const status = $("#green-species-page-status");
      const prev = $("#green-species-prev");
      const next = $("#green-species-next");
      if (count) count.textContent = total ? "全" + total + "件／" + (start + 1) + "〜" + end + "件表示" : "該当0件";
      if (status) status.textContent = page + " / " + pages + "ページ";
      if (prev) prev.disabled = page <= 1;
      if (next) next.disabled = page >= pages;
    } finally {
      applying = false;
    }
  }

  async function refreshSpeciesData() {
    if (!window.Green?.api) {
      renderPage();
      return;
    }
    try {
      const result = await window.Green.api("/api/admin/plant-species");
      const items = result?.data?.items || [];
      speciesByCode = new Map(items.map((item) => [item.species_code, item]));
      populateCategories();
    } catch (_) {
      speciesByCode = new Map();
    }
    renderPage();
  }

  function bindOnce() {
    if (document.documentElement.dataset.greenOwnerSpeciesListBound === VERSION) return;
    document.documentElement.dataset.greenOwnerSpeciesListBound = VERSION;

    document.addEventListener("click", (event) => {
      const tab = event.target.closest?.("[data-asset-tab]");
      if (tab) setTimeout(() => renderPage(true), 0);

      if (event.target.closest?.("#green-species-prev")) {
        page -= 1;
        renderPage();
      }
      if (event.target.closest?.("#green-species-next")) {
        page += 1;
        renderPage();
      }
      if (event.target.closest?.("#green-species-clear")) {
        const search = $("#green-species-search");
        const category = $("#green-species-category");
        const indoor = $("#green-species-indoor");
        if (search) search.value = "";
        if (category) category.value = "";
        if (indoor) indoor.value = "";
        renderPage(true);
      }
    });

    document.addEventListener("input", (event) => {
      if (event.target?.id === "green-species-search") renderPage(true);
    });

    document.addEventListener("change", (event) => {
      if (["green-species-category","green-species-indoor"].includes(event.target?.id)) renderPage(true);
    });

    const tbody = speciesRows();
    if (tbody) {
      const observer = new MutationObserver(() => {
        clearTimeout(observerTimer);
        observerTimer = setTimeout(refreshSpeciesData, 80);
      });
      observer.observe(tbody, { childList: true });
    }
  }

  function boot() {
    ensureStyle();
    ensureUi();
    bindOnce();
    refreshSpeciesData();
    renderPage();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(boot, 0), { once: true });
  } else {
    setTimeout(boot, 0);
  }
})();
