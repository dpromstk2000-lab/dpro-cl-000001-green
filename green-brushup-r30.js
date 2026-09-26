(() => {
  "use strict";

  const VERSION = "GREEN-BRUSHUP-R30-20260916";
  const OWNER_PATH = /\/owner\.html$/;
  const MEMBER_PATH = /\/member\.html$/;
  const Green = window.Green;

  const HEADQUARTERS_LABELS = {
    unconfirmed: "未確認",
    checking: "確認中",
    confirmed: "確認済み",
    not_required: "本部確認不要",
    rejected: "確認不可",
  };

  const FREQUENCY_LABELS = {
    weekly: "毎週",
    biweekly: "隔週",
    monthly: "毎月",
    every_n_weeks: "指定週ごと",
    every_n_months: "指定月ごと",
    custom: "個別設定",
  };

  const SERVICE_LABELS = {
    regular_rental: "定期レンタル",
    site_check: "現地確認",
    photo_consultation: "写真相談",
    plant_addition: "植物追加",
    spot_event: "スポット・イベント",
    maintenance: "メンテナンス",
    pickup_disposal: "引取り・処分",
    other: "その他",
  };

  const assetContext = {
    customers: [],
    sites: [],
    assets: [],
    customerMap: new Map(),
    siteMap: new Map(),
    assetByCode: new Map(),
    loading: null,
  };

  function customerName(customer) {
    return customer?.company_name || customer?.contact_name || "顧客名未設定";
  }

  function installStyle() {
    if (document.getElementById("green-brushup-r30-style")) return;
    const style = document.createElement("style");
    style.id = "green-brushup-r30-style";
    style.textContent = `
      .green-brushup-customer-cell{min-width:170px}
      .green-brushup-customer-cell strong{display:block;color:#173d32;font-weight:800;line-height:1.35}
      .green-brushup-customer-cell small{display:block;margin-top:3px;color:#667b71;font-size:11px;line-height:1.35}
      .green-brushup-customer-cell.is-unlinked strong{color:#7b8781}
      .green-brushup-filter-count{display:block;margin-top:4px;color:#6a7e74;font-size:11px;font-weight:600}
      .green-brushup-overdue{background:#fff1cf!important;color:#7a5611!important}
      .green-brushup-note{color:#51675d}
      @media(max-width:900px){.green-brushup-customer-cell{min-width:145px}}
    `;
    document.head.append(style);
  }

  function isOwnerReady() {
    const app = document.getElementById("owner-app");
    return Boolean(app && !app.hidden && Green?.api);
  }

  async function refreshAssetContext() {
    if (!isOwnerReady()) return false;
    if (assetContext.loading) return assetContext.loading;
    assetContext.loading = (async () => {
      try {
        const [customerResult, siteResult, assetResult] = await Promise.all([
          Green.api("/api/admin/customers?limit=500"),
          Green.api("/api/admin/sites?limit=500"),
          Green.api("/api/admin/assets?type=plant&limit=500"),
        ]);
        assetContext.customers = customerResult.data?.items || [];
        assetContext.sites = siteResult.data?.items || [];
        assetContext.assets = assetResult.data?.plants || [];
        assetContext.customerMap = new Map(assetContext.customers.map((item) => [item.id, item]));
        assetContext.siteMap = new Map(assetContext.sites.map((item) => [item.id, item]));
        assetContext.assetByCode = new Map(assetContext.assets.map((item) => [String(item.asset_code || "").trim(), item]));
        populateCustomerFilter();
        decoratePlantTable();
        return true;
      } catch {
        return false;
      } finally {
        assetContext.loading = null;
      }
    })();
    return assetContext.loading;
  }

  function installCustomerFilter() {
    const panel = document.querySelector('[data-view-panel="assets"]');
    const toolbar = panel?.querySelector(".owner-toolbar");
    if (!toolbar || document.getElementById("asset-customer-filter")) return;

    const label = document.createElement("label");
    label.dataset.greenBrushupCustomerFilter = VERSION;
    label.innerHTML = `顧客<select id="asset-customer-filter" aria-label="顧客で植物資産を絞り込み"><option value="">すべての顧客</option></select><small id="asset-customer-filter-count" class="green-brushup-filter-count"></small>`;
    const locationSelect = toolbar.querySelector("#asset-location");
    const locationLabel = locationSelect?.closest("label");
    const searchButton = toolbar.querySelector('[data-load="assets"]');
    toolbar.insertBefore(label, locationLabel || searchButton || null);
    label.querySelector("select").addEventListener("change", applyAssetCustomerFilter);
  }

  function populateCustomerFilter() {
    installCustomerFilter();
    const select = document.getElementById("asset-customer-filter");
    if (!select) return;
    const selected = select.value;
    const usedCustomerIds = new Set();
    for (const asset of assetContext.assets) {
      const site = assetContext.siteMap.get(asset.current_site_id);
      if (site?.customer_id) usedCustomerIds.add(site.customer_id);
    }
    const customers = assetContext.customers
      .filter((item) => usedCustomerIds.has(item.id))
      .sort((a, b) => customerName(a).localeCompare(customerName(b), "ja"));
    select.innerHTML = `<option value="">すべての顧客</option>${customers.map((item) => `<option value="${String(item.id).replace(/"/g, "&quot;")}">${customerName(item).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</option>`).join("")}`;
    if ([...select.options].some((option) => option.value === selected)) select.value = selected;
  }

  function ensureCustomerHeader(table) {
    const row = table?.querySelector("thead tr");
    if (!row || row.querySelector('[data-green-brushup="customer-header"]')) return;
    const th = document.createElement("th");
    th.dataset.greenBrushup = "customer-header";
    th.textContent = "顧客・拠点";
    row.insertBefore(th, row.children[2] || null);
  }

  function decoratePlantTable() {
    const table = document.querySelector('[data-asset-table="plants"] table');
    const tbody = document.getElementById("plant-asset-rows");
    if (!table || !tbody) return;
    ensureCustomerHeader(table);

    [...tbody.children].forEach((row) => {
      if (!(row instanceof HTMLTableRowElement)) return;
      const emptyCell = row.querySelector("td[colspan]");
      if (emptyCell) {
        emptyCell.colSpan = 8;
        return;
      }
      const code = row.querySelector(".owner-code-badge")?.textContent?.trim() || "";
      const asset = assetContext.assetByCode.get(code);
      const site = asset ? assetContext.siteMap.get(asset.current_site_id) : null;
      const customer = site ? assetContext.customerMap.get(site.customer_id) : null;
      row.dataset.greenCustomerId = customer?.id || "";

      let cell = row.querySelector('[data-green-brushup="customer-cell"]');
      if (!cell) {
        cell = document.createElement("td");
        cell.dataset.greenBrushup = "customer-cell";
        row.insertBefore(cell, row.children[2] || null);
      }
      cell.className = `green-brushup-customer-cell${customer ? "" : " is-unlinked"}`;
      if (customer) {
        const name = customerName(customer);
        cell.innerHTML = `<strong></strong><small></small>`;
        cell.querySelector("strong").textContent = name;
        cell.querySelector("small").textContent = site?.site_name || "拠点名未設定";
      } else {
        cell.innerHTML = `<strong>顧客未紐付け</strong><small>${asset?.current_location_type === "customer_site" ? "拠点情報を確認してください" : "倉庫・養生・移動中など"}</small>`;
      }
    });
    applyAssetCustomerFilter();
  }

  function applyAssetCustomerFilter() {
    const select = document.getElementById("asset-customer-filter");
    const tbody = document.getElementById("plant-asset-rows");
    if (!select || !tbody) return;
    const selected = select.value;
    let visible = 0;
    let total = 0;
    [...tbody.querySelectorAll(":scope > tr")].forEach((row) => {
      if (row.querySelector("td[colspan]")) return;
      total += 1;
      const show = !selected || row.dataset.greenCustomerId === selected;
      row.hidden = !show;
      if (show) visible += 1;
    });
    const count = document.getElementById("asset-customer-filter-count");
    if (count) count.textContent = selected ? `${visible}件を表示` : `${total}件`;
  }

  function parseDateText(text) {
    const match = String(text || "").match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
    if (!match) return "";
    const [, y, m, d] = match;
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  function todayJst() {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  }

  function polishOwnerVisits() {
    const tbody = document.getElementById("visit-rows");
    if (!tbody) return;
    const today = todayJst();
    [...tbody.querySelectorAll(":scope > tr")].forEach((row) => {
      const dateText = row.children[1]?.querySelector(".owner-row-title")?.textContent || row.children[1]?.textContent || "";
      const date = parseDateText(dateText);
      const chip = row.children[5]?.querySelector(".owner-status");
      if (date && date < today && chip?.textContent?.trim() === "未開始") {
        chip.textContent = "予定日経過";
        chip.classList.add("green-brushup-overdue");
        chip.title = "過去日ですが完了記録がない予定です。必要に応じて状態を確認してください。";
      }
    });
  }

  function localizeOwnerDialog() {
    const dialog = document.getElementById("owner-dialog");
    if (!dialog?.hasAttribute("open")) return;
    const kicker = dialog.querySelector("#dialog-kicker")?.textContent?.trim();
    if (kicker !== "SERVICE STATUS") return;

    dialog.querySelectorAll(".owner-detail-item").forEach((item) => {
      const label = item.querySelector("small")?.textContent?.trim();
      const value = item.querySelector("strong");
      if (label === "本部確認" && value) {
        const raw = value.textContent.trim();
        if (HEADQUARTERS_LABELS[raw]) value.textContent = HEADQUARTERS_LABELS[raw];
      }
    });

    dialog.querySelectorAll(".owner-dialog-section").forEach((section) => {
      const title = section.querySelector("h3")?.textContent?.trim();
      if (title === "訪問ルール") {
        section.querySelectorAll(".owner-mini-item").forEach((item) => {
          const text = item.textContent.trim();
          const match = text.match(/^([^／]+)(／.*)?$/);
          if (match && FREQUENCY_LABELS[match[1]]) item.textContent = `${FREQUENCY_LABELS[match[1]]}${match[2] || ""}`;
        });
      }
      if (title === "対象サービス") {
        const empty = section.querySelector(".owner-empty");
        if (empty) {
          const message = "基本作業内容に沿って運用中です。個別サービス項目は必要に応じて追加できます。";
          if (empty.textContent.trim() !== message) empty.textContent = message;
          empty.classList.add("green-brushup-note");
        }
        section.querySelectorAll(".owner-mini-item").forEach((item) => {
          const text = item.textContent.trim();
          const match = text.match(/^([^｜]+)(｜.*)?$/);
          if (match && SERVICE_LABELS[match[1]]) item.textContent = `${SERVICE_LABELS[match[1]]}${match[2] || ""}`;
        });
      }
    });
  }

  function initOwner() {
    installStyle();
    installCustomerFilter();

    const assetButton = document.querySelector('[data-view="assets"]');
    assetButton?.addEventListener("click", () => setTimeout(refreshAssetContext, 80));

    const plantBody = document.getElementById("plant-asset-rows");
    if (plantBody) {
      new MutationObserver(() => {
        setTimeout(() => {
          refreshAssetContext();
          decoratePlantTable();
        }, 30);
      }).observe(plantBody, { childList: true });
    }

    const visitBody = document.getElementById("visit-rows");
    if (visitBody) new MutationObserver(() => setTimeout(polishOwnerVisits, 20)).observe(visitBody, { childList: true });

    const dialog = document.getElementById("owner-dialog");
    if (dialog) new MutationObserver(() => setTimeout(localizeOwnerDialog, 10)).observe(dialog, { attributes: true, childList: true, subtree: true, attributeFilter: ["open"] });

    refreshAssetContext();
    polishOwnerVisits();
    localizeOwnerDialog();
    document.documentElement.dataset.greenBrushupR30 = VERSION;
  }

  function polishMemberContracts() {
    const content = document.getElementById("tab-content");
    if (!content) return;
    content.querySelectorAll("li").forEach((item) => {
      if (item.textContent.trim() === "対象内容は準備中です。") {
        item.textContent = "基本作業内容に沿ってサービスをご利用いただいています。";
        item.classList.add("green-brushup-note");
      }
    });
  }

  function polishMemberVisits() {
    const content = document.getElementById("tab-content");
    if (!content) return;
    const today = todayJst();
    content.querySelectorAll(".timeline-item").forEach((item) => {
      const dateText = item.querySelector(".timeline-meta span:first-child")?.textContent || "";
      const date = parseDateText(dateText);
      const chip = item.querySelector(".timeline-meta .status-chip");
      if (date && date < today && chip?.textContent?.trim() === "未開始") {
        chip.textContent = "予定日経過";
        chip.classList.add("green-brushup-overdue");
        chip.title = "過去の訪問予定です。実施状況は事業者へご確認ください。";
      }
    });
  }

  function polishMember() {
    polishMemberContracts();
    polishMemberVisits();
  }

  function initMember() {
    installStyle();
    const content = document.getElementById("tab-content");
    if (content) new MutationObserver(() => setTimeout(polishMember, 10)).observe(content, { childList: true, subtree: true });
    polishMember();
    document.documentElement.dataset.greenBrushupR30 = VERSION;
  }

  function bootOwnerWhenReady() {
    if (isOwnerReady()) {
      initOwner();
      return;
    }
    const observer = new MutationObserver(() => {
      if (isOwnerReady()) {
        observer.disconnect();
        initOwner();
      }
    });
    observer.observe(document.body, { attributes: true, childList: true, subtree: true, attributeFilter: ["hidden"] });
  }

  if (OWNER_PATH.test(location.pathname)) bootOwnerWhenReady();
  if (MEMBER_PATH.test(location.pathname)) initMember();
})();
