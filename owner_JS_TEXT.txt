(() => {
  "use strict";

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const Green = window.Green;
  const config = window.GREEN_CONFIG;
  const state = {
    session: null,
    currentView: "dashboard",
    customers: [],
    customerMap: new Map(),
    sites: [],
    siteMap: new Map(),
    leads: [],
    leadMap: new Map(),
    assetTab: "plants",
    assetFeatures: null,
    species: [],
    speciesMap: new Map(),
    containerModels: [],
    containerModelMap: new Map(),
    plantAssets: [],
    plantAssetMap: new Map(),
    containerAssets: [],
    containerAssetMap: new Map(),
    installations: [],
    stockItems: [],
    staff: [], staffMap: new Map(), contracts: [], contractMap: new Map(),
    visits: [], visitMap: new Map(), visitRules: [], visitTab: "schedules",
    reports: [], reportMap: new Map(), messageTemplates: [], notifications: [], messageTab: "templates",
    replacements: [], replacementMap: new Map(), replacementTab: "requests", careBatches: [], careMap: new Map(), disposals: [],
  };

  const labels = {
    sales: {
      new: "新着", contacted: "連絡済み", site_check_scheduling: "現地確認調整中", site_check_scheduled: "現地確認予定",
      site_checked: "現地確認済み", planning: "導入内容整理中", preparing: "導入準備中", installation_scheduled: "設置予定",
      active: "利用開始", on_hold: "保留", lost: "失注", follow_up: "再連絡予定",
    },
    siteCheck: { scheduling: "日程調整中", scheduled: "予定確定", in_progress: "確認中", completed: "完了", postponed: "延期", cancelled: "取消" },
    customer: { lead: "見込み", active: "利用中", paused: "休止", ended: "終了", inactive: "無効" },
    contract: { draft: "下書き", review: "確認中", scheduled: "利用開始予定", active: "利用中", change_pending: "内容変更", paused: "休止", cancellation_requested: "解約申出", removal_scheduled: "撤去予定", ended: "終了" },
    category: { regular_rental: "定期レンタル", site_check: "現地確認", photo_consultation: "写真相談", plant_addition: "植物追加", spot_event: "スポット・イベント", maintenance: "メンテナンス", pickup_disposal: "引取り・処分", other: "その他" },
    source: { website: "ホームページ", line: "LINE", phone: "電話", admin: "管理画面", referral: "紹介", other: "その他" },
    contact: { line: "LINE", phone: "電話", email: "メール", sms: "SMS", other: "その他" },
    asset: { inventory:"在庫", reserved:"確保済み", preparing:"準備中", loaded:"積込済み", installed:"設置中", replacement_planned:"交換予定", recovered:"回収済み", in_care:"養生中", reusable:"再利用可", inactive:"無効", disposed:"廃棄済み", returned:"返却済み" },
    condition: { good:"良好", observe:"経過観察", replacement_candidate:"交換候補", replacement_required:"交換必要", pest_found:"害虫あり", disease_suspected:"病気疑い", damaged:"破損", customer_confirmation_required:"顧客確認必要" },
    location: { warehouse:"倉庫", care_area:"養生場所", vehicle:"車両", customer_site:"顧客拠点", supplier:"仕入先", disposed:"廃棄", unknown:"不明" },
    installation: { planning:"計画中", asset_selecting:"植物選定中", asset_reserved:"確保済み", scheduled:"設置予定", loading:"積込中", in_transit:"搬送中", installing:"設置作業中", installed:"設置済み", postponed:"延期", cancelled:"取消" },
    plantMode: { asset:"一鉢管理", count:"本数管理", hybrid:"併用管理" },
    containerMode: { none:"管理しない", with_plant:"植物と一体", separate_asset:"別資産" },
    movement: { reserve:"確保", load:"積込", transfer:"移動", install:"設置", replace:"交換予定", recover:"回収", return:"返却", care:"養生へ", reuse:"再利用", dispose:"廃棄", adjust:"調整" },
    stockMovement: { receive:"入庫", reserve:"予約", release:"予約解除", load:"積込", install:"設置・使用", recover:"回収", care_in:"養生入り", care_out:"養生戻し", adjust:"数量調整", dispose:"廃棄", return:"返却" },
    visit: { not_started:"未開始", arrived:"到着", working:"作業中", paused:"一時保留", completed:"完了", unavailable:"訪問できず", revisit_required:"再訪問必要", cancelled:"取消" },
    visitType: { regular:"定期巡回", temporary:"臨時訪問", site_check:"現地確認", installation:"設置", replacement:"交換", revisit:"再訪問", other:"その他" },
    frequency: { weekly:"毎週", biweekly:"隔週", monthly:"毎月", every_n_weeks:"指定週ごと", every_n_months:"指定月ごと", custom:"個別設定" },
    assignmentRole: { primary:"主担当", support:"補助", driver:"運転", observer:"同行" },
    weekday: { 1:"月", 2:"火", 3:"水", 4:"木", 5:"金", 6:"土", 7:"日" },
    visitEvent: { created:"作成", assigned:"担当設定", reordered:"順番変更", loaded:"積込", departed:"出発", arrived:"到着", started:"作業開始", paused:"一時保留", resumed:"再開", completed:"完了", unavailable:"訪問できず", revisit:"再訪問", cancelled:"取消", corrected:"訂正" },
    report: { draft:"下書き", in_progress:"作業中", completed:"完了", corrected:"訂正済み", cancelled:"取消" },
    photo: { before:"作業前", after:"作業後", issue:"異常", replacement:"交換", installation:"設置位置", care:"養生" },
    replacement: { proposed:"提案", review_required:"確認待ち", approved:"承認済み", replacement_allocating:"代替割当中", scheduled:"交換予定", loaded:"積込済み", replaced:"交換済み", recovered:"回収済み", returned_to_warehouse:"帰庫済み", care_required:"養生必要", reusable:"再利用可", disposed:"廃棄済み", returned:"返却済み", cancelled:"取消" },
    severity: { low:"低", normal:"通常", high:"高", urgent:"緊急" },
    care: { planned:"養生予定", in_care:"養生中", observing:"経過観察", reusable:"再利用可", disposal_required:"廃棄判定", returned:"返却済み", closed:"終了" },
    reuse: { reusable:"再利用可能", continue_care:"養生継続", dispose:"廃棄", return_supplier:"仕入先返却", return_headquarters:"本部返却", inactive:"使用停止" },
    disposal: { discard:"廃棄", recycle:"リサイクル", return_supplier:"仕入先返却", return_headquarters:"本部返却", other:"その他" },
    replacementPhoto: { before:"交換前", after:"交換後", issue:"異常", replacement:"交換", recovery:"回収" },
    carePhoto: { care:"養生", condition:"状態", recovery:"回収時", reuse:"再利用", disposal:"廃棄" },
    work: { watering:"給水", leaf_cleaning:"葉清掃", pruning:"剪定", dead_leaf_removal:"枯葉除去", pot_area_cleaning:"鉢周辺清掃", position_adjustment:"向き・位置調整", soil_fertilizer_check:"土・肥料確認", pest_check:"害虫確認", disease_check:"病気確認", container_check:"鉢・カバー確認", other:"その他" },
  };

  const dialog = $("#owner-dialog");
  const dialogBody = $("#dialog-body");
  const dialogFooter = $("#dialog-footer");

  function esc(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
  }

  function statusChip(status, group = "sales") {
    return `<span class="owner-status" data-status="${esc(status)}">${esc(labels[group]?.[status] || Green.statusLabel(status))}</span>`;
  }

  function emptyRow(columns, text = "該当するデータはありません。") {
    return `<tr><td colspan="${columns}"><div class="owner-empty">${esc(text)}</div></td></tr>`;
  }

  function formatDateTime(value) {
    if (!value) return "未設定";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return esc(value);
    return new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
  }

  function inputDateTime(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  }

  function formDataObject(form) {
    const data = Object.fromEntries(new FormData(form).entries());
    $$('input[type="checkbox"]', form).forEach((input) => { data[input.name] = input.checked; });
    return data;
  }

  function selectOptions(map, selected = "", blank = "選択してください") {
    return `<option value="">${esc(blank)}</option>${Object.entries(map).map(([value, label]) => `<option value="${esc(value)}"${value === selected ? " selected" : ""}>${esc(label)}</option>`).join("")}`;
  }

  function customerOptions(selected = "") {
    return `<option value="">顧客を選択</option>${state.customers.map((item) => `<option value="${item.id}"${item.id === selected ? " selected" : ""}>${esc(item.company_name || item.contact_name)}（${esc(item.customer_number)}）</option>`).join("")}`;
  }

  function siteOptions(selected = "", customerId = "") {
    return `<option value="">拠点を選択</option>${state.sites.filter((item) => !customerId || item.customer_id === customerId).map((item) => `<option value="${item.id}"${item.id === selected ? " selected" : ""}>${esc(item.site_name)}（${esc(item.site_code)}）</option>`).join("")}`;
  }

  function leadOptions(selected = "") {
    return `<option value="">営業案件を選択</option>${state.leads.map((item) => `<option value="${item.id}"${item.id === selected ? " selected" : ""}>${esc(item.lead_number)}／${esc(labels.sales[item.status] || item.status)}</option>`).join("")}`;
  }

  function openDialog(title, kicker, bodyHtml, footerHtml = "") {
    $("#dialog-title").textContent = title;
    $("#dialog-kicker").textContent = kicker;
    dialogBody.innerHTML = bodyHtml;
    dialogFooter.innerHTML = footerHtml || '<button type="button" class="btn btn--secondary" data-dialog-close>閉じる</button>';
    $$('[data-dialog-close]', dialog).forEach((button) => button.addEventListener("click", closeDialog));
    if (typeof dialog.showModal === "function") dialog.showModal(); else dialog.setAttribute("open", "");
  }

  function closeDialog() {
    if (typeof dialog.close === "function") dialog.close(); else dialog.removeAttribute("open");
  }

  function loadingDialog(title = "読み込み中") {
    openDialog(title, "LOADING", '<div class="owner-loading">データを読み込んでいます…</div>');
  }

  async function withSubmit(button, task, label = "保存中…") {
    Green.setBusy(button, true, label);
    try { return await task(); }
    catch (error) {
      if (error.code === "duplicate_candidate") {
        const candidates = error.details?.candidates || [];
        Green.toast(`重複候補が${candidates.length}件あります。`, "error");
      } else Green.toast(`${error.message}${error.requestId ? `（確認番号：${error.requestId}）` : ""}`, "error");
      throw error;
    } finally { Green.setBusy(button, false); }
  }

  function populateFilters() {
    $("#inquiry-status").innerHTML = `<option value="">すべて</option>${Object.entries(labels.sales).map(([v,l]) => `<option value="${v}">${l}</option>`).join("")}`;
    $("#lead-status").innerHTML = $("#inquiry-status").innerHTML;
    $("#site-check-status").innerHTML = `<option value="">すべて</option>${Object.entries(labels.siteCheck).map(([v,l]) => `<option value="${v}">${l}</option>`).join("")}`;
    $("#customer-status").innerHTML = `<option value="">すべて</option>${Object.entries(labels.customer).map(([v,l]) => `<option value="${v}">${l}</option>`).join("")}`;
    $("#contract-status").innerHTML = `<option value="">すべて</option>${Object.entries(labels.contract).map(([v,l]) => `<option value="${v}">${l}</option>`).join("")}`;
    $("#asset-status").innerHTML = `<option value="">すべて</option>${Object.entries(labels.asset).map(([v,l]) => `<option value="${v}">${l}</option>`).join("")}`;
    $("#asset-location").innerHTML = `<option value="">すべて</option>${Object.entries(labels.location).map(([v,l]) => `<option value="${v}">${l}</option>`).join("")}`;
    $("#visit-status").innerHTML = `<option value="">すべて</option>${Object.entries(labels.visit).map(([v,l]) => `<option value="${v}">${l}</option>`).join("")}`;
    $("#installation-status").innerHTML = `<option value="">すべて</option>${Object.entries(labels.installation).map(([v,l]) => `<option value="${v}">${l}</option>`).join("")}`;
    $("#replacement-status").innerHTML = `<option value="">すべて</option>${Object.entries(labels.replacement).map(([v,l]) => `<option value="${v}">${l}</option>`).join("")}`;
    $("#replacement-severity").innerHTML = `<option value="">すべて</option>${Object.entries(labels.severity).map(([v,l]) => `<option value="${v}">${l}</option>`).join("")}`;
    $("#care-status").innerHTML = `<option value="">すべて</option>${Object.entries(labels.care).map(([v,l]) => `<option value="${v}">${l}</option>`).join("")}`;
  }

  async function restoreSession() {
    try {
      const result = await Green.api("/api/admin/session");
      setSession(result.data);
      showApp();
      await loadView("dashboard");
    } catch { showLogin(); }
  }

  function setSession(session) {
    state.session = session;
    Green.setCsrfToken(session.csrfToken);
    $("#side-facility").textContent = session.facilityName || session.facilityCode;
    $("#session-expiry").textContent = session.expiresAt ? `有効期限 ${formatDateTime(session.expiresAt)}` : "";
  }

  function showLogin() { $("#login-view").hidden = false; $("#owner-app").hidden = true; }
  function showApp() { $("#login-view").hidden = true; $("#owner-app").hidden = false; }

  async function login(event) {
    event.preventDefault();
    const button = $("#login-form button[type=submit]");
    $("#login-error").hidden = true;
    try {
      const result = await withSubmit(button, () => Green.api("/api/admin/login", { method: "POST", json: { facilityCode: $("#login-facility").value.trim(), code: $("#login-code").value } }), "ログイン中…");
      setSession(result.data); $("#login-code").value = ""; showApp(); await loadView("dashboard");
    } catch (error) { Green.renderError($("#login-error"), error); }
  }

  async function logout() {
    try { await Green.api("/api/admin/logout", { method: "POST", json: {} }); } catch {}
    state.session = null; Green.setCsrfToken(null); showLogin();
  }

  async function loadView(view) {
    state.currentView = view;
    $$("[data-view-panel]").forEach((panel) => panel.classList.toggle("is-active", panel.dataset.viewPanel === view));
    $$("[data-view]").forEach((button) => button.classList.toggle("is-active", button.dataset.view === view));
    const titles = { dashboard: "ダッシュボード", inquiries: "問い合わせ", leads: "営業対応", "site-checks": "現地確認", customers: "顧客", sites: "拠点・設置場所", contracts: "利用・契約状態", assets: "植物・鉢台帳", installations: "設置・移動", visits: "巡回予定", reports: "作業報告", replacements: "交換・回収・養生", messages: "LINE・メッセージ", stock: "簡易在庫", features: "機能設定" };
    $("#view-title").textContent = titles[view] || "管理画面";
    closeSidebar();
    try {
      if (view === "dashboard") await loadDashboard();
      if (view === "inquiries") await loadInquiries();
      if (view === "leads") await loadLeads();
      if (view === "site-checks") await loadSiteChecks();
      if (view === "customers") await loadCustomers();
      if (view === "sites") await loadSites();
      if (view === "contracts") await loadContracts();
      if (view === "assets") await loadAssets();
      if (view === "installations") await loadInstallations();
      if (view === "visits") await loadVisits();
      if (view === "reports") await loadReports();
      if (view === "replacements") await loadReplacements();
      if (view === "messages") await loadMessages();
      if (view === "stock") await loadStock();
      if (view === "features") await window.GreenFeatureSettings?.load();
    } catch (error) { Green.toast(error.message, "error"); }
  }

  async function loadDashboard() {
    const result = await Green.api("/api/admin/dashboard");
    const counts = result.data.counts;
    $("#dashboard-date").textContent = `${Green.formatDate(result.data.today)}の状況`;
    const cards = [
      ["新着問い合わせ", counts.newInquiries, "inquiries", counts.newInquiries ? "未対応があります" : "新着はありません"],
      ["返信・再連絡待ち", counts.replyWaiting, "inquiries", "連絡状況を確認"],
      ["本日の現地確認", counts.siteChecksToday, "site-checks", "予定と担当を確認"],
      ["導入準備中", counts.preparing, "inquiries", "計画・準備・設置予定"],
      ["利用中顧客", counts.activeCustomers, "customers", "現在の利用顧客"],
      ["利用中契約", counts.activeContracts, "contracts", "金額情報は扱いません"],
      ["本日の巡回", counts.todayVisits, "dashboard", "GREEN-7で本格連携"],
      ["巡回未完了", counts.unfinishedVisits, "dashboard", "本日の未完了"],
      ["設置中植物", counts.installedPlants || 0, "assets", "顧客拠点に設置中"],
      ["交換候補", counts.replacementCandidates || 0, "assets", "状態確認が必要"],
      ["設置準備中", counts.installationPreparing || 0, "installations", "完了前の設置計画"],
      ["在庫不足警告", counts.stockWarnings || 0, "stock", "警告基準以下"],
    ];
    $("#dashboard-stats").innerHTML = cards.map(([label,count,view,note], index) => `<button class="owner-stat${index < 2 && count ? " is-alert" : ""}" data-go="${view}"><small>${label}</small><strong>${count}</strong><span>${note}</span></button>`).join("");
    $$('[data-go]', $("#dashboard-stats")).forEach((button) => button.addEventListener("click", () => loadView(button.dataset.go)));
    const items = result.data.attention || [];
    $("#dashboard-attention").innerHTML = items.length ? `<div class="owner-attention-list">${items.map((item) => `<div class="owner-attention-item"><span><strong>${item.type === "inquiry" ? "問い合わせ" : "営業案件"}</strong><small class="owner-row-sub">${formatDateTime(item.occurredAt)}</small></span>${statusChip(item.status)} </div>`).join("")}</div>` : '<div class="owner-empty">期限の近い対応はありません。</div>';
  }

  async function loadInquiries() {
    const params = new URLSearchParams(); const search = $("#inquiry-search").value.trim(); const status = $("#inquiry-status").value; if (search) params.set("search", search); if (status) params.set("status", status);
    $("#inquiry-rows").innerHTML = emptyRow(7, "読み込み中です…");
    const result = await Green.api(`/api/admin/inquiries?${params}`); const items = result.data.items;
    $("#inquiry-rows").innerHTML = items.length ? items.map((item) => `<tr><td><span class="owner-row-title">${esc(item.reception_number)}</span>${item.duplicate_candidate ? '<span class="owner-row-sub">重複候補あり</span>' : ""}</td><td><span class="owner-row-title">${esc(item.company_name || "個人")}</span><span class="owner-row-sub">${esc(item.contact_name)}／${esc(item.phone || item.email || "連絡先未設定")}</span></td><td>${esc(labels.category[item.inquiry_category] || item.inquiry_category)}</td><td>${esc(labels.source[item.source] || item.source)}</td><td>${statusChip(item.status)}</td><td>${formatDateTime(item.created_at)}</td><td><button class="owner-row-action" data-inquiry="${item.id}">詳細</button></td></tr>`).join("") : emptyRow(7);
    $$('[data-inquiry]').forEach((button) => button.addEventListener("click", () => openInquiry(button.dataset.inquiry)));
  }

  async function loadLeads() {
    const status = $("#lead-status").value; $("#lead-rows").innerHTML = emptyRow(6, "読み込み中です…"); const result = await Green.api(`/api/admin/leads${status ? `?status=${encodeURIComponent(status)}` : ""}`); state.leads = result.data.items; state.leadMap = new Map(state.leads.map((item) => [item.id, item]));
    $("#lead-rows").innerHTML = state.leads.length ? state.leads.map((item) => `<tr><td class="owner-row-title">${esc(item.lead_number)}</td><td>${statusChip(item.status)}</td><td>${esc(item.next_action || "未設定")}</td><td>${formatDateTime(item.next_action_at)}</td><td>${formatDateTime(item.updated_at)}</td><td><button class="owner-row-action" data-lead="${item.id}">詳細</button></td></tr>`).join("") : emptyRow(6);
    $$('[data-lead]').forEach((button) => button.addEventListener("click", () => openLead(button.dataset.lead)));
  }

  async function loadSiteChecks() {
    const status = $("#site-check-status").value; $("#site-check-rows").innerHTML = emptyRow(6, "読み込み中です…"); await Promise.all([ensureCustomers(), ensureSites()]); const result = await Green.api(`/api/admin/site-checks${status ? `?status=${encodeURIComponent(status)}` : ""}`); const items = result.data.items;
    $("#site-check-rows").innerHTML = items.length ? items.map((item) => `<tr><td class="owner-row-title">${esc(item.check_number)}</td><td>${formatDateTime(item.scheduled_start)}</td><td>${statusChip(item.status,"siteCheck")}</td><td>${esc(state.customerMap.get(item.customer_id)?.company_name || state.customerMap.get(item.customer_id)?.contact_name || "未紐付け")}<span class="owner-row-sub">${esc(state.siteMap.get(item.site_id)?.site_name || "拠点未設定")}</span></td><td>${formatDateTime(item.updated_at)}</td><td><button class="owner-row-action" data-site-check="${item.id}">詳細</button></td></tr>`).join("") : emptyRow(6);
    $$('[data-site-check]').forEach((button) => button.addEventListener("click", () => openSiteCheck(button.dataset.siteCheck)));
  }

  async function loadCustomers() {
    const params = new URLSearchParams(); const search = $("#customer-search").value.trim(); const status = $("#customer-status").value; if (search) params.set("search", search); if (status) params.set("status", status); $("#customer-rows").innerHTML = emptyRow(6, "読み込み中です…");
    const result = await Green.api(`/api/admin/customers?${params}`); state.customers = result.data.items; state.customerMap = new Map(state.customers.map((item) => [item.id, item]));
    $("#customer-rows").innerHTML = state.customers.length ? state.customers.map((item) => `<tr><td class="owner-row-title">${esc(item.customer_number)}</td><td><span class="owner-row-title">${esc(item.company_name || "個人")}</span><span class="owner-row-sub">${esc(item.contact_name)}</span></td><td>${esc(item.phone || "未設定")}<span class="owner-row-sub">${esc(item.email || "")}</span></td><td>${esc(item.address || "未設定")}</td><td>${statusChip(item.status,"customer")}</td><td><button class="owner-row-action" data-customer="${item.id}">詳細</button></td></tr>`).join("") : emptyRow(6);
    $$('[data-customer]').forEach((button) => button.addEventListener("click", () => openCustomer(button.dataset.customer)));
  }

  async function loadSites() {
    const search = $("#site-search").value.trim(); $("#site-rows").innerHTML = emptyRow(6, "読み込み中です…"); await ensureCustomers(); const result = await Green.api(`/api/admin/sites${search ? `?search=${encodeURIComponent(search)}` : ""}`); state.sites = result.data.items; state.siteMap = new Map(state.sites.map((item) => [item.id, item]));
    $("#site-rows").innerHTML = state.sites.length ? state.sites.map((item) => `<tr><td class="owner-row-title">${esc(item.site_code)}</td><td><span class="owner-row-title">${esc(item.site_name)}</span><span class="owner-row-sub">${esc(state.customerMap.get(item.customer_id)?.company_name || state.customerMap.get(item.customer_id)?.contact_name || "顧客未取得")}</span></td><td>${esc([item.prefecture,item.city,item.address_line,item.building_name].filter(Boolean).join(" ") || "未設定")}</td><td>${esc(item.contact_name || "未設定")}<span class="owner-row-sub">${esc(item.phone || "")}</span></td><td>${statusChip(item.is_active ? "active" : "inactive","customer")}</td><td><button class="owner-row-action" data-site="${item.id}">詳細</button></td></tr>`).join("") : emptyRow(6);
    $$('[data-site]').forEach((button) => button.addEventListener("click", () => openSite(button.dataset.site)));
  }

  async function loadContracts() {
    const status = $("#contract-status").value; $("#contract-rows").innerHTML = emptyRow(6, "読み込み中です…"); await ensureCustomers(); const result = await Green.api(`/api/admin/contracts${status ? `?status=${encodeURIComponent(status)}` : ""}`); const items = result.data.items;
    $("#contract-rows").innerHTML = items.length ? items.map((item) => `<tr><td class="owner-row-title">${esc(item.contract_number)}</td><td>${esc(state.customerMap.get(item.customer_id)?.company_name || state.customerMap.get(item.customer_id)?.contact_name || "顧客未取得")}</td><td>${statusChip(item.status,"contract")}</td><td>${Green.formatDate(item.start_date)}</td><td>${Green.formatDate(item.planned_end_date)}</td><td><button class="owner-row-action" data-contract="${item.id}">詳細</button></td></tr>`).join("") : emptyRow(6);
    $$('[data-contract]').forEach((button) => button.addEventListener("click", () => openContract(button.dataset.contract)));
  }

  async function ensureCustomers(force = false) {
    if (!force && state.customers.length) return state.customers;
    const result = await Green.api("/api/admin/customers?limit=200"); state.customers = result.data.items; state.customerMap = new Map(state.customers.map((item) => [item.id, item])); return state.customers;
  }
  async function ensureSites(force = false) {
    if (!force && state.sites.length) return state.sites;
    const result = await Green.api("/api/admin/sites?limit=200"); state.sites = result.data.items; state.siteMap = new Map(state.sites.map((item) => [item.id, item])); return state.sites;
  }
  async function ensureLeads(force = false) {
    if (!force && state.leads.length) return state.leads;
    const result = await Green.api("/api/admin/leads?limit=200"); state.leads = result.data.items; state.leadMap = new Map(state.leads.map((item) => [item.id,item])); return state.leads;
  }

  function phoneInquiryForm(prefill = {}) {
    openDialog("電話問い合わせを登録", "PHONE INQUIRY", `<form id="phone-inquiry-form" class="owner-form-grid">
      <label>法人名・屋号<input name="companyName" value="${esc(prefill.company_name || "")}"></label><label>担当者名<span class="required">必須</span><input name="contactName" required value="${esc(prefill.contact_name || "")}"></label>
      <label>電話番号<input name="phone" inputmode="tel" value="${esc(prefill.phone || "")}"></label><label>メール<input name="email" type="email" value="${esc(prefill.email || "")}"></label>
      <label>相談区分<select name="inquiryCategory">${selectOptions(labels.category,prefill.inquiry_category || "regular_rental", "選択")}</select></label><label>希望連絡方法<select name="preferredContactMethod">${selectOptions(labels.contact,"phone", "選択")}</select></label>
      <label class="full">住所<input name="address" value="${esc(prefill.address || "")}"></label><label class="full">相談内容<textarea name="inquiryText" required>${esc(prefill.inquiry_text || "")}</textarea></label>
    </form>`, '<button type="button" class="btn btn--secondary" data-dialog-close>取消</button><button type="button" class="btn btn--primary" id="save-phone-inquiry">登録</button>');
    $("#save-phone-inquiry").addEventListener("click", async (event) => {
      const data = formDataObject($("#phone-inquiry-form"));
      try { const result = await withSubmit(event.currentTarget, () => Green.api("/api/admin/inquiries", { method: "POST", json: data })); closeDialog(); Green.toast(`受付番号 ${result.data.inquiry.reception_number} を登録しました。`, "success"); await loadInquiries(); }
      catch {}
    });
  }

  async function openInquiry(id) {
    loadingDialog("問い合わせ詳細");
    try {
      const result = await Green.api(`/api/admin/inquiries/${id}`); const item = result.data.inquiry; const photos = result.data.photos || [];
      openDialog(`問い合わせ ${item.reception_number}`, "INQUIRY DETAIL", `<div class="owner-detail-grid">
        ${detail("状態", labels.sales[item.status] || item.status)}${detail("受付元", labels.source[item.source] || item.source)}${detail("法人名", item.company_name || "個人")}${detail("担当者", item.contact_name)}${detail("電話", item.phone || "未設定")}${detail("メール", item.email || "未設定")}${detail("住所", item.address || "未設定")}${detail("相談区分", labels.category[item.inquiry_category] || item.inquiry_category)}
      </div><section class="owner-dialog-section"><h3>相談内容</h3><div class="owner-mini-item">${esc(item.inquiry_text).replace(/\n/g,"<br>")}</div></section>
      ${item.duplicate_candidate ? `<div class="owner-duplicate-box">同一電話番号・内容などの重複候補があります。顧客登録前に検索してください。<br>${esc(item.duplicate_reason || "")}</div>` : ""}
      ${photos.length ? `<section class="owner-dialog-section"><h3>添付写真</h3><div class="owner-photo-grid">${photos.map((p) => p.signed_url ? `<a href="${esc(p.signed_url)}" target="_blank" rel="noopener"><img src="${esc(p.signed_url)}" alt="問い合わせ写真"></a>` : "").join("")}</div></section>` : ""}
      <form id="inquiry-update-form" class="owner-form-grid owner-dialog-section"><label>状態<select name="status">${selectOptions(labels.sales,item.status,"選択")}</select></label><label>再連絡日<input name="follow_up_on" type="date" value="${esc(item.follow_up_on || "")}"></label><label class="full">保留理由<textarea name="hold_reason">${esc(item.hold_reason || "")}</textarea></label><label class="full">失注理由<textarea name="lost_reason">${esc(item.lost_reason || "")}</textarea></label></form>
      <div class="owner-dialog-actions"><button class="btn btn--secondary" id="create-lead-from-inquiry">営業案件を作成</button><button class="btn btn--secondary" id="create-customer-from-inquiry">顧客として登録</button></div>`, '<button type="button" class="btn btn--secondary" data-dialog-close>閉じる</button><button type="button" class="btn btn--primary" id="save-inquiry">変更を保存</button>');
      $("#save-inquiry").addEventListener("click", async (event) => { try { await withSubmit(event.currentTarget, () => Green.api(`/api/admin/inquiries/${id}`, { method: "PATCH", json: formDataObject($("#inquiry-update-form")) })); Green.toast("問い合わせを更新しました。", "success"); closeDialog(); await loadInquiries(); } catch {} });
      $("#create-lead-from-inquiry").addEventListener("click", async (event) => { try { const created = await withSubmit(event.currentTarget, () => Green.api("/api/admin/leads", { method: "POST", json: { inquiryId: id, customerId: item.customer_id || null, status: item.status } })); Green.toast(created.data.reused ? "既存の営業案件を開きます。" : "営業案件を作成しました。", "success"); await ensureLeads(true); openLead(created.data.lead.id); } catch {} });
      $("#create-customer-from-inquiry").addEventListener("click", () => customerForm({ inquiryId: id, company_name: item.company_name, contact_name: item.contact_name, phone: item.phone, email: item.email, postal_code: item.postal_code, address: item.address }));
    } catch (error) { openDialog("読み込みエラー", "ERROR", `<div class="form-error">${esc(error.message)}</div>`); }
  }

  async function openLead(id) {
    loadingDialog("営業案件詳細");
    const result = await Green.api(`/api/admin/leads/${id}`); const item = result.data.lead; const activities = result.data.activities || [];
    openDialog(`営業案件 ${item.lead_number}`, "SALES LEAD", `<form id="lead-update-form" class="owner-form-grid"><label>状態<select name="status">${selectOptions(labels.sales,item.status,"選択")}</select></label><label>次回対応日時<input name="nextActionAt" type="datetime-local" value="${inputDateTime(item.next_action_at)}"></label><label class="full">次回対応<textarea name="nextAction">${esc(item.next_action || "")}</textarea></label><label>再連絡日<input name="followUpOn" type="date" value="${esc(item.follow_up_on || "")}"></label><label>保留理由<input name="holdReason" value="${esc(item.hold_reason || "")}"></label><label class="full">失注理由<textarea name="lostReason">${esc(item.lost_reason || "")}</textarea></label></form>
      <section class="owner-dialog-section"><h3>対応履歴</h3><div class="owner-mini-list">${activities.length ? activities.map((a) => `<div class="owner-mini-item"><strong>${esc(a.summary)}</strong><span class="owner-row-sub">${formatDateTime(a.activity_at)}／${esc(a.activity_type)}</span>${a.next_action ? `<span class="owner-row-sub">次回：${esc(a.next_action)}</span>` : ""}</div>`).join("") : '<div class="owner-empty">対応履歴はありません。</div>'}</div></section>
      <form id="lead-activity-form" class="owner-form-grid owner-dialog-section"><h3 class="full">対応履歴を追加</h3><label>種別<select name="activityType"><option value="call">電話</option><option value="line">LINE</option><option value="email">メール</option><option value="meeting">面談</option><option value="memo">メモ</option></select></label><label>対応日時<input name="activityAt" type="datetime-local"></label><label class="full">対応内容<textarea name="summary" required></textarea></label><label>次回対応<input name="nextAction"></label><label>次回日時<input name="nextActionAt" type="datetime-local"></label></form>`, '<button type="button" class="btn btn--secondary" id="add-lead-activity">履歴を追加</button><button type="button" class="btn btn--primary" id="save-lead">案件を保存</button>');
    $("#save-lead").addEventListener("click", async (event) => { try { await withSubmit(event.currentTarget, () => Green.api(`/api/admin/leads/${id}`, { method: "PATCH", json: formDataObject($("#lead-update-form")) })); Green.toast("営業案件を更新しました。", "success"); closeDialog(); await loadLeads(); } catch {} });
    $("#add-lead-activity").addEventListener("click", async (event) => { try { await withSubmit(event.currentTarget, () => Green.api(`/api/admin/leads/${id}/activities`, { method: "POST", json: formDataObject($("#lead-activity-form")) })); Green.toast("対応履歴を追加しました。", "success"); openLead(id); } catch {} });
  }

  async function siteCheckForm(prefill = {}) {
    await Promise.all([ensureLeads(), ensureCustomers(), ensureSites()]);
    openDialog(prefill.id ? "現地確認を編集" : "現地確認を登録", "SITE CHECK", `<form id="site-check-form" class="owner-form-grid"><label>営業案件<select name="leadId">${leadOptions(prefill.lead_id || "")}</select></label><label>顧客<select name="customerId" id="site-check-customer">${customerOptions(prefill.customer_id || "")}</select></label><label>拠点<select name="siteId" id="site-check-site">${siteOptions(prefill.site_id || "",prefill.customer_id || "")}</select></label><label>状態<select name="status">${selectOptions(labels.siteCheck,prefill.status || "scheduling","選択")}</select></label><label>開始日時<input name="scheduledStart" type="datetime-local" value="${inputDateTime(prefill.scheduled_start)}"></label><label>終了日時<input name="scheduledEnd" type="datetime-local" value="${inputDateTime(prefill.scheduled_end)}"></label><label class="full">お客様の要望<textarea name="customerRequest">${esc(prefill.customer_request || "")}</textarea></label><label class="full">社内メモ<textarea name="internalNote">${esc(prefill.internal_note || "")}</textarea></label></form>`, `<button type="button" class="btn btn--secondary" data-dialog-close>取消</button><button type="button" class="btn btn--primary" id="save-site-check">${prefill.id ? "更新" : "登録"}</button>`);
    $("#site-check-customer").addEventListener("change", (event) => { $("#site-check-site").innerHTML = siteOptions("",event.target.value); });
    $("#save-site-check").addEventListener("click", async (event) => { try { const path = prefill.id ? `/api/admin/site-checks/${prefill.id}` : "/api/admin/site-checks"; const method = prefill.id ? "PATCH" : "POST"; await withSubmit(event.currentTarget, () => Green.api(path, { method, json: formDataObject($("#site-check-form")) })); Green.toast(prefill.id ? "現地確認を更新しました。" : "現地確認を登録しました。", "success"); closeDialog(); await loadSiteChecks(); } catch {} });
  }

  async function openSiteCheck(id) { loadingDialog("現地確認詳細"); const result = await Green.api(`/api/admin/site-checks/${id}`); const item = result.data.siteCheck; await siteCheckForm({ ...item, id }); }

  async function customerForm(prefill = {}) {
    openDialog(prefill.id ? "顧客情報を編集" : "顧客を登録", "CUSTOMER", `<form id="customer-form" class="owner-form-grid"><input type="hidden" name="inquiryId" value="${esc(prefill.inquiryId || "")}"><label>顧客区分<select name="customerType"><option value="corporate">法人</option><option value="individual"${prefill.customer_type === "individual" ? " selected" : ""}>個人</option><option value="organization">団体</option><option value="other">その他</option></select></label><label>状態<select name="status">${selectOptions(labels.customer,prefill.status || "active","選択")}</select></label><label>法人名・屋号<input name="companyName" value="${esc(prefill.company_name || "")}"></label><label>担当者名<input name="contactName" required value="${esc(prefill.contact_name || "")}"></label><label>担当者名カナ<input name="contactNameKana" value="${esc(prefill.contact_name_kana || "")}"></label><label>電話番号<input name="phone" inputmode="tel" value="${esc(prefill.phone || "")}"></label><label>メール<input name="email" type="email" value="${esc(prefill.email || "")}"></label><label>郵便番号<input name="postalCode" value="${esc(prefill.postal_code || "")}"></label><label class="full">住所<input name="address" value="${esc(prefill.address || "")}"></label><label>希望連絡方法<select name="preferredContactMethod">${selectOptions(labels.contact,prefill.preferred_contact_method || "phone","選択")}</select></label><label>本部確認<select name="headquartersConfirmationStatus">${selectOptions({unconfirmed:"未確認",checking:"確認中",confirmed:"確認済み",not_required:"不要",rejected:"不可"},prefill.headquarters_confirmation_status || "unconfirmed","選択")}</select></label></form><div id="customer-duplicate-area"></div>`, `<button type="button" class="btn btn--secondary" data-dialog-close>取消</button><button type="button" class="btn btn--primary" id="save-customer">${prefill.id ? "更新" : "登録"}</button>`);
    $("#save-customer").addEventListener("click", async (event) => {
      const data = formDataObject($("#customer-form")); const save = async (allowDuplicate = false) => Green.api(prefill.id ? `/api/admin/customers/${prefill.id}` : "/api/admin/customers", { method: prefill.id ? "PATCH" : "POST", json: { ...data, allowDuplicate } });
      try { await withSubmit(event.currentTarget, () => save(false)); Green.toast(prefill.id ? "顧客情報を更新しました。" : "顧客を登録しました。", "success"); closeDialog(); await ensureCustomers(true); await loadCustomers(); }
      catch (error) {
        if (error.code !== "duplicate_candidate") return;
        const candidates = error.details?.candidates || [];
        $("#customer-duplicate-area").innerHTML = `<div class="owner-duplicate-box"><strong>重複候補を確認してください</strong>${candidates.map((c) => `<div>${esc(c.customer_number)}｜${esc(c.company_name || c.contact_name)}｜${esc(c.phone || "")}</div>`).join("")}<button type="button" class="btn btn--secondary" id="force-customer-save">別顧客として登録</button></div>`;
        $("#force-customer-save").addEventListener("click", async (forceEvent) => { try { await withSubmit(forceEvent.currentTarget, () => save(true)); Green.toast("別顧客として登録しました。", "success"); closeDialog(); await ensureCustomers(true); await loadCustomers(); } catch {} });
      }
    });
  }

  async function openCustomer(id) {
    loadingDialog("顧客詳細"); const result = await Green.api(`/api/admin/customers/${id}`); const { customer, contacts, sites, contracts, notes } = result.data;
    openDialog(`${customer.company_name || customer.contact_name}`, "CUSTOMER DETAIL", `<div class="owner-detail-grid">${detail("顧客番号",customer.customer_number)}${detail("状態",labels.customer[customer.status] || customer.status)}${detail("担当者",customer.contact_name)}${detail("電話",customer.phone || "未設定")}${detail("メール",customer.email || "未設定")}${detail("住所",customer.address || "未設定")}</div>
      ${miniSection("連絡先",contacts.map((c) => `${c.contact_name}｜${c.phone || c.email || "未設定"}`))}${miniSection("拠点",sites.map((s) => `${s.site_name}｜${[s.prefecture,s.city,s.address_line].filter(Boolean).join(" ")}`))}${miniSection("利用状態",contracts.map((c) => `${c.contract_number}｜${labels.contract[c.status] || c.status}`))}${miniSection("メモ",notes.map((n) => `${n.visibility === "customer_shared" ? "お客様共有" : "社内"}｜${n.note_text}`))}
      <div class="owner-dialog-actions"><button class="btn btn--secondary" id="edit-customer">基本情報を編集</button><button class="btn btn--secondary" id="add-contact">連絡先を追加</button><button class="btn btn--secondary" id="add-note">メモを追加</button><button class="btn btn--secondary" id="add-site-for-customer">拠点を追加</button><button class="btn btn--secondary" id="add-contract-for-customer">利用状態を追加</button></div>`);
    $("#edit-customer").addEventListener("click", () => customerForm({ ...customer, id }));
    $("#add-contact").addEventListener("click", () => contactForm(id)); $("#add-note").addEventListener("click", () => noteForm(id)); $("#add-site-for-customer").addEventListener("click", () => siteForm({ customer_id: id })); $("#add-contract-for-customer").addEventListener("click", () => contractForm({ customer_id: id }));
  }

  function contactForm(customerId) {
    openDialog("連絡先を追加", "CONTACT", `<form id="contact-form" class="owner-form-grid"><label>氏名<input name="contactName" required></label><label>部署<input name="department"></label><label>役職<input name="positionName"></label><label>電話<input name="phone" inputmode="tel"></label><label>メール<input name="email" type="email"></label><label>LINEユーザーID<input name="lineUserId"></label><label class="full"><input name="isPrimary" type="checkbox"> 主担当にする</label></form>`, '<button type="button" class="btn btn--secondary" data-dialog-close>取消</button><button type="button" class="btn btn--primary" id="save-contact">追加</button>');
    $("#save-contact").addEventListener("click", async (event) => { try { await withSubmit(event.currentTarget, () => Green.api(`/api/admin/customers/${customerId}/contacts`, { method: "POST", json: formDataObject($("#contact-form")) })); Green.toast("連絡先を追加しました。", "success"); openCustomer(customerId); } catch {} });
  }

  function noteForm(customerId) {
    openDialog("顧客メモを追加", "CUSTOMER NOTE", `<form id="note-form" class="owner-form-grid"><label>公開範囲<select name="visibility"><option value="internal">社内のみ</option><option value="customer_shared">お客様共有</option></select></label><label><input name="isPinned" type="checkbox"> 上部に固定</label><label class="full">メモ<textarea name="noteText" required></textarea></label></form>`, '<button type="button" class="btn btn--secondary" data-dialog-close>取消</button><button type="button" class="btn btn--primary" id="save-note">追加</button>');
    $("#save-note").addEventListener("click", async (event) => { try { await withSubmit(event.currentTarget, () => Green.api(`/api/admin/customers/${customerId}/notes`, { method: "POST", json: formDataObject($("#note-form")) })); Green.toast("メモを追加しました。", "success"); openCustomer(customerId); } catch {} });
  }

  async function siteForm(prefill = {}) {
    await ensureCustomers();
    openDialog(prefill.id ? "拠点を編集" : "拠点を登録", "CUSTOMER SITE", `<form id="site-form" class="owner-form-grid"><label>顧客<select name="customerId" ${prefill.id ? "disabled" : ""}>${customerOptions(prefill.customer_id || "")}</select></label><label>拠点名<input name="siteName" required value="${esc(prefill.site_name || "")}"></label><label>郵便番号<input name="postalCode" value="${esc(prefill.postal_code || "")}"></label><label>都道府県<input name="prefecture" value="${esc(prefill.prefecture || "")}"></label><label>市区町村<input name="city" value="${esc(prefill.city || "")}"></label><label>番地<input name="addressLine" value="${esc(prefill.address_line || "")}"></label><label class="full">建物名<input name="buildingName" value="${esc(prefill.building_name || "")}"></label><label>現地担当者<input name="contactName" value="${esc(prefill.contact_name || "")}"></label><label>電話<input name="phone" value="${esc(prefill.phone || "")}"></label><label class="full">入館方法<textarea name="entryInfo">${esc(prefill.entry_info || "")}</textarea></label><label class="full">駐車情報<textarea name="parkingInfo">${esc(prefill.parking_info || "")}</textarea></label><label class="full">社内メモ<textarea name="internalNote">${esc(prefill.internal_note || "")}</textarea></label></form>`, `<button type="button" class="btn btn--secondary" data-dialog-close>取消</button><button type="button" class="btn btn--primary" id="save-site">${prefill.id ? "更新" : "登録"}</button>`);
    $("#save-site").addEventListener("click", async (event) => { try { const data = formDataObject($("#site-form")); if (prefill.id) delete data.customerId; await withSubmit(event.currentTarget, () => Green.api(prefill.id ? `/api/admin/sites/${prefill.id}` : "/api/admin/sites", { method: prefill.id ? "PATCH" : "POST", json: data })); Green.toast(prefill.id ? "拠点を更新しました。" : "拠点を登録しました。", "success"); closeDialog(); await ensureSites(true); await loadSites(); } catch {} });
  }

  async function openSite(id) {
    loadingDialog("拠点詳細"); const result = await Green.api(`/api/admin/sites/${id}`); const { site, areas } = result.data;
    openDialog(site.site_name, "SITE DETAIL", `<div class="owner-detail-grid">${detail("拠点コード",site.site_code)}${detail("住所",[site.prefecture,site.city,site.address_line,site.building_name].filter(Boolean).join(" ") || "未設定")}${detail("現地担当者",site.contact_name || "未設定")}${detail("電話",site.phone || "未設定")}${detail("入館方法",site.entry_info || "未設定")}${detail("駐車情報",site.parking_info || "未設定")}</div>${miniSection("設置場所",areas.map((a) => `${a.area_name}${a.floor_name ? `（${a.floor_name}）` : ""}｜${a.placement_note || "メモなし"}`))}<div class="owner-dialog-actions"><button class="btn btn--secondary" id="edit-site">拠点を編集</button><button class="btn btn--secondary" id="add-area">設置場所を追加</button></div>`);
    $("#edit-site").addEventListener("click", () => siteForm({ ...site, id })); $("#add-area").addEventListener("click", () => areaForm(id));
  }

  function areaForm(siteId) {
    openDialog("設置場所を追加", "SITE AREA", `<form id="area-form" class="owner-form-grid"><label>設置場所名<input name="areaName" required placeholder="受付・待合室など"></label><label>階<input name="floorName"></label><label>部屋名<input name="roomName"></label><label>場所種別<input name="areaType"></label><label class="full">アクセス注意<textarea name="accessNote"></textarea></label><label class="full">設置メモ<textarea name="placementNote"></textarea></label></form>`, '<button type="button" class="btn btn--secondary" data-dialog-close>取消</button><button type="button" class="btn btn--primary" id="save-area">追加</button>');
    $("#save-area").addEventListener("click", async (event) => { try { await withSubmit(event.currentTarget, () => Green.api(`/api/admin/sites/${siteId}/areas`, { method: "POST", json: formDataObject($("#area-form")) })); Green.toast("設置場所を追加しました。", "success"); openSite(siteId); } catch {} });
  }

  async function contractForm(prefill = {}) {
    await ensureCustomers();
    openDialog(prefill.id ? "利用状態を編集" : "利用状態を登録", "SERVICE STATUS", `<form id="contract-form" class="owner-form-grid"><label>顧客<select name="customerId" ${prefill.id ? "disabled" : ""}>${customerOptions(prefill.customer_id || "")}</select></label><label>状態<select name="status">${selectOptions(labels.contract,prefill.status || "draft","選択")}</select></label><label>開始日<input name="startDate" type="date" value="${esc(prefill.start_date || "")}"></label><label>終了予定日<input name="plannedEndDate" type="date" value="${esc(prefill.planned_end_date || "")}"></label><label>希望連絡方法<select name="preferredContactMethod">${selectOptions(labels.contact,prefill.preferred_contact_method || "line","選択")}</select></label><label>本部確認<select name="headquartersConfirmationStatus">${selectOptions({unconfirmed:"未確認",checking:"確認中",confirmed:"確認済み",not_required:"不要",rejected:"不可"},prefill.headquarters_confirmation_status || "unconfirmed","選択")}</select></label><label class="full">基本作業内容<textarea name="defaultWorkContent">${esc(prefill.default_work_content || "")}</textarea></label><label class="full">お客様向け注意<textarea name="customerNote">${esc(prefill.customer_note || "")}</textarea></label><label class="full">社内メモ<textarea name="internalNote">${esc(prefill.internal_note || "")}</textarea></label></form><p class="owner-form-help">料金、単価、請求、入金はGREEN V1.1では扱いません。</p>`, `<button type="button" class="btn btn--secondary" data-dialog-close>取消</button><button type="button" class="btn btn--primary" id="save-contract">${prefill.id ? "更新" : "登録"}</button>`);
    $("#save-contract").addEventListener("click", async (event) => { try { const data = formDataObject($("#contract-form")); if (prefill.id) delete data.customerId; await withSubmit(event.currentTarget, () => Green.api(prefill.id ? `/api/admin/contracts/${prefill.id}` : "/api/admin/contracts", { method: prefill.id ? "PATCH" : "POST", json: data })); Green.toast(prefill.id ? "利用状態を更新しました。" : "利用状態を登録しました。", "success"); closeDialog(); await loadContracts(); } catch {} });
  }

  async function openContract(id) { loadingDialog("利用状態詳細"); const result = await Green.api(`/api/admin/contracts/${id}`); const { contract, items, visitRules, changes } = result.data; openDialog(`利用番号 ${contract.contract_number}`, "SERVICE STATUS", `<div class="owner-detail-grid">${detail("顧客",state.customerMap.get(contract.customer_id)?.company_name || state.customerMap.get(contract.customer_id)?.contact_name || "未取得")}${detail("状態",labels.contract[contract.status] || contract.status)}${detail("開始日",Green.formatDate(contract.start_date))}${detail("終了予定",Green.formatDate(contract.planned_end_date))}${detail("基本作業",contract.default_work_content || "未設定")}${detail("本部確認",contract.headquarters_confirmation_status)}</div>${miniSection("対象サービス",items.map((i) => `${i.service_type}｜${i.quantity}件`))}${miniSection("訪問ルール",visitRules.map((r) => `${r.frequency_type}／${r.expected_duration_minutes}分`))}${miniSection("変更履歴",changes.map((c) => `${c.change_type}｜${c.status}`))}<div class="owner-dialog-actions"><button class="btn btn--secondary" id="edit-contract">利用状態を編集</button></div>`); $("#edit-contract").addEventListener("click", () => contractForm({ ...contract, id })); }

  function featureValueOf(features, key, fallback) {
    const item = features?.[key];
    return item && typeof item === "object" && "value" in item ? item.value : fallback;
  }

  function optionList(items, valueKey, labelFn, selected = "", blank = "選択してください") {
    return `<option value="">${esc(blank)}</option>${items.map((item) => `<option value="${esc(item[valueKey])}"${item[valueKey] === selected ? " selected" : ""}>${esc(labelFn(item))}</option>`).join("")}`;
  }

  function assetStatusChip(status) { return statusChip(status, "asset"); }
  function locationLabel(asset) {
    const site = state.siteMap.get(asset.current_site_id);
    const primary = labels.location[asset.current_location_type] || asset.current_location_type || "未設定";
    return `<span class="owner-location"><strong>${esc(primary)}</strong>${site ? `<small>${esc(site.site_name)}</small>` : ""}</span>`;
  }

  async function ensureAssetMasterData(force = false) {
    if (!force && state.species.length && state.containerModels.length) return;
    const [speciesResult, modelResult] = await Promise.all([
      Green.api("/api/admin/plant-species"),
      Green.api("/api/admin/container-models"),
    ]);
    state.species = speciesResult.data.items || [];
    state.speciesMap = new Map(state.species.map((item) => [item.id, item]));
    state.containerModels = modelResult.data.items || [];
    state.containerModelMap = new Map(state.containerModels.map((item) => [item.id, item]));
  }

  async function loadAssets() {
    const search = $("#asset-search").value.trim();
    const status = $("#asset-status").value;
    const location = $("#asset-location").value;
    const params = new URLSearchParams({ type: "all", limit: "500" });
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    if (location) params.set("location", location);
    $("#plant-asset-rows").innerHTML = emptyRow(7, "読み込み中です…");
    $("#container-asset-rows").innerHTML = emptyRow(6, "読み込み中です…");
    await Promise.all([ensureSites(), ensureAssetMasterData()]);
    const [assetResult, featureResult] = await Promise.all([
      Green.api(`/api/admin/assets?${params}`),
      Green.api("/api/admin/features"),
    ]);
    state.assetFeatures = featureResult.data.features || {};
    state.plantAssets = assetResult.data.plants || [];
    state.plantAssetMap = new Map(state.plantAssets.map((item) => [item.id, item]));
    state.containerAssets = assetResult.data.containers || [];
    state.containerAssetMap = new Map(state.containerAssets.map((item) => [item.id, item]));
    renderAssetSettings();
    renderPlantAssets();
    renderContainerAssets();
    renderSpecies();
    renderContainerModels();
    setAssetTab(state.assetTab);
  }

  function renderAssetSettings() {
    const f = state.assetFeatures || {};
    $("#asset-plant-mode").value = featureValueOf(f, "plant_management_mode", "asset");
    $("#asset-container-mode").value = featureValueOf(f, "container_management_mode", "with_plant");
    $("#asset-use-qr").checked = Boolean(featureValueOf(f, "use_plant_qr", false));
    $("#asset-use-hq-code").checked = Boolean(featureValueOf(f, "use_headquarters_asset_code", false));
    $("#asset-use-inventory").checked = Boolean(featureValueOf(f, "use_simple_inventory", true));
    const mode = $("#asset-plant-mode").value;
    $("#asset-settings-note").textContent = mode === "count" ? "本数管理では新しい一鉢資産とQRを登録しません。既存の資産履歴は保持されます。" : mode === "hybrid" ? "重要植物は一鉢管理、その他は本数管理として併用できます。" : "すべての植物を一鉢単位で追跡します。";
  }

  async function saveAssetSettings(event) {
    const changes = {
      plant_management_mode: $("#asset-plant-mode").value,
      container_management_mode: $("#asset-container-mode").value,
      use_plant_qr: $("#asset-use-qr").checked,
      use_headquarters_asset_code: $("#asset-use-hq-code").checked,
      use_simple_inventory: $("#asset-use-inventory").checked,
    };
    try {
      const result = await withSubmit(event.currentTarget, () => Green.api("/api/admin/features", { method: "PATCH", json: { changes, reason: "GREEN-6植物・鉢管理設定" } }));
      state.assetFeatures = result.data.features;
      renderAssetSettings();
      Green.toast("管理方式を保存しました。既存データは保持されています。", "success");
      await loadAssets();
    } catch {}
  }

  function setAssetTab(tab) {
    state.assetTab = tab;
    $$('[data-asset-tab]').forEach((button) => button.classList.toggle("is-active", button.dataset.assetTab === tab));
    $$('[data-asset-table]').forEach((table) => { table.hidden = table.dataset.assetTable !== tab; });
  }

  function renderPlantAssets() {
    $("#plant-asset-rows").innerHTML = state.plantAssets.length ? state.plantAssets.map((item) => {
      const species = state.speciesMap.get(item.species_id);
      return `<tr><td><span class="owner-code-badge">${esc(item.asset_code)}</span><span class="owner-row-sub">${esc(item.display_name || "")}</span></td><td><span class="owner-row-title">${esc(species?.common_name || "品種未取得")}</span><span class="owner-row-sub">${esc(species?.scientific_name || "")}</span></td><td>${esc(item.size_code || "未設定")}</td><td>${assetStatusChip(item.asset_status)}</td><td>${locationLabel(item)}</td><td>${statusChip(item.condition_code, "condition")}</td><td><button class="owner-row-action" data-plant-asset="${item.id}">詳細</button></td></tr>`;
    }).join("") : emptyRow(7);
    $$('[data-plant-asset]').forEach((button) => button.addEventListener("click", () => openAsset(button.dataset.plantAsset, "plant")));
  }

  function renderContainerAssets() {
    $("#container-asset-rows").innerHTML = state.containerAssets.length ? state.containerAssets.map((item) => {
      const model = state.containerModelMap.get(item.model_id);
      return `<tr><td><span class="owner-code-badge">${esc(item.container_code)}</span></td><td><span class="owner-row-title">${esc(model?.model_name || "モデル未取得")}</span><span class="owner-row-sub">${esc(model?.size_code || "")}</span></td><td>${assetStatusChip(item.asset_status)}</td><td>${locationLabel(item)}</td><td>${esc(item.condition_note || "未設定")}</td><td><button class="owner-row-action" data-container-asset="${item.id}">詳細</button></td></tr>`;
    }).join("") : emptyRow(6, featureValueOf(state.assetFeatures, "container_management_mode", "with_plant") === "separate_asset" ? "鉢資産はありません。" : "鉢の別資産管理は無効です。");
    $$('[data-container-asset]').forEach((button) => button.addEventListener("click", () => openAsset(button.dataset.containerAsset, "container")));
  }

  function renderSpecies() {
    $("#species-rows").innerHTML = state.species.length ? state.species.map((item) => `<tr><td><span class="owner-code-badge">${esc(item.species_code)}</span></td><td><span class="owner-row-title">${esc(item.common_name)}</span><span class="owner-row-sub">${esc(item.scientific_name || "")}</span></td><td>${esc(item.category || "未設定")}</td><td>${esc({indoor:"屋内",outdoor:"屋外",both:"両方"}[item.indoor_outdoor] || item.indoor_outdoor)}</td><td>${esc(item.default_size_code || "未設定")}</td><td><button class="owner-row-action" data-species="${item.id}">編集</button></td></tr>`).join("") : emptyRow(6);
    $$('[data-species]').forEach((button) => button.addEventListener("click", () => speciesForm(state.speciesMap.get(button.dataset.species))));
  }

  function renderContainerModels() {
    $("#container-model-rows").innerHTML = state.containerModels.length ? state.containerModels.map((item) => `<tr><td><span class="owner-code-badge">${esc(item.model_code)}</span></td><td class="owner-row-title">${esc(item.model_name)}</td><td>${esc({pot:"鉢",cover:"鉢カバー",planter:"プランター",stand:"スタンド",other:"その他"}[item.container_type] || item.container_type)}</td><td>${esc(item.size_code || "未設定")}</td><td>${esc([item.material,item.color_name].filter(Boolean).join("／") || "未設定")}</td><td><button class="owner-row-action" data-container-model="${item.id}">編集</button></td></tr>`).join("") : emptyRow(6);
    $$('[data-container-model]').forEach((button) => button.addEventListener("click", () => containerModelForm(state.containerModelMap.get(button.dataset.containerModel))));
  }

  function speciesForm(prefill = {}) {
    openDialog(prefill.id ? "植物品種を編集" : "植物品種を登録", "PLANT SPECIES", `<form id="species-form" class="owner-form-grid"><label>品種コード<input name="speciesCode" required value="${esc(prefill.species_code || "")}" ${prefill.id ? "readonly" : ""}></label><label>植物名<input name="commonName" required value="${esc(prefill.common_name || "")}"></label><label>学名<input name="scientificName" value="${esc(prefill.scientific_name || "")}"></label><label>分類<input name="category" value="${esc(prefill.category || "")}" placeholder="大型・つる性など"></label><label>屋内外<select name="indoorOutdoor">${selectOptions({indoor:"屋内",outdoor:"屋外",both:"両方"},prefill.indoor_outdoor || "indoor","選択")}</select></label><label>標準サイズ<input name="defaultSizeCode" value="${esc(prefill.default_size_code || "")}" placeholder="S・M・Lなど"></label><label class="full">水やり注意<textarea name="wateringNote">${esc(prefill.watering_note || "")}</textarea></label><label class="full">光環境注意<textarea name="lightNote">${esc(prefill.light_note || "")}</textarea></label><label class="full">管理メモ<textarea name="careNote">${esc(prefill.care_note || "")}</textarea></label></form>`, `<button type="button" class="btn btn--secondary" data-dialog-close>取消</button><button type="button" class="btn btn--primary" id="save-species">${prefill.id ? "更新" : "登録"}</button>`);
    $("#save-species").addEventListener("click", async (event) => { try { await withSubmit(event.currentTarget, () => Green.api(prefill.id ? `/api/admin/plant-species/${prefill.id}` : "/api/admin/plant-species", { method: prefill.id ? "PATCH" : "POST", json: formDataObject($("#species-form")) })); Green.toast(prefill.id ? "植物品種を更新しました。" : "植物品種を登録しました。", "success"); closeDialog(); await ensureAssetMasterData(true); await loadAssets(); } catch {} });
  }

  function containerModelForm(prefill = {}) {
    openDialog(prefill.id ? "鉢モデルを編集" : "鉢モデルを登録", "CONTAINER MODEL", `<form id="container-model-form" class="owner-form-grid"><label>モデルコード<input name="modelCode" required value="${esc(prefill.model_code || "")}" ${prefill.id ? "readonly" : ""}></label><label>モデル名<input name="modelName" required value="${esc(prefill.model_name || "")}"></label><label>種別<select name="containerType">${selectOptions({pot:"鉢",cover:"鉢カバー",planter:"プランター",stand:"スタンド",other:"その他"},prefill.container_type || "pot","選択")}</select></label><label>サイズ<input name="sizeCode" value="${esc(prefill.size_code || "")}"></label><label>素材<input name="material" value="${esc(prefill.material || "")}"></label><label>色<input name="colorName" value="${esc(prefill.color_name || "")}"></label></form>`, `<button type="button" class="btn btn--secondary" data-dialog-close>取消</button><button type="button" class="btn btn--primary" id="save-container-model">${prefill.id ? "更新" : "登録"}</button>`);
    $("#save-container-model").addEventListener("click", async (event) => { try { await withSubmit(event.currentTarget, () => Green.api(prefill.id ? `/api/admin/container-models/${prefill.id}` : "/api/admin/container-models", { method: prefill.id ? "PATCH" : "POST", json: formDataObject($("#container-model-form")) })); Green.toast(prefill.id ? "鉢モデルを更新しました。" : "鉢モデルを登録しました。", "success"); closeDialog(); await ensureAssetMasterData(true); await loadAssets(); } catch {} });
  }

  async function assetTypeChoice() {
    await ensureAssetMasterData();
    const mode = featureValueOf(state.assetFeatures, "plant_management_mode", "asset");
    const containerMode = featureValueOf(state.assetFeatures, "container_management_mode", "with_plant");
    openDialog("資産を登録", "ASSET TYPE", `<div class="owner-dialog-actions is-grid"><button class="btn btn--primary" id="choose-plant" ${mode === "count" ? "disabled" : ""}>植物を一鉢登録</button><button class="btn btn--secondary" id="choose-container" ${containerMode !== "separate_asset" ? "disabled" : ""}>鉢を別資産登録</button></div><p class="owner-form-help">現在：植物は${esc(labels.plantMode[mode])}、鉢は${esc(labels.containerMode[containerMode])}です。</p>`);
    $("#choose-plant").addEventListener("click", () => assetForm("plant"));
    $("#choose-container").addEventListener("click", () => assetForm("container"));
  }

  async function assetForm(type, prefill = {}) {
    await ensureAssetMasterData();
    const useQr = featureValueOf(state.assetFeatures, "use_plant_qr", false);
    const useHq = featureValueOf(state.assetFeatures, "use_headquarters_asset_code", false);
    if (type === "plant") {
      openDialog(prefill.id ? "植物資産を編集" : "植物資産を登録", "PLANT ASSET", `<form id="asset-form" class="owner-form-grid"><input type="hidden" name="assetType" value="plant"><label>資産コード<input name="assetCode" required value="${esc(prefill.asset_code || "")}" ${prefill.id ? "readonly" : ""}></label><label>植物品種<select name="speciesId" ${prefill.id ? "disabled" : ""}>${optionList(state.species,"id",(i)=>`${i.common_name}（${i.species_code}）`,prefill.species_id)}</select></label><label>表示名<input name="displayName" value="${esc(prefill.display_name || "")}"></label><label>サイズ<input name="sizeCode" value="${esc(prefill.size_code || "")}"></label><label>所有区分<select name="ownershipType">${selectOptions({company_rental:"自社レンタル",customer_owned:"顧客所有",headquarters_owned:"本部所有",supplier_owned:"仕入先所有",other:"その他"},prefill.ownership_type || "company_rental","選択")}</select></label><label>植物状態<select name="conditionCode">${selectOptions(labels.condition,prefill.condition_code || "good","選択")}</select></label>${useQr ? `<label>QRコード<input name="qrCode" value="${esc(prefill.qr_code || "")}"></label>` : ""}${useHq ? `<label>本部管理番号<input name="headquartersAssetCode" value="${esc(prefill.headquarters_asset_code || "")}"></label>` : ""}<label>取得日<input type="date" name="acquiredOn" value="${esc(prefill.acquired_on || "")}"></label><label class="full">社内メモ<textarea name="internalNote">${esc(prefill.internal_note || "")}</textarea></label></form>`, `<button type="button" class="btn btn--secondary" data-dialog-close>取消</button><button type="button" class="btn btn--primary" id="save-asset">${prefill.id ? "更新" : "登録"}</button>`);
    } else {
      openDialog(prefill.id ? "鉢資産を編集" : "鉢資産を登録", "CONTAINER ASSET", `<form id="asset-form" class="owner-form-grid"><input type="hidden" name="assetType" value="container"><label>鉢資産コード<input name="containerCode" required value="${esc(prefill.container_code || "")}" ${prefill.id ? "readonly" : ""}></label><label>鉢モデル<select name="modelId" ${prefill.id ? "disabled" : ""}>${optionList(state.containerModels,"id",(i)=>`${i.model_name}（${i.model_code}）`,prefill.model_id)}</select></label>${useQr ? `<label>QRコード<input name="qrCode" value="${esc(prefill.qr_code || "")}"></label>` : ""}${useHq ? `<label>本部管理番号<input name="headquartersAssetCode" value="${esc(prefill.headquarters_asset_code || "")}"></label>` : ""}<label class="full">状態メモ<textarea name="conditionNote">${esc(prefill.condition_note || "")}</textarea></label></form>`, `<button type="button" class="btn btn--secondary" data-dialog-close>取消</button><button type="button" class="btn btn--primary" id="save-asset">${prefill.id ? "更新" : "登録"}</button>`);
    }
    $("#save-asset").addEventListener("click", async (event) => { try { const data = formDataObject($("#asset-form")); const path = prefill.id ? `/api/admin/assets/${prefill.id}` : "/api/admin/assets"; await withSubmit(event.currentTarget, () => Green.api(path, { method: prefill.id ? "PATCH" : "POST", json: data })); Green.toast(prefill.id ? "資産を更新しました。" : "資産を登録しました。", "success"); closeDialog(); await loadAssets(); } catch {} });
  }

  async function openAsset(id, type) {
    loadingDialog("資産詳細");
    const result = await Green.api(`/api/admin/assets/${id}?type=${type}`);
    const { asset, movements, pairs } = result.data;
    const species = type === "plant" ? state.speciesMap.get(asset.species_id) : null;
    const model = type === "container" ? state.containerModelMap.get(asset.model_id) : null;
    const title = type === "plant" ? `${asset.asset_code} ${asset.display_name || species?.common_name || ""}` : `${asset.container_code} ${model?.model_name || ""}`;
    const pairText = pairs.find((p) => p.is_current);
    openDialog(title, type === "plant" ? "PLANT ASSET" : "CONTAINER ASSET", `<div class="owner-asset-summary"><div><small>状態</small><strong>${esc(labels.asset[asset.asset_status] || asset.asset_status)}</strong></div><div><small>現在地</small><strong>${esc(labels.location[asset.current_location_type] || asset.current_location_type)}</strong></div><div><small>${type === "plant" ? "植物状態" : "モデル"}</small><strong>${esc(type === "plant" ? (labels.condition[asset.condition_code] || asset.condition_code) : (model?.model_name || "未取得"))}</strong></div><div><small>更新</small><strong>${esc(formatDateTime(asset.updated_at))}</strong></div></div><div class="owner-detail-grid">${detail(type === "plant" ? "植物" : "鉢モデル",type === "plant" ? species?.common_name || "未取得" : model?.model_name || "未取得")}${detail("サイズ",type === "plant" ? asset.size_code || "未設定" : model?.size_code || "未設定")}${detail("拠点",state.siteMap.get(asset.current_site_id)?.site_name || "未設定")}${detail("QR",asset.qr_code || "未使用")}${detail("本部番号",asset.headquarters_asset_code || "未使用")}${detail("ペア",pairText ? (type === "plant" ? state.containerAssetMap.get(pairText.container_asset_id)?.container_code : state.plantAssetMap.get(pairText.plant_asset_id)?.asset_code) || "設定済み" : "なし")}</div><section class="owner-dialog-section"><h3>移動履歴</h3><div class="owner-movement-list">${movements.length ? movements.slice(0,10).map((m)=>`<div class="owner-movement-item"><strong>${esc(labels.movement[m.movement_type] || m.movement_type)}</strong><span>${esc(labels.location[m.from_location_type] || m.from_location_type || "未設定")} → ${esc(labels.location[m.to_location_type] || m.to_location_type || "未設定")}</span><small>${formatDateTime(m.moved_at)}</small></div>`).join("") : '<div class="owner-empty">移動履歴はありません。</div>'}</div></section><div class="owner-dialog-actions is-grid"><button class="btn btn--secondary" id="edit-asset">基本情報を編集</button><button class="btn btn--primary" id="move-asset">移動を登録</button>${type === "plant" && featureValueOf(state.assetFeatures,"container_management_mode","with_plant") === "separate_asset" ? '<button class="btn btn--secondary" id="pair-asset">鉢と組み合わせ</button>' : ""}</div>`);
    $("#edit-asset").addEventListener("click", () => assetForm(type, { ...asset, id }));
    $("#move-asset").addEventListener("click", () => assetMoveForm(asset, type));
    if ($("#pair-asset")) $("#pair-asset").addEventListener("click", () => assetPairForm(asset));
  }

  async function assetMoveForm(asset, type) {
    await ensureSites();
    openDialog("資産移動を登録", "ASSET MOVEMENT", `<form id="asset-move-form" class="owner-form-grid"><input type="hidden" name="assetType" value="${type}"><label>移動種別<select name="movementType">${selectOptions(labels.movement,"transfer","選択")}</select></label><label>移動先<select name="toLocationType" id="move-location">${selectOptions(labels.location,asset.current_location_type,"選択")}</select></label><label>顧客拠点<select name="siteId" id="move-site">${optionList(state.sites,"id",(i)=>i.site_name,asset.current_site_id,"拠点を選択")}</select></label><label>設置場所<select name="siteAreaId" id="move-area"><option value="">設置場所を選択</option></select></label><label class="full">理由・メモ<textarea name="reason"></textarea></label></form><p class="owner-form-help">顧客拠点以外へ移動する場合、拠点と設置場所は空欄にします。</p>`, '<button type="button" class="btn btn--secondary" data-dialog-close>取消</button><button type="button" class="btn btn--primary" id="save-asset-move">移動を登録</button>');
    const updateAreas = async () => { const siteId = $("#move-site").value; if (!siteId) { $("#move-area").innerHTML = '<option value="">設置場所を選択</option>'; return; } const result = await Green.api(`/api/admin/sites/${siteId}`); $("#move-area").innerHTML = optionList(result.data.areas || [],"id",(i)=>i.area_name,asset.current_site_area_id,"設置場所を選択"); };
    $("#move-site").addEventListener("change", updateAreas); await updateAreas();
    $("#move-location").addEventListener("change", () => { const customer = $("#move-location").value === "customer_site"; $("#move-site").disabled = !customer; $("#move-area").disabled = !customer; if (!customer) { $("#move-site").value = ""; $("#move-area").value = ""; } });
    $("#move-location").dispatchEvent(new Event("change"));
    $("#save-asset-move").addEventListener("click", async (event) => { try { await withSubmit(event.currentTarget, () => Green.api(`/api/admin/assets/${asset.id}/move`, { method: "POST", json: formDataObject($("#asset-move-form")) })); Green.toast("資産の現在地と移動履歴を更新しました。", "success"); closeDialog(); await loadAssets(); } catch {} });
  }

  function assetPairForm(plant) {
    const available = state.containerAssets.filter((c) => c.is_active && !["disposed","returned"].includes(c.asset_status));
    openDialog("植物と鉢を組み合わせ", "ASSET PAIR", `<form id="asset-pair-form" class="owner-form-grid"><input type="hidden" name="plantAssetId" value="${plant.id}"><label class="full">鉢資産<select name="containerAssetId">${optionList(available,"id",(i)=>`${i.container_code}／${state.containerModelMap.get(i.model_id)?.model_name || "モデル未取得"}`,"","鉢資産を選択")}</select></label><label class="full">メモ<textarea name="note"></textarea></label></form>`, '<button type="button" class="btn btn--secondary" data-dialog-close>取消</button><button type="button" class="btn btn--primary" id="save-asset-pair">組み合わせる</button>');
    $("#save-asset-pair").addEventListener("click", async (event) => { try { await withSubmit(event.currentTarget, () => Green.api("/api/admin/assets/pair", { method: "POST", json: formDataObject($("#asset-pair-form")) })); Green.toast("植物と鉢を組み合わせました。", "success"); closeDialog(); await loadAssets(); } catch {} });
  }

  async function loadInstallations() {
    const status = $("#installation-status").value;
    $("#installation-rows").innerHTML = emptyRow(7, "読み込み中です…");
    await Promise.all([ensureCustomers(), ensureSites()]);
    const result = await Green.api(`/api/admin/installations${status ? `?status=${encodeURIComponent(status)}` : ""}`);
    state.installations = result.data.items || [];
    $("#installation-rows").innerHTML = state.installations.length ? state.installations.map((item) => `<tr><td><span class="owner-code-badge">${esc(item.installation_number)}</span></td><td><span class="owner-row-title">${esc(state.customerMap.get(item.customer_id)?.company_name || state.customerMap.get(item.customer_id)?.contact_name || "顧客未取得")}</span><span class="owner-row-sub">${esc(state.siteMap.get(item.site_id)?.site_name || "拠点未取得")}</span></td><td>${esc(labels.plantMode[item.management_mode] || item.management_mode)}</td><td>${statusChip(item.status,"installation")}</td><td>${formatDateTime(item.scheduled_at)}</td><td>${formatDateTime(item.updated_at)}</td><td><button class="owner-row-action" data-installation="${item.id}">詳細</button></td></tr>`).join("") : emptyRow(7);
    $$('[data-installation]').forEach((button) => button.addEventListener("click", () => openInstallation(button.dataset.installation)));
  }

  async function installationForm(prefill = {}) {
    await Promise.all([ensureCustomers(), ensureSites()]);
    const featureResult = await Green.api("/api/admin/features");
    const mode = featureValueOf(featureResult.data.features,"plant_management_mode","asset");
    openDialog("設置計画を登録", "INSTALLATION PLAN", `<form id="installation-form" class="owner-form-grid"><label>顧客<select name="customerId" id="installation-customer">${customerOptions(prefill.customer_id || "")}</select></label><label>拠点<select name="siteId" id="installation-site">${siteOptions(prefill.site_id || "",prefill.customer_id || "")}</select></label><label>管理方式<select name="managementMode">${selectOptions(labels.plantMode,mode,"選択")}</select></label><label>状態<select name="status">${selectOptions(labels.installation,"planning","選択")}</select></label><label>設置予定日時<input type="datetime-local" name="scheduledAt"></label><label class="full">お客様向けコメント<textarea name="customerComment"></textarea></label><label class="full">社内メモ<textarea name="internalNote"></textarea></label></form>`, '<button type="button" class="btn btn--secondary" data-dialog-close>取消</button><button type="button" class="btn btn--primary" id="save-installation">登録</button>');
    $("#installation-customer").addEventListener("change", () => { $("#installation-site").innerHTML = siteOptions("",$("#installation-customer").value); });
    $("#save-installation").addEventListener("click", async (event) => { try { await withSubmit(event.currentTarget, () => Green.api("/api/admin/installations", { method: "POST", json: formDataObject($("#installation-form")) })); Green.toast("設置計画を登録しました。", "success"); closeDialog(); await loadInstallations(); } catch {} });
  }

  async function openInstallation(id) {
    loadingDialog("設置計画詳細");
    await ensureAssetMasterData();
    if (!state.plantAssets.length) { const assets = await Green.api("/api/admin/assets?type=all&limit=500"); state.plantAssets = assets.data.plants || []; state.plantAssetMap = new Map(state.plantAssets.map((i)=>[i.id,i])); state.containerAssets = assets.data.containers || []; state.containerAssetMap = new Map(state.containerAssets.map((i)=>[i.id,i])); }
    const result = await Green.api(`/api/admin/installations/${id}`);
    const { installation, items, counts } = result.data;
    const itemLines = items.map((i)=>`${state.plantAssetMap.get(i.plant_asset_id)?.asset_code || "植物未取得"}／${i.item_status}／${i.placement_note || "メモなし"}`);
    const countLines = counts.map((i)=>`${state.speciesMap.get(i.species_id)?.common_name || "品種未取得"} ${i.size_code || ""} × ${i.active_quantity}`);
    openDialog(`設置 ${installation.installation_number}`, "INSTALLATION DETAIL", `<div class="owner-detail-grid">${detail("顧客",state.customerMap.get(installation.customer_id)?.company_name || state.customerMap.get(installation.customer_id)?.contact_name || "未取得")}${detail("拠点",state.siteMap.get(installation.site_id)?.site_name || "未取得")}${detail("管理方式",labels.plantMode[installation.management_mode] || installation.management_mode)}${detail("状態",labels.installation[installation.status] || installation.status)}${detail("設置予定",formatDateTime(installation.scheduled_at))}${detail("設置完了",formatDateTime(installation.installed_at))}</div>${miniSection("一鉢資産",itemLines)}${miniSection("本数管理",countLines)}<div class="owner-dialog-actions is-grid">${["asset","hybrid"].includes(installation.management_mode) && !["installed","cancelled"].includes(installation.status) ? '<button class="btn btn--secondary" id="add-installation-asset">植物資産を追加</button>' : ""}${["count","hybrid"].includes(installation.management_mode) && !["installed","cancelled"].includes(installation.status) ? '<button class="btn btn--secondary" id="add-installation-count">本数を追加</button>' : ""}${!["installed","cancelled"].includes(installation.status) ? '<button class="btn btn--primary" id="complete-installation">設置完了</button>' : ""}</div>`);
    if ($("#add-installation-asset")) $("#add-installation-asset").addEventListener("click", () => installationAssetForm(installation));
    if ($("#add-installation-count")) $("#add-installation-count").addEventListener("click", () => installationCountForm(installation));
    if ($("#complete-installation")) $("#complete-installation").addEventListener("click", async (event) => { if (!confirm("設置植物の現在地を顧客拠点へ変更し、設置完了にしますか？")) return; try { await withSubmit(event.currentTarget, () => Green.api(`/api/admin/installations/${id}/complete`, { method: "POST", json: {} }), "完了処理中…"); Green.toast("設置を完了し、資産の現在地を更新しました。", "success"); closeDialog(); await Promise.all([loadInstallations(),loadAssets()]); } catch {} });
  }

  async function installationAssetForm(installation) {
    const siteResult = await Green.api(`/api/admin/sites/${installation.site_id}`);
    const candidates = state.plantAssets.filter((a)=>a.is_active && !["installed","disposed","returned","inactive"].includes(a.asset_status));
    const containers = state.containerAssets.filter((a)=>a.is_active && !["installed","disposed","returned","inactive"].includes(a.asset_status));
    openDialog("設置植物を追加", "INSTALLATION ASSET", `<form id="installation-asset-form" class="owner-form-grid"><label class="full">植物資産<select name="plantAssetId">${optionList(candidates,"id",(i)=>`${i.asset_code}／${state.speciesMap.get(i.species_id)?.common_name || "品種未取得"}`,"","植物を選択")}</select></label><label>設置場所<select name="siteAreaId">${optionList(siteResult.data.areas || [],"id",(i)=>i.area_name,"","設置場所を選択")}</select></label><label>鉢資産<select name="containerAssetId">${optionList(containers,"id",(i)=>i.container_code,"","鉢なし・一体管理")}</select></label><label class="full">配置メモ<textarea name="placementNote"></textarea></label></form>`, '<button type="button" class="btn btn--secondary" data-dialog-close>取消</button><button type="button" class="btn btn--primary" id="save-installation-asset">追加</button>');
    $("#save-installation-asset").addEventListener("click", async (event) => { try { await withSubmit(event.currentTarget, () => Green.api(`/api/admin/installations/${installation.id}/items`, { method: "POST", json: formDataObject($("#installation-asset-form")) })); Green.toast("植物を設置計画へ確保しました。", "success"); openInstallation(installation.id); } catch {} });
  }

  async function installationCountForm(installation) {
    const siteResult = await Green.api(`/api/admin/sites/${installation.site_id}`);
    openDialog("設置本数を追加", "INSTALLATION COUNT", `<form id="installation-count-form" class="owner-form-grid"><label>植物品種<select name="speciesId">${optionList(state.species,"id",(i)=>i.common_name,"","植物を選択")}</select></label><label>サイズ<input name="sizeCode"></label><label>数量<input type="number" min="1" name="quantity" value="1"></label><label>設置場所<select name="siteAreaId">${optionList(siteResult.data.areas || [],"id",(i)=>i.area_name,"","設置場所を選択")}</select></label><label class="full">配置メモ<textarea name="placementNote"></textarea></label></form>`, '<button type="button" class="btn btn--secondary" data-dialog-close>取消</button><button type="button" class="btn btn--primary" id="save-installation-count">追加</button>');
    $("#save-installation-count").addEventListener("click", async (event) => { try { await withSubmit(event.currentTarget, () => Green.api(`/api/admin/installations/${installation.id}/counts`, { method: "POST", json: formDataObject($("#installation-count-form")) })); Green.toast("設置本数を追加しました。", "success"); openInstallation(installation.id); } catch {} });
  }

  async function loadStock() {
    const search = $("#stock-search").value.trim();
    $("#stock-rows").innerHTML = emptyRow(9, "読み込み中です…");
    try {
      const result = await Green.api(`/api/admin/stock${search ? `?search=${encodeURIComponent(search)}` : ""}`);
      state.stockItems = result.data.items || [];
      $("#stock-rows").innerHTML = state.stockItems.length ? state.stockItems.map((item) => { const warning = item.is_active && item.available_quantity <= item.warning_threshold; return `<tr><td><span class="owner-code-badge">${esc(item.stock_code)}</span></td><td><span class="owner-row-title">${esc(item.item_name)}</span><span class="owner-row-sub">${esc(item.size_code || item.item_type)}</span></td><td>${esc(item.storage_location || "未設定")}</td><td>${item.current_quantity}</td><td>${item.available_quantity}</td><td>${item.reserved_quantity}</td><td>${item.care_quantity}</td><td>${warning ? '<span class="owner-warning-number">不足</span>' : "正常"}</td><td><button class="owner-row-action" data-stock="${item.id}">詳細</button></td></tr>`; }).join("") : emptyRow(9);
      $$('[data-stock]').forEach((button) => button.addEventListener("click", () => openStock(button.dataset.stock)));
    } catch (error) {
      $("#stock-rows").innerHTML = emptyRow(9, error.code === "feature_disabled" ? "簡易在庫は現在OFFです。植物・鉢台帳の管理方式からONにできます。" : error.message);
      throw error;
    }
  }

  async function stockForm() {
    await ensureAssetMasterData();
    openDialog("在庫品目を登録", "SIMPLE STOCK", `<form id="stock-form" class="owner-form-grid"><label>在庫コード<input name="stockCode" required></label><label>品目名<input name="itemName" required></label><label>種別<select name="itemType">${selectOptions({plant:"植物",container:"鉢",cover:"鉢カバー",planter:"プランター",supply:"資材",other:"その他"},"plant","選択")}</select></label><label>サイズ<input name="sizeCode"></label><label>保管場所<input name="storageLocation"></label><label>植物品種<select name="speciesId">${optionList(state.species,"id",(i)=>i.common_name,"","該当なし")}</select></label><label>鉢モデル<select name="containerModelId">${optionList(state.containerModels,"id",(i)=>i.model_name,"","該当なし")}</select></label><label>現在数<input type="number" min="0" name="currentQuantity" value="0"></label><label>利用可能数<input type="number" min="0" name="availableQuantity" value="0"></label><label>予約済み<input type="number" min="0" name="reservedQuantity" value="0"></label><label>養生中<input type="number" min="0" name="careQuantity" value="0"></label><label>不足警告基準<input type="number" min="0" name="warningThreshold" value="0"></label></form><p class="owner-form-help">仕入金額、原価、在庫評価は登録しません。</p>`, '<button type="button" class="btn btn--secondary" data-dialog-close>取消</button><button type="button" class="btn btn--primary" id="save-stock">登録</button>');
    $("#save-stock").addEventListener("click", async (event) => { try { await withSubmit(event.currentTarget, () => Green.api("/api/admin/stock", { method: "POST", json: formDataObject($("#stock-form")) })); Green.toast("在庫品目を登録しました。", "success"); closeDialog(); await loadStock(); } catch {} });
  }

  async function openStock(id) {
    loadingDialog("在庫詳細");
    const result = await Green.api(`/api/admin/stock?itemId=${id}`);
    const item = result.data.items.find((i)=>i.id === id);
    const movements = result.data.movements || [];
    const stocktakes = result.data.stocktakes || [];
    openDialog(item.item_name, "STOCK DETAIL", `<div class="owner-asset-summary"><div><small>現在数</small><strong>${item.current_quantity}</strong></div><div><small>利用可能</small><strong>${item.available_quantity}</strong></div><div><small>予約済み</small><strong>${item.reserved_quantity}</strong></div><div><small>養生中</small><strong>${item.care_quantity}</strong></div></div><div class="owner-detail-grid">${detail("在庫コード",item.stock_code)}${detail("保管場所",item.storage_location || "未設定")}${detail("警告基準",item.warning_threshold)}${detail("状態",item.is_active ? "有効" : "無効")}</div><section class="owner-dialog-section"><h3>最近の入出庫</h3><div class="owner-movement-list">${movements.length ? movements.slice(0,8).map((m)=>`<div class="owner-movement-item"><strong>${esc(labels.stockMovement[m.movement_type] || m.movement_type)}</strong><span>${m.quantity_delta > 0 ? "+" : ""}${m.quantity_delta}</span><small>${formatDateTime(m.occurred_at)}</small></div>`).join("") : '<div class="owner-empty">入出庫履歴はありません。</div>'}</div></section>${miniSection("棚卸",stocktakes.slice(0,5).map((t)=>`${Green.formatDate(t.counted_at)}｜実数 ${t.counted_quantity}／差異 ${t.difference_quantity}`))}<div class="owner-dialog-actions is-grid"><button class="btn btn--primary" id="stock-move">入出庫を登録</button><button class="btn btn--secondary" id="stocktake">棚卸を登録</button></div>`);
    $("#stock-move").addEventListener("click", () => stockMoveForm(item));
    $("#stocktake").addEventListener("click", () => stocktakeForm(item));
  }


  function setVisitTab(tab) {
    state.visitTab = tab;
    $$('[data-visit-tab]').forEach((button) => button.classList.toggle('is-active', button.dataset.visitTab === tab));
    $$('[data-visit-panel]').forEach((panel) => { panel.hidden = panel.dataset.visitPanel !== tab; });
    if (tab === 'rules') loadVisitRules().catch((error) => Green.toast(error.message, 'error'));
  }

  async function ensureStaff(force = false) {
    if (!force && state.staff.length) return state.staff;
    const result = await Green.api('/api/admin/staff');
    state.staff = result.data.items || [];
    state.staffMap = new Map(state.staff.map((item) => [item.id, item]));
    $('#visit-staff').innerHTML = `<option value="">すべて</option>${state.staff.filter((item) => item.status === 'active').map((item) => `<option value="${item.id}">${esc(item.display_name)}（${esc(item.staff_code)}）</option>`).join('')}`;
    return state.staff;
  }

  async function ensureContracts(force = false) {
    if (!force && state.contracts.length) return state.contracts;
    const result = await Green.api('/api/admin/contracts?limit=500');
    state.contracts = result.data.items || [];
    state.contractMap = new Map(state.contracts.map((item) => [item.id, item]));
    return state.contracts;
  }

  function staffOptions(selected = '') {
    return `<option value="">担当者を選択</option>${state.staff.filter((item) => item.status === 'active').map((item) => `<option value="${item.id}"${item.id === selected ? ' selected' : ''}>${esc(item.display_name)}（${esc(item.staff_code)}）</option>`).join('')}`;
  }

  function contractOptions(selected = '') {
    return `<option value="">利用状態を選択</option>${state.contracts.filter((item) => ['scheduled','active','change_pending'].includes(item.status)).map((item) => `<option value="${item.id}"${item.id === selected ? ' selected' : ''}>${esc(item.contract_number)}／${esc(state.customerMap.get(item.customer_id)?.company_name || state.customerMap.get(item.customer_id)?.contact_name || '顧客')}</option>`).join('')}`;
  }

  async function loadVisits() {
    await ensureStaff();
    const params = new URLSearchParams();
    const from = $('#visit-from').value; const to = $('#visit-to').value;
    if (from) params.set('from', from); if (to) params.set('to', to);
    if ($('#visit-status').value) params.set('status', $('#visit-status').value);
    if ($('#visit-staff').value) params.set('staffId', $('#visit-staff').value);
    if ($('#visit-search').value.trim()) params.set('search', $('#visit-search').value.trim());
    $('#visit-rows').innerHTML = emptyRow(7, '読み込み中です…');
    const result = await Green.api(`/api/admin/visits?${params}`);
    state.visits = result.data.items || [];
    state.visitMap = new Map(state.visits.map((item) => [item.id, item]));
    const counts = {
      total: state.visits.length,
      unassigned: state.visits.filter((item) => !item.assignments?.length).length,
      working: state.visits.filter((item) => ['arrived','working','paused'].includes(item.status)).length,
      completed: state.visits.filter((item) => item.status === 'completed').length,
      unavailable: state.visits.filter((item) => ['unavailable','revisit_required'].includes(item.status)).length,
    };
    $('#visit-summary').innerHTML = Object.entries({ '予定': counts.total, '未割当': counts.unassigned, '作業中': counts.working, '完了': counts.completed, '訪問できず・再訪問': counts.unavailable }).map(([label, count]) => `<div><small>${label}</small><strong>${count}</strong></div>`).join('');
    $('#visit-rows').innerHTML = state.visits.length ? state.visits.map((item) => {
      const primary = item.assignments?.find((assignment) => assignment.assignment_role === 'primary') || item.assignments?.[0];
      const routeOrder = item.route?.route_order || '—';
      const time = [Green.formatTime(item.planned_time_from), item.planned_time_to ? Green.formatTime(item.planned_time_to) : ''].filter(Boolean).join('〜');
      return `<tr><td><span class="owner-route-order">${esc(routeOrder)}</span></td><td><span class="owner-row-title">${Green.formatDate(item.planned_date)}</span><span class="owner-row-sub">${esc(time)}</span></td><td><span class="owner-row-title">${esc(item.customer?.company_name || item.customer?.contact_name || '顧客')}</span><span class="owner-row-sub">${esc(item.site?.site_name || '拠点未設定')}</span></td><td>${esc(item.planned_work || '定期メンテナンス')}<span class="owner-row-sub">${esc(labels.visitType[item.visit_type] || item.visit_type)}</span></td><td>${primary ? esc(primary.staff?.display_name || state.staffMap.get(primary.staff_id)?.display_name || '担当') : '<span class="owner-warning-number">未割当</span>'}</td><td>${statusChip(item.status, 'visit')}</td><td><button class="owner-row-action" data-visit="${item.id}">詳細</button></td></tr>`;
    }).join('') : emptyRow(7);
    $$('[data-visit]').forEach((button) => button.addEventListener('click', () => openVisit(button.dataset.visit)));
    if (state.visitTab === 'rules') await loadVisitRules();
  }

  async function loadVisitRules() {
    await Promise.all([ensureCustomers(), ensureSites(), ensureContracts()]);
    $('#visit-rule-rows').innerHTML = emptyRow(7, '読み込み中です…');
    const result = await Green.api('/api/admin/visit-rules');
    state.visitRules = result.data.items || [];
    $('#visit-rule-rows').innerHTML = state.visitRules.length ? state.visitRules.map((rule) => {
      const contract = state.contractMap.get(rule.contract_id);
      const site = state.siteMap.get(rule.site_id);
      const days = (rule.weekdays || []).map((day) => labels.weekday[day] || day).join('・') || '基準日';
      const time = rule.preferred_time_from ? `${Green.formatTime(rule.preferred_time_from)}〜${rule.preferred_time_to ? Green.formatTime(rule.preferred_time_to) : '未定'}` : '時間未定';
      return `<tr><td><span class="owner-code-badge">${esc(rule.rule_code)}</span>${rule.is_active ? '' : '<span class="owner-row-sub">停止中</span>'}</td><td>${esc(contract?.contract_number || rule.contract_id)}</td><td>${esc(site?.site_name || rule.site_id)}</td><td>${esc(labels.frequency[rule.frequency_type] || rule.frequency_type)}<span class="owner-row-sub">間隔 ${rule.interval_value}</span></td><td>${esc(days)}<span class="owner-row-sub">${esc(time)}／${rule.expected_duration_minutes}分</span></td><td>${Green.formatDate(rule.active_from)}〜${rule.active_until ? Green.formatDate(rule.active_until) : '終了未定'}</td><td><button class="owner-row-action" data-rule-edit="${rule.id}">編集</button></td></tr>`;
    }).join('') : emptyRow(7);
    $$('[data-rule-edit]').forEach((button) => button.addEventListener('click', () => visitRuleForm(state.visitRules.find((rule) => rule.id === button.dataset.ruleEdit) || {})));
  }

  async function openVisit(id) {
    loadingDialog('訪問予定詳細');
    try {
      await ensureStaff();
      const result = await Green.api(`/api/admin/visits/${id}`);
      const { visit, customer, site, assignments, route, logs, report } = result.data;
      const primary = assignments.find((assignment) => assignment.assignment_role === 'primary') || assignments[0];
      openDialog(`訪問 ${visit.visit_number}`, 'VISIT DETAIL', `<div class="owner-detail-grid">
        ${detail('訪問日', Green.formatDate(visit.planned_date))}${detail('時間帯', `${Green.formatTime(visit.planned_time_from)}〜${visit.planned_time_to ? Green.formatTime(visit.planned_time_to) : '未定'}`)}${detail('状態', labels.visit[visit.status] || visit.status)}${detail('訪問種別', labels.visitType[visit.visit_type] || visit.visit_type)}${detail('顧客', customer.company_name || customer.contact_name)}${detail('拠点', site.site_name)}${detail('担当', primary ? state.staffMap.get(primary.staff_id)?.display_name || primary.staff_id : '未割当')}${detail('訪問順', route?.route_order || '未設定')}
      </div><section class="owner-dialog-section"><h3>予定作業</h3><div class="owner-mini-item">${esc(visit.planned_work || '未設定').replace(/\n/g,'<br>')}</div></section>
      ${visit.customer_visible_note ? `<section class="owner-dialog-section"><h3>お客様向け注意</h3><div class="owner-mini-item">${esc(visit.customer_visible_note)}</div></section>` : ''}
      ${miniSection('進行履歴', (logs || []).map((log) => `${formatDateTime(log.event_at)}｜${labels.visitEvent[log.event_type] || log.event_type}${log.note ? `｜${log.note}` : ''}`))}
      ${report ? `<section class="owner-dialog-section"><h3>作業報告</h3><div class="owner-mini-item">${esc(report.report_number)}／${esc(report.report_status)}</div></section>` : ''}
      <div class="owner-dialog-actions"><button class="btn btn--secondary" id="edit-visit">予定を編集</button><button class="btn btn--primary" id="assign-visit">担当・順番を設定</button></div>`);
      $('#edit-visit').addEventListener('click', () => visitForm(visit));
      $('#assign-visit').addEventListener('click', () => assignVisitForm(visit, primary?.staff_id || route?.staff_id || '', route?.route_order || ''));
    } catch (error) { openDialog('読み込みエラー', 'ERROR', `<div class="form-error">${esc(error.message)}</div>`); }
  }

  async function visitForm(prefill = {}) {
    await Promise.all([ensureCustomers(), ensureSites(), ensureContracts()]);
    const customerId = prefill.customer_id || '';
    openDialog(prefill.id ? '訪問予定を編集' : '訪問予定を登録', 'VISIT SCHEDULE', `<form id="visit-form" class="owner-form-grid">
      ${prefill.id ? '' : `<label>顧客<select name="customerId" id="visit-customer" required>${customerOptions(customerId)}</select></label><label>拠点<select name="siteId" id="visit-site" required>${siteOptions(prefill.site_id || '', customerId)}</select></label>`}
      ${prefill.id ? '' : `<label>利用状態<select name="contractId">${contractOptions(prefill.contract_id || '')}</select></label>`}<label>訪問種別<select name="visitType">${selectOptions(labels.visitType, prefill.visit_type || 'regular', '選択')}</select></label>
      <label>訪問日<input type="date" name="plannedDate" required value="${esc(prefill.planned_date || $('#visit-from').value)}"></label><label>開始時刻<input type="time" name="plannedTimeFrom" value="${esc((prefill.planned_time_from || '').slice(0,5))}"></label><label>終了時刻<input type="time" name="plannedTimeTo" value="${esc((prefill.planned_time_to || '').slice(0,5))}"></label><label>標準時間（分）<input type="number" min="15" max="1440" step="15" name="expectedDurationMinutes" value="${esc(prefill.expected_duration_minutes || 60)}"></label>
      <label class="full">予定作業<textarea name="plannedWork">${esc(prefill.planned_work || '定期メンテナンス')}</textarea></label><label>ルートエリア<input name="routeArea" value="${esc(prefill.route_area || '')}"></label><label class="full">お客様向け注意<textarea name="customerVisibleNote">${esc(prefill.customer_visible_note || '')}</textarea></label><label class="full">社内メモ<textarea name="internalNote">${esc(prefill.internal_note || '')}</textarea></label>
    </form>`, `<button type="button" class="btn btn--secondary" data-dialog-close>取消</button><button type="button" class="btn btn--primary" id="save-visit">${prefill.id ? '更新' : '登録'}</button>`);
    if (!prefill.id) $('#visit-customer').addEventListener('change', () => { $('#visit-site').innerHTML = siteOptions('', $('#visit-customer').value); });
    $('#save-visit').addEventListener('click', async (event) => { try { const data = formDataObject($('#visit-form')); await withSubmit(event.currentTarget, () => Green.api(prefill.id ? `/api/admin/visits/${prefill.id}` : '/api/admin/visits', { method: prefill.id ? 'PATCH' : 'POST', json: data })); Green.toast(prefill.id ? '訪問予定を更新しました。' : '訪問予定を登録しました。', 'success'); closeDialog(); await loadVisits(); } catch {} });
  }

  async function assignVisitForm(visit, selectedStaff = '', selectedOrder = '') {
    await ensureStaff();
    openDialog('担当・訪問順を設定', 'ASSIGN & ROUTE', `<form id="visit-assign-form" class="owner-form-grid"><input type="hidden" name="visitId" value="${visit.id}"><label>担当スタッフ<select name="staffId" required>${staffOptions(selectedStaff)}</select></label><label>担当区分<select name="assignmentRole">${selectOptions(labels.assignmentRole, 'primary', '選択')}</select></label><label>訪問順<input type="number" min="1" max="999" name="routeOrder" value="${esc(selectedOrder)}"></label><label>訪問日<input value="${esc(visit.planned_date)}" disabled></label></form><p class="owner-form-help">主担当を変更すると、以前の主担当は無効化されます。</p>`, '<button type="button" class="btn btn--secondary" data-dialog-close>取消</button><button type="button" class="btn btn--primary" id="save-visit-assignment">保存</button>');
    $('#save-visit-assignment').addEventListener('click', async (event) => { try { const data = formDataObject($('#visit-assign-form')); await withSubmit(event.currentTarget, () => Green.api('/api/admin/visits/assign', { method: 'POST', json: data })); if (data.routeOrder) await Green.api('/api/admin/visits/reorder', { method: 'POST', json: { visitId: visit.id, staffId: data.staffId, routeOrder: data.routeOrder } }); Green.toast('担当と訪問順を設定しました。', 'success'); closeDialog(); await loadVisits(); } catch {} });
  }

  function generateVisitsForm() {
    openDialog('訪問予定を一括生成', 'GENERATE VISITS', `<form id="visit-generate-form" class="owner-form-grid"><label>開始日<input type="date" name="fromDate" required value="${esc($('#visit-from').value)}"></label><label>終了日<input type="date" name="toDate" required value="${esc($('#visit-to').value)}"></label></form><div class="owner-inline-note">利用中の定期訪問ルールから予定を生成します。同じルール・同じ日付は重複生成されません。</div>`, '<button type="button" class="btn btn--secondary" data-dialog-close>取消</button><button type="button" class="btn btn--primary" id="run-visit-generation">生成する</button>');
    $('#run-visit-generation').addEventListener('click', async (event) => { try { const result = await withSubmit(event.currentTarget, () => Green.api('/api/admin/visits/generate', { method: 'POST', json: formDataObject($('#visit-generate-form')) }), '生成中…'); Green.toast(`${result.data.inserted || 0}件の予定を生成しました。`, 'success'); closeDialog(); await loadVisits(); } catch {} });
  }

  async function visitRuleForm(prefill = {}) {
    await Promise.all([ensureCustomers(), ensureSites(), ensureContracts()]);
    const weekdays = new Set(prefill.weekdays || []);
    openDialog(prefill.id ? '定期訪問ルールを編集' : '定期訪問ルールを登録', 'VISIT RULE', `<form id="visit-rule-form" class="owner-form-grid">
      ${prefill.id ? '' : `<label>利用状態<select name="contractId" id="rule-contract" required>${contractOptions(prefill.contract_id || '')}</select></label><label>拠点<select name="siteId" required>${siteOptions(prefill.site_id || '')}</select></label>`}
      <label>頻度<select name="frequencyType">${selectOptions(labels.frequency, prefill.frequency_type || 'monthly', '選択')}</select></label><label>間隔<input type="number" min="1" max="24" name="intervalValue" value="${esc(prefill.interval_value || 1)}"></label>
      <fieldset class="full owner-weekdays"><legend>訪問曜日</legend>${Object.entries(labels.weekday).map(([value,label]) => `<label><input type="checkbox" name="weekday" value="${value}"${weekdays.has(Number(value)) ? ' checked' : ''}>${label}</label>`).join('')}</fieldset>
      <label>希望開始時刻<input type="time" name="preferredTimeFrom" value="${esc((prefill.preferred_time_from || '').slice(0,5))}"></label><label>希望終了時刻<input type="time" name="preferredTimeTo" value="${esc((prefill.preferred_time_to || '').slice(0,5))}"></label><label>標準作業時間（分）<input type="number" min="15" max="1440" step="15" name="expectedDurationMinutes" value="${esc(prefill.expected_duration_minutes || 60)}"></label><label>開始日<input type="date" name="activeFrom" required value="${esc(prefill.active_from || '')}"></label><label>終了日<input type="date" name="activeUntil" value="${esc(prefill.active_until || '')}"></label><label class="owner-check"><input type="checkbox" name="isActive"${prefill.id && prefill.is_active === false ? '' : ' checked'}>有効</label>
    </form>`, `<button type="button" class="btn btn--secondary" data-dialog-close>取消</button><button type="button" class="btn btn--primary" id="save-visit-rule">${prefill.id ? '更新' : '登録'}</button>`);
    $('#save-visit-rule').addEventListener('click', async (event) => { try { const form = $('#visit-rule-form'); const data = formDataObject(form); data.weekdays = $$('input[name="weekday"]:checked', form).map((input) => Number(input.value)); delete data.weekday; await withSubmit(event.currentTarget, () => Green.api(prefill.id ? `/api/admin/visit-rules/${prefill.id}` : '/api/admin/visit-rules', { method: prefill.id ? 'PATCH' : 'POST', json: data })); Green.toast(prefill.id ? '訪問ルールを更新しました。' : '訪問ルールを登録しました。', 'success'); closeDialog(); await loadVisitRules(); } catch {} });
  }

  function stockMoveForm(item) {
    openDialog("入出庫を登録", "STOCK MOVEMENT", `<form id="stock-move-form" class="owner-form-grid"><input type="hidden" name="stockItemId" value="${item.id}"><label>処理<select name="movementType">${selectOptions(Object.fromEntries(Object.entries(labels.stockMovement).filter(([key]) => key !== "adjust")),"receive","選択")}</select></label><label>数量<input type="number" min="1" name="quantity" value="1"></label><label class="full">理由・メモ<textarea name="reason"></textarea></label></form><p class="owner-form-help">予約・養生・利用可能数も処理種別に応じて同時に更新します。</p>`, '<button type="button" class="btn btn--secondary" data-dialog-close>取消</button><button type="button" class="btn btn--primary" id="save-stock-move">登録</button>');
    $("#save-stock-move").addEventListener("click", async (event) => { try { await withSubmit(event.currentTarget, () => Green.api("/api/admin/stock/move", { method: "POST", json: formDataObject($("#stock-move-form")) })); Green.toast("在庫数量を更新しました。", "success"); closeDialog(); await loadStock(); } catch {} });
  }

  function stocktakeForm(item) {
    openDialog("棚卸を登録", "STOCKTAKE", `<form id="stocktake-form" class="owner-form-grid"><input type="hidden" name="stockItemId" value="${item.id}"><label>システム現在数<input value="${item.current_quantity}" disabled></label><label>実数<input type="number" min="0" name="countedQuantity" value="${item.current_quantity}"></label><label class="owner-check full"><input type="checkbox" name="applyAdjustment">差異を現在数へ反映する</label><label class="full">メモ<textarea name="note"></textarea></label></form>`, '<button type="button" class="btn btn--secondary" data-dialog-close>取消</button><button type="button" class="btn btn--primary" id="save-stocktake">登録</button>');
    $("#save-stocktake").addEventListener("click", async (event) => { try { await withSubmit(event.currentTarget, () => Green.api("/api/admin/stocktake", { method: "POST", json: formDataObject($("#stocktake-form")) })); Green.toast("棚卸を登録しました。", "success"); closeDialog(); await loadStock(); } catch {} });
  }


  async function loadReports() {
    const params = new URLSearchParams();
    if ($('#report-from').value) params.set('from', $('#report-from').value);
    if ($('#report-to').value) params.set('to', $('#report-to').value);
    if ($('#report-status').value) params.set('status', $('#report-status').value);
    if ($('#report-search').value.trim()) params.set('search', $('#report-search').value.trim());
    $('#report-rows').innerHTML = emptyRow(7, '読み込み中です…');
    const result = await Green.api(`/api/admin/reports?${params}`);
    state.reports = result.data.items || [];
    state.reportMap = new Map(state.reports.map((item) => [item.id, item]));
    const summary = {
      '報告': state.reports.length,
      '完了・訂正': state.reports.filter((item) => ['completed','corrected'].includes(item.report_status)).length,
      '公開済み': state.reports.filter((item) => item.customerReport?.published_status === 'published').length,
      '写真あり': state.reports.filter((item) => item.photoCounts?.total > 0).length,
    };
    $('#report-summary').innerHTML = Object.entries(summary).map(([label,count]) => `<div><small>${label}</small><strong>${count}</strong></div>`).join('');
    $('#report-rows').innerHTML = state.reports.length ? state.reports.map((item) => {
      const publicStatus = item.customerReport?.published_status === 'published' ? '<span class="owner-status" data-status="published">公開済み</span>' : '<span class="owner-row-sub">未公開</span>';
      return `<tr><td><span class="owner-row-title">${Green.formatDate(item.visit?.planned_date || item.started_at)}</span><span class="owner-row-sub">${formatDateTime(item.completed_at || item.updated_at)}</span></td><td><span class="owner-row-title">${esc(item.customer?.company_name || item.customer?.contact_name || '顧客')}</span><span class="owner-row-sub">${esc(item.site?.site_name || '拠点')}</span></td><td><span class="owner-code-badge">${esc(item.report_number)}</span><span class="owner-row-sub">${esc(item.visit?.visit_number || '')}</span></td><td>${item.photoCounts?.total || 0}枚<span class="owner-row-sub">公開 ${item.photoCounts?.public || 0}枚</span></td><td>${publicStatus}</td><td>${statusChip(item.report_status, 'report')}</td><td><button class="owner-row-action" data-report="${item.id}">詳細</button></td></tr>`;
    }).join('') : emptyRow(7);
    $$('[data-report]').forEach((button) => button.addEventListener('click', () => openReport(button.dataset.report)));
  }

  async function openReport(reportId) {
    loadingDialog('作業報告詳細');
    try {
      const result = await Green.api(`/api/admin/reports/${reportId}`);
      const { report, visit, customer, site, items, photos, customerReport, notifications, notificationLogs } = result.data;
      const bulk = (report.bulk_work_keys || []).map((key) => `<span class="owner-code-badge">${esc(labels.work[key] || key)}</span>`).join('') || '<span class="owner-row-sub">一括作業なし</span>';
      const itemRows = (items || []).map((item) => `<div class="owner-maintenance-item"><div><strong>${esc(item.work_key === 'plant:condition' ? '植物状態' : labels.work[item.work_key] || item.work_key)}</strong><small>${esc(labels.condition[item.condition_code] || item.condition_code || '状態未入力')}</small></div><span>${item.is_customer_visible ? 'お客様公開' : '社内のみ'}</span>${item.note ? `<p>${esc(item.note)}</p>` : ''}</div>`).join('') || '<div class="owner-empty">一鉢別入力はありません。</div>';
      const photoRows = (photos || []).map((photo) => `<figure class="owner-report-photo"><img src="${esc(photo.signed_url)}" alt="${esc(photo.caption || labels.photo[photo.photo_type] || '作業写真')}" loading="lazy"><figcaption><strong>${esc(labels.photo[photo.photo_type] || photo.photo_type)}</strong><label class="owner-check"><input type="checkbox" data-report-photo-visible="${photo.id}"${photo.is_customer_visible ? ' checked' : ''}>お客様へ公開</label></figcaption></figure>`).join('') || '<div class="owner-empty">写真はありません。</div>';
      const published = customerReport?.published_status === 'published';
      openDialog(`作業報告 ${report.report_number}`, 'MAINTENANCE REPORT', `<div class="owner-detail-grid">${detail('作業日', Green.formatDate(visit.planned_date))}${detail('顧客', customer.company_name || customer.contact_name)}${detail('拠点', site.site_name)}${detail('状態', labels.report[report.report_status] || report.report_status)}${detail('完了日時', formatDateTime(report.completed_at))}${detail('公開状態', published ? '公開済み' : '未公開')}</div>
      <section class="owner-dialog-section"><h3>一括作業</h3><div class="owner-chip-list">${bulk}</div></section>
      <section class="owner-dialog-section"><h3>一鉢別状態・作業</h3><div class="owner-maintenance-list">${itemRows}</div></section>
      <section class="owner-dialog-section"><h3>作業写真</h3><div class="owner-report-photo-grid">${photoRows}</div></section>
      <form id="report-edit-form" class="owner-form-grid"><label class="full">お客様向けコメント<textarea name="customerComment">${esc(report.customer_comment || '')}</textarea></label><label class="full">社内メモ<textarea name="internalNote">${esc(report.internal_note || '')}</textarea></label><label class="full">次回対応<textarea name="nextAction">${esc(report.next_action || '')}</textarea></label><label>次回対応日<input type="date" name="nextActionOn" value="${esc(report.next_action_on || '')}"></label></form>
      <section class="owner-dialog-section"><h3>LINE・通知</h3><div class="owner-mini-list"><div class="owner-mini-item">通知ジョブ：${notifications?.length || 0}件</div><div class="owner-mini-item">コピー・送信履歴：${notificationLogs?.length || 0}件</div></div></section>`, `<button type="button" class="btn btn--secondary" data-dialog-close>閉じる</button><button type="button" class="btn btn--secondary" id="save-report-edit">内容を保存</button><button type="button" class="btn btn--secondary" id="copy-report-line">LINE文面をコピー</button><button type="button" class="btn btn--primary" id="toggle-report-publish">${published ? '公開を取り下げる' : 'お客様へ公開'}</button>`);
      $$('[data-report-photo-visible]').forEach((input) => input.addEventListener('change', async () => {
        try { await Green.api(`/api/admin/report-photos/${input.dataset.reportPhotoVisible}`, { method:'PATCH', json:{ isCustomerVisible: input.checked } }); Green.toast('写真の公開範囲を更新しました。','success'); }
        catch (error) { input.checked = !input.checked; Green.toast(error.message,'error'); }
      }));
      $('#save-report-edit').addEventListener('click', async (event) => { try { await withSubmit(event.currentTarget, () => Green.api(`/api/admin/reports/${reportId}`, { method:'PATCH', json:formDataObject($('#report-edit-form')) })); Green.toast('作業報告を更新しました。','success'); } catch {} });
      $('#toggle-report-publish').addEventListener('click', async (event) => { try { await withSubmit(event.currentTarget, () => Green.api(`/api/admin/reports/${reportId}/publish`, { method:'POST', json:{ publish: !published } })); Green.toast(published ? '公開を取り下げました。' : 'お客様へ公開しました。','success'); closeDialog(); await loadReports(); } catch {} });
      $('#copy-report-line').addEventListener('click', async (event) => { try { const copy = await withSubmit(event.currentTarget, () => Green.api(`/api/admin/reports/${reportId}/message-copy`, { method:'POST', json:{ templateKey:'visit_completion' } }), '文面作成中…'); await navigator.clipboard.writeText(copy.data.message); Green.toast('LINE文面をコピーしました。','success'); } catch (error) { Green.toast(error.message,'error'); } });
    } catch (error) { closeDialog(); Green.toast(error.message,'error'); }
  }

  function setMessageTab(tab) {
    state.messageTab = tab;
    $$('[data-message-tab]').forEach((button) => button.classList.toggle('is-active', button.dataset.messageTab === tab));
    $$('[data-message-panel]').forEach((panel) => { panel.hidden = panel.dataset.messagePanel !== tab; });
    if (tab === 'notifications') loadNotifications().catch((error) => Green.toast(error.message,'error'));
  }

  async function loadMessages() {
    if (state.messageTab === 'notifications') return loadNotifications();
    const result = await Green.api('/api/admin/message-templates');
    state.messageTemplates = result.data.items || [];
    $('#message-template-rows').innerHTML = state.messageTemplates.length ? state.messageTemplates.map((item) => `<tr><td><span class="owner-row-title">${esc(item.template_name)}</span><span class="owner-row-sub">${esc(item.template_key)}</span></td><td>${esc(item.category)}</td><td>${esc(item.channel)}</td><td>${item.is_active ? '有効' : '停止'}</td><td><button class="owner-row-action" data-template-edit="${item.id}">編集</button></td></tr>`).join('') : emptyRow(5);
    $$('[data-template-edit]').forEach((button) => button.addEventListener('click', () => messageTemplateForm(state.messageTemplates.find((item) => item.id === button.dataset.templateEdit))));
  }

  function messageTemplateForm(item) {
    openDialog('文面テンプレートを編集', 'MESSAGE TEMPLATE', `<form id="message-template-form" class="owner-form-grid"><label class="full">テンプレート名<input name="templateName" value="${esc(item.template_name)}" required></label><label class="full">本文<textarea name="body" rows="12" required>${esc(item.body)}</textarea></label><label class="owner-check full"><input type="checkbox" name="isActive"${item.is_active ? ' checked' : ''}>有効</label></form><div class="owner-inline-note">利用できる差込：{customer_name}、{site_name}、{visit_date}、{work_summary}</div>`, '<button type="button" class="btn btn--secondary" data-dialog-close>取消</button><button type="button" class="btn btn--primary" id="save-message-template">保存</button>');
    $('#save-message-template').addEventListener('click', async (event) => { try { await withSubmit(event.currentTarget, () => Green.api(`/api/admin/message-templates/${item.id}`, { method:'PATCH', json:formDataObject($('#message-template-form')) })); Green.toast('文面テンプレートを更新しました。','success'); closeDialog(); await loadMessages(); } catch {} });
  }

  async function loadNotifications() {
    const params = new URLSearchParams();
    if ($('#notification-status').value) params.set('status', $('#notification-status').value);
    const result = await Green.api(`/api/admin/notifications?${params}`);
    state.notifications = result.data.items || [];
    $('#notification-rows').innerHTML = state.notifications.length ? state.notifications.map((item) => `<tr><td>${formatDateTime(item.created_at)}</td><td>${esc(item.customer?.company_name || item.customer?.contact_name || '顧客')}</td><td>${esc(item.notification_type)}</td><td>${esc(item.mode)}</td><td>${esc(item.status)}</td><td><span class="owner-message-preview">${esc(item.rendered_message || '文面未作成')}</span></td></tr>`).join('') : emptyRow(6);
  }


  // GREEN-9 replacement, recovery, care and disposal management
  function replacementStatusChip(status) { return statusChip(status, "replacement"); }
  function plantAssetLabel(asset) {
    if (!asset) return "植物未設定";
    const species = asset.species || state.speciesMap.get(asset.species_id);
    return `${asset.display_name || species?.common_name || asset.asset_code}（${asset.asset_code}）`;
  }
  async function ensureReplacementAssets(force = false) {
    if (!force && state.plantAssets.length) return state.plantAssets;
    await Promise.all([ensureSites(), ensureCustomers(), ensureAssetMasterData()]);
    const result = await Green.api("/api/admin/assets?type=plant&limit=500");
    state.plantAssets = result.data.plants || [];
    state.plantAssetMap = new Map(state.plantAssets.map((item) => [item.id, item]));
    return state.plantAssets;
  }
  function setReplacementTab(tab) {
    state.replacementTab = tab;
    $$('[data-replacement-tab]').forEach((button) => button.classList.toggle('is-active', button.dataset.replacementTab === tab));
    $$('[data-replacement-panel]').forEach((panel) => { panel.hidden = panel.dataset.replacementPanel !== tab; });
    loadReplacements().catch((error) => Green.toast(error.message, 'error'));
  }
  async function loadReplacements() {
    if (state.replacementTab === 'care') return loadCareBatches();
    if (state.replacementTab === 'disposals') return loadDisposals();
    const params = new URLSearchParams();
    if ($('#replacement-status').value) params.set('status', $('#replacement-status').value);
    if ($('#replacement-severity').value) params.set('severity', $('#replacement-severity').value);
    if ($('#replacement-search').value.trim()) params.set('search', $('#replacement-search').value.trim());
    $('#replacement-rows').innerHTML = emptyRow(8, '読み込み中です…');
    const result = await Green.api(`/api/admin/replacements?${params}`);
    state.replacements = result.data.items || [];
    state.replacementMap = new Map(state.replacements.map((item) => [item.id, item]));
    const summary = {
      '交換依頼': state.replacements.length,
      '承認待ち': state.replacements.filter((item) => ['proposed','review_required'].includes(item.status)).length,
      '交換予定': state.replacements.filter((item) => ['approved','replacement_allocating','scheduled','loaded'].includes(item.status)).length,
      '回収後処理': state.replacements.filter((item) => ['recovered','returned_to_warehouse','care_required'].includes(item.status)).length,
    };
    $('#replacement-summary').innerHTML = Object.entries(summary).map(([label,count]) => `<div><small>${label}</small><strong>${count}</strong></div>`).join('');
    $('#replacement-rows').innerHTML = state.replacements.length ? state.replacements.map((item) => `<tr>
      <td><span class="owner-code-badge">${esc(item.replacement_number)}</span><span class="owner-row-sub">${formatDateTime(item.proposed_at)}</span></td>
      <td><span class="owner-row-title">${esc(item.customer?.company_name || item.customer?.contact_name || '顧客')}</span><span class="owner-row-sub">${esc(item.site?.site_name || '拠点')}</span></td>
      <td><span class="owner-row-title">${esc(plantAssetLabel(item.oldAsset))}</span><span class="owner-row-sub">→ ${esc(item.newAsset ? plantAssetLabel(item.newAsset) : '代替未割当')}</span></td>
      <td><span class="owner-status" data-status="${esc(item.severity)}">${esc(labels.severity[item.severity] || item.severity)}</span></td>
      <td>${item.scheduled_at ? formatDateTime(item.scheduled_at) : '未設定'}</td>
      <td>${replacementStatusChip(item.status)}</td>
      <td>${item.recovery?.returned_to_warehouse_at ? '帰庫済み' : item.recovery ? '回収済み' : '—'}</td>
      <td><button class="owner-row-action" data-replacement="${item.id}">詳細</button></td>
    </tr>`).join('') : emptyRow(8);
    $$('[data-replacement]').forEach((button) => button.addEventListener('click', () => openReplacement(button.dataset.replacement)));
  }
  async function replacementForm(prefill = {}) {
    await ensureReplacementAssets();
    const installed = state.plantAssets.filter((item) => item.asset_status === 'installed');
    const available = state.plantAssets.filter((item) => ['inventory','reserved','reusable','replacement_planned'].includes(item.asset_status));
    openDialog('交換依頼を登録', 'REPLACEMENT REQUEST', `<form id="replacement-form" class="owner-form-grid">
      <label>顧客<select name="customerId" id="replacement-customer" required>${customerOptions(prefill.customer_id || '')}</select></label>
      <label>拠点<select name="siteId" id="replacement-site" required>${siteOptions(prefill.site_id || '', prefill.customer_id || '')}</select></label>
      <label>交換対象植物<select name="oldPlantAssetId">${optionList(installed,'id',(i)=>plantAssetLabel(i),prefill.old_plant_asset_id || '','対象植物を選択')}</select></label>
      <label>代替植物<select name="newPlantAssetId">${optionList(available,'id',(i)=>plantAssetLabel(i),prefill.proposed_plant_asset_id || '','後で割り当て')}</select></label>
      <label>緊急度<select name="severity">${selectOptions(labels.severity,prefill.severity || 'normal','選択')}</select></label>
      <label>交換予定日時<input type="datetime-local" name="scheduledAt" value="${inputDateTime(prefill.scheduled_at)}"></label>
      <label class="full">交換理由<textarea name="reason" required>${esc(prefill.reason || '')}</textarea></label>
      <label class="full">お客様向けコメント<textarea name="customerComment">${esc(prefill.customer_comment || '')}</textarea></label>
      <label class="full">社内メモ<textarea name="internalNote">${esc(prefill.internal_note || '')}</textarea></label>
    </form>`, '<button type="button" class="btn btn--secondary" data-dialog-close>取消</button><button type="button" class="btn btn--primary" id="save-replacement">登録</button>');
    $('#replacement-customer').addEventListener('change', () => { $('#replacement-site').innerHTML = siteOptions('', $('#replacement-customer').value); });
    $('#save-replacement').addEventListener('click', async (event) => { try { const result = await withSubmit(event.currentTarget, () => Green.api('/api/admin/replacements', { method:'POST', json:formDataObject($('#replacement-form')) })); Green.toast(`交換番号 ${result.data.request.replacement_number} を登録しました。`,'success'); closeDialog(); await loadReplacements(); } catch {} });
  }
  async function openReplacement(id) {
    loadingDialog('交換詳細');
    try {
      await ensureReplacementAssets();
      const result = await Green.api(`/api/admin/replacements/${id}`);
      const { request, operations, recoveries, photos, care } = result.data;
      const recovery = recoveries?.[0] || request.recovery;
      const careBatch = care?.[0];
      const photosHtml = photos?.length ? photos.map((photo) => `<figure><a href="${esc(photo.signed_url || '#')}" target="_blank" rel="noopener"><img src="${esc(photo.signed_url || '')}" alt="交換写真"></a><figcaption>${esc(labels.replacementPhoto[photo.photo_type] || photo.photo_type)}${photo.caption ? `｜${esc(photo.caption)}` : ''}</figcaption></figure>`).join('') : '<div class="owner-empty">交換写真はありません。</div>';
      const operation = operations?.[0];
      openDialog(`交換 ${request.replacement_number}`, 'REPLACEMENT DETAIL', `<div class="owner-detail-grid">
        ${detail('状態',labels.replacement[request.status] || request.status)}${detail('緊急度',labels.severity[request.severity] || request.severity)}${detail('顧客',request.customer?.company_name || request.customer?.contact_name)}${detail('拠点',request.site?.site_name)}${detail('交換元',plantAssetLabel(request.oldAsset))}${detail('代替植物',request.newAsset ? plantAssetLabel(request.newAsset) : '未割当')}${detail('交換予定',request.scheduled_at ? formatDateTime(request.scheduled_at) : '未設定')}${detail('承認',request.approved_at ? `${formatDateTime(request.approved_at)} 承認済み` : '未承認')}
      </div><section class="owner-dialog-section"><h3>交換理由</h3><div class="owner-mini-item">${esc(request.reason).replace(/\n/g,'<br>')}</div></section>
      <form id="replacement-edit-form" class="owner-form-grid owner-dialog-section"><label>緊急度<select name="severity">${selectOptions(labels.severity,request.severity,'選択')}</select></label><label>交換予定日時<input type="datetime-local" name="scheduledAt" value="${inputDateTime(request.scheduled_at)}"></label><label class="full">交換理由<textarea name="reason">${esc(request.reason)}</textarea></label><label class="full">お客様向けコメント<textarea name="customerComment">${esc(request.customer_comment || '')}</textarea></label><label class="full">社内メモ<textarea name="internalNote">${esc(request.internal_note || '')}</textarea></label></form>
      <section class="owner-dialog-section"><h3>交換・回収写真</h3><div class="owner-photo-grid">${photosHtml}</div><form id="replacement-photo-form" class="owner-form-grid owner-photo-form"><label>写真区分<select name="photoType">${selectOptions(labels.replacementPhoto,'replacement','選択')}</select></label><label>写真<input type="file" name="file" accept="image/jpeg,image/png,image/webp" required></label><label class="full">メモ<input name="caption"></label><label class="owner-check full"><input type="checkbox" name="isCustomerVisible">お客様へ公開</label><button type="button" class="btn btn--secondary full" id="upload-replacement-photo">写真を追加</button></form></section>
      <section class="owner-dialog-section"><h3>進行状況</h3><div class="owner-mini-list"><div class="owner-mini-item">作業状態：${esc(operation?.operation_status || '未作成')}</div><div class="owner-mini-item">回収：${recovery ? `${esc(recovery.recovery_number)}／${recovery.returned_to_warehouse_at ? '帰庫済み' : '帰庫待ち'}` : '未回収'}</div><div class="owner-mini-item">養生：${careBatch ? `${esc(careBatch.care_number)}／${esc(labels.care[careBatch.status] || careBatch.status)}` : '未開始'}</div></div></section>`, `<button type="button" class="btn btn--secondary" data-dialog-close>閉じる</button><button type="button" class="btn btn--secondary" id="save-replacement-edit">内容保存</button><span id="replacement-actions"></span>`);
      const actions = [];
      if (['proposed','review_required','replacement_allocating','approved','scheduled'].includes(request.status)) actions.push('<button type="button" class="btn btn--primary" id="approve-replacement">承認・代替割当</button>');
      if (['approved','scheduled','replacement_allocating'].includes(request.status) && request.newAsset) actions.push('<button type="button" class="btn btn--primary" id="load-replacement">積込済みにする</button>');
      if (['loaded','scheduled','approved'].includes(request.status) && request.newAsset) actions.push('<button type="button" class="btn btn--primary" id="complete-replacement">現地交換を完了</button>');
      if (recovery && !recovery.returned_to_warehouse_at) actions.push('<button type="button" class="btn btn--primary" id="return-recovery">回収植物を帰庫</button>');
      if (recovery?.returned_to_warehouse_at && !careBatch) actions.push('<button type="button" class="btn btn--primary" id="start-care-from-recovery">養生を開始</button>');
      $('#replacement-actions').innerHTML = actions.join('');
      $('#save-replacement-edit').addEventListener('click', async (event) => { try { await withSubmit(event.currentTarget, () => Green.api(`/api/admin/replacements/${id}`, { method:'PATCH', json:formDataObject($('#replacement-edit-form')) })); Green.toast('交換依頼を更新しました。','success'); closeDialog(); await loadReplacements(); } catch {} });
      $('#approve-replacement')?.addEventListener('click', () => replacementApproveForm(request));
      $('#load-replacement')?.addEventListener('click', async (event) => { if (!confirm('代替植物を車両へ積込済みにしますか？')) return; try { await withSubmit(event.currentTarget, () => Green.api(`/api/admin/replacements/${id}/load`, { method:'POST', json:{}, idempotencyKey:Green.uuid() }),'積込処理中…'); Green.toast('積込済みに更新しました。','success'); closeDialog(); await loadReplacements(); } catch {} });
      $('#complete-replacement')?.addEventListener('click', () => replacementCompleteForm(request));
      $('#return-recovery')?.addEventListener('click', () => recoveryReturnForm(recovery, request));
      $('#start-care-from-recovery')?.addEventListener('click', () => careForm({ plant_asset_id: recovery.plant_asset_id, recovery_record_id: recovery.id, initial_condition: recovery.initial_condition }));
      $('#upload-replacement-photo').addEventListener('click', async (event) => { const form=$('#replacement-photo-form'); const file=form.elements.file.files[0]; if(!file){Green.toast('写真を選択してください。','error');return;} try { const compressed=await Green.compressImage(file); const data=new FormData(); data.append('file',compressed); data.append('photoType',form.elements.photoType.value); data.append('caption',form.elements.caption.value); data.append('isCustomerVisible',String(form.elements.isCustomerVisible.checked)); await withSubmit(event.currentTarget,()=>Green.api(`/api/admin/replacements/${id}/photos`,{method:'POST',body:data}),'送信中…'); Green.toast('交換写真を追加しました。','success'); openReplacement(id); } catch(error){Green.toast(error.message,'error');} });
    } catch (error) { closeDialog(); Green.toast(error.message,'error'); }
  }
  async function replacementApproveForm(request) {
    await ensureReplacementAssets();
    const candidates=state.plantAssets.filter((item)=>['inventory','reserved','reusable','replacement_planned'].includes(item.asset_status)&&item.id!==request.old_plant_asset_id);
    openDialog('交換を承認・代替植物を割当', 'APPROVAL', `<form id="replacement-approve-form" class="owner-form-grid"><label class="full">代替植物<select name="newPlantAssetId">${optionList(candidates,'id',(i)=>plantAssetLabel(i),request.proposed_plant_asset_id || '','代替植物を選択')}</select></label><label>交換予定日時<input type="datetime-local" name="scheduledAt" value="${inputDateTime(request.scheduled_at)}"></label><label class="full">承認メモ<textarea name="internalNote">${esc(request.internal_note || '')}</textarea></label></form>`, '<button type="button" class="btn btn--secondary" data-dialog-close>取消</button><button type="button" class="btn btn--primary" id="save-replacement-approval">承認する</button>');
    $('#save-replacement-approval').addEventListener('click', async (event)=>{try{await withSubmit(event.currentTarget,()=>Green.api(`/api/admin/replacements/${request.id}/approve`,{method:'POST',json:formDataObject($('#replacement-approve-form'))}),'承認中…');Green.toast('交換を承認しました。','success');closeDialog();await loadReplacements();}catch{}});
  }
  function replacementCompleteForm(request) {
    openDialog('現地交換を完了', 'COMPLETE REPLACEMENT', `<form id="replacement-complete-form" class="owner-form-grid"><label class="owner-check full"><input type="checkbox" name="customerPresent">お客様立会いあり</label><label class="full">お客様向けコメント<textarea name="customerComment">${esc(request.customer_comment || '')}</textarea></label><label class="full">社内メモ<textarea name="internalNote">${esc(request.internal_note || '')}</textarea></label></form><div class="owner-warning-box">完了すると、旧植物は回収状態、代替植物は同じ設置場所へ設置済みになります。</div>`, '<button type="button" class="btn btn--secondary" data-dialog-close>取消</button><button type="button" class="btn btn--primary" id="save-replacement-complete">交換完了</button>');
    $('#save-replacement-complete').addEventListener('click',async(event)=>{if(!confirm('植物の設置・回収履歴を確定しますか？'))return;try{await withSubmit(event.currentTarget,()=>Green.api(`/api/admin/replacements/${request.id}/complete`,{method:'POST',json:formDataObject($('#replacement-complete-form')),idempotencyKey:Green.uuid()}),'交換処理中…');Green.toast('現地交換と旧植物の回収を記録しました。','success');closeDialog();await loadReplacements();}catch{}});
  }
  function recoveryReturnForm(recovery, request) {
    openDialog('回収植物を帰庫', 'RETURN TO WAREHOUSE', `<form id="recovery-return-form" class="owner-form-grid"><label>帰庫時状態<select name="initialCondition">${selectOptions(labels.condition,recovery.initial_condition || request.oldAsset?.condition_code || 'observe','選択')}</select></label><label>次の対応<select name="nextAction"><option value="care">養生</option><option value="reusable">再利用判定</option><option value="dispose">廃棄判定</option><option value="return">返却</option></select></label><label class="full">メモ<textarea name="note">${esc(recovery.note || '')}</textarea></label></form>`, '<button type="button" class="btn btn--secondary" data-dialog-close>取消</button><button type="button" class="btn btn--primary" id="save-recovery-return">帰庫を記録</button>');
    $('#save-recovery-return').addEventListener('click',async(event)=>{try{await withSubmit(event.currentTarget,()=>Green.api(`/api/admin/recoveries/${recovery.id}/return-warehouse`,{method:'POST',json:formDataObject($('#recovery-return-form'))}),'帰庫処理中…');Green.toast('回収植物の帰庫を記録しました。','success');closeDialog();await loadReplacements();}catch{}});
  }
  async function loadCareBatches() {
    const params=new URLSearchParams(); if($('#care-status').value)params.set('status',$('#care-status').value);
    $('#care-rows').innerHTML=emptyRow(7,'読み込み中です…'); const result=await Green.api(`/api/admin/care?${params}`); state.careBatches=result.data.items||[]; state.careMap=new Map(state.careBatches.map((item)=>[item.id,item]));
    $('#care-rows').innerHTML=state.careBatches.length?state.careBatches.map((item)=>`<tr><td><span class="owner-code-badge">${esc(item.care_number)}</span></td><td><span class="owner-row-title">${esc(plantAssetLabel(item.plantAsset))}</span></td><td>${esc(item.care_location || '未設定')}</td><td>${Green.formatDate(item.started_on)}</td><td>${Green.formatDate(item.next_check_on)}</td><td>${statusChip(item.status,'care')}</td><td><button class="owner-row-action" data-care="${item.id}">詳細</button></td></tr>`).join(''):emptyRow(7);
    $$('[data-care]').forEach((button)=>button.addEventListener('click',()=>openCare(button.dataset.care)));
  }
  async function careForm(prefill={}) {
    await ensureReplacementAssets(); const candidates=state.plantAssets.filter((item)=>['recovered','in_care','replacement_planned','reusable'].includes(item.asset_status));
    openDialog('養生を開始', 'CARE START', `<form id="care-form" class="owner-form-grid"><input type="hidden" name="recoveryRecordId" value="${esc(prefill.recovery_record_id || '')}"><label>植物<select name="plantAssetId" required>${optionList(candidates,'id',(i)=>plantAssetLabel(i),prefill.plant_asset_id || '','植物を選択')}</select></label><label>養生場所<input name="careLocation" value="${esc(prefill.care_location || '養生スペース')}"></label><label>開始日<input type="date" name="startedOn" value="${esc(prefill.started_on || new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo'}).format(new Date()))}"></label><label>次回確認日<input type="date" name="nextCheckOn" value="${esc(prefill.next_check_on || '')}"></label><label class="full">開始時状態<textarea name="initialCondition">${esc(prefill.initial_condition || '')}</textarea></label><label class="full">養生計画<textarea name="carePlan"></textarea></label><label class="full">メモ<textarea name="note"></textarea></label></form>`, '<button type="button" class="btn btn--secondary" data-dialog-close>取消</button><button type="button" class="btn btn--primary" id="save-care">養生開始</button>');
    $('#save-care').addEventListener('click',async(event)=>{try{await withSubmit(event.currentTarget,()=>Green.api('/api/admin/care',{method:'POST',json:formDataObject($('#care-form'))}),'登録中…');Green.toast('養生を開始しました。','success');closeDialog();state.replacementTab='care';await loadReplacements();}catch{}});
  }
  async function openCare(id) {
    loadingDialog('養生詳細'); try { const result=await Green.api(`/api/admin/care/${id}`); const {careBatch,plantAsset,logs,decisions,photos,disposals}=result.data; const active=['planned','in_care','observing'].includes(careBatch.status); openDialog(`養生 ${careBatch.care_number}`,'CARE DETAIL',`<div class="owner-detail-grid">${detail('植物',plantAssetLabel(plantAsset))}${detail('状態',labels.care[careBatch.status]||careBatch.status)}${detail('養生場所',careBatch.care_location||'未設定')}${detail('開始日',Green.formatDate(careBatch.started_on))}${detail('次回確認',Green.formatDate(careBatch.next_check_on))}${detail('終了日',Green.formatDate(careBatch.ended_on))}</div><section class="owner-dialog-section"><h3>養生計画</h3><div class="owner-mini-item">${esc(careBatch.care_plan||'未設定').replace(/\n/g,'<br>')}</div></section>${miniSection('養生記録',(logs||[]).map((log)=>`${Green.formatDate(log.logged_on)}｜${labels.condition[log.condition_code]||log.condition_code||'状態未設定'}｜${log.note||'メモなし'}`))}${miniSection('判定履歴',(decisions||[]).map((d)=>`${formatDateTime(d.decided_at)}｜${labels.reuse[d.decision]||d.decision}｜${d.reason||''}`))}<section class="owner-dialog-section"><h3>養生写真</h3><div class="owner-photo-grid">${photos?.length?photos.map((p)=>`<figure><a href="${esc(p.signed_url||'#')}" target="_blank" rel="noopener"><img src="${esc(p.signed_url||'')}" alt="養生写真"></a><figcaption>${esc(labels.carePhoto[p.photo_type]||p.photo_type)}${p.caption?`｜${esc(p.caption)}`:''}</figcaption></figure>`).join(''):'<div class="owner-empty">写真はありません。</div>'}</div><form id="care-photo-form" class="owner-form-grid owner-photo-form"><label>区分<select name="photoType">${selectOptions(labels.carePhoto,'care','選択')}</select></label><label>写真<input type="file" name="file" accept="image/jpeg,image/png,image/webp"></label><label class="full">メモ<input name="caption"></label><button type="button" class="btn btn--secondary full" id="upload-care-photo">写真追加</button></form></section>${disposals?.length?miniSection('廃棄・返却記録',disposals.map((d)=>`${d.disposal_number}｜${labels.disposal[d.disposal_type]||d.disposal_type}｜${d.reason}`)):''}`,`<button type="button" class="btn btn--secondary" data-dialog-close>閉じる</button>${active?'<button type="button" class="btn btn--secondary" id="add-care-log">養生記録を追加</button><button type="button" class="btn btn--primary" id="decide-care">再利用・廃棄を判定</button>':''}`);
      $('#add-care-log')?.addEventListener('click',()=>careLogForm(careBatch)); $('#decide-care')?.addEventListener('click',()=>careDecisionForm(careBatch,plantAsset)); $('#upload-care-photo').addEventListener('click',async(event)=>{const form=$('#care-photo-form');const file=form.elements.file.files[0];if(!file){Green.toast('写真を選択してください。','error');return;}try{const compressed=await Green.compressImage(file);const data=new FormData();data.append('file',compressed);data.append('photoType',form.elements.photoType.value);data.append('caption',form.elements.caption.value);await withSubmit(event.currentTarget,()=>Green.api(`/api/admin/care/${id}/photos`,{method:'POST',body:data}),'送信中…');Green.toast('養生写真を追加しました。','success');openCare(id);}catch(error){Green.toast(error.message,'error');}});
    } catch(error){closeDialog();Green.toast(error.message,'error');}
  }
  function careLogForm(batch) { openDialog('養生記録を追加','CARE LOG',`<form id="care-log-form" class="owner-form-grid"><label>記録日<input type="date" name="loggedOn" value="${new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo'}).format(new Date())}"></label><label>植物状態<select name="conditionCode">${selectOptions(labels.condition,'observe','選択')}</select></label><fieldset class="full owner-weekdays"><legend>実施内容</legend>${['給水','葉清掃','剪定','害虫確認','病気確認','土・肥料確認','植替え','その他'].map((label,index)=>`<label><input type="checkbox" name="workKey" value="care_${index+1}">${label}</label>`).join('')}</fieldset><label>次回確認日<input type="date" name="nextCheckOn"></label><label class="full">記録<textarea name="note"></textarea></label></form>`,'<button type="button" class="btn btn--secondary" data-dialog-close>取消</button><button type="button" class="btn btn--primary" id="save-care-log">記録</button>'); $('#save-care-log').addEventListener('click',async(event)=>{try{const form=$('#care-log-form');const data=formDataObject(form);data.workKeys=$$('input[name="workKey"]:checked',form).map((i)=>i.value);delete data.workKey;await withSubmit(event.currentTarget,()=>Green.api(`/api/admin/care/${batch.id}/logs`,{method:'POST',json:data}));Green.toast('養生記録を追加しました。','success');openCare(batch.id);}catch{}}); }
  function careDecisionForm(batch,asset) { openDialog('養生後の判定','REUSE DECISION',`<form id="care-decision-form" class="owner-form-grid"><label>判定<select name="decision">${selectOptions(labels.reuse,'reusable','選択')}</select></label><label>次の場所<select name="nextLocationType">${selectOptions(labels.location,'warehouse','選択')}</select></label><label class="full">判定理由<textarea name="reason" required></textarea></label></form><div class="owner-warning-box">「廃棄」を選択した場合は、判定後に廃棄記録を登録してください。</div>`,'<button type="button" class="btn btn--secondary" data-dialog-close>取消</button><button type="button" class="btn btn--primary" id="save-care-decision">判定を保存</button>'); $('#save-care-decision').addEventListener('click',async(event)=>{try{const data=formDataObject($('#care-decision-form'));await withSubmit(event.currentTarget,()=>Green.api(`/api/admin/care/${batch.id}/decision`,{method:'POST',json:data}));Green.toast('養生後の判定を保存しました。','success');if(data.decision==='dispose'){disposalForm({plant_asset_id:asset.id,care_batch_id:batch.id});}else{closeDialog();await loadCareBatches();}}catch{}}); }
  async function loadDisposals() { $('#disposal-rows').innerHTML=emptyRow(6,'読み込み中です…');const result=await Green.api('/api/admin/disposals');state.disposals=result.data.items||[];$('#disposal-rows').innerHTML=state.disposals.length?state.disposals.map((item)=>`<tr><td><span class="owner-code-badge">${esc(item.disposal_number)}</span></td><td>${esc(plantAssetLabel(item.plantAsset))}</td><td>${esc(labels.disposal[item.disposal_type]||item.disposal_type)}</td><td>${formatDateTime(item.disposed_at)}</td><td>${esc(item.reason)}</td><td>${esc(item.evidence_note||'—')}</td></tr>`).join(''):emptyRow(6); }
  async function disposalForm(prefill={}) { await ensureReplacementAssets();openDialog('廃棄・返却記録','DISPOSAL RECORD',`<form id="disposal-form" class="owner-form-grid"><input type="hidden" name="careBatchId" value="${esc(prefill.care_batch_id||'')}"><label>植物<select name="plantAssetId">${optionList(state.plantAssets,'id',(i)=>plantAssetLabel(i),prefill.plant_asset_id||'','植物を選択')}</select></label><label>処理区分<select name="disposalType">${selectOptions(labels.disposal,prefill.disposal_type||'discard','選択')}</select></label><label class="full">理由<textarea name="reason" required>${esc(prefill.reason||'')}</textarea></label><label class="full">証跡メモ<textarea name="evidenceNote"></textarea></label></form><div class="owner-warning-box">確定すると対象資産の現在地と状態を廃棄・返却へ更新します。</div>`,'<button type="button" class="btn btn--secondary" data-dialog-close>取消</button><button type="button" class="btn btn--primary" id="save-disposal">記録を確定</button>');$('#save-disposal').addEventListener('click',async(event)=>{if(!confirm('この処理は資産状態を変更します。確定しますか？'))return;try{await withSubmit(event.currentTarget,()=>Green.api('/api/admin/disposals',{method:'POST',json:formDataObject($('#disposal-form'))}),'処理中…');Green.toast('廃棄・返却記録を登録しました。','success');closeDialog();state.replacementTab='disposals';await loadReplacements();}catch{}}); }


  function detail(label, value) { return `<div class="owner-detail-item"><small>${esc(label)}</small><strong>${esc(value ?? "未設定")}</strong></div>`; }
  function miniSection(title, items) { return `<section class="owner-dialog-section"><h3>${esc(title)}</h3><div class="owner-mini-list">${items.length ? items.map((item) => `<div class="owner-mini-item">${esc(item)}</div>`).join("") : '<div class="owner-empty">登録はありません。</div>'}</div></section>`; }

  function openSidebar() { $("#owner-sidebar").classList.add("is-open"); $("#owner-sidebar-backdrop").hidden = false; }
  function closeSidebar() { $("#owner-sidebar").classList.remove("is-open"); $("#owner-sidebar-backdrop").hidden = true; }

  function bindEvents() {
    $("#login-form").addEventListener("submit", login); $("#clear-login-code").addEventListener("click", () => { $("#login-code").value = ""; $("#login-code").focus(); }); $("#logout-button").addEventListener("click", logout); $("#reload-button").addEventListener("click", () => loadView(state.currentView));
    $$("[data-view]").forEach((button) => button.addEventListener("click", () => loadView(button.dataset.view))); $$("[data-load]").forEach((button) => button.addEventListener("click", () => loadView(button.dataset.load))); $$("[data-action]").forEach((button) => button.addEventListener("click", async () => { const action = button.dataset.action; if (action === "phone-inquiry") phoneInquiryForm(); if (action === "new-customer") customerForm(); if (action === "new-site") siteForm(); if (action === "new-site-check") siteCheckForm(); if (action === "new-contract") contractForm(); if (action === "new-species") speciesForm(); if (action === "new-container-model") containerModelForm(); if (action === "new-asset") assetTypeChoice(); if (action === "new-installation") installationForm(); if (action === "new-visit") visitForm(); if (action === "generate-visits") generateVisitsForm(); if (action === "new-visit-rule") visitRuleForm(); if (action === "new-stock") stockForm(); if (action === "new-replacement") replacementForm(); if (action === "new-care") careForm(); if (action === "new-disposal") disposalForm(); }));
    $("#dialog-close").addEventListener("click", closeDialog); $("#dialog-cancel").addEventListener("click", closeDialog); dialog.addEventListener("cancel", (event) => { event.preventDefault(); closeDialog(); });
    $("#owner-menu-button").addEventListener("click", openSidebar); $("#owner-sidebar-backdrop").addEventListener("click", closeSidebar);
    ["inquiry-search","customer-search","site-search","asset-search","visit-search","report-search","replacement-search","stock-search"].forEach((id) => $("#"+id).addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); const view = id.startsWith("inquiry") ? "inquiries" : id.startsWith("customer") ? "customers" : id.startsWith("site-") ? "sites" : id.startsWith("asset") ? "assets" : id.startsWith("visit") ? "visits" : id.startsWith("report") ? "reports" : id.startsWith("replacement") ? "replacements" : "stock"; loadView(view); } }));
    $$("[data-asset-tab]").forEach((button) => button.addEventListener("click", () => setAssetTab(button.dataset.assetTab)));
    $$("[data-visit-tab]").forEach((button) => button.addEventListener("click", () => setVisitTab(button.dataset.visitTab)));
    $$("[data-replacement-tab]").forEach((button) => button.addEventListener("click", () => setReplacementTab(button.dataset.replacementTab)));
    $("#asset-settings-save").addEventListener("click", saveAssetSettings);
    $("#asset-plant-mode").addEventListener("change", renderAssetSettings);
  }

  function init() {
    $("#login-facility").value = config.FACILITY_CODE || "dpro_green_rental_demo";
    const todayText = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo", year:"numeric", month:"2-digit", day:"2-digit" }).format(new Date()); const endDate = new Date(`${todayText}T00:00:00+09:00`); endDate.setDate(endDate.getDate() + 14); const endText = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo", year:"numeric", month:"2-digit", day:"2-digit" }).format(endDate); $("#visit-from").value = todayText; $("#visit-to").value = endText; const reportStart = new Date(`${todayText}T00:00:00+09:00`); reportStart.setDate(reportStart.getDate() - 30); const reportStartText = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo", year:"numeric", month:"2-digit", day:"2-digit" }).format(reportStart); $("#report-from").value = reportStartText; $("#report-to").value = todayText;
    populateFilters(); bindEvents(); restoreSession();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
