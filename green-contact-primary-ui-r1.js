(() => {
  "use strict";

  const VERSION = "GREEN-CONTACT-PRIMARY-UI-R1.4-MESSAGE-TAB-FIX-R1-20261002";
  window.__GREEN_CONTACT_PRIMARY_UI_R1__ = VERSION;

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  function ensureStyle() {
    if (document.getElementById("green-contact-primary-ui-r1-style")) return;
    const style = document.createElement("style");
    style.id = "green-contact-primary-ui-r1-style";
    style.textContent = `
      /* Existing contact-primary HUMAN ACCEPTANCE lock */
      #contact-form label[data-green-primary-contact]{
        grid-column:1 / -1;
        display:flex !important;
        align-items:flex-start !important;
        gap:12px !important;
        min-height:auto !important;
        padding:14px 16px !important;
        border:1px solid #d7e4dc !important;
        border-radius:12px !important;
        background:#f7fbf8 !important;
        cursor:pointer;
      }
      #contact-form label[data-green-primary-contact] input[type="checkbox"]{
        appearance:auto !important;
        -webkit-appearance:checkbox !important;
        width:20px !important;
        height:20px !important;
        min-width:20px !important;
        max-width:20px !important;
        min-height:20px !important;
        margin:2px 0 0 !important;
        padding:0 !important;
        border:initial !important;
        border-radius:initial !important;
        box-shadow:none !important;
        accent-color:#177653;
        flex:0 0 20px !important;
      }
      #contact-form .green-primary-contact-copy{
        display:grid;
        gap:4px;
        line-height:1.45;
      }
      #contact-form .green-primary-contact-title{
        font-weight:800;
        color:#172d24;
      }
      #contact-form .green-primary-contact-help{
        font-size:13px;
        font-weight:500;
        color:#64776e;
      }

      /* Replacement workflow footer */
      #dialog-footer{
        flex-wrap:wrap !important;
        align-items:center !important;
      }
      #dialog-footer > .green-replacement-next-action{
        flex:0 0 auto !important;
      }
      @media(max-width:760px){
        #dialog-footer > .green-replacement-next-action{
          width:100% !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function enhanceContactPrimary() {
    const form = document.getElementById("contact-form");
    if (!form) return;
    const input = form.querySelector('input[name="isPrimary"]');
    if (!input) return;
    const label = input.closest("label");
    if (!label || label.dataset.greenPrimaryContact === VERSION) return;

    label.dataset.greenPrimaryContact = VERSION;
    Array.from(label.childNodes).forEach((node) => {
      if (node === input) return;
      node.remove();
    });

    const copy = document.createElement("span");
    copy.className = "green-primary-contact-copy";
    copy.innerHTML = `
      <span class="green-primary-contact-title">主担当にする</span>
      <span class="green-primary-contact-help">この連絡先を、この顧客の代表連絡先として使用します。</span>
    `;
    label.appendChild(copy);
  }

  async function refreshReplacementCandidates() {
    const title = $("#dialog-title")?.textContent?.trim() || "";
    if (title !== "交換を承認・代替植物を割当") return;

    const select = $('#replacement-approve-form select[name="newPlantAssetId"]');
    if (!select || select.dataset.greenFreshCandidates === VERSION) return;
    select.dataset.greenFreshCandidates = VERSION;

    const Green = window.Green;
    if (!Green?.api) return;

    const previous = select.value || "";
    try {
      const result = await Green.api("/api/admin/assets?type=plant&limit=500");
      const plants = result?.data?.plants || [];
      const candidates = plants.filter((item) =>
        ["inventory", "reserved", "reusable", "replacement_planned"].includes(item.asset_status)
      );

      const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({
        "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;"
      }[char]));

      select.innerHTML =
        '<option value="">代替植物を選択</option>' +
        candidates.map((item) => {
          const label = `${item.display_name || item.asset_code}（${item.asset_code}）`;
          return `<option value="${esc(item.id)}">${esc(label)}</option>`;
        }).join("");

      if (previous && candidates.some((item) => item.id === previous)) {
        select.value = previous;
      }
    } catch (error) {
      delete select.dataset.greenFreshCandidates;
      console.warn("[DPRO GREEN] replacement candidate refresh failed", error);
    }
  }

  function replacementDetailStatus() {
    const title = $("#dialog-title")?.textContent?.trim() || "";
    if (!title.startsWith("交換 RPL-")) return "";
    return $(".owner-detail-grid .owner-detail-item:first-child strong", $("#dialog-body") || document)
      ?.textContent?.trim() || "";
  }

  function translateReplacementOperationStatus() {
    const title = $("#dialog-title")?.textContent?.trim() || "";
    if (!title.startsWith("交換 RPL-")) return;

    const map = {
      planned: "予定",
      scheduled: "予定",
      loaded: "積込済み",
      in_progress: "作業中",
      working: "作業中",
      completed: "完了",
      cancelled: "取消"
    };

    $$(".owner-mini-item", $("#dialog-body") || document).forEach((item) => {
      const text = item.textContent.trim();
      const prefix = "作業状態：";
      if (!text.startsWith(prefix)) return;
      const raw = text.slice(prefix.length).trim();
      if (map[raw]) item.textContent = `${prefix}${map[raw]}`;
    });
  }

  function placeNextReplacementAction() {
    const statusText = replacementDetailStatus();
    if (!statusText) return;

    const footer = $("#dialog-footer");
    if (!footer) return;

    const buttons = {
      approve: $("#approve-replacement"),
      load: $("#load-replacement"),
      complete: $("#complete-replacement"),
      returnRecovery: $("#return-recovery"),
      startCare: $("#start-care-from-recovery"),
    };

    Object.values(buttons).forEach((button) => {
      if (!button) return;
      button.hidden = true;
      button.classList.remove("green-replacement-next-action");
    });

    let next = null;

    if (statusText === "確認待ち" || statusText === "提案") {
      next = buttons.approve;
    } else if (statusText === "交換予定" || statusText === "承認済み" || statusText === "代替割当中") {
      next = buttons.load;
    } else if (statusText === "積込済み") {
      next = buttons.complete;
    } else if (statusText === "回収済み") {
      next = buttons.returnRecovery;
    } else if (statusText === "帰庫済み") {
      next = buttons.startCare;
    }

    if (!next) return;

    next.hidden = false;
    next.classList.add("green-replacement-next-action");

    /* Move the actual owner.js button to footer; listeners are preserved. */
    if (next.parentElement !== footer) footer.appendChild(next);
  }

  function enhanceReplacementDetail() {
    translateReplacementOperationStatus();
    placeNextReplacementAction();
  }

  let queued = false;
  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      ensureStyle();
      enhanceContactPrimary();
      enhanceReplacementDetail();
      refreshReplacementCandidates();
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", schedule, { once:true });
  } else {
    schedule();
  }

  new MutationObserver(schedule).observe(document.body, {
    childList:true,
    subtree:true,
    characterData:true
  });
})();

/* DPRO GREEN MESSAGE TAB FIX R1 / 2026-10-02 */
(() => {
  "use strict";

  const VERSION = "GREEN-MESSAGE-TAB-FIX-R1.0-20261002";
  if (window.__GREEN_MESSAGE_TAB_FIX_R1__ === VERSION) return;
  window.__GREEN_MESSAGE_TAB_FIX_R1__ = VERSION;

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  const typeLabels = {
    inquiry_received: "お問い合わせ受付",
    replacement_notice: "植物交換予定",
    site_check_scheduled: "現地確認予定",
    visit_completed: "作業完了",
    revisit_notice: "再訪問のご案内",
    visit_completion: "作業完了のお知らせ",
    visit_notice: "訪問予定のお知らせ"
  };

  const modeLabels = {
    copy: "文面コピー",
    line: "LINE送信",
    auto: "自動送信",
    manual: "手動"
  };

  const statusLabels = {
    pending: "文面コピー待ち",
    ready: "自動送信待ち",
    sending: "送信中",
    sent: "送信済み",
    skipped: "対象外",
    failed: "失敗",
    cancelled: "取消"
  };

  const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;"
  }[char]));

  function formatDateTime(value) {
    if (!value) return "未設定";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat("ja-JP", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  }

  async function loadNotifications() {
    const Green = window.Green;
    const tbody = $("#notification-rows");
    const status = $("#notification-status")?.value || "";
    if (!Green?.api || !tbody) return;

    tbody.innerHTML = '<tr><td colspan="6"><div class="owner-empty">読み込み中です…</div></td></tr>';

    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      const result = await Green.api(`/api/admin/notifications?${params}`);
      const items = result?.data?.items || [];

      tbody.innerHTML = items.length ? items.map((item) => `
        <tr>
          <td>${esc(formatDateTime(item.created_at))}</td>
          <td>${esc(item.customer?.company_name || item.customer?.contact_name || "顧客")}</td>
          <td>
            <span class="owner-row-title">${esc(typeLabels[item.notification_type] || item.notification_type || "通知")}</span>
            ${item.notification_type ? `<span class="owner-row-sub">${esc(item.notification_type)}</span>` : ""}
          </td>
          <td>${esc(modeLabels[item.mode] || item.mode || "—")}</td>
          <td>${esc(statusLabels[item.status] || item.status || "—")}</td>
          <td><span class="owner-message-preview">${esc(item.rendered_message || "文面未作成")}</span></td>
        </tr>
      `).join("") : '<tr><td colspan="6"><div class="owner-empty">通知ログはありません。</div></td></tr>';
    } catch (error) {
      tbody.innerHTML = '<tr><td colspan="6"><div class="owner-empty">通知ログを読み込めませんでした。</div></td></tr>';
      Green.toast?.(`通知ログの読み込みに失敗しました。${error?.message ? ` ${error.message}` : ""}`, "error");
    }
  }

  function switchTab(tab) {
    $$("[data-message-tab]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.messageTab === tab);
    });
    $$("[data-message-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.messagePanel !== tab;
    });

    if (tab === "notifications") loadNotifications();
  }

  function replaceNotificationReloadButton() {
    const panel = $('[data-message-panel="notifications"]');
    if (!panel) return;
    const current = panel.querySelector('button[data-load="messages"], button[data-green-notification-reload]');
    if (!current || current.dataset.greenNotificationReload === VERSION) return;

    const replacement = current.cloneNode(true);
    replacement.removeAttribute("data-load");
    replacement.dataset.greenNotificationReload = VERSION;
    replacement.addEventListener("click", (event) => {
      event.preventDefault();
      loadNotifications();
    });
    current.replaceWith(replacement);
  }

  function bindTabs() {
    $$("[data-message-tab]").forEach((button) => {
      if (button.dataset.greenMessageTabBound === VERSION) return;
      button.dataset.greenMessageTabBound = VERSION;
      button.addEventListener("click", (event) => {
        event.preventDefault();
        switchTab(button.dataset.messageTab);
      });
    });
    replaceNotificationReloadButton();
  }

  let queued = false;
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      bindTabs();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", schedule, { once: true });
  } else {
    schedule();
  }

  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
})();
