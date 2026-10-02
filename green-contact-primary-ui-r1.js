(() => {
  "use strict";

  const VERSION = "GREEN-CONTACT-PRIMARY-UI-R1.6-CONTRACT-CHANGE-REVIEW-R1-20261002";
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


/* DPRO GREEN LINE COPY PREVIEW / EDIT R1 / 2026-10-02 */
(() => {
  "use strict";

  const VERSION = "GREEN-LINE-COPY-PREVIEW-R1.0-20261002";
  if (window.__GREEN_LINE_COPY_PREVIEW_R1__ === VERSION) return;
  window.__GREEN_LINE_COPY_PREVIEW_R1__ = VERSION;

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  let currentReportId = "";

  function ensureStyle() {
    if (document.getElementById("green-line-copy-preview-r1-style")) return;
    const style = document.createElement("style");
    style.id = "green-line-copy-preview-r1-style";
    style.textContent = `
      #green-line-copy-preview-r1{
        width:min(760px,calc(100vw - 28px));
        max-height:min(86vh,860px);
        padding:0;
        border:0;
        border-radius:22px;
        box-shadow:0 24px 80px rgba(18,49,37,.28);
        color:#172d24;
      }
      #green-line-copy-preview-r1::backdrop{background:rgba(18,38,31,.48);}
      .green-line-copy-shell{display:grid;grid-template-rows:auto 1fr auto;max-height:86vh;background:#fff;}
      .green-line-copy-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;padding:24px 26px 18px;border-bottom:1px solid #dce7e1;}
      .green-line-copy-head small{display:block;color:#3e966f;font-weight:800;letter-spacing:.18em;margin-bottom:7px;}
      .green-line-copy-head h2{margin:0;font-size:24px;line-height:1.3;}
      .green-line-copy-close{width:42px;height:42px;border:0;border-radius:50%;background:#f1f5f2;font-size:29px;line-height:1;cursor:pointer;}
      .green-line-copy-body{padding:22px 26px;overflow:auto;display:grid;gap:16px;}
      .green-line-copy-note{padding:14px 16px;border-radius:12px;background:#f3f8f5;border:1px solid #d8e6de;line-height:1.65;font-weight:650;}
      .green-line-copy-note strong{display:block;margin-bottom:3px;}
      .green-line-copy-editor-label{display:grid;gap:8px;font-weight:800;}
      #green-line-copy-text{width:100%;min-height:320px;resize:vertical;box-sizing:border-box;padding:16px;border:1px solid #cfddd5;border-radius:14px;background:#fff;font:inherit;line-height:1.72;color:#172d24;}
      #green-line-copy-text:focus{outline:3px solid rgba(35,123,86,.14);border-color:#267d59;}
      .green-line-copy-meta{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;color:#667970;font-size:13px;}
      .green-line-copy-result{padding:13px 15px;border-radius:12px;border:1px solid #e7c66c;background:#fff8df;color:#6f5210;font-weight:800;line-height:1.55;}
      .green-line-copy-result.is-error{border-color:#e2a7a0;background:#fff2f0;color:#8a2920;}
      .green-line-copy-foot{display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap;padding:16px 26px 20px;border-top:1px solid #dce7e1;background:#fbfdfc;}
      .green-line-copy-foot button{min-height:42px;}
      @media(max-width:640px){
        .green-line-copy-head,.green-line-copy-body,.green-line-copy-foot{padding-left:16px;padding-right:16px;}
        .green-line-copy-foot .btn{width:100%;}
        #green-line-copy-text{min-height:300px;}
      }
    `;
    document.head.appendChild(style);
  }

  function ensureDialog() {
    ensureStyle();
    let dialog = document.getElementById("green-line-copy-preview-r1");
    if (dialog) return dialog;
    dialog = document.createElement("dialog");
    dialog.id = "green-line-copy-preview-r1";
    dialog.innerHTML = `
      <div class="green-line-copy-shell">
        <header class="green-line-copy-head">
          <div><small>LINE MESSAGE PREVIEW</small><h2>LINE送信用文面を確認・編集</h2></div>
          <button type="button" class="green-line-copy-close" aria-label="閉じる">×</button>
        </header>
        <div class="green-line-copy-body">
          <div class="green-line-copy-note">
            <strong>この画面で最終文面を確認できます。</strong>
            ここでの修正は今回の送信用文面だけに反映され、元の文面テンプレートは変更しません。
          </div>
          <label class="green-line-copy-editor-label">送信・コピーする文面
            <textarea id="green-line-copy-text" maxlength="5000"></textarea>
          </label>
          <div class="green-line-copy-meta"><span>個別の一言や補足を自由に追加できます。</span><span id="green-line-copy-count">0 / 5000</span></div>
          <div id="green-line-copy-result" class="green-line-copy-result" hidden></div>
        </div>
        <footer class="green-line-copy-foot">
          <button type="button" class="btn btn--secondary" id="green-line-copy-reset">テンプレートに戻す</button>
          <button type="button" class="btn btn--secondary" id="green-line-copy-cancel">取消</button>
          <button type="button" class="btn btn--primary" id="green-line-copy-confirm">この文面をコピー</button>
        </footer>
      </div>`;
    document.body.appendChild(dialog);
    const close = () => { if (dialog.open) dialog.close(); };
    $(".green-line-copy-close", dialog).addEventListener("click", close);
    $("#green-line-copy-cancel", dialog).addEventListener("click", close);
    dialog.addEventListener("cancel", (event) => { event.preventDefault(); close(); });
    return dialog;
  }

  async function resolveReportId() {
    if (currentReportId) return currentReportId;
    const title = $("#dialog-title")?.textContent?.trim() || "";
    const match = title.match(/作業報告\s+(RPT-[A-Z0-9-]+)/i);
    if (!match || !window.Green?.api) return "";
    try {
      const result = await window.Green.api(`/api/admin/reports?search=${encodeURIComponent(match[1])}`);
      const exact = (result?.data?.items || []).find((item) => item.report_number === match[1]);
      if (exact?.id) currentReportId = exact.id;
    } catch {}
    return currentReportId;
  }

  function updateHistoryCount() {
    const item = $$(".owner-mini-item", $("#dialog-body") || document).find((node) => node.textContent.trim().startsWith("コピー・送信履歴："));
    if (!item) return;
    const match = item.textContent.match(/(\d+)件/);
    const count = match ? Number(match[1]) + 1 : 1;
    item.textContent = `コピー・送信履歴：${count}件`;
  }

  async function showPreview() {
    const Green = window.Green;
    const reportId = await resolveReportId();
    if (!Green?.api || !reportId) {
      Green?.toast?.("作業報告を特定できませんでした。いったん詳細を閉じて開き直してください。", "error");
      return;
    }

    const sourceButton = $("#copy-report-line");
    if (sourceButton) {
      sourceButton.disabled = true;
      sourceButton.textContent = "文面作成中…";
    }

    try {
      const preview = await Green.api(`/api/admin/reports/${reportId}/message-copy`, {
        method:"POST",
        json:{ templateKey:"visit_completion", previewOnly:true }
      });
      const originalMessage = String(preview?.data?.message || "");
      const dialog = ensureDialog();
      const textarea = $("#green-line-copy-text", dialog);
      const count = $("#green-line-copy-count", dialog);
      const reset = $("#green-line-copy-reset", dialog);
      const confirm = $("#green-line-copy-confirm", dialog);
      const resultBox = $("#green-line-copy-result", dialog);

      const updateCount = () => { count.textContent = `${textarea.value.length} / 5000`; };
      textarea.value = originalMessage;
      updateCount();
      resultBox.hidden = true;
      resultBox.classList.remove("is-error");
      confirm.disabled = false;
      confirm.textContent = "この文面をコピー";

      textarea.oninput = updateCount;
      reset.onclick = () => {
        textarea.value = originalMessage;
        updateCount();
        textarea.focus();
      };

      confirm.onclick = async () => {
        const finalMessage = textarea.value.trim();
        if (!finalMessage) {
          resultBox.textContent = "文面を入力してください。";
          resultBox.classList.add("is-error");
          resultBox.hidden = false;
          return;
        }
        confirm.disabled = true;
        confirm.textContent = "コピー中…";
        resultBox.hidden = true;
        resultBox.classList.remove("is-error");
        let copied = false;
        try {
          await navigator.clipboard.writeText(finalMessage);
          copied = true;
          const saved = await Green.api(`/api/admin/reports/${reportId}/message-copy`, {
            method:"POST",
            json:{ templateKey:"visit_completion", message:finalMessage }
          });
          const savedMessage = String(saved?.data?.message || finalMessage);
          if (savedMessage !== finalMessage) await navigator.clipboard.writeText(savedMessage);
          updateHistoryCount();
          resultBox.textContent = "この文面をコピーしました。コピー履歴にも同じ最終文面を保存しました。";
          resultBox.hidden = false;
          confirm.textContent = "コピー済み";
          Green.toast?.("LINE文面をコピーしました。", "success");
        } catch (error) {
          resultBox.textContent = copied
            ? "文面はクリップボードへコピーしましたが、履歴保存に失敗しました。画面を閉じずにもう一度お試しください。"
            : `コピーできませんでした。${error?.message ? ` ${error.message}` : ""}`;
          resultBox.classList.add("is-error");
          resultBox.hidden = false;
          confirm.disabled = false;
          confirm.textContent = copied ? "履歴保存を再試行" : "この文面をコピー";
        }
      };

      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
      setTimeout(() => textarea.focus(), 0);
    } catch (error) {
      Green.toast?.(`LINE文面を作成できませんでした。${error?.message ? ` ${error.message}` : ""}`, "error");
    } finally {
      if (sourceButton && sourceButton.isConnected) {
        sourceButton.disabled = false;
        sourceButton.textContent = "LINE文面をコピー";
      }
    }
  }

  function replaceCopyButton() {
    const original = $("#copy-report-line");
    if (!original || original.dataset.greenLinePreviewBound === VERSION) return;
    const replacement = original.cloneNode(true);
    replacement.dataset.greenLinePreviewBound = VERSION;
    replacement.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      showPreview();
    });
    original.replaceWith(replacement);
  }

  // Capture report id before owner.js opens the detail dialog.
  document.addEventListener("click", (event) => {
    const button = event.target.closest?.("[data-report]");
    if (button?.dataset?.report) currentReportId = button.dataset.report;
  }, true);

  let queued = false;
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      replaceCopyButton();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", schedule, { once:true });
  else schedule();
  new MutationObserver(schedule).observe(document.body, { childList:true, subtree:true });
})();


