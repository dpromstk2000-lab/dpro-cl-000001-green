(() => {
  "use strict";

  const VERSION = "GREEN-CUSTOMER-CONTACT-R1.4-BUILD-AUTH-FALLBACK-20261004";
  if (window.__GREEN_CUSTOMER_CONTACT_R1__ === VERSION) return;
  window.__GREEN_CUSTOMER_CONTACT_R1__ = VERSION;

  const LINE_API = "https://dpro-cl-000001-green-line.dpromstk2000.workers.dev";
  const EMAIL_READY = false; // Enable only after custom-domain mail setup is verified.

  const state = {
    initialized: false,
    loading: false,
    items: [],
    filtered: [],
    selected: null,
    lineThreads: [],
    lineInquiryByUser: new Map(),
    channelErrors: [],
    channel: "all",
    query: ""
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (m) => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    }[m]));
  }

  function text(value, fallback = "") {
    const v = String(value ?? "").trim();
    return v || fallback;
  }

  function safeUrl(value) {
    const raw = text(value);
    if (!raw) return "";
    try {
      const url = new URL(raw, location.href);
      return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch {
      return "";
    }
  }

  function lineAttachmentHtml(attachment) {
    if (!attachment) return "";
    const url = safeUrl(attachment.url);
    const name = text(attachment.name, "添付資料");
    const kind = text(attachment.kind || (String(attachment.mime || "").startsWith("image/") ? "image" : "document"));

    if (!url) return `<span class="gcc-attachment gcc-attachment-missing">📎 ${esc(name)}</span>`;

    if (kind === "image") {
      return `<a class="gcc-attachment gcc-attachment-image" href="${esc(url)}" target="_blank" rel="noopener"><img src="${esc(url)}" alt="${esc(name)}" loading="lazy" decoding="async"></a>`;
    }

    return `<a class="gcc-attachment gcc-attachment-file" href="${esc(url)}" target="_blank" rel="noopener">📎 ${esc(name)}を開く</a>`;
  }

  function fmt(value) {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return new Intl.DateTimeFormat("ja-JP", {
      month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit"
    }).format(d);
  }

  function coreApi(path, options) {
    if (!window.Green?.api) throw new Error("GREEN Core APIを利用できません。");
    return window.Green.api(path, options);
  }

  function token() {
    try { return sessionStorage.getItem("green_admin_session_token") || ""; }
    catch { return ""; }
  }

  const LINE_BUILD_KEY = "dpro_green_line_build_code";

  function isBuildMode() {
    return new URLSearchParams(location.search).get("dpro_build") === "1";
  }

  function readStoredLineBuildCode() {
    try {
      return sessionStorage.getItem(LINE_BUILD_KEY)
        || sessionStorage.getItem("dpro_green_shop_build_code")
        || "";
    } catch {
      return "";
    }
  }

  function writeStoredLineBuildCode(value) {
    try {
      if (value) sessionStorage.setItem(LINE_BUILD_KEY, value);
      else sessionStorage.removeItem(LINE_BUILD_KEY);
    } catch {}
  }

  function lineAccessCandidates() {
    const result = [];
    const buildMode = isBuildMode();
    const build = buildMode ? readStoredLineBuildCode() : "";
    const normal = token();

    // QA/build mode must prefer the dedicated LINE build credential.
    if (build) result.push({ token: `build:${build}`, kind: "build" });
    if (normal) result.push({ token: normal, kind: "owner" });

    // De-duplicate identical values while preserving priority.
    return result.filter((item, index, all) =>
      all.findIndex((x) => x.token === item.token) === index
    );
  }

  async function fetchLineWithToken(path, options, accessToken) {
    const headers = new Headers(options.headers || {});
    headers.set("Authorization", `Bearer ${accessToken}`);
    headers.set("Accept", "application/json");
    if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

    let response;
    try {
      response = await fetch(`${LINE_API}${path}`, {
        ...options,
        headers,
        cache: "no-store"
      });
    } catch (error) {
      throw new Error(`LINE接続に失敗しました。${error?.message || "通信エラー"}`);
    }

    const data = await response.json().catch(() => ({}));
    return { response, data };
  }

  async function lineApi(path, options = {}) {
    const candidates = lineAccessCandidates();
    let lastError = null;

    for (const candidate of candidates) {
      const { response, data } = await fetchLineWithToken(path, options, candidate.token);
      if (response.ok && data?.ok !== false) return data;

      const message = data?.message || data?.error || `LINE API HTTP ${response.status}`;
      lastError = new Error(message);

      // Only try another credential on authentication/authorization rejection.
      if (![401, 403].includes(response.status)) throw lastError;
    }

    if (isBuildMode()) {
      let current = readStoredLineBuildCode();

      // If a stored build credential was rejected, allow one explicit replacement.
      if (current && candidates.some((x) => x.kind === "build")) {
        writeStoredLineBuildCode("");
        current = "";
      }

      if (!current) {
        const entered = prompt("構築・QA用のLINE管理コードを入力してください。\nこのタブのセッション中だけ保持します。") || "";
        if (entered) {
          writeStoredLineBuildCode(entered);
          const { response, data } = await fetchLineWithToken(path, options, `build:${entered}`);
          if (response.ok && data?.ok !== false) return data;
          writeStoredLineBuildCode("");
          throw new Error(data?.message || data?.error || `LINE API HTTP ${response.status}`);
        }
      }
    }

    throw lastError || new Error("LINE用の管理セッションを確認できません。再ログインしてください。");
  }

  function panel() {
    return $('[data-view-panel="inquiries"]');
  }

  function activateCustomerContact() {
    $$("[data-view]").forEach((b) => b.classList.toggle("is-active", b.dataset.view === "inquiries"));
    $$("[data-view-panel]").forEach((p) => p.classList.toggle("is-active", p.dataset.viewPanel === "inquiries"));
    const title = $("#view-title");
    if (title) title.textContent = "顧客対応";
    ensureUi();
    loadUnified().catch(showError);
  }

  function renameNavigation() {
    const inquiryButton = $('[data-view="inquiries"]');
    if (inquiryButton) inquiryButton.innerHTML = "<span>✉</span>顧客対応";

    const messagesButton = $('[data-view="messages"]');
    if (messagesButton) messagesButton.innerHTML = "<span>送</span>通知・送信履歴";

    const messagesPanel = $('[data-view-panel="messages"]');
    if (messagesPanel) {
      const h2 = $("h2", messagesPanel);
      const p = $(".owner-heading p:not(.eyebrow)", messagesPanel);
      if (h2) h2.textContent = "通知・送信履歴";
      if (p) p.textContent = "作業完了文面、通知ログ、送信履歴を確認します。お客様からの連絡は「顧客対応」で確認します。";
    }

    $$("*").forEach((node) => {
      if (node.childElementCount === 0 && node.textContent?.trim() === "新着問い合わせ") {
        node.textContent = "新着顧客対応";
      }
    });
  }

  function ensureUi() {
    if (state.initialized) return;
    const root = panel();
    if (!root) return;
    state.initialized = true;

    root.innerHTML = `
      <div class="owner-heading gcc-head">
        <div>
          <p class="eyebrow">CUSTOMER CONTACT</p>
          <h2>顧客対応</h2>
          <p>WEB・LINE・電話の連絡をここで確認します。返信後、必要なものだけ営業対応へ進めます。</p>
        </div>
        <button class="btn btn--primary" id="gcc-phone">＋ 電話受付</button>
      </div>

      <div class="gcc-mail-wait" id="gcc-mail-wait">
        <strong>WEBメール返信は独自ドメイン設定待ち</strong>
        <span>受信・内容確認・営業案件化は利用できます。ドメイン確定後に、この画面からのメール返信を有効化します。</span>
      </div>

      <div class="gcc-channel-warning" id="gcc-channel-warning" hidden></div>

      <div class="gcc-toolbar">
        <div class="gcc-tabs" role="tablist" aria-label="受付チャネル">
          <button type="button" data-gcc-channel="all" class="is-active">すべて <b id="gcc-count-all">0</b></button>
          <button type="button" data-gcc-channel="website">WEB <b id="gcc-count-web">0</b></button>
          <button type="button" data-gcc-channel="line">LINE <b id="gcc-count-line">0</b></button>
          <button type="button" data-gcc-channel="phone">電話 <b id="gcc-count-phone">0</b></button>
        </div>
        <label class="gcc-search">検索
          <input id="gcc-search" placeholder="氏名・会社名・受付番号・メッセージ">
        </label>
        <button class="btn btn--secondary" id="gcc-reload">再表示</button>
      </div>

      <div class="gcc-layout">
        <section class="gcc-list-panel" aria-label="顧客対応一覧">
          <div class="gcc-list" id="gcc-list"><div class="gcc-empty">読み込み中です…</div></div>
        </section>
        <section class="gcc-detail-panel" id="gcc-detail" aria-live="polite">
          <div class="gcc-detail-empty">
            <strong>顧客対応を選択してください</strong>
            <span>WEB・LINE・電話の内容と対応操作がここに表示されます。</span>
          </div>
        </section>
      </div>
    `;

    $("#gcc-phone")?.addEventListener("click", () => {
      const original = $('[data-view-panel="dashboard"] [data-action="phone-inquiry"]');
      original?.click();
    });
    $("#gcc-reload")?.addEventListener("click", () => loadUnified(true).catch(showError));
    $("#gcc-search")?.addEventListener("input", (e) => {
      state.query = e.target.value.trim().toLowerCase();
      applyFilter();
    });
    $$("[data-gcc-channel]", root).forEach((button) => button.addEventListener("click", () => {
      state.channel = button.dataset.gccChannel || "all";
      $$("[data-gcc-channel]", root).forEach((b) => b.classList.toggle("is-active", b === button));
      applyFilter();
    }));
  }

  function renderChannelWarning() {
    const box = $("#gcc-channel-warning");
    if (!box) return;

    if (!state.channelErrors.length) {
      box.hidden = true;
      box.innerHTML = "";
      return;
    }

    box.hidden = false;
    box.innerHTML = `
      <strong>一部チャネルを取得できませんでした</strong>
      <span>${state.channelErrors.map((x) => esc(x)).join(" / ")}</span>
      <small>取得できたチャネルはそのまま表示しています。「再表示」で再試行できます。</small>
    `;
  }

  async function enrichLineInquiries(inquiries) {
    const rows = inquiries.filter((x) => x.source === "line").slice(0, 50);
    const details = await Promise.all(rows.map(async (row) => {
      try {
        const r = await coreApi(`/api/admin/inquiries/${encodeURIComponent(row.id)}`);
        return r?.data?.inquiry || null;
      } catch { return null; }
    }));
    state.lineInquiryByUser.clear();
    for (const row of details) {
      if (row?.line_user_id) state.lineInquiryByUser.set(String(row.line_user_id), row);
    }
  }

  async function loadUnified(force = false) {
    if (state.loading && !force) return;
    state.loading = true;
    const list = $("#gcc-list");
    if (list) list.innerHTML = '<div class="gcc-empty">顧客対応を確認しています…</div>';

    try {
      const [coreResult, lineResult] = await Promise.allSettled([
        coreApi("/api/admin/inquiries?limit=200"),
        lineApi("/api/contact/threads")
      ]);

      const coreOk = coreResult.status === "fulfilled";
      const lineOk = lineResult.status === "fulfilled";

      state.channelErrors = [];
      if (!coreOk) {
        state.channelErrors.push(`WEB・電話: ${coreResult.reason?.message || "取得失敗"}`);
      }
      if (!lineOk) {
        state.channelErrors.push(`LINE: ${lineResult.reason?.message || "取得失敗"}`);
      }

      if (!coreOk && !lineOk) {
        throw new Error(state.channelErrors.join(" / "));
      }

      const core = coreOk ? coreResult.value : null;
      const threads = lineOk ? lineResult.value : null;

      const inquiries = Array.isArray(core?.data?.items) ? core.data.items : [];
      state.lineThreads = Array.isArray(threads?.threads) ? threads.threads : [];

      if (coreOk) {
        await enrichLineInquiries(inquiries);
      } else {
        state.lineInquiryByUser.clear();
      }

      const coreItems = inquiries
        .filter((row) => lineOk ? row.source !== "line" : true)
        .map((row) => ({
          key: `inquiry:${row.id}`,
          kind: "inquiry",
          channel: row.source === "website" ? "website" : row.source === "phone" ? "phone" : row.source === "line" ? "line" : row.source || "website",
          id: row.id,
          title: row.company_name || row.contact_name || "お問い合わせ",
          sub: row.contact_name || row.phone || row.email || "",
          preview: row.inquiry_category || (row.source === "line" ? "LINE受付（返信接続を再試行してください）" : "相談受付"),
          status: row.status || "new",
          at: row.updated_at || row.created_at,
          unread: row.status === "new" ? 1 : 0,
          raw: row
        }));

      const lineItems = state.lineThreads.map((thread) => {
        const inquiry = state.lineInquiryByUser.get(String(thread.userKey || thread.lineUserId || thread.line_user_id || ""));
        return {
          key: `line:${thread.id}`,
          kind: "line",
          channel: "line",
          id: thread.id,
          inquiryId: inquiry?.id || null,
          title: thread.displayName || "LINEユーザー",
          sub: inquiry?.company_name || inquiry?.contact_name || "",
          preview: thread.lastMessage || "LINE会話",
          status: thread.status || "open",
          at: thread.lastMessageAt || thread.updatedAt || thread.createdAt,
          unread: Number(thread.unreadCount || 0),
          raw: thread,
          inquiry
        };
      });

      state.items = [...coreItems, ...lineItems].sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0));
      renderChannelWarning();
      updateCounts();
      applyFilter();

      if (state.selected) {
        const same = state.items.find((x) => x.key === state.selected.key);
        if (same) await selectItem(same, false);
      }
    } finally {
      state.loading = false;
    }
  }

  function updateCounts() {
    const count = (ch) => state.items.filter((x) => ch === "all" || x.channel === ch).length;
    $("#gcc-count-all").textContent = count("all");
    $("#gcc-count-web").textContent = count("website");
    $("#gcc-count-line").textContent = count("line");
    $("#gcc-count-phone").textContent = count("phone");
  }

  function applyFilter() {
    const q = state.query;
    state.filtered = state.items.filter((item) => {
      if (state.channel !== "all" && item.channel !== state.channel) return false;
      if (!q) return true;
      return `${item.title} ${item.sub} ${item.preview} ${item.raw?.reception_number || ""}`.toLowerCase().includes(q);
    });
    renderList();
  }

  function channelLabel(channel) {
    return channel === "website" ? "WEB" : channel === "line" ? "LINE" : channel === "phone" ? "電話" : String(channel || "受付");
  }

  function statusLabel(item) {
    if (item.kind === "line") return item.status === "closed" ? "対応完了" : (item.unread ? `未読 ${item.unread}` : "対応中");
    const map = { new:"新着", contacted:"連絡済み", site_check_scheduling:"現地確認調整中", site_check_scheduled:"現地確認予定", planning:"計画中", won:"成約", lost:"失注", on_hold:"保留" };
    return map[item.status] || item.status || "受付";
  }

  function renderList() {
    const list = $("#gcc-list");
    if (!list) return;
    if (!state.filtered.length) {
      list.innerHTML = '<div class="gcc-empty">該当する顧客対応はありません。</div>';
      return;
    }
    list.innerHTML = state.filtered.map((item) => `
      <button type="button" class="gcc-item${state.selected?.key === item.key ? " is-active" : ""}" data-gcc-key="${esc(item.key)}">
        <span class="gcc-item-top">
          <span class="gcc-channel is-${esc(item.channel)}">${esc(channelLabel(item.channel))}</span>
          <time>${esc(fmt(item.at))}</time>
        </span>
        <strong>${esc(item.title)}</strong>
        ${item.sub ? `<span class="gcc-sub">${esc(item.sub)}</span>` : ""}
        <span class="gcc-preview">${esc(item.preview)}</span>
        <span class="gcc-status${item.unread ? " is-unread" : ""}">${esc(statusLabel(item))}</span>
      </button>
    `).join("");

    $$("[data-gcc-key]", list).forEach((button) => button.addEventListener("click", () => {
      const item = state.items.find((x) => x.key === button.dataset.gccKey);
      if (item) selectItem(item).catch(showError);
    }));
  }

  async function selectItem(item, markRead = true) {
    state.selected = item;
    renderList();
    if (item.kind === "line") await renderLine(item, markRead);
    else await renderInquiry(item);
  }

  async function renderInquiry(item) {
    const detail = $("#gcc-detail");
    if (!detail) return;
    detail.innerHTML = '<div class="gcc-detail-empty">内容を読み込んでいます…</div>';

    const result = await coreApi(`/api/admin/inquiries/${encodeURIComponent(item.id)}`);
    const inquiry = result?.data?.inquiry || item.raw || {};
    const photos = Array.isArray(result?.data?.photos) ? result.data.photos : [];
    item.raw = inquiry;

    const email = text(inquiry.email);
    const phone = text(inquiry.phone);
    const preferred = inquiry.preferred_contact_method === "email" ? "メール" : inquiry.preferred_contact_method === "phone" ? "電話" : "おまかせ";

    detail.innerHTML = `
      <div class="gcc-detail-head">
        <div>
          <span class="gcc-channel is-${esc(item.channel)}">${esc(channelLabel(item.channel))}</span>
          <h3>${esc(inquiry.company_name || inquiry.contact_name || "お問い合わせ")}</h3>
          <p>${esc(inquiry.reception_number || "")} / 希望連絡：${esc(preferred)}</p>
        </div>
        <span class="gcc-status">${esc(statusLabel(item))}</span>
      </div>

      <div class="gcc-facts">
        <div><small>担当者</small><strong>${esc(inquiry.contact_name || "未設定")}</strong></div>
        <div><small>電話</small><strong>${esc(phone || "未設定")}</strong></div>
        <div><small>メール</small><strong>${esc(email || "未設定")}</strong></div>
        <div><small>住所</small><strong>${esc(inquiry.address || "未設定")}</strong></div>
      </div>

      <section class="gcc-message-card">
        <small>相談内容</small>
        <p>${esc(inquiry.inquiry_text || "内容なし").replace(/\n/g, "<br>")}</p>
      </section>

      ${photos.length ? `<section class="gcc-photo-grid">${photos.map((p) => p.signed_url ? `<a href="${esc(p.signed_url)}" target="_blank" rel="noopener"><img src="${esc(p.signed_url)}" alt="問い合わせ写真"></a>` : "").join("")}</section>` : ""}

      <div class="gcc-actions">
        ${phone ? `<a class="btn btn--secondary" href="tel:${esc(phone.replace(/[^\d+]/g, ""))}">電話する</a>` : ""}
        <button class="btn btn--secondary" type="button" id="gcc-email" ${EMAIL_READY && email ? "" : "disabled"}>
          ${EMAIL_READY ? "メール返信" : "メール返信（ドメイン設定待ち）"}
        </button>
        <button class="btn btn--primary" type="button" id="gcc-lead">営業案件へ進める</button>
      </div>
      ${!EMAIL_READY ? '<p class="gcc-domain-note">独自ドメインとメール送受信設定が完了すると、ここからWEB問い合わせへ返信できるようになります。</p>' : ""}
    `;

    $("#gcc-lead")?.addEventListener("click", () => createLead(item));
  }

  async function renderLine(item, markRead = true) {
    const detail = $("#gcc-detail");
    if (!detail) return;
    detail.innerHTML = '<div class="gcc-detail-empty">LINE会話を読み込んでいます…</div>';

    const data = await lineApi(`/api/contact/threads/${encodeURIComponent(item.id)}/messages`);
    const messages = Array.isArray(data?.messages) ? data.messages : [];

    if (markRead && item.unread > 0) {
      await lineApi(`/api/contact/threads/${encodeURIComponent(item.id)}/read`, { method:"POST", body:"{}" }).catch(() => {});
      item.unread = 0;
      updateCounts();
      renderList();
    }

    detail.innerHTML = `
      <div class="gcc-detail-head">
        <div>
          <span class="gcc-channel is-line">LINE</span>
          <h3>${esc(item.title)}</h3>
          <p>${esc(item.sub || "LINE公式からの会話")}</p>
        </div>
        <button class="btn btn--secondary" type="button" id="gcc-line-status">${item.status === "closed" ? "対応を再開" : "対応完了にする"}</button>
      </div>

      <div class="gcc-conversation" id="gcc-conversation">
        ${messages.length ? messages.map((msg) => `
          <div class="gcc-bubble ${msg.direction === "outbound" ? "is-out" : "is-in"}">
            ${msg.body || msg.text ? `<p>${esc(msg.body || msg.text || "").replace(/\n/g, "<br>")}</p>` : ""}
            ${lineAttachmentHtml(msg.attachment)}
            <small>${esc(fmt(msg.occurredAt || msg.occurred_at || msg.createdAt || msg.created_at))}</small>
          </div>
        `).join("") : '<div class="gcc-empty">表示できるメッセージはありません。</div>'}
      </div>

      <form class="gcc-reply" id="gcc-line-reply">
        <label>LINEへ返信
          <textarea id="gcc-line-text" maxlength="5000" placeholder="返信内容を入力してください"></textarea>
        </label>
        <button class="btn btn--primary" type="submit">LINEへ返信</button>
      </form>

      <div class="gcc-actions">
        ${item.inquiryId ? '<button class="btn btn--secondary" type="button" id="gcc-line-lead">営業案件へ進める</button>' : '<span class="gcc-domain-note">営業案件化する受付情報を確認中です。必要な場合は「営業対応」から登録できます。</span>'}
      </div>
    `;

    const box = $("#gcc-conversation");
    if (box) box.scrollTop = box.scrollHeight;

    $("#gcc-line-reply")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const textarea = $("#gcc-line-text");
      const value = textarea?.value.trim();
      if (!value) return;
      const button = event.submitter;
      if (button) { button.disabled = true; button.textContent = "送信中…"; }
      try {
        await lineApi(`/api/contact/threads/${encodeURIComponent(item.id)}/reply`, {
          method:"POST", body:JSON.stringify({ text:value })
        });
        if (textarea) textarea.value = "";
        window.Green?.toast?.("LINEへ返信しました。", "success");
        await loadUnified(true);
        const same = state.items.find((x) => x.key === item.key);
        if (same) await selectItem(same, false);
      } catch (error) {
        window.Green?.toast?.(`LINE返信に失敗しました。${error.message}`, "error");
      } finally {
        if (button) { button.disabled = false; button.textContent = "LINEへ返信"; }
      }
    });

    $("#gcc-line-status")?.addEventListener("click", async () => {
      const next = item.status === "closed" ? "open" : "closed";
      await lineApi(`/api/contact/threads/${encodeURIComponent(item.id)}/status`, {
        method:"POST", body:JSON.stringify({ status:next })
      });
      item.status = next;
      window.Green?.toast?.(next === "closed" ? "対応完了にしました。" : "対応を再開しました。", "success");
      await loadUnified(true);
    });

    $("#gcc-line-lead")?.addEventListener("click", () => createLead({ ...item, id:item.inquiryId, kind:"inquiry" }));
  }

  async function createLead(item) {
    if (!item?.id) return;
    const button = $("#gcc-lead") || $("#gcc-line-lead");
    if (button) { button.disabled = true; button.textContent = "作成中…"; }
    try {
      const result = await coreApi("/api/admin/leads", {
        method:"POST",
        json:{ inquiryId:item.id, status:item.inquiry?.status || item.raw?.status || "new" }
      });
      window.Green?.toast?.(result?.data?.reused ? "既存の営業案件があります。" : "営業案件を作成しました。", "success");
      const leadNav = $('[data-view="leads"]');
      if (leadNav) setTimeout(() => leadNav.click(), 350);
    } catch (error) {
      window.Green?.toast?.(`営業案件を作成できませんでした。${error.message}`, "error");
      if (button) { button.disabled = false; button.textContent = "営業案件へ進める"; }
    }
  }

  function showError(error) {
    console.error("[DPRO GREEN CUSTOMER CONTACT]", error);
    const list = $("#gcc-list");
    if (list) list.innerHTML = `<div class="gcc-error">顧客対応を読み込めませんでした。${esc(error?.message || "")}</div>`;
    window.Green?.toast?.("顧客対応の読み込みに失敗しました。", "error");
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest?.('[data-view="inquiries"]');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    activateCustomerContact();
  }, true);

  function init() {
    renameNavigation();
    ensureUi();
    const params = new URLSearchParams(location.search);
    if (params.get("view") === "customer-contact" || location.hash === "#customer-contact") {
      setTimeout(activateCustomerContact, 0);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once:true });
  else init();
})();
