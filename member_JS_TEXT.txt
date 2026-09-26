(() => {
  "use strict";
  const { api, uploadPhoto, compressImage, uuid, setCsrfToken, formatDate, formatTime, statusLabel, toast, setBusy, renderError } = window.Green;
  const config = window.GREEN_CONFIG;
  const loginPanel = document.querySelector("#login-panel");
  const portal = document.querySelector("#portal");
  const globalError = document.querySelector("#global-error");
  const content = document.querySelector("#tab-content");
  let overview = null;
  let currentTab = "home";

  async function initialize() {
    bindEvents();
    try {
      const session = await api("/api/member/session");
      setCsrfToken(session.data.csrfToken);
      await enterPortal();
    } catch {
      loginPanel.hidden = false;
    }
  }

  function bindEvents() {
    document.querySelector("#demo-login").addEventListener("click", demoLogin);
    document.querySelector("#line-login").addEventListener("click", lineLogin);
    document.querySelector("#logout").addEventListener("click", logout);
    document.querySelectorAll("[data-tab]").forEach((button) => button.addEventListener("click", () => openTab(button.dataset.tab)));
  }

  async function demoLogin() {
    const button = document.querySelector("#demo-login");
    setBusy(button, true, "確認中…");
    globalError.hidden = true;
    try {
      const customerNumber = document.querySelector("#demo-customer-number").value.trim() || config.DEMO_CUSTOMER_NUMBER;
      const response = await api("/api/member/login", {
        method: "POST",
        json: { mode: "demo", facilityCode: config.FACILITY_CODE, token: config.DEMO_MEMBER_TOKEN, customerNumber },
      });
      setCsrfToken(response.data.csrfToken);
      await enterPortal();
    } catch (error) {
      renderError(globalError, error);
    } finally {
      setBusy(button, false);
    }
  }

  async function lineLogin() {
    const button = document.querySelector("#line-login");
    setBusy(button, true, "LINE確認中…");
    globalError.hidden = true;
    try {
      if (!config.LIFF_ID || !window.liff) throw new Error("LIFF IDはまだ設定されていません。デモ表示をご利用ください。");
      await liff.init({ liffId: config.LIFF_ID });
      if (!liff.isLoggedIn()) {
        liff.login({ redirectUri: location.href });
        return;
      }
      const idToken = liff.getIDToken();
      if (!idToken) throw new Error("LINE IDトークンを取得できませんでした。");
      const response = await api("/api/member/login", { method: "POST", json: { mode: "line", facilityCode: config.FACILITY_CODE, idToken } });
      setCsrfToken(response.data.csrfToken);
      await enterPortal();
    } catch (error) {
      renderError(globalError, error);
    } finally {
      setBusy(button, false);
    }
  }

  async function enterPortal() {
    loginPanel.hidden = true;
    portal.hidden = false;
    await loadOverview();
    await openTab("home");
  }

  async function logout() {
    try { await api("/api/member/logout", { method: "POST", json: {} }); } catch { /* clear UI anyway */ }
    setCsrfToken(null);
    overview = null;
    portal.hidden = true;
    loginPanel.hidden = false;
  }

  async function loadOverview() {
    const response = await api("/api/member/overview");
    overview = response.data;
    const name = overview.customer.companyName || overview.customer.contactName;
    document.querySelector("#member-name").textContent = name;
    document.querySelector("#member-number").textContent = overview.customer.customerNumber;
    document.querySelector("#next-visit-count").textContent = overview.nextVisits.length;
    document.querySelector("#site-count").textContent = overview.sites.length;
    document.querySelector("#issue-count").textContent = overview.activeIssues.length;
    applyFeatureVisibility();
  }

  function applyFeatureVisibility() {
    const features = overview.features || {};
    document.querySelector('[data-tab="contracts"]').hidden = !features.use_customer_contract_view;
    document.querySelector('[data-tab="reports"]').hidden = !features.use_customer_report_page;
    document.querySelector('[data-tab="requests"]').hidden = !(features.use_visit_change_request || features.use_additional_service_request);
  }

  async function openTab(tab) {
    currentTab = tab;
    document.querySelectorAll("[data-tab]").forEach((button) => button.classList.toggle("is-active", button.dataset.tab === tab));
    content.innerHTML = '<div class="loading-panel"><span class="spinner"></span>読み込み中…</div>';
    try {
      if (tab === "home") renderHome();
      if (tab === "contracts") await renderContracts();
      if (tab === "plants") await renderPlants();
      if (tab === "visits") await renderVisits();
      if (tab === "reports") await renderReports();
      if (tab === "replacements") await renderReplacements();
      if (tab === "requests") renderRequests();
    } catch (error) {
      content.innerHTML = `<div class="alert alert-error">${escapeHtml(error.message)}${error.requestId ? `（確認番号：${escapeHtml(error.requestId)}）` : ""}</div>`;
    }
  }

  function renderHome() {
    const visits = overview.nextVisits.map((visit) => card(`次回 ${formatDate(visit.planned_date)}`, `${formatTime(visit.planned_time_from)}〜 ${escapeHtml(visit.planned_work || "定期メンテナンス")}`, statusLabel(visit.status))).join("") || empty("現在、表示できる次回訪問予定はありません。");
    const reports = overview.latestReports.map((report) => card(report.title, formatDate(report.published_at), "作業報告")).join("") || empty("公開済みの作業報告はまだありません。");
    const issues = overview.activeIssues.map((issue) => card(issue.issue_type, issue.description, statusLabel(issue.status))).join("") || empty("対応中のご相談はありません。");
    content.innerHTML = `
      <section class="portal-section"><div class="section-heading"><div><p class="eyebrow">NEXT VISIT</p><h2>次回の訪問</h2></div></div><div class="card-grid">${visits}</div></section>
      <section class="portal-section"><div class="section-heading"><div><p class="eyebrow">LATEST REPORT</p><h2>最近の作業報告</h2></div></div><div class="card-grid">${reports}</div></section>
      <section class="portal-section"><div class="section-heading"><div><p class="eyebrow">IN PROGRESS</p><h2>対応中のご相談</h2></div></div><div class="card-grid">${issues}</div></section>`;
  }

  async function renderContracts() {
    const response = await api("/api/member/contracts");
    const itemsByContract = groupBy(response.data.items, "contract_id");
    const html = response.data.contracts.map((contract) => {
      const items = (itemsByContract[contract.id] || []).map((item) => `<li>${escapeHtml(item.service_type)}・${item.quantity}点${item.work_content ? `／${escapeHtml(item.work_content)}` : ""}</li>`).join("");
      return `<article class="detail-card"><div class="detail-card-head"><div><span class="status-chip">${statusLabel(contract.status)}</span><h3>${escapeHtml(contract.contract_number)}</h3></div><span>${formatDate(contract.start_date)}〜</span></div><p>${escapeHtml(contract.default_work_content || "作業内容は確認中です。")}</p><ul class="plain-list">${items || "<li>対象内容は準備中です。</li>"}</ul></article>`;
    }).join("") || empty("表示できるご利用内容はありません。");
    content.innerHTML = `<section class="portal-section"><div class="section-heading"><div><p class="eyebrow">SERVICE</p><h2>ご利用内容</h2></div></div><div class="stack">${html}</div></section>`;
  }

  async function renderPlants() {
    const response = await api("/api/member/installations");
    const speciesMap = Object.fromEntries(response.data.species.map((row) => [row.id, row]));
    const assetMap = Object.fromEntries(response.data.assets.map((row) => [row.id, row]));
    const installationMap = Object.fromEntries(response.data.installations.map((row) => [row.id, row]));
    const assetCards = response.data.assetItems.map((item) => {
      const asset = assetMap[item.plant_asset_id] || {};
      const species = speciesMap[asset.species_id] || {};
      return plantCard(species.common_name || asset.display_name || "植物", asset.size_code, asset.condition_code, item.placement_note, installationMap[item.installation_id]);
    });
    const countCards = response.data.countItems.map((item) => {
      const species = speciesMap[item.species_id] || {};
      return plantCard(species.common_name || "植物", item.size_code, "good", `${item.active_quantity}鉢・${item.placement_note || "設置中"}`, installationMap[item.installation_id]);
    });
    content.innerHTML = `<section class="portal-section"><div class="section-heading"><div><p class="eyebrow">GREEN ASSETS</p><h2>設置中の植物</h2></div></div><div class="plant-grid">${[...assetCards, ...countCards].join("") || empty("設置中の植物はまだ登録されていません。")}</div></section>`;
  }

  async function renderVisits() {
    const response = await api("/api/member/visits");
    const rows = response.data.visits.map((visit) => `<article class="timeline-item"><div class="timeline-dot"></div><div><div class="timeline-meta"><span>${formatDate(visit.planned_date)}</span><span class="status-chip">${statusLabel(visit.status)}</span></div><h3>${escapeHtml(visit.planned_work || "定期メンテナンス")}</h3><p>${formatTime(visit.planned_time_from)}〜${visit.planned_time_to ? formatTime(visit.planned_time_to) : "時間未定"}</p>${visit.customer_visible_note ? `<p class="note">${escapeHtml(visit.customer_visible_note)}</p>` : ""}</div></article>`).join("") || empty("訪問履歴はまだありません。");
    content.innerHTML = `<section class="portal-section"><div class="section-heading"><div><p class="eyebrow">VISITS</p><h2>訪問予定・履歴</h2></div></div><div class="timeline">${rows}</div></section>`;
  }

  async function renderReports() {
    const response = await api("/api/member/reports");
    const photosByReport = groupBy(response.data.photos, "reportId");
    const rows = response.data.reports.map((report) => {
      const photos = (photosByReport[report.maintenance_report_id] || []).filter((photo) => photo.url).map((photo) => `<img class="report-photo" src="${escapeAttribute(photo.url)}" alt="${escapeAttribute(photo.caption || report.title)}" loading="lazy">`).join("");
      const publicItems = report.public_work_items || {};
      const bulkLabels = { watering:"給水", leaf_cleaning:"葉清掃", pruning:"剪定", dead_leaf_removal:"枯葉除去", pot_area_cleaning:"鉢周辺清掃", position_adjustment:"向き・位置調整", soil_fertilizer_check:"土・肥料確認", pest_check:"害虫確認", disease_check:"病気確認", container_check:"鉢・カバー確認", other:"その他" };
      const bulkItems = Array.isArray(publicItems.bulkWorkKeys) ? publicItems.bulkWorkKeys.map((key) => `<li>${escapeHtml(bulkLabels[key] || key)}</li>`) : [];
      const detailItems = Array.isArray(publicItems.items) ? publicItems.items.map((item) => `<li>${escapeHtml(item.note || item.workKey || "植物状態を確認")}</li>`) : [];
      const legacyItems = Array.isArray(publicItems) ? publicItems.map((item) => `<li>${escapeHtml(typeof item === "string" ? item : item.label || item.work || "作業")}</li>`) : [];
      const workItems = [...bulkItems, ...detailItems, ...legacyItems].join("");
      return `<article class="report-card"><div class="report-card-head"><div><span>${formatDate(report.published_at)}</span><h3>${escapeHtml(report.title)}</h3></div><span class="status-chip">公開済み</span></div><p>${escapeHtml(report.public_comment)}</p>${workItems ? `<ul class="plain-list">${workItems}</ul>` : ""}${photos ? `<div class="report-photo-grid">${photos}</div>` : ""}</article>`;
    }).join("") || empty("公開済みの作業報告はまだありません。");
    content.innerHTML = `<section class="portal-section"><div class="section-heading"><div><p class="eyebrow">REPORTS</p><h2>作業報告</h2></div></div><div class="stack">${rows}</div></section>`;
  }


  async function renderReplacements() {
    const response = await api("/api/member/replacements");
    const photosByRequest = groupBy(response.data.photos, "replacementRequestId");
    const statusLabels = { replaced:"交換済み", recovered:"回収済み", returned_to_warehouse:"帰庫済み", care_required:"養生中", reusable:"再利用可能", disposed:"処理済み", returned:"返却済み" };
    const rows = response.data.items.map((item) => {
      const oldName = item.oldAsset?.displayName || item.oldAsset?.speciesName || item.oldAsset?.assetCode || "交換前植物";
      const newName = item.newAsset?.displayName || item.newAsset?.speciesName || item.newAsset?.assetCode || "代替植物";
      const photos = (photosByRequest[item.id] || []).filter((photo) => photo.url).map((photo) => `<img class="report-photo" src="${escapeAttribute(photo.url)}" alt="${escapeAttribute(photo.caption || "植物交換写真")}" loading="lazy">`).join("");
      return `<article class="report-card"><div class="report-card-head"><div><span>${formatDate(item.updatedAt)}</span><h3>${escapeHtml(item.site?.site_name || "設置場所")}の植物交換</h3></div><span class="status-chip">${escapeHtml(statusLabels[item.status] || item.status)}</span></div><p>${escapeHtml(item.customerComment || item.reason || "植物の状態に合わせて交換対応を行いました。")}</p><div class="replacement-flow"><span>${escapeHtml(oldName)}</span><strong>→</strong><span>${escapeHtml(newName)}</span></div>${photos ? `<div class="report-photo-grid">${photos}</div>` : ""}</article>`;
    }).join("") || empty("公開できる交換履歴はまだありません。");
    content.innerHTML = `<section class="portal-section"><div class="section-heading"><div><p class="eyebrow">REPLACEMENTS</p><h2>植物の交換履歴</h2></div></div><div class="stack">${rows}</div></section>`;
  }

  function renderRequests() {
    const contractOptions = overview.activeContracts.map((contract) => `<option value="${escapeAttribute(contract.id)}">${escapeHtml(contract.contract_number)}（${statusLabel(contract.status)}）</option>`).join("");
    const siteOptions = overview.sites.map((site) => `<option value="${escapeAttribute(site.id)}">${escapeHtml(site.site_name)}</option>`).join("");
    content.innerHTML = `
      <section class="portal-section"><div class="section-heading"><div><p class="eyebrow">CONTACT</p><h2>植物・訪問のご相談</h2></div></div>
        <div class="request-grid">
          <form id="issue-form" class="request-card"><h3>植物の異常を相談</h3><label>対象拠点<select name="siteId"><option value="">選択しない</option>${siteOptions}</select></label><label>状態<select name="conditionCode"><option value="observe">少し気になる</option><option value="replacement_candidate">交換を相談したい</option><option value="pest_found">虫が見える</option><option value="disease_suspected">病気のように見える</option><option value="damaged">破損している</option></select></label><label>相談内容<textarea name="description" rows="5" required minlength="5"></textarea></label><label>写真<input name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple></label><button class="button button-primary" type="submit">相談を送る</button><div class="inline-error" hidden></div></form>
          <form id="change-form" class="request-card"><h3>訪問日時・利用内容の変更相談</h3><label>対象<select name="contractId" required><option value="">選択してください</option>${contractOptions}</select></label><label>希望日<input name="preferredDate" type="date"></label><label>相談内容<textarea name="requestText" rows="5" required minlength="5"></textarea></label><button class="button button-primary" type="submit">変更相談を送る</button><div class="inline-error" hidden></div></form>
          <form id="additional-form" class="request-card"><h3>植物追加・スポット対応</h3><label>相談区分<select name="inquiryCategory"><option value="plant_addition">植物を追加したい</option><option value="spot_event">スポット利用を相談</option><option value="maintenance">メンテナンスを相談</option><option value="pickup_disposal">引取り・処分を相談</option><option value="other">その他</option></select></label><label>希望本数<input name="desiredCount" type="number" min="0" max="999"></label><label>相談内容<textarea name="inquiryText" rows="5" required minlength="5"></textarea></label><button class="button button-primary" type="submit">追加相談を送る</button><div class="inline-error" hidden></div></form>
        </div>
      </section>`;
    document.querySelector("#issue-form").addEventListener("submit", submitIssue);
    document.querySelector("#change-form").addEventListener("submit", submitChange);
    document.querySelector("#additional-form").addEventListener("submit", submitAdditional);
  }

  async function submitIssue(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector("button");
    const errorBox = form.querySelector(".inline-error");
    errorBox.hidden = true;
    setBusy(button, true);
    try {
      const data = new FormData(form);
      const response = await api("/api/member/issues", { method: "POST", json: { siteId: data.get("siteId") || null, issueType: "plant_condition", conditionCode: data.get("conditionCode"), description: data.get("description"), severity: "normal", requiresReplacement: data.get("conditionCode") === "replacement_candidate" } });
      const files = [...form.elements.photos.files].slice(0, 4);
      for (let index = 0; index < files.length; index += 1) {
        const compressed = await compressImage(files[index]);
        await uploadPhoto(`/api/member/issues/${response.data.issue.id}/photos`, compressed, response.data.uploadToken, `お客様相談写真 ${index + 1}`);
      }
      toast(`相談を受け付けました（${response.data.issue.issue_number}）`, "success");
      form.reset();
      await loadOverview();
    } catch (error) { renderError(errorBox, error); } finally { setBusy(button, false); }
  }

  async function submitChange(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector("button");
    const errorBox = form.querySelector(".inline-error");
    setBusy(button, true);
    try {
      const data = Object.fromEntries(new FormData(form));
      await api("/api/member/change-requests", { method: "POST", json: data });
      toast("変更相談を受け付けました。", "success");
      form.reset();
    } catch (error) { renderError(errorBox, error); } finally { setBusy(button, false); }
  }

  async function submitAdditional(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector("button");
    const errorBox = form.querySelector(".inline-error");
    setBusy(button, true);
    try {
      const data = Object.fromEntries(new FormData(form));
      await api("/api/member/additional-requests", { method: "POST", json: data, idempotencyKey: uuid() });
      toast("追加相談を受け付けました。", "success");
      form.reset();
    } catch (error) { renderError(errorBox, error); } finally { setBusy(button, false); }
  }

  function card(title, text, status) { return `<article class="mini-card"><span class="status-chip">${escapeHtml(status)}</span><h3>${escapeHtml(title)}</h3><p>${escapeHtml(text)}</p></article>`; }
  function plantCard(name, size, condition, note, installation) { return `<article class="plant-card"><div class="plant-symbol" aria-hidden="true">🌿</div><div><span class="status-chip">${escapeHtml(statusLabel(condition))}</span><h3>${escapeHtml(name)}</h3><p>${escapeHtml(size || "サイズ未設定")}・${escapeHtml(note || "設置中")}</p><small>${installation?.installed_at ? `${formatDate(installation.installed_at)} 設置` : "設置情報確認中"}</small></div></article>`; }
  function empty(message) { return `<div class="empty-state"><span aria-hidden="true">🌱</span><p>${escapeHtml(message)}</p></div>`; }
  function groupBy(rows, key) { return (rows || []).reduce((result, row) => { (result[row[key]] ||= []).push(row); return result; }, {}); }
  function escapeHtml(value) { return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char])); }
  function escapeAttribute(value) { return escapeHtml(value); }

  initialize();
})();