/* DPRO GREEN CONTRACT CHANGE REVIEW R1 / 2026-10-02 */
(() => {
  "use strict";
  const VERSION = "GREEN-CONTRACT-CHANGE-REVIEW-R1.0-20261002";
  if (window.__GREEN_CONTRACT_CHANGE_REVIEW_R1__ === VERSION) return;
  window.__GREEN_CONTRACT_CHANGE_REVIEW_R1__ = VERSION;
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
  const statusLabels = {requested:"受付中",reviewing:"確認中",approved:"承認済み",applied:"反映済み",rejected:"却下",cancelled:"取消"};
  const typeLabels = {visit_change_request:"訪問日時・利用内容の変更"};
  let currentContractId = "";
  let loading = false;
  function ensureStyle(){
    if(document.getElementById("green-contract-change-review-r1-style"))return;
    const style=document.createElement("style");style.id="green-contract-change-review-r1-style";style.textContent=`
      .green-contract-change-review{margin-top:24px}.green-contract-change-review-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:12px}.green-contract-change-review-head h3{margin:0;font-size:20px}.green-contract-change-review-head p{margin:4px 0 0;color:#66786f;font-size:13px}.green-contract-change-card{border:1px solid #d8e3dc;border-radius:14px;background:#fff;padding:16px;display:grid;gap:14px;margin-top:12px}.green-contract-change-meta{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.green-contract-change-meta>div{border:1px solid #e1e9e4;border-radius:10px;background:#f8fbf9;padding:10px 12px;display:grid;gap:4px}.green-contract-change-meta small{color:#6c7d75;font-weight:700}.green-contract-change-meta strong{color:#172d24}.green-contract-change-request{border:1px solid #d8e3dc;border-radius:10px;background:#fbfdfc;padding:12px 14px;white-space:pre-wrap;line-height:1.7}.green-contract-change-note{display:grid;gap:6px}.green-contract-change-note span{font-weight:800;color:#263b32}.green-contract-change-note textarea{width:100%;min-height:84px;resize:vertical;border:1px solid #cad9d0;border-radius:10px;padding:10px 12px;font:inherit;box-sizing:border-box}.green-contract-change-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.green-contract-change-actions .btn{margin:0}.green-contract-change-warning{padding:10px 12px;border-radius:10px;background:#fff8e8;border:1px solid #efc36d;color:#765319;line-height:1.55;font-size:13px}.green-contract-change-empty{padding:14px;border:1px dashed #cfdcd4;border-radius:12px;color:#687b72;background:#fbfdfc}@media(max-width:760px){.green-contract-change-meta{grid-template-columns:1fr}.green-contract-change-actions .btn{width:100%}}`;
    document.head.appendChild(style);
  }
  function formatDate(value){if(!value)return"未設定";const d=new Date(`${String(value).slice(0,10)}T00:00:00+09:00`);if(Number.isNaN(d.getTime()))return String(value);return new Intl.DateTimeFormat("ja-JP",{year:"numeric",month:"numeric",day:"numeric",timeZone:"Asia/Tokyo"}).format(d)}
  function formatDateTime(value){if(!value)return"未設定";const d=new Date(value);if(Number.isNaN(d.getTime()))return String(value);return new Intl.DateTimeFormat("ja-JP",{year:"numeric",month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit",timeZone:"Asia/Tokyo"}).format(d)}
  function nativeChangeSection(){return $$("#dialog-body .owner-dialog-section").find((section)=>$("h3",section)?.textContent?.trim()==="変更履歴")||null}
  function actionButtons(change){const status=change.status;const parts=[];if(status==="requested")parts.push('<button class="btn btn--secondary" data-change-status="reviewing">確認中にする</button>');if(["requested","reviewing"].includes(status)){parts.push('<button class="btn btn--primary" data-change-status="approved">承認する</button>');parts.push('<button class="btn btn--secondary" data-change-status="rejected">却下する</button>')}if(status==="approved"){parts.push('<button class="btn btn--secondary" data-change-open-visits>巡回予定で調整</button>');parts.push('<button class="btn btn--primary" data-change-status="applied">反映済みにする</button>')}if(["rejected","cancelled"].includes(status))parts.push('<button class="btn btn--secondary" data-change-status="reviewing">確認中へ戻す</button>');return parts.join("")}
  function renderReview(changes){const native=nativeChangeSection();if(!native)return;native.hidden=true;let section=$("#green-contract-change-review-r1");if(!section){section=document.createElement("section");section.id="green-contract-change-review-r1";section.className="green-contract-change-review";native.insertAdjacentElement("afterend",section)}const rows=Array.isArray(changes)?changes:[];section.innerHTML=`<div class="green-contract-change-review-head"><div><h3>変更依頼・対応</h3><p>お客様からの希望内容を確認し、対応状況を管理します。</p></div></div>${rows.length?rows.map((change)=>{const requestText=change?.requested_data?.requestText||change?.requested_data?.request_text||"変更内容の記載はありません。";const note=change.reason||"";return `<article class="green-contract-change-card" data-change-id="${esc(change.id)}"><div class="green-contract-change-meta"><div><small>依頼種別</small><strong>${esc(typeLabels[change.change_type]||change.change_type||"変更依頼")}</strong></div><div><small>状態</small><strong>${esc(statusLabels[change.status]||change.status||"未設定")}</strong></div><div><small>受付日時</small><strong>${esc(formatDateTime(change.requested_at))}</strong></div><div><small>希望日</small><strong>${esc(formatDate(change.effective_on))}</strong></div></div><div><strong>お客様の相談内容</strong><div class="green-contract-change-request">${esc(requestText)}</div></div><label class="green-contract-change-note"><span>対応メモ</span><textarea data-change-note placeholder="確認内容やお客様への案内内容を記録します。">${esc(note)}</textarea></label>${change.status==="approved"?'<div class="green-contract-change-warning">承認だけでは実際の訪問予定は変更されません。「巡回予定」で日程を調整した後、「反映済みにする」で完了してください。</div>':""}<div class="green-contract-change-actions">${actionButtons(change)}</div></article>`}).join(""):'<div class="green-contract-change-empty">変更依頼はありません。</div>'}`;$$('[data-change-status]',section).forEach((button)=>button.addEventListener("click",()=>updateChange(button)));$$('[data-change-open-visits]',section).forEach((button)=>button.addEventListener("click",()=>{document.getElementById("dialog-close")?.click();document.querySelector('[data-view="visits"]')?.click()}))}
  async function loadReview(){if(!currentContractId||loading)return;const title=$("#dialog-title")?.textContent?.trim()||"";if(!title.startsWith("利用番号 "))return;const Green=window.Green;if(!Green?.api)return;const native=nativeChangeSection();if(!native)return;loading=true;try{const result=await Green.api(`/api/admin/contracts/${encodeURIComponent(currentContractId)}`);renderReview(result?.data?.changes||[])}catch(error){console.warn("[DPRO GREEN] contract change review load failed",error)}finally{loading=false}}
  async function updateChange(button){const card=button.closest("[data-change-id]");if(!card||!currentContractId)return;const changeId=card.dataset.changeId;const status=button.dataset.changeStatus;const note=$("[data-change-note]",card)?.value?.trim()||"";const Green=window.Green;if(!Green?.api)return;if(status==="approved"&&!confirm("この変更相談を承認しますか？\n承認しても実際の訪問予定は自動変更されません。"))return;if(status==="applied"&&!confirm("巡回予定・利用内容への実際の反映が完了していますか？"))return;if(status==="rejected"&&!confirm("この変更相談を却下しますか？"))return;const original=button.textContent;button.disabled=true;button.textContent="保存中…";try{await Green.api(`/api/admin/contracts/${encodeURIComponent(currentContractId)}/changes/${encodeURIComponent(changeId)}`,{method:"PATCH",json:{status,note}});Green.toast?.(`変更依頼を「${statusLabels[status]||status}」に更新しました。`,"success");const result=await Green.api(`/api/admin/contracts/${encodeURIComponent(currentContractId)}`);renderReview(result?.data?.changes||[])}catch(error){Green.toast?.(error?.message||"変更依頼を更新できませんでした。","error");button.disabled=false;button.textContent=original}}
  document.addEventListener("click",(event)=>{const button=event.target.closest?.("[data-contract]");if(button?.dataset?.contract)currentContractId=button.dataset.contract},true);
  let scheduled=false;const schedule=()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;ensureStyle();loadReview()})};if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",schedule,{once:true});else schedule();new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,characterData:true});
})();
