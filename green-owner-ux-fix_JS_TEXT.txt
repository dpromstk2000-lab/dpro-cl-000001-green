(() => {
  "use strict";

  const VERSION = "GREEN-OWNER-UX-FIX-R2.9-20260915";
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const dialog = $("#owner-dialog");
  if (!dialog || !window.Green) return;

  document.documentElement.dataset.greenOwnerUxFix = VERSION;

  const LEAD_STATUS_LABELS = Object.freeze({
    new: "新着",
    contacted: "連絡済み",
    site_check_scheduling: "現地確認調整中",
    site_check_scheduled: "現地確認予定",
    site_checked: "現地確認済み",
    planning: "導入内容整理中",
    preparing: "導入準備中",
    installation_scheduled: "設置予定",
    active: "利用開始",
    on_hold: "保留",
    lost: "失注",
    follow_up: "再連絡予定",
  });
  const LABEL_TO_STATUS = Object.freeze(Object.fromEntries(Object.entries(LEAD_STATUS_LABELS).map(([k, v]) => [v, k])));
  const ACTIVITY_TYPE_LABELS = Object.freeze({ call: "電話", line: "LINE", email: "メール", meeting: "面談", memo: "メモ" });
  const SITE_CHECK_STATUS_LABELS = Object.freeze({ scheduling: "日程調整中", scheduled: "予定確定", in_progress: "確認中", completed: "完了", postponed: "延期", cancelled: "取消" });
  const SITE_CHECK_PHOTO_LABELS = Object.freeze({ site: "現場全体", placement: "設置候補", access: "搬入経路", issue: "注意箇所", other: "その他" });
  const CUSTOMER_STATUS_LABELS = Object.freeze({ lead: "見込み", active: "利用中", paused: "休止", ended: "終了", inactive: "無効" });

  function esc(value) {
    return String(value ?? "").replace(/[&<>'\"]/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
    }[char]));
  }

  function pad2(value) { return String(value).padStart(2, "0"); }
  function localDateValue(date = new Date()) { return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`; }
  function localDateTimeValue(date) { return `${localDateValue(date)}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`; }
  function nextQuarterValue() {
    const date = new Date();
    date.setSeconds(0, 0);
    const rem = date.getMinutes() % 15;
    date.setMinutes(date.getMinutes() + (rem === 0 ? 15 : 15 - rem));
    return localDateTimeValue(date);
  }
  function toLocalInput(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return localDateTimeValue(date);
  }
  function localInputToIso(value) {
    if (!value) return "";
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? "" : date.toISOString();
  }
  function parseDisplayDateTime(text) {
    const match = String(text || "").match(/(\d{4})\/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})/);
    if (!match) return "";
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]), 0, 0);
    return localDateTimeValue(date);
  }
  function formatLocalDateTime(value) {
    if (!value) return "未設定";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
  }
  function isQuarterMinute(value) {
    if (!value) return true;
    const match = String(value).match(/T\d{2}:(\d{2})/);
    return Boolean(match) && Number(match[1]) % 15 === 0;
  }
  function isFutureDateTime(value) {
    if (!value) return true;
    const time = new Date(value).getTime();
    return Number.isFinite(time) && time >= Date.now();
  }

  function closeDialog() {
    if (typeof dialog.close === "function" && dialog.open) dialog.close();
    else dialog.removeAttribute("open");
  }
  function normalizeDialogShell() {
    const shell = $("#dialog-shell");
    if (!shell || shell.tagName !== "FORM") return;
    const replacement = document.createElement("div");
    for (const attribute of Array.from(shell.attributes)) {
      if (attribute.name !== "method") replacement.setAttribute(attribute.name, attribute.value);
    }
    while (shell.firstChild) replacement.append(shell.firstChild);
    shell.replaceWith(replacement);
  }
  function ensureDialogOpen() {
    if (dialog.open) return;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }
  function bindDialogClose() {
    $$('[data-dialog-close]', dialog).forEach((button) => {
      if (button.dataset.greenCloseBound === "1") return;
      button.dataset.greenCloseBound = "1";
      button.addEventListener("click", closeDialog);
    });
  }
  function setDialog(titleText, kickerText, bodyHtml, footerHtml) {
    const body = $("#dialog-body");
    const footer = $("#dialog-footer");
    const title = $("#dialog-title");
    const kicker = $("#dialog-kicker");
    if (title) title.textContent = titleText;
    if (kicker) kicker.textContent = kickerText;
    if (body) body.innerHTML = bodyHtml;
    if (footer) footer.innerHTML = footerHtml;
    bindDialogClose();
    ensureDialogOpen();
  }

  function timeoutError(ms) {
    const error = new Error(`通信が${Math.round(ms / 1000)}秒以内に完了しませんでした。`);
    error.code = "request_timeout";
    return error;
  }
  async function apiWithTimeout(path, options = undefined, ms = 7000) {
    let timer;
    try {
      return await Promise.race([
        window.Green.api(path, options),
        new Promise((_, reject) => { timer = setTimeout(() => reject(timeoutError(ms)), ms); }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  function showFormError(form, title, message, meta = "") {
    form?.querySelector(".green-owner-save-error")?.remove();
    const box = document.createElement("div");
    box.className = "green-owner-inline-error green-owner-save-error";
    box.setAttribute("role", "alert");
    box.innerHTML = `<strong>${esc(title)}</strong><span>${esc(message)}</span>${meta ? `<small>${esc(meta)}</small>` : ""}`;
    form?.prepend(box);
    box.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  function leadStatusOptions(selected) {
    return Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => `<option value="${value}"${value === selected ? " selected" : ""}>${label}</option>`).join("");
  }
  function activityTypeOptions() {
    return Object.entries(ACTIVITY_TYPE_LABELS).map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
  }
  function syncLeadReasonVisibility() {
    const form = $("#lead-update-form", dialog);
    if (!form) return;
    const status = $('[name="status"]', form)?.value || "new";
    const hold = $("[data-lead-reason='hold']", form);
    const lost = $("[data-lead-reason='lost']", form);
    if (hold) hold.hidden = status !== "on_hold";
    if (lost) lost.hidden = status !== "lost";
  }
  function applyScheduleRules() {
    const leadForm = $("#lead-update-form", dialog);
    if (leadForm) {
      const next = $('[name="nextActionAt"]', leadForm);
      const follow = $('[name="followUpOn"]', leadForm);
      if (next) { next.step = "900"; next.min = nextQuarterValue(); next.title = "現在以降を15分単位で選択してください。"; }
      if (follow) { follow.min = localDateValue(); follow.title = "今日以降の日付を選択してください。"; }
    }
    const activityForm = $("#lead-activity-form", dialog);
    if (activityForm) {
      const actual = $('[name="activityAt"]', activityForm);
      const next = $('[name="nextActionAt"]', activityForm);
      if (actual) { actual.step = "900"; actual.title = "実績日時は過去も入力できます。時間は15分単位です。"; }
      if (next) { next.step = "900"; next.min = nextQuarterValue(); next.title = "現在以降を15分単位で選択してください。"; }
    }
  }
  function validateLeadForm(form) {
    const next = $('[name="nextActionAt"]', form);
    const follow = $('[name="followUpOn"]', form);
    if (next?.value && !isQuarterMinute(next.value)) {
      showFormError(form, "日時を確認してください", "次回対応日時は00分・15分・30分・45分のいずれかで選択してください。"); next.focus(); return false;
    }
    if (next?.value && !isFutureDateTime(next.value)) {
      showFormError(form, "日時を確認してください", "次回対応日時は現在以降を選択してください。過去日時は登録できません。"); next.focus(); return false;
    }
    if (follow?.value && follow.value < localDateValue()) {
      showFormError(form, "日付を確認してください", "再連絡日は今日以降を選択してください。過去日は登録できません。"); follow.focus(); return false;
    }
    return true;
  }
  function validateActivityForm(form) {
    const actual = $('[name="activityAt"]', form);
    const next = $('[name="nextActionAt"]', form);
    if (actual?.value && !isQuarterMinute(actual.value)) {
      showFormError(form, "日時を確認してください", "対応日時は00分・15分・30分・45分のいずれかで入力してください。過去日時は入力できます。"); actual.focus(); return false;
    }
    if (next?.value && !isQuarterMinute(next.value)) {
      showFormError(form, "日時を確認してください", "次回日時は00分・15分・30分・45分のいずれかで選択してください。"); next.focus(); return false;
    }
    if (next?.value && !isFutureDateTime(next.value)) {
      showFormError(form, "日時を確認してください", "次回日時は現在以降を選択してください。過去日時は登録できません。"); next.focus(); return false;
    }
    return true;
  }

  function rowLeadSnapshot(button) {
    const row = button.closest("tr");
    const cells = row ? Array.from(row.cells) : [];
    const leadNumber = cells[0]?.textContent?.trim() || "";
    const statusLabel = cells[1]?.textContent?.trim() || "新着";
    const nextAction = cells[2]?.textContent?.trim() || "";
    const nextActionAt = parseDisplayDateTime(cells[3]?.textContent || "");
    return {
      id: button.dataset.lead,
      lead_number: leadNumber,
      status: LABEL_TO_STATUS[statusLabel] || "new",
      next_action: nextAction === "未設定" ? "" : nextAction,
      next_action_at: nextActionAt ? localInputToIso(nextActionAt) : null,
      follow_up_on: "",
      hold_reason: "",
      lost_reason: "",
    };
  }

  function leadActivitiesHtml(activities) {
    return activities.length ? activities.map((a) => `<div class="owner-mini-item"><strong>${esc(a.summary || "対応内容未設定")}</strong><span class="owner-row-sub">${esc(formatLocalDateTime(a.activity_at))}／${esc(ACTIVITY_TYPE_LABELS[a.activity_type] || a.activity_type || "その他")}</span>${a.next_action ? `<span class="owner-row-sub">次回：${esc(a.next_action)}</span>` : ""}</div>`).join("") : '<div class="owner-empty">対応履歴はありません。</div>';
  }

  function renderLeadDialog(id, item) {
    const nextValue = toLocalInput(item.next_action_at);
    const legacyWarning = nextValue && !isQuarterMinute(nextValue)
      ? '<div class="green-owner-inline-warning"><strong>旧入力データを確認してください</strong><span>現在の次回対応日時は15分刻みではありません。保存時に00分・15分・30分・45分へ変更してください。</span></div>'
      : "";

    setDialog(
      `営業案件 ${item.lead_number || ""}`,
      "SALES LEAD",
      `${legacyWarning}
      <form id="lead-update-form" class="owner-form-grid">
        <label>状態<select name="status">${leadStatusOptions(item.status || "new")}</select></label>
        <label>次回対応日時<input name="nextActionAt" type="datetime-local" step="900" value="${esc(nextValue)}"><span class="green-owner-schedule-note">現在以降・15分刻み</span></label>
        <label class="full">次回対応<textarea name="nextAction">${esc(item.next_action || "")}</textarea></label>
        <label>再連絡日<input name="followUpOn" type="date" value="${esc(item.follow_up_on || "")}"><span class="green-owner-schedule-note">今日以降</span></label>
        <label data-lead-reason="hold">保留理由<input name="holdReason" value="${esc(item.hold_reason || "")}"></label>
        <label class="full" data-lead-reason="lost">失注理由<textarea name="lostReason">${esc(item.lost_reason || "")}</textarea></label>
      </form>
      <section class="owner-dialog-section" id="green-lead-customer-handoff"><h3>顧客台帳</h3><div class="owner-empty">案件情報を確認しています…</div></section>
      <section class="owner-dialog-section"><h3>対応履歴</h3><div id="green-lead-history-status" class="green-owner-history-status"><strong>対応履歴を確認しています…</strong><span>案件の編集は先に進められます。</span></div><div id="green-lead-activities" class="owner-mini-list"><div class="owner-empty">対応履歴を確認中…</div></div></section>
      <form id="lead-activity-form" class="owner-form-grid owner-dialog-section">
        <h3 class="full">対応履歴を追加</h3>
        <label>種別<select name="activityType">${activityTypeOptions()}</select></label>
        <label>対応日時<input name="activityAt" type="datetime-local" step="900"><span class="green-owner-schedule-note">過去入力可・15分刻み</span></label>
        <label class="full">対応内容<textarea name="summary" required></textarea></label>
        <label>次回対応<input name="nextAction"></label>
        <label>次回日時<input name="nextActionAt" type="datetime-local" step="900"><span class="green-owner-schedule-note">現在以降・15分刻み</span></label>
      </form>`,
      '<button type="button" class="btn btn--secondary" id="add-lead-activity">履歴を追加</button><button type="button" class="btn btn--primary" id="save-lead">案件を保存</button>'
    );

    const leadForm = $("#lead-update-form", dialog);
    const activityForm = $("#lead-activity-form", dialog);
    $('[name="status"]', leadForm)?.addEventListener("change", syncLeadReasonVisibility);
    syncLeadReasonVisibility();
    applyScheduleRules();

    $("#save-lead", dialog)?.addEventListener("click", async (event) => {
      if (!validateLeadForm(leadForm)) return;
      const payload = {
        status: $('[name="status"]', leadForm)?.value || "new",
        nextActionAt: localInputToIso($('[name="nextActionAt"]', leadForm)?.value || ""),
        nextAction: $('[name="nextAction"]', leadForm)?.value?.trim() || "",
        followUpOn: $('[name="followUpOn"]', leadForm)?.value || "",
        holdReason: $('[name="holdReason"]', leadForm)?.value?.trim() || "",
        lostReason: $('[name="lostReason"]', leadForm)?.value?.trim() || "",
      };
      const button = event.currentTarget;
      window.Green.setBusy(button, true, "保存中…");
      try {
        await apiWithTimeout(`/api/admin/leads/${encodeURIComponent(id)}`, { method: "PATCH", json: payload }, 8000);
        window.Green.toast("営業案件を更新しました。", "success");
        closeDialog();
        $('[data-load="leads"]')?.click();
      } catch (error) {
        window.Green.setBusy(button, false);
        const meta = [error?.code ? `エラーコード: ${error.code}` : "", error?.requestId ? `確認番号: ${error.requestId}` : ""].filter(Boolean).join(" / ");
        showFormError(leadForm, "案件を保存できませんでした", error?.message || "保存処理に失敗しました。", meta);
      }
    });

    $("#add-lead-activity", dialog)?.addEventListener("click", async (event) => {
      if (!validateActivityForm(activityForm)) return;
      const summary = $('[name="summary"]', activityForm)?.value?.trim() || "";
      if (!summary) { showFormError(activityForm, "対応内容を確認してください", "対応内容を入力してください。"); return; }
      const payload = {
        activityType: $('[name="activityType"]', activityForm)?.value || "memo",
        activityAt: localInputToIso($('[name="activityAt"]', activityForm)?.value || ""),
        summary,
        nextAction: $('[name="nextAction"]', activityForm)?.value?.trim() || "",
        nextActionAt: localInputToIso($('[name="nextActionAt"]', activityForm)?.value || ""),
      };
      const button = event.currentTarget;
      window.Green.setBusy(button, true, "追加中…");
      try {
        await apiWithTimeout(`/api/admin/leads/${encodeURIComponent(id)}/activities`, { method: "POST", json: payload }, 8000);
        window.Green.toast("対応履歴を追加しました。", "success");
        activityForm.reset();
        applyScheduleRules();
        void loadActivities(id);
      } catch (error) {
        const meta = [error?.code ? `エラーコード: ${error.code}` : "", error?.requestId ? `確認番号: ${error.requestId}` : ""].filter(Boolean).join(" / ");
        showFormError(activityForm, "履歴を追加できませんでした", error?.message || "追加処理に失敗しました。", meta);
      } finally {
        if (button?.isConnected) window.Green.setBusy(button, false);
      }
    });

    // UIは即表示。補足情報と履歴は後から取り込む。
    void hydrateLead(id, leadForm);
    void loadActivities(id);
  }

  function customerStatusOptions(selected = "lead") {
    return Object.entries(CUSTOMER_STATUS_LABELS).map(([value, label]) => `<option value="${value}"${value === selected ? " selected" : ""}>${label}</option>`).join("");
  }

  function preferredContactOptions(selected = "phone") {
    const options = { line: "LINE", phone: "電話", email: "メール", sms: "SMS", other: "その他" };
    return Object.entries(options).map(([value, label]) => `<option value="${value}"${value === selected ? " selected" : ""}>${label}</option>`).join("");
  }

  function headquartersStatusOptions(selected = "unconfirmed") {
    const options = { unconfirmed: "未確認", checking: "確認中", confirmed: "確認済み", not_required: "不要", rejected: "不可" };
    return Object.entries(options).map(([value, label]) => `<option value="${value}"${value === selected ? " selected" : ""}>${label}</option>`).join("");
  }

  const PENDING_SITE_HANDOFF_KEY = "green_pending_site_after_customer_v1";

  function splitJapaneseAddress(value) {
    const address = String(value || "").trim();
    if (!address) return { prefecture: "", city: "", addressLine: "" };
    const pref = address.match(/^(北海道|東京都|京都府|大阪府|.{2,3}県)(.*)$/);
    if (!pref) return { prefecture: "", city: "", addressLine: address };
    const prefecture = pref[1];
    const rest = pref[2].trim();
    for (const pattern of [/^(.+?市.+?区)(.*)$/, /^(.+?郡.+?[町村])(.*)$/, /^(.+?[市区町村])(.*)$/]) {
      const match = rest.match(pattern);
      if (match) return { prefecture, city: match[1].trim(), addressLine: (match[2] || "").trim() };
    }
    return { prefecture, city: "", addressLine: rest };
  }

  function savePendingSiteHandoff(customer, payload) {
    try {
      sessionStorage.setItem(PENDING_SITE_HANDOFF_KEY, JSON.stringify({
        customerId: customer?.id || "",
        customerNumber: customer?.customer_number || "",
        companyName: customer?.company_name || payload?.companyName || "",
        contactName: customer?.contact_name || payload?.contactName || "",
        phone: customer?.phone || payload?.phone || "",
        postalCode: customer?.postal_code || payload?.postalCode || "",
        address: customer?.address || payload?.address || "",
        createdAt: Date.now(),
      }));
    } catch {}
  }

  function goToSiteRegistrationAfterCustomer(customer, payload) {
    savePendingSiteHandoff(customer, payload);
    const url = new URL(location.href);
    url.searchParams.set("view", "sites");
    location.href = url.toString();
  }

  async function resumePendingSiteHandoff() {
    let pending = null;
    try {
      pending = JSON.parse(sessionStorage.getItem(PENDING_SITE_HANDOFF_KEY) || "null");
    } catch {}
    if (!pending?.customerId) return;
    if (Date.now() - Number(pending.createdAt || 0) > 10 * 60 * 1000) {
      try { sessionStorage.removeItem(PENDING_SITE_HANDOFF_KEY); } catch {}
      return;
    }

    const currentView = new URLSearchParams(location.search).get("view");
    if (currentView !== "sites") return;

    const waitFor = async (test, timeoutMs = 9000) => {
      const started = Date.now();
      while (Date.now() - started < timeoutMs) {
        const result = test();
        if (result) return result;
        await new Promise((resolve) => setTimeout(resolve, 120));
      }
      return null;
    };

    const addButton = await waitFor(() => document.querySelector('[data-action="new-site"]'));
    if (!addButton) return;
    addButton.click();

    const form = await waitFor(() => document.querySelector("#site-form"));
    if (!form) return;

    const customerSelect = form.querySelector('[name="customerId"]');
    if (customerSelect) {
      const optionExists = Array.from(customerSelect.options || []).some((option) => option.value === pending.customerId);
      if (optionExists) {
        customerSelect.value = pending.customerId;
        customerSelect.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }

    const setIfBlank = (name, value) => {
      const input = form.querySelector(`[name="${name}"]`);
      if (input && !input.value && value) input.value = value;
    };
    setIfBlank("contactName", pending.contactName);
    setIfBlank("phone", pending.phone);
    setIfBlank("postalCode", pending.postalCode);

    const parts = splitJapaneseAddress(pending.address);
    setIfBlank("prefecture", parts.prefecture);
    setIfBlank("city", parts.city);
    setIfBlank("addressLine", parts.addressLine);

    if (!form.querySelector(".green-owner-site-handoff-note")) {
      const note = document.createElement("div");
      note.className = "green-owner-next-action green-owner-site-handoff-note full";
      note.innerHTML = `<strong>${esc(pending.customerNumber || "登録した顧客")} の拠点を登録します</strong><p>顧客・担当者・電話・住所を引き継ぎました。拠点名、建物名、入館方法、駐車情報などを確認してください。</p>`;
      form.prepend(note);
    }
    try { sessionStorage.removeItem(PENDING_SITE_HANDOFF_KEY); } catch {}
  }

  function installLeadCustomerHandoff(id, lead) {
    const section = $("#green-lead-customer-handoff", dialog);
    if (!section || !lead) return;
    if (lead.customer_id) {
      section.innerHTML = '<h3>顧客台帳</h3><div class="green-owner-history-status is-ok"><strong>顧客台帳に連携済みです</strong><span>この営業案件は既存の顧客情報へ紐付いています。</span></div><button type="button" class="btn btn--secondary" id="green-open-customer-ledger">顧客台帳を開く</button>';
      $("#green-open-customer-ledger", section)?.addEventListener("click", () => { closeDialog(); $('.owner-nav [data-view="customers"]')?.click(); });
      return;
    }
    const allowed = ["site_checked", "planning", "preparing", "installation_scheduled", "active"].includes(lead.status);
    if (!allowed) {
      section.innerHTML = '<h3>顧客台帳</h3><div class="owner-empty">現地確認完了後、見込み顧客として顧客台帳へ引き継げます。</div>';
      return;
    }
    section.innerHTML = '<h3>顧客台帳</h3><div class="green-owner-next-action"><strong>現地確認後の顧客情報へ引き継ぐ</strong><p>契約前は「見込み」として登録し、拠点・提案・契約準備へ進めます。</p></div><button type="button" class="btn btn--primary" id="green-lead-to-customer">顧客台帳へ引き継ぐ</button>';
    $("#green-lead-to-customer", section)?.addEventListener("click", () => openLeadCustomerHandoff(id, lead));
  }

  async function openLeadCustomerHandoff(leadId, lead) {
    let inquiry = null;
    if (lead?.inquiry_id) {
      try {
        const result = await apiWithTimeout(`/api/admin/inquiries/${encodeURIComponent(lead.inquiry_id)}`, undefined, 6000);
        inquiry = result?.data?.inquiry || null;
      } catch {}
    }
    const corporate = Boolean(inquiry?.company_name);
    const customerType = corporate ? "corporate" : "individual";
    setDialog(
      "顧客台帳へ引き継ぐ",
      "CUSTOMER HANDOFF",
      `<section class="green-owner-next-action"><strong>営業案件から顧客情報を作成します</strong><p>まだ契約前なので、通常は状態を「見込み」のまま登録します。契約開始後に「利用中」へ変更できます。</p></section>
      <form id="green-lead-customer-form" class="owner-form-grid">
        <label>顧客区分<select name="customerType"><option value="corporate"${customerType === "corporate" ? " selected" : ""}>法人</option><option value="individual"${customerType === "individual" ? " selected" : ""}>個人</option><option value="organization">団体</option><option value="other">その他</option></select></label>
        <label>状態<select name="status">${customerStatusOptions("lead")}</select><span class="green-owner-schedule-note">契約前は「見込み」推奨</span></label>
        <label>法人名・屋号<input name="companyName" value="${esc(inquiry?.company_name || "")}"></label>
        <label>担当者名<input name="contactName" required value="${esc(inquiry?.contact_name || "")}"></label>
        <label>担当者名カナ<input name="contactNameKana" value="${esc(inquiry?.contact_name_kana || "")}"></label>
        <label>電話番号<input name="phone" inputmode="tel" value="${esc(inquiry?.phone || "")}"></label>
        <label>メール<input name="email" type="email" value="${esc(inquiry?.email || "")}"></label>
        <label>郵便番号<input name="postalCode" value="${esc(inquiry?.postal_code || "")}"></label>
        <label class="full">住所<input name="address" value="${esc(inquiry?.address || "")}"></label>
        <label>希望連絡方法<select name="preferredContactMethod">${preferredContactOptions(inquiry?.preferred_contact_method || "phone")}</select></label>
        <label>本部確認<select name="headquartersConfirmationStatus">${headquartersStatusOptions("unconfirmed")}</select></label>
      </form>`,
      '<button type="button" class="btn btn--secondary" id="green-customer-handoff-cancel">営業案件へ戻る</button><button type="button" class="btn btn--primary" id="green-customer-handoff-save">顧客台帳へ登録</button>'
    );
    $("#green-customer-handoff-cancel", dialog)?.addEventListener("click", () => renderLeadDialog(leadId, lead));
    $("#green-customer-handoff-save", dialog)?.addEventListener("click", async (event) => {
      const form = $("#green-lead-customer-form", dialog);
      const get = (name) => $(`[name="${name}"]`, form)?.value?.trim() || "";
      const type = get("customerType") || "corporate";
      if (!get("contactName")) { showFormError(form, "登録内容を確認してください", "担当者名を入力してください。"); return; }
      if (type !== "individual" && !get("companyName")) { showFormError(form, "登録内容を確認してください", "法人・団体の場合は法人名・屋号を入力してください。"); return; }
      const payload = {
        leadId,
        inquiryId: lead?.inquiry_id || null,
        customerType: type,
        status: get("status") || "lead",
        companyName: get("companyName"),
        contactName: get("contactName"),
        contactNameKana: get("contactNameKana"),
        phone: get("phone"), email: get("email"), postalCode: get("postalCode"), address: get("address"),
        preferredContactMethod: get("preferredContactMethod") || "phone",
        headquartersConfirmationStatus: get("headquartersConfirmationStatus") || "unconfirmed",
      };
      const button = event.currentTarget;
      window.Green.setBusy(button, true, "登録中…");
      try {
        const result = await apiWithTimeout("/api/admin/customers", { method: "POST", json: payload }, 9000);
        const customer = result?.data?.customer || {};
        setDialog("顧客台帳へ引き継ぎました", "REGISTERED", `<section class="green-owner-success" role="status"><div class="green-owner-success__icon">✓</div><div><strong>${result?.data?.reused ? "既存顧客へ連携しました" : "顧客を登録できました"}</strong><p>顧客番号 <b>${esc(customer.customer_number || "")}</b></p></div></section><section class="green-owner-next-action"><strong>次にどうしますか？</strong><p>営業案件・相談受付・現地確認も同じ顧客へ紐付きます。次は拠点・設置場所を登録できます。</p></section>`, '<button type="button" class="btn btn--secondary" id="green-customer-ledger-after">顧客台帳を開く</button><button type="button" class="btn btn--primary" id="green-sites-after">拠点・設置場所へ</button>');
        $("#green-customer-ledger-after", dialog)?.addEventListener("click", () => { closeDialog(); $('.owner-nav [data-view="customers"]')?.click(); });
        $("#green-sites-after", dialog)?.addEventListener("click", () => goToSiteRegistrationAfterCustomer(customer, payload));
      } catch (error) {
        const candidates = error?.details?.candidates || [];
        const extra = candidates.length ? ` 重複候補: ${candidates.map((c) => c.customer_number || c.company_name || c.contact_name).filter(Boolean).join(" / ")}` : "";
        const meta = [error?.code ? `エラーコード: ${error.code}` : "", error?.requestId ? `確認番号: ${error.requestId}` : ""].filter(Boolean).join(" / ");
        showFormError(form, "顧客台帳へ登録できませんでした", `${error?.message || "登録処理に失敗しました。"}${extra}`, meta);
      } finally {
        if (button?.isConnected) window.Green.setBusy(button, false);
      }
    });
  }

  async function hydrateLead(id, form) {
    form.dataset.greenDirty = "0";
    form.addEventListener("input", () => { form.dataset.greenDirty = "1"; }, { once: true });
    form.addEventListener("change", () => { form.dataset.greenDirty = "1"; }, { once: true });
    try {
      const result = await apiWithTimeout("/api/admin/leads?limit=200", undefined, 4500);
      const full = (result?.data?.items || []).find((item) => item?.id === id);
      if (!full || form.dataset.greenDirty === "1" || !form.isConnected) return;
      $('[name="status"]', form).value = full.status || "new";
      $('[name="nextAction"]', form).value = full.next_action || "";
      $('[name="nextActionAt"]', form).value = toLocalInput(full.next_action_at);
      $('[name="followUpOn"]', form).value = full.follow_up_on || "";
      $('[name="holdReason"]', form).value = full.hold_reason || "";
      $('[name="lostReason"]', form).value = full.lost_reason || "";
      syncLeadReasonVisibility();
      applyScheduleRules();
      installLeadCustomerHandoff(id, full);
    } catch {
      // 補足情報の取得失敗は編集を止めない。
    }
  }

  async function loadActivities(id) {
    const status = $("#green-lead-history-status", dialog);
    const list = $("#green-lead-activities", dialog);
    if (!status || !list) return;
    status.className = "green-owner-history-status";
    status.innerHTML = "<strong>対応履歴を確認しています…</strong><span>案件の編集は先に進められます。</span>";
    try {
      const result = await apiWithTimeout(`/api/admin/leads/${encodeURIComponent(id)}`, undefined, 5000);
      if (!list.isConnected) return;
      const activities = result?.data?.activities || [];
      list.innerHTML = leadActivitiesHtml(activities);
      status.className = "green-owner-history-status is-ok";
      status.innerHTML = `<strong>対応履歴を読み込みました</strong><span>${activities.length}件</span>`;
      setTimeout(() => status?.isConnected && status.remove(), 1400);
    } catch (error) {
      if (!list.isConnected) return;
      status.className = "green-owner-history-status is-warning";
      status.innerHTML = '<strong>対応履歴のみ読み込めませんでした</strong><span>案件情報の確認・編集・保存はそのまま行えます。</span><button type="button" class="btn btn--secondary btn--small" id="green-retry-lead-history">履歴を再試行</button>';
      list.innerHTML = '<div class="owner-empty">履歴の取得待ちです。案件編集には影響しません。</div>';
      $("#green-retry-lead-history", dialog)?.addEventListener("click", () => loadActivities(id));
    }
  }

  // window capture は document capture より先に実行される。
  // 旧V1.4のクリック遮断より前に処理し、API待ちなしで詳細画面を表示する。
  function installLeadClickFix() {
    window.addEventListener("click", (event) => {
      const button = event.target?.closest?.('[data-view-panel="leads"] [data-lead]');
      if (!button || !button.dataset.lead) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      renderLeadDialog(button.dataset.lead, rowLeadSnapshot(button));
    }, true);
  }

  function normalizePhone(value) {
    let phone = String(value || "").trim();
    if (phone.startsWith("+81")) phone = `0${phone.slice(3)}`;
    return phone.replace(/\D/g, "");
  }
  function phoneValue(name) { return $(`[name="${name}"]`, $("#dialog-body"))?.value?.trim() || ""; }
  function ensurePhoneHelp() {
    const body = $("#dialog-body");
    if (!body || !$("#save-phone-inquiry", dialog)) return;
    const inquiry = $('[name="inquiryText"]', body);
    if (inquiry && !inquiry.closest("label")?.querySelector(".green-owner-required")) {
      const badge = document.createElement("span"); badge.className = "required green-owner-required"; badge.textContent = "必須"; inquiry.closest("label")?.insertBefore(badge, inquiry);
    }
  }
  async function submitPhoneInquiry(button) {
    const contactName = phoneValue("contactName");
    const phone = phoneValue("phone");
    const email = phoneValue("email");
    const inquiryText = phoneValue("inquiryText");
    const form = $("#phone-inquiry-form", dialog);
    if (!contactName) { showFormError(form, "登録できませんでした", "担当者名を入力してください。"); return; }
    if (!phone && !email) { showFormError(form, "登録できませんでした", "電話番号またはメールアドレスのどちらかを入力してください。"); return; }
    if (phone && ![10,11].includes(normalizePhone(phone).length)) { showFormError(form, "登録できませんでした", "電話番号は10桁または11桁で入力してください。"); return; }
    if (!inquiryText) { showFormError(form, "登録できませんでした", "相談内容を入力してください。"); return; }
    const payload = {
      companyName: phoneValue("companyName"), contactName, phone, email,
      inquiryCategory: phoneValue("inquiryCategory") || "regular_rental",
      preferredContactMethod: phoneValue("preferredContactMethod") || "phone",
      address: phoneValue("address"), inquiryText,
    };
    window.Green.setBusy(button, true, "登録中…");
    try {
      const result = await apiWithTimeout("/api/admin/inquiries", { method: "POST", json: payload, idempotencyKey: window.Green.uuid?.() || `green-phone-${Date.now()}` }, 8000);
      const inquiry = result.data?.inquiry || {};
      setDialog("電話相談を登録しました", "REGISTERED",
        `<section class="green-owner-success" role="status"><div class="green-owner-success__icon">✓</div><div><strong>登録できました</strong><p>受付番号 <b>${esc(inquiry.reception_number || "")}</b></p></div></section><section class="green-owner-next-action"><strong>次にどうしますか？</strong><p>継続して提案・現地確認へ進める相談は「営業案件へ引き継ぐ」を選びます。</p></section>`,
        '<button type="button" class="btn btn--secondary" id="green-phone-list">相談一覧へ戻る</button><button type="button" class="btn btn--primary" id="green-phone-lead">営業案件へ引き継ぐ</button>');
      $("#green-phone-list", dialog)?.addEventListener("click", () => { closeDialog(); $('.owner-nav [data-view="inquiries"]')?.click(); });
      $("#green-phone-lead", dialog)?.addEventListener("click", async (e) => {
        const b = e.currentTarget; window.Green.setBusy(b, true, "引き継ぎ中…");
        try {
          const created = await apiWithTimeout("/api/admin/leads", { method: "POST", json: { inquiryId: inquiry.id, status: inquiry.status || "new" } }, 8000);
          window.Green.toast(`営業案件 ${created.data?.lead?.lead_number || ""} へ引き継ぎました。`, "success");
          closeDialog(); $('.owner-nav [data-view="leads"]')?.click();
        } catch (error) { window.Green.setBusy(b, false); showFormError($("#dialog-body", dialog), "営業案件へ引き継げませんでした", error?.message || "処理に失敗しました。"); }
      });
    } catch (error) {
      const meta = [error?.code ? `エラーコード: ${error.code}` : "", error?.requestId ? `確認番号: ${error.requestId}` : ""].filter(Boolean).join(" / ");
      showFormError(form, "登録できませんでした", error?.message || "登録処理に失敗しました。", meta);
    } finally { if (button?.isConnected) window.Green.setBusy(button, false); }
  }
  function installPhoneFix() {
    window.addEventListener("click", (event) => {
      const button = event.target?.closest?.("#save-phone-inquiry");
      if (!button || !dialog.contains(button)) return;
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
      submitPhoneInquiry(button);
    }, true);
  }

  function installSiteCheckDetailStyles() {
    if (document.getElementById("green-site-check-r17-style")) return;
    const style = document.createElement("style");
    style.id = "green-site-check-r17-style";
    style.textContent = `
      .green-site-section{grid-column:1/-1;margin:8px 0 2px;padding:14px;border:1px solid #dbe7df;border-radius:14px;background:#fbfdfb}
      .green-site-section>h3{margin:0 0 6px;font-size:17px}.green-site-section>p{margin:0 0 12px;color:#64756e;font-size:13px}
      .green-site-photo-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-top:10px}
      .green-site-photo{border:1px solid #dbe3de;border-radius:12px;overflow:hidden;background:#fff}
      .green-site-photo img{display:block;width:100%;height:130px;object-fit:cover;background:#eef3ef}
      .green-site-photo__body{display:grid;gap:4px;padding:9px}.green-site-photo__body small{color:#64756e}
      .green-site-photo__delete{justify-self:start;border:0;background:none;color:#9b3030;text-decoration:underline;cursor:pointer;padding:2px 0}
      .green-site-upload{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}.green-site-upload .full{grid-column:1/-1}
      .green-site-lines-note{display:block;margin-top:4px;color:#64756e;font-size:12px}
      .green-site-next{grid-column:1/-1;padding:14px 15px;border:1px solid #cfe2d4;border-radius:12px;background:#f2faf4;color:#174b35}
      @media(max-width:760px){.green-site-upload{grid-template-columns:1fr}.green-site-upload .full{grid-column:auto}.green-site-photo-grid{grid-template-columns:1fr 1fr}}
    `;
    document.head.append(style);
  }

  function siteCheckStatusOptions(selected) {
    return Object.entries(SITE_CHECK_STATUS_LABELS).map(([value,label]) => `<option value="${value}"${value===selected?" selected":""}>${label}</option>`).join("");
  }
  function siteCheckPhotoTypeOptions(selected="site") {
    return Object.entries(SITE_CHECK_PHOTO_LABELS).map(([value,label]) => `<option value="${value}"${value===selected?" selected":""}>${label}</option>`).join("");
  }
  function arrayToLines(value) {
    if (!Array.isArray(value)) return "";
    return value.map((item) => typeof item === "string" ? item : (item?.label || item?.name || item?.note || JSON.stringify(item))).filter(Boolean).join("\n");
  }
  function linesToArray(value) {
    return String(value || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(0, 100);
  }
  function staffOptions(items, selected) {
    return `<option value="">担当未設定</option>${(items||[]).filter((x)=>x.status!=="inactive").map((x)=>`<option value="${esc(x.id)}"${x.id===selected?" selected":""}>${esc(x.display_name || x.staff_code || "スタッフ")}</option>`).join("")}`;
  }
  function siteCheckPhotosHtml(photos) {
    if (!photos?.length) return '<div class="owner-empty">現地写真はまだありません。</div>';
    return `<div class="green-site-photo-grid">${photos.map((p)=>`<article class="green-site-photo">${p.signed_url?`<img src="${esc(p.signed_url)}" alt="${esc(SITE_CHECK_PHOTO_LABELS[p.photo_type] || "現地写真")}">`:'<div class="owner-empty">画像URLを取得できません</div>'}<div class="green-site-photo__body"><strong>${esc(SITE_CHECK_PHOTO_LABELS[p.photo_type] || p.photo_type || "写真")}</strong>${p.caption?`<small>${esc(p.caption)}</small>`:""}<button type="button" class="green-site-photo__delete" data-green-site-photo-delete="${esc(p.id)}">削除</button></div></article>`).join("")}</div>`;
  }

  async function openSiteCheckDetailR17(id) {
    setDialog("現地確認詳細", "LOADING", '<div class="owner-loading">現地確認の予定と結果を読み込んでいます…</div>', '<button type="button" class="btn btn--secondary" data-dialog-close>閉じる</button>');
    try {
      const [detail, staffResult] = await Promise.all([
        apiWithTimeout(`/api/admin/site-checks/${id}`, undefined, 9000),
        apiWithTimeout('/api/admin/staff', undefined, 9000).catch(()=>({data:{items:[]}})),
      ]);
      renderSiteCheckDetailR17(id, detail?.data?.siteCheck || {}, detail?.data?.photos || [], staffResult?.data?.items || []);
    } catch (error) {
      setDialog("現地確認を開けませんでした", "ERROR", `<div class="green-owner-inline-error green-owner-load-error"><strong>読み込みに失敗しました</strong><span>${esc(error?.message || "現地確認を読み込めませんでした。")}</span>${error?.requestId?`<small>確認番号: ${esc(error.requestId)}</small>`:""}</div>`, `<button type="button" class="btn btn--secondary" data-dialog-close>閉じる</button><button type="button" class="btn btn--primary" id="green-site-retry">再試行</button>`);
      $("#green-site-retry", dialog)?.addEventListener("click",()=>openSiteCheckDetailR17(id));
    }
  }

  function renderSiteCheckDetailR17(id, item, photos, staff) {
    const completed = item.status === "completed";
    setDialog(
      `現地確認 ${item.check_number || ""}`,
      "SITE CHECK DETAIL",
      `<form id="green-site-detail-form" class="owner-form-grid">
        <section class="green-site-section"><h3>訪問予定</h3><p>訪問日時・進行状態・担当を管理します。</p></section>
        <label>状態<select name="status">${siteCheckStatusOptions(item.status || "scheduled")}</select></label>
        <label>担当スタッフ<select name="assignedStaffId">${staffOptions(staff,item.assigned_staff_id || "")}</select></label>
        <label>開始日時<input name="scheduledStart" type="datetime-local" step="900" value="${esc(toLocalInput(item.scheduled_start))}"><span class="green-owner-schedule-note">履歴編集可・15分刻み</span></label>
        <label>終了日時<input name="scheduledEnd" type="datetime-local" step="900" value="${esc(toLocalInput(item.scheduled_end))}"><span class="green-owner-schedule-note">開始より後・15分刻み</span></label>
        <label class="full">お客様の要望<textarea name="customerRequest">${esc(item.customer_request || "")}</textarea></label>
        <label class="full">社内メモ<textarea name="internalNote">${esc(item.internal_note || "")}</textarea></label>

        <section class="green-site-section"><h3>現地確認結果</h3><p>訪問後に、植物選定と設置準備へ引き継ぐための条件を残します。</p></section>
        <label class="full">現場環境<textarea name="siteEnvironment" placeholder="例：受付・応接・執務室、空調あり、人通り多め">${esc(item.site_environment || "")}</textarea></label>
        <label>採光・日当たり<input name="lightCondition" value="${esc(item.light_condition || "")}" placeholder="例：午前は明るい／直射日光なし"></label>
        <label>温度・空調<input name="temperatureNote" value="${esc(item.temperature_note || "")}" placeholder="例：終日空調、冬季18℃前後"></label>
        <label class="full">給水・管理条件<textarea name="wateringNote" placeholder="例：給水場所、床養生、営業時間中の作業可否">${esc(item.watering_note || "")}</textarea></label>
        <label class="full">搬入経路・駐車・注意事項<textarea name="accessNote" placeholder="例：正面搬入可、エレベーター有、裏手に駐車1台可">${esc(item.access_note || "")}</textarea></label>

        <section class="green-site-section"><h3>設置・植物候補</h3><p>1行に1候補で入力します。後の提案・設置準備へ引き継ぎます。</p></section>
        <label class="full">設置候補場所<textarea name="proposedAreas" placeholder="受付カウンター横\n応接室入口\n執務室窓側">${esc(arrayToLines(item.proposed_areas))}</textarea><span class="green-site-lines-note">1行 = 1設置候補</span></label>
        <label class="full">植物・鉢候補<textarea name="proposedPlants" placeholder="ドラセナ Mサイズ + 白鉢カバー\nポトス Sサイズ + 卓上鉢">${esc(arrayToLines(item.proposed_plants))}</textarea><span class="green-site-lines-note">1行 = 1植物・鉢候補</span></label>

        <section class="green-site-section"><h3>現地写真</h3><p>現場全体・設置候補・搬入経路・注意箇所を写真で残せます。</p><div id="green-site-photo-list">${siteCheckPhotosHtml(photos)}</div>
          <div class="green-site-upload">
            <label>写真区分<select id="green-site-photo-type">${siteCheckPhotoTypeOptions()}</select></label>
            <label>写真<input id="green-site-photo-file" type="file" accept="image/jpeg,image/png,image/webp"></label>
            <label class="full">写真メモ<input id="green-site-photo-caption" maxlength="500" placeholder="例：受付入口から見た設置候補位置"></label>
            <div class="full"><button type="button" class="btn btn--secondary" id="green-site-photo-upload">写真を追加</button></div>
          </div>
        </section>
        ${completed?'<div class="green-site-next"><strong>現地確認は完了済みです</strong><div>営業案件は「現地確認済み」へ連動します。内容を修正した場合は保存してください。</div></div>':'<div class="green-site-next"><strong>訪問後の操作</strong><div>確認結果を入力し、状態を「完了」にして保存すると、営業案件が自動で「現地確認済み」へ進みます。</div></div>'}
      </form>`,
      '<button type="button" class="btn btn--secondary" data-dialog-close>閉じる</button><button type="button" class="btn btn--primary" id="green-site-detail-save">現地確認を保存</button>',
    );

    $("#green-site-detail-save", dialog)?.addEventListener("click", (event)=>saveSiteCheckDetailR17(id, item, event.currentTarget));
    $("#green-site-photo-upload", dialog)?.addEventListener("click", (event)=>uploadSiteCheckPhotoR17(id, event.currentTarget));
    $$('[data-green-site-photo-delete]', dialog).forEach((button)=>button.addEventListener("click",()=>deleteSiteCheckPhotoR17(id, button.dataset.greenSitePhotoDelete, button)));
  }

  function detailPayloadR17(form) {
    const value=(name)=>$(`[name="${name}"]`,form)?.value?.trim() || "";
    return {
      status:value("status"), assignedStaffId:value("assignedStaffId") || null,
      scheduledStart:localInputToIso(value("scheduledStart")) || null,
      scheduledEnd:localInputToIso(value("scheduledEnd")) || null,
      customerRequest:value("customerRequest"), internalNote:value("internalNote"),
      siteEnvironment:value("siteEnvironment"), lightCondition:value("lightCondition"), temperatureNote:value("temperatureNote"),
      wateringNote:value("wateringNote"), accessNote:value("accessNote"),
      proposedAreas:linesToArray(value("proposedAreas")), proposedPlants:linesToArray(value("proposedPlants")),
    };
  }
  function validateSiteCheckDetailR17(form) {
    form?.querySelector(".green-owner-save-error")?.remove();
    const start=$('[name="scheduledStart"]',form), end=$('[name="scheduledEnd"]',form), status=$('[name="status"]',form)?.value || "";
    if (["scheduled","in_progress","completed"].includes(status) && (!start?.value || !end?.value)) { showFormError(form,"日時を確認してください","予定確定・確認中・完了の場合は開始日時と終了日時を入力してください。"); return false; }
    if ((start?.value && !end?.value)||(!start?.value&&end?.value)) { showFormError(form,"日時を確認してください","開始日時と終了日時は両方入力してください。"); return false; }
    if (start?.value && !isQuarterMinute(start.value)) { showFormError(form,"開始日時を確認してください","開始日時は00分・15分・30分・45分で入力してください。"); start.focus(); return false; }
    if (end?.value && !isQuarterMinute(end.value)) { showFormError(form,"終了日時を確認してください","終了日時は00分・15分・30分・45分で入力してください。"); end.focus(); return false; }
    if (start?.value && end?.value && new Date(end.value)<=new Date(start.value)) { showFormError(form,"終了日時を確認してください","終了日時は開始日時より後にしてください。"); end.focus(); return false; }
    return true;
  }
  async function saveSiteCheckDetailR17(id, original, button) {
    const form=$("#green-site-detail-form",dialog); if(!form || !validateSiteCheckDetailR17(form)) return;
    const payload=detailPayloadR17(form); window.Green.setBusy(button,true,"保存中…");
    try {
      const result=await apiWithTimeout(`/api/admin/site-checks/${id}`,{method:"PATCH",json:payload},10000);
      const item=result?.data?.siteCheck || {...original,...payload};
      const completed=item.status==="completed";
      setDialog(completed?"現地確認を完了しました":"現地確認を保存しました","SAVED",`<section class="green-owner-success" role="status"><div class="green-owner-success__icon">✓</div><div><strong>保存できました</strong><p>確認番号 <b>${esc(item.check_number || original.check_number || "")}</b></p></div></section><section class="green-owner-next-action"><strong>次にどうしますか？</strong><p>${completed?'営業案件は「現地確認済み」へ連動更新されます。次は顧客・拠点・利用内容を整理できます。':'現地確認一覧へ戻るか、営業案件を確認できます。'}</p></section>`,`<button type="button" class="btn btn--secondary" id="green-site-detail-list">現地確認一覧へ戻る</button>${original.lead_id?'<button type="button" class="btn btn--primary" id="green-site-detail-lead">営業案件を確認</button>':''}`);
      $("#green-site-detail-list",dialog)?.addEventListener("click",()=>{closeDialog();$('.owner-nav [data-view="site-checks"]')?.click();});
      $("#green-site-detail-lead",dialog)?.addEventListener("click",()=>{closeDialog();$('.owner-nav [data-view="leads"]')?.click();});
    } catch(error) { const meta=[error?.code?`エラーコード: ${error.code}`:"",error?.requestId?`確認番号: ${error.requestId}`:""].filter(Boolean).join(" / "); showFormError(form,"保存できませんでした",error?.message || "保存処理に失敗しました。",meta); }
    finally { if(button?.isConnected) window.Green.setBusy(button,false); }
  }
  async function uploadSiteCheckPhotoR17(siteCheckId, button) {
    const fileInput=$("#green-site-photo-file",dialog); const file=fileInput?.files?.[0];
    if(!file){ window.Green.toast("写真を選択してください。","error"); return; }
    window.Green.setBusy(button,true,"追加中…");
    try {
      const compressed=await window.Green.compressImage(file);
      const form=new FormData(); form.append("file",compressed,compressed.name || "site-check.jpg");
      form.append("photoType",$("#green-site-photo-type",dialog)?.value || "site");
      form.append("caption",$("#green-site-photo-caption",dialog)?.value?.trim() || "");
      await apiWithTimeout(`/api/admin/site-checks/${siteCheckId}/photos`,{method:"POST",body:form},15000);
      window.Green.toast("現地写真を追加しました。","success"); await openSiteCheckDetailR17(siteCheckId);
    } catch(error) { window.Green.toast(`${error?.message || "写真を追加できませんでした。"}${error?.requestId?`（確認番号：${error.requestId}）`:""}`,"error"); }
    finally { if(button?.isConnected) window.Green.setBusy(button,false); }
  }
  async function deleteSiteCheckPhotoR17(siteCheckId, photoId, button) {
    if(!photoId || !confirm("この現地写真を削除しますか？")) return;
    window.Green.setBusy(button,true,"削除中…");
    try { await apiWithTimeout(`/api/admin/site-check-photos/${photoId}`,{method:"DELETE"},10000); window.Green.toast("現地写真を削除しました。","success"); await openSiteCheckDetailR17(siteCheckId); }
    catch(error){ window.Green.toast(`${error?.message || "写真を削除できませんでした。"}${error?.requestId?`（確認番号：${error.requestId}）`:""}`,"error"); }
    finally { if(button?.isConnected) window.Green.setBusy(button,false); }
  }
  function installSiteCheckDetailFixR17() {
    window.addEventListener("click",(event)=>{
      const button=event.target?.closest?.('[data-view-panel="site-checks"] [data-site-check]');
      if(!button || !button.dataset.siteCheck) return;
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
      openSiteCheckDetailR17(button.dataset.siteCheck);
    },true);
  }

  function ensureSiteCheckHelp() {
    const form = $("#site-check-form", dialog);
    const save = $("#save-site-check", dialog);
    if (!form || !save || save.textContent.trim() !== "登録") return;

    if (!$("#green-site-check-guidance", form)) {
      const guidance = document.createElement("div");
      guidance.id = "green-site-check-guidance";
      guidance.className = "green-owner-guidance full";
      guidance.innerHTML = "<strong>現地確認を登録します</strong><span>営業案件が選択されていれば、成約前は顧客・拠点が未登録でも進められます。顧客台帳・拠点は成約後に正式登録できます。</span>";
      form.prepend(guidance);
    }

    const customer = $('[name="customerId"]', form);
    const site = $('[name="siteId"]', form);
    [customer, site].forEach((input) => {
      const label = input?.closest("label");
      if (!label || label.querySelector(".green-owner-optional-note")) return;
      const note = document.createElement("span");
      note.className = "green-owner-schedule-note green-owner-optional-note";
      note.textContent = "営業案件を選択済みなら任意";
      label.append(note);
    });
  }

  function applySiteCheckRules() {
    const form = $("#site-check-form", dialog);
    const save = $("#save-site-check", dialog);
    if (!form || !save || save.textContent.trim() !== "登録") return;

    const start = $('[name="scheduledStart"]', form);
    const end = $('[name="scheduledEnd"]', form);
    const min = nextQuarterValue();

    if (start) {
      start.step = "900";
      start.min = min;
      start.title = "現在以降を15分単位で選択してください。";
      const label = start.closest("label");
      if (label && !label.querySelector(".green-site-start-note")) {
        const note = document.createElement("span");
        note.className = "green-owner-schedule-note green-site-start-note";
        note.textContent = "現在以降・15分刻み";
        label.append(note);
      }
    }

    if (end) {
      end.step = "900";
      end.min = start?.value || min;
      end.title = "開始日時より後を15分単位で選択してください。";
      const label = end.closest("label");
      if (label && !label.querySelector(".green-site-end-note")) {
        const note = document.createElement("span");
        note.className = "green-owner-schedule-note green-site-end-note";
        note.textContent = "開始より後・15分刻み";
        label.append(note);
      }
    }

    if (start && start.dataset.greenSiteBound !== "1") {
      start.dataset.greenSiteBound = "1";
      start.addEventListener("change", () => {
        if (end) end.min = start.value || nextQuarterValue();
      });
    }
  }

  function validateSiteCheckForm(form) {
    form?.querySelector(".green-owner-save-error")?.remove();
    const lead = $('[name="leadId"]', form);
    const customer = $('[name="customerId"]', form);
    const status = $('[name="status"]', form);
    const start = $('[name="scheduledStart"]', form);
    const end = $('[name="scheduledEnd"]', form);

    if (!lead?.value && !customer?.value) {
      showFormError(form, "登録内容を確認してください", "営業案件または顧客のどちらかを選択してください。");
      lead?.focus();
      return false;
    }

    const scheduledStatus = ["scheduled", "in_progress"].includes(status?.value || "");
    if (scheduledStatus && !start?.value) {
      showFormError(form, "開始日時を確認してください", "予定確定・確認中の場合は開始日時を入力してください。");
      start?.focus();
      return false;
    }
    if (scheduledStatus && !end?.value) {
      showFormError(form, "終了日時を確認してください", "予定確定・確認中の場合は終了日時を入力してください。");
      end?.focus();
      return false;
    }
    if ((start?.value && !end?.value) || (!start?.value && end?.value)) {
      showFormError(form, "日時を確認してください", "開始日時と終了日時は両方入力してください。");
      (start?.value ? end : start)?.focus();
      return false;
    }
    if (start?.value && !isQuarterMinute(start.value)) {
      showFormError(form, "開始日時を確認してください", "開始日時は00分・15分・30分・45分で選択してください。");
      start.focus();
      return false;
    }
    if (end?.value && !isQuarterMinute(end.value)) {
      showFormError(form, "終了日時を確認してください", "終了日時は00分・15分・30分・45分で選択してください。");
      end.focus();
      return false;
    }
    if (start?.value && !isFutureDateTime(start.value)) {
      showFormError(form, "開始日時を確認してください", "開始日時は現在以降を選択してください。過去日時は登録できません。");
      start.focus();
      return false;
    }
    if (end?.value && !isFutureDateTime(end.value)) {
      showFormError(form, "終了日時を確認してください", "終了日時は現在以降を選択してください。過去日時は登録できません。");
      end.focus();
      return false;
    }
    if (start?.value && end?.value && new Date(end.value).getTime() <= new Date(start.value).getTime()) {
      showFormError(form, "終了日時を確認してください", "終了日時は開始日時より後にしてください。");
      end.focus();
      return false;
    }
    return true;
  }

  function siteCheckPayload(form) {
    const value = (name) => $(`[name="${name}"]`, form)?.value?.trim() || "";
    return {
      leadId: value("leadId") || null,
      customerId: value("customerId") || null,
      siteId: value("siteId") || null,
      status: value("status") || "scheduling",
      scheduledStart: localInputToIso(value("scheduledStart")) || null,
      scheduledEnd: localInputToIso(value("scheduledEnd")) || null,
      customerRequest: value("customerRequest"),
      internalNote: value("internalNote"),
    };
  }

  function showSiteCheckSuccess(item, payload) {
    const leadLinked = Boolean(payload.leadId);
    const statusText = payload.scheduledStart ? "現地確認予定" : "現地確認調整中";
    setDialog(
      "現地確認を登録しました",
      "REGISTERED",
      `<section class="green-owner-success" role="status">
        <div class="green-owner-success__icon">✓</div>
        <div><strong>登録できました</strong><p>確認番号 <b>${esc(item?.check_number || "登録済み")}</b></p></div>
      </section>
      <section class="green-owner-next-action">
        <strong>次にどうしますか？</strong>
        <p>${leadLinked ? `営業案件も「${esc(statusText)}」へ連動更新されます。` : "現地確認一覧で予定と状態を確認できます。"} 訪問後は詳細画面から確認結果を記録します。</p>
      </section>`,
      `<button type="button" class="btn btn--secondary" id="green-site-check-list">現地確認一覧へ戻る</button>${leadLinked ? '<button type="button" class="btn btn--primary" id="green-site-check-lead">営業案件を確認</button>' : ""}`,
    );

    $("#green-site-check-list", dialog)?.addEventListener("click", () => {
      closeDialog();
      $('.owner-nav [data-view="site-checks"]')?.click();
    });
    $("#green-site-check-lead", dialog)?.addEventListener("click", () => {
      closeDialog();
      $('.owner-nav [data-view="leads"]')?.click();
    });
  }

  async function submitSiteCheck(button) {
    const form = $("#site-check-form", dialog);
    if (!form || !validateSiteCheckForm(form)) return;
    const payload = siteCheckPayload(form);

    window.Green.setBusy(button, true, "登録中…");
    try {
      const result = await apiWithTimeout("/api/admin/site-checks", {
        method: "POST",
        json: payload,
        idempotencyKey: window.Green.uuid?.() || `green-site-check-${Date.now()}`,
      }, 9000);
      const item = result?.data?.siteCheck || {};
      window.Green.toast(`現地確認 ${item.check_number || ""} を登録しました。`, "success");
      showSiteCheckSuccess(item, payload);
    } catch (error) {
      const meta = [
        error?.code ? `エラーコード: ${error.code}` : "",
        error?.requestId ? `確認番号: ${error.requestId}` : "",
      ].filter(Boolean).join(" / ");
      showFormError(form, "現地確認を登録できませんでした", error?.message || "登録処理に失敗しました。", meta);
    } finally {
      if (button?.isConnected) window.Green.setBusy(button, false);
    }
  }

  function installSiteCheckFix() {
    window.addEventListener("click", (event) => {
      const button = event.target?.closest?.("#save-site-check");
      if (!button || !dialog.contains(button) || button.textContent.trim() !== "登録") return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      submitSiteCheck(button);
    }, true);

    dialog.addEventListener("focusin", (event) => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement)) return;
      if (!$("#site-check-form", dialog)) return;
      if (input.name === "scheduledStart") input.min = nextQuarterValue();
      if (input.name === "scheduledEnd") input.min = $('[name="scheduledStart"]', dialog)?.value || nextQuarterValue();
    });
  }

  const INSTALLATION_ITEM_STATUS_LABELS = Object.freeze({
    inventory: "在庫",
    reserved: "確保済み",
    preparing: "準備中",
    loaded: "積込済み",
    installed: "設置済み",
    recovered: "回収済み",
    cancelled: "取消",
  });

  async function ensureInstallationItemClarity() {
    const kicker = $("#dialog-kicker", dialog)?.textContent?.trim() || "";
    if (kicker !== "INSTALLATION DETAIL") return;

    const body = $("#dialog-body", dialog);
    if (!body || body.dataset.greenInstallationItemsLoading === "1") return;

    const sections = $$(".owner-dialog-section", body);
    const section = sections.find((item) => $("h3", item)?.textContent?.trim() === "一鉢資産");
    if (!section) return;

    const listEl = $(".owner-mini-list", section);
    if (!listEl) return;

    const currentRows = Array.from(listEl.children);
    if (currentRows.length && currentRows.every((row) => row.dataset.greenInstallationItem === "1")) return;

    const title = $("#dialog-title", dialog)?.textContent?.trim() || "";
    const number = title.match(/INS-\d{8}-\d+/)?.[0] || "";
    if (!number) return;

    body.dataset.greenInstallationItemsLoading = "1";
    try {
      const listResult = await apiWithTimeout("/api/admin/installations?limit=1000", undefined, 7000);
      const list = listResult?.data?.items || [];
      const listItem = list.find((item) => String(item.installation_number || "") === number);
      if (!listItem?.id) return;

      const detailResult = await apiWithTimeout(`/api/admin/installations/${encodeURIComponent(listItem.id)}`, undefined, 7000);
      const installation = detailResult?.data?.installation;
      const items = detailResult?.data?.items || [];
      if (!installation) return;

      const [siteResult, assetResult] = await Promise.all([
        apiWithTimeout(`/api/admin/sites/${encodeURIComponent(installation.site_id)}`, undefined, 7000),
        apiWithTimeout("/api/admin/assets?type=plant&limit=500", undefined, 7000),
      ]);

      const areas = siteResult?.data?.areas || [];
      const areaMap = new Map(areas.map((item) => [item.id, item]));
      const assets = assetResult?.data?.plants || [];
      const assetMap = new Map(assets.map((item) => [item.id, item]));

      const areaOptions = (selectedId) => areas.map((area) =>
        `<option value="${esc(area.id)}"${area.id === selectedId ? " selected" : ""}>${esc(area.area_name || "名称未設定")}</option>`
      ).join("");

      listEl.innerHTML = items.length
        ? items.map((item) => {
            const asset = assetMap.get(item.plant_asset_id);
            const area = areaMap.get(item.site_area_id);
            const status = INSTALLATION_ITEM_STATUS_LABELS[item.item_status] || item.item_status || "未設定";
            return `<div class="owner-mini-item" data-green-installation-item="1" data-item-id="${esc(item.id)}">
              <strong>${esc(asset?.asset_code || "植物未取得")}</strong>
              <span>状態：${esc(status)}</span>
              <span>設置場所：${esc(area?.area_name || "未設定")}</span>
              <span>${esc(item.placement_note || "配置メモなし")}</span>
              ${["installed", "cancelled"].includes(installation.status) ? "" : `<button type="button" class="btn btn--secondary" data-green-edit-installation-item="${esc(item.id)}">割当を編集</button>`}
              <div class="green-installation-item-editor" data-green-installation-item-editor="${esc(item.id)}" hidden>
                <label>設置場所
                  <select data-green-item-area>${areaOptions(item.site_area_id)}</select>
                </label>
                <label>配置メモ
                  <textarea data-green-item-note>${esc(item.placement_note || "")}</textarea>
                </label>
                <div class="owner-dialog-actions">
                  <button type="button" class="btn btn--secondary" data-green-item-edit-cancel>取消</button>
                  <button type="button" class="btn btn--primary" data-green-item-edit-save>変更を保存</button>
                </div>
              </div>
            </div>`;
          }).join("")
        : '<div class="owner-empty">登録はありません。</div>';

      $$("[data-green-edit-installation-item]", listEl).forEach((button) => {
        button.addEventListener("click", () => {
          const editor = listEl.querySelector(`[data-green-installation-item-editor="${button.dataset.greenEditInstallationItem}"]`);
          if (editor) editor.hidden = false;
          button.hidden = true;
        });
      });

      $$("[data-green-item-edit-cancel]", listEl).forEach((button) => {
        button.addEventListener("click", () => {
          const row = button.closest("[data-green-installation-item]");
          const editor = $("[data-green-installation-item-editor]", row);
          const editButton = $("[data-green-edit-installation-item]", row);
          if (editor) editor.hidden = true;
          if (editButton) editButton.hidden = false;
        });
      });

      $$("[data-green-item-edit-save]", listEl).forEach((button) => {
        button.addEventListener("click", async () => {
          const row = button.closest("[data-green-installation-item]");
          const itemId = row?.dataset.itemId;
          const areaId = $("[data-green-item-area]", row)?.value || "";
          const note = $("[data-green-item-note]", row)?.value || "";
          if (!itemId || !areaId) {
            window.Green.toast("設置場所を選択してください。", "error");
            return;
          }
          button.disabled = true;
          const original = button.textContent;
          button.textContent = "保存中…";
          try {
            await apiWithTimeout(`/api/admin/installations/${encodeURIComponent(installation.id)}/items/${encodeURIComponent(itemId)}`, {
              method: "PATCH",
              json: { siteAreaId: areaId, placementNote: note },
            }, 10000);
            window.Green.toast("設置場所の割当を更新しました。", "success");
            listEl.innerHTML = '<div class="owner-empty">更新内容を再読み込みしています…</div>';
            setTimeout(() => ensureInstallationItemClarity().catch(() => {}), 50);
          } catch (error) {
            window.Green.toast(error?.message || "割当を更新できませんでした。", "error");
          } finally {
            button.disabled = false;
            button.textContent = original;
          }
        });
      });
    } catch {
      // Keep the base owner.js detail display usable even if enrichment fails.
    } finally {
      body.dataset.greenInstallationItemsLoading = "0";
    }
  }

  const INSTALLATION_STATUS_LABELS = Object.freeze({
    planning: "計画中",
    asset_selecting: "植物選定中",
    asset_reserved: "確保済み",
    scheduled: "設置予定",
    loading: "積込中",
    in_transit: "搬送中",
    installing: "設置作業中",
    installed: "設置済み",
    postponed: "延期",
    cancelled: "取消",
  });

  function installationStatusOptions(selected) {
    return Object.entries(INSTALLATION_STATUS_LABELS)
      .filter(([value]) => value !== "installed" || selected === "installed")
      .map(([value, label]) => `<option value="${value}"${value === selected ? " selected" : ""}>${esc(label)}</option>`)
      .join("");
  }

  function updateInstallationDetailCard(labelText, valueText) {
    const body = $("#dialog-body", dialog);
    if (!body) return;
    for (const item of $$(".owner-detail-item", body)) {
      const small = $("small", item);
      const strong = $("strong", item);
      if (small?.textContent?.trim() === labelText && strong) {
        strong.textContent = valueText;
        return;
      }
    }
  }

  async function ensureInstallationEditPanel() {
    const kicker = $("#dialog-kicker", dialog)?.textContent?.trim() || "";
    if (kicker !== "INSTALLATION DETAIL") return;

    const body = $("#dialog-body", dialog);
    if (!body || body.querySelector("[data-green-installation-edit]")) return;
    if (body.dataset.greenInstallationEditLoading === "1") return;

    const title = $("#dialog-title", dialog)?.textContent?.trim() || "";
    const number = title.match(/INS-\d{8}-\d+/)?.[0] || "";
    if (!number) return;

    body.dataset.greenInstallationEditLoading = "1";
    try {
      const listResult = await apiWithTimeout("/api/admin/installations?limit=1000", undefined, 7000);
      const list = listResult?.data?.items || [];
      const listItem = list.find((item) => String(item.installation_number || "") === number);
      if (!listItem?.id) return;

      const detailResult = await apiWithTimeout(`/api/admin/installations/${encodeURIComponent(listItem.id)}`, undefined, 7000);
      const installation = detailResult?.data?.installation;
      if (!installation) return;

      const section = document.createElement("section");
      section.className = "owner-dialog-section";
      section.dataset.greenInstallationEdit = "1";

      const installed = installation.status === "installed";
      section.innerHTML = `
        <h3>設置計画の内容を編集</h3>
        <p class="green-owner-section-help">登録後でも、設置予定・お客様向けコメント・社内メモを修正できます。</p>
        <form id="green-installation-edit-form" class="owner-form-grid">
          <label>状態
            <select name="status"${installed ? " disabled" : ""}>
              ${installationStatusOptions(installation.status || "planning")}
            </select>
            ${installed ? "<small>設置済みの状態は完了処理で確定されています。</small>" : ""}
          </label>
          <label>設置予定日時
            <input type="datetime-local" name="scheduledAt" step="900" value="${esc(toLocalInput(installation.scheduled_at))}">
            <small>現在以降・15分刻み</small>
          </label>
          <label class="full">お客様向けコメント
            <textarea name="customerComment">${esc(installation.customer_comment || "")}</textarea>
          </label>
          <label class="full">社内メモ
            <textarea name="internalNote">${esc(installation.internal_note || "")}</textarea>
          </label>
        </form>
        <div class="owner-dialog-actions">
          <button type="button" class="btn btn--primary" id="green-save-installation-edit">内容を保存</button>
        </div>`;

      const grid = $(".owner-detail-grid", body);
      if (grid?.nextSibling) body.insertBefore(section, grid.nextSibling);
      else if (grid) grid.after(section);
      else body.prepend(section);

      const save = $("#green-save-installation-edit", section);
      save?.addEventListener("click", async () => {
        const form = $("#green-installation-edit-form", section);
        const scheduledInput = $('[name="scheduledAt"]', form);
        const scheduledAt = scheduledInput?.value || "";

        if (scheduledAt && !isQuarterMinute(scheduledAt)) {
          showFormError(form, "設置予定日時を確認してください", "00分・15分・30分・45分のいずれかで入力してください。");
          scheduledInput?.focus();
          return;
        }
        if (scheduledAt && !isFutureDateTime(scheduledAt)) {
          showFormError(form, "設置予定日時を確認してください", "過去の日時は指定できません。");
          scheduledInput?.focus();
          return;
        }

        const statusSelect = $('[name="status"]', form);
        const payload = {
          scheduledAt: scheduledAt ? localInputToIso(scheduledAt) : "",
          customerComment: $('[name="customerComment"]', form)?.value || "",
          internalNote: $('[name="internalNote"]', form)?.value || "",
        };
        if (!installed && statusSelect) payload.status = statusSelect.value;

        save.disabled = true;
        const original = save.textContent;
        save.textContent = "保存中…";
        try {
          const result = await apiWithTimeout(`/api/admin/installations/${encodeURIComponent(installation.id)}`, {
            method: "PATCH",
            json: payload,
          }, 10000);
          const updated = result?.data?.installation || {};
          window.Green.toast("設置計画の内容を更新しました。", "success");
          updateInstallationDetailCard("状態", INSTALLATION_STATUS_LABELS[updated.status || payload.status || installation.status] || updated.status || installation.status);
          updateInstallationDetailCard("設置予定", updated.scheduled_at ? formatLocalDateTime(updated.scheduled_at) : "未設定");
        } catch (error) {
          showFormError(form, "保存できませんでした", error?.message || "通信を確認して、もう一度保存してください。", error?.requestId ? `確認番号：${error.requestId}` : "");
        } finally {
          save.disabled = false;
          save.textContent = original;
        }
      });
    } catch {
      // Existing installation detail remains usable even when the edit helper cannot load.
    } finally {
      body.dataset.greenInstallationEditLoading = "0";
    }
  }

  function featureSettingValue(features, key, fallback) {
    const item = features?.[key];
    return item && typeof item === "object" && "value" in item ? item.value : fallback;
  }

  function containerModelLabel(item) {
    const typeLabel = { pot: "鉢", cover: "鉢カバー", planter: "プランター", stand: "スタンド", other: "その他" }[item?.container_type] || item?.container_type || "";
    const detail = [typeLabel, item?.size_code, item?.material, item?.color_name].filter(Boolean).join("／");
    return `${item?.model_name || item?.model_code || "鉢モデル"}${detail ? `（${detail}）` : ""}`;
  }

  async function ensureIntegratedContainerModelField() {
    const kicker = $("#dialog-kicker", dialog)?.textContent?.trim() || "";
    if (kicker !== "PLANT ASSET") return;

    const form = $("#asset-form", dialog);
    if (!form || form.dataset.greenIntegratedPotReady === "1") return;
    form.dataset.greenIntegratedPotReady = "loading";

    try {
      const [featureResult, modelResult] = await Promise.all([
        apiWithTimeout("/api/admin/features", undefined, 7000),
        apiWithTimeout("/api/admin/container-models", undefined, 7000),
      ]);
      const mode = featureSettingValue(featureResult?.data?.features, "container_management_mode", "with_plant");
      if (mode !== "with_plant") {
        form.dataset.greenIntegratedPotReady = "1";
        return;
      }

      const models = modelResult?.data?.items || [];
      let selectedId = "";
      const assetCodeInput = form.querySelector('[name="assetCode"]');
      const assetCode = assetCodeInput?.value?.trim() || "";
      if (assetCode && assetCodeInput?.readOnly) {
        try {
          const assetResult = await apiWithTimeout(`/api/admin/assets?type=plant&search=${encodeURIComponent(assetCode)}&limit=10`, undefined, 7000);
          const asset = (assetResult?.data?.plants || []).find((item) => String(item.asset_code || "").toUpperCase() === assetCode.toUpperCase());
          selectedId = asset?.metadata?.container_model_id || "";
        } catch {}
      }

      const label = document.createElement("label");
      label.className = "green-integrated-container-model";
      label.innerHTML = `<span>鉢モデル</span><select name="containerModelId">
        <option value="">未設定</option>
        ${models.map((item) => `<option value="${esc(item.id)}"${item.id === selectedId ? " selected" : ""}>${esc(containerModelLabel(item))}</option>`).join("")}
      </select><small>鉢を植物と一体管理する設定です。鉢カバー・卓上鉢などのモデルを植物資産に記録します。</small>`;

      const acquired = form.querySelector('[name="acquiredOn"]')?.closest("label");
      if (acquired) acquired.before(label);
      else form.append(label);

      form.dataset.greenIntegratedPotReady = "1";
    } catch {
      form.dataset.greenIntegratedPotReady = "0";
    }
  }

  async function ensureIntegratedContainerModelDetail() {
    const kicker = $("#dialog-kicker", dialog)?.textContent?.trim() || "";
    if (kicker !== "PLANT ASSET" || $("#asset-form", dialog)) return;

    const grid = $(".owner-detail-grid", dialog);
    if (!grid || grid.querySelector("[data-green-integrated-pot-detail]")) return;

    const title = $("#dialog-title", dialog)?.textContent?.trim() || "";
    const assetCode = title.split(/\s+/)[0] || "";
    if (!assetCode) return;

    grid.dataset.greenIntegratedPotLoading = grid.dataset.greenIntegratedPotLoading || "1";
    if (grid.dataset.greenIntegratedPotLoading === "done") return;

    try {
      const [assetResult, modelResult, featureResult] = await Promise.all([
        apiWithTimeout(`/api/admin/assets?type=plant&search=${encodeURIComponent(assetCode)}&limit=10`, undefined, 7000),
        apiWithTimeout("/api/admin/container-models", undefined, 7000),
        apiWithTimeout("/api/admin/features", undefined, 7000),
      ]);
      const mode = featureSettingValue(featureResult?.data?.features, "container_management_mode", "with_plant");
      if (mode !== "with_plant") {
        grid.dataset.greenIntegratedPotLoading = "done";
        return;
      }

      const asset = (assetResult?.data?.plants || []).find((item) => String(item.asset_code || "").toUpperCase() === assetCode.toUpperCase());
      const modelId = asset?.metadata?.container_model_id || "";
      const model = (modelResult?.data?.items || []).find((item) => item.id === modelId);

      const item = document.createElement("div");
      item.className = "owner-detail-item";
      item.dataset.greenIntegratedPotDetail = "1";
      item.innerHTML = `<small>鉢モデル（一体管理）</small><strong>${esc(model ? containerModelLabel(model) : "未設定")}</strong>`;
      grid.append(item);
      grid.dataset.greenIntegratedPotLoading = "done";
    } catch {
      grid.dataset.greenIntegratedPotLoading = "";
    }
  }

  async function syncServiceStatusFromCustomer() {
    const kicker = $("#dialog-kicker", dialog)?.textContent?.trim() || "";
    if (kicker !== "SERVICE STATUS") return;

    const form = $("#contract-form", dialog);
    if (!form || form.dataset.greenCustomerSyncBound === "1") return;

    const customerSelect = $('[name="customerId"]', form);
    const contactSelect = $('[name="preferredContactMethod"]', form);
    const hqSelect = $('[name="headquartersConfirmationStatus"]', form);
    if (!customerSelect || !contactSelect || !hqSelect) return;

    form.dataset.greenCustomerSyncBound = "1";

    const apply = async () => {
      const customerId = customerSelect.value;
      if (!customerId) return;

      try {
        const result = await apiWithTimeout(`/api/admin/customers/${encodeURIComponent(customerId)}`, undefined, 7000);
        const customer = result?.data?.customer || null;
        if (!customer) return;

        if (customer.preferred_contact_method) {
          contactSelect.value = customer.preferred_contact_method;
        }
        if (customer.headquarters_confirmation_status) {
          hqSelect.value = customer.headquarters_confirmation_status;
        }

        let note = form.querySelector(".green-service-status-customer-sync-note");
        if (!note) {
          note = document.createElement("div");
          note.className = "green-owner-next-action green-service-status-customer-sync-note full";
          const firstLabel = form.querySelector("label");
          if (firstLabel) firstLabel.before(note);
          else form.prepend(note);
        }
        note.innerHTML = `<strong>顧客台帳の設定を反映しました</strong><p>希望連絡方法と本部確認は、選択した顧客の登録内容を初期値として表示しています。</p>`;
      } catch {
        // Existing form remains usable even when customer detail lookup fails.
      }
    };

    customerSelect.addEventListener("change", apply);

    // Existing contracts must keep their own saved values.
    if (!customerSelect.disabled && customerSelect.value) {
      await apply();
    }
  }

  function ensureSiteDetailActions() {
    const kicker = $("#dialog-kicker", dialog)?.textContent?.trim() || "";
    if (kicker !== "SITE DETAIL") return;

    const body = $("#dialog-body", dialog);
    const footer = $("#dialog-footer", dialog);
    if (!body || !footer) return;

    const edit = $("#edit-site", dialog);
    const add = $("#add-area", dialog);
    if (!edit && !add) return;

    let close = footer.querySelector("[data-dialog-close]");
    if (!close) {
      close = document.createElement("button");
      close.type = "button";
      close.className = "btn btn--secondary";
      close.dataset.dialogClose = "";
      close.textContent = "閉じる";
      close.addEventListener("click", closeDialog);
      footer.append(close);
    }

    footer.classList.add("green-site-detail-footer");

    if (edit) {
      edit.classList.remove("btn--primary");
      edit.classList.add("btn--secondary");
      if (edit.parentElement !== footer) footer.insertBefore(edit, close);
    }

    if (add) {
      add.classList.remove("btn--secondary");
      add.classList.add("btn--primary");
      if (add.parentElement !== footer) footer.insertBefore(add, close);
    }

    for (const wrapper of body.querySelectorAll(".owner-dialog-actions")) {
      if (!wrapper.children.length) wrapper.remove();
    }
  }

  function applyCustomerLedgerCopy() {
    const panel = document.querySelector('[data-view-panel="customers"]');
    if (!panel) return;
    for (const element of panel.querySelectorAll("p")) {
      const text = element.textContent?.trim() || "";
      if (text.includes("成約後・利用中のお客様情報を管理します")) {
        element.textContent = "現地確認後の見込み顧客から、成約後・利用中のお客様まで管理します。相談・営業の進捗は営業案件で管理します。";
      }
    }
  }

  function decodeSessionPayload() {
    try {
      const token = sessionStorage.getItem("green_admin_session_token");
      if (!token) return null;
      const encoded = token.split(".")[0];
      const padded = encoded.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((encoded.length + 3) % 4);
      return JSON.parse(atob(padded));
    } catch { return null; }
  }
  function updateSessionCountdown() {
    const status = $("#session-expiry");
    const payload = decodeSessionPayload();
    if (!status || !payload?.exp) return;
    const remaining = payload.exp * 1000 - Date.now();
    if (remaining <= 0) { status.textContent = "ログイン期限切れ｜再読込で更新"; return; }
    const minutes = Math.max(1, Math.ceil(remaining / 60000));
    const hours = Math.floor(minutes / 60), mins = minutes % 60;
    status.textContent = hours ? `ログイン残り ${hours}時間${mins ? `${mins}分` : ""}` : `ログイン残り ${minutes}分`;
  }

  function installDialogFeedbackBridge() {
    if (document.documentElement.dataset.greenDialogFeedbackBridge === "1") return;
    document.documentElement.dataset.greenDialogFeedbackBridge = "1";

    const mirrorToast = (toast) => {
      if (!(toast instanceof HTMLElement) || !toast.classList.contains("toast")) return;
      if (!dialog?.open || toast.dataset.greenDialogMirrored === "1") return;
      const body = $("#dialog-body", dialog);
      if (!body) return;

      toast.dataset.greenDialogMirrored = "1";
      body.querySelectorAll(".green-dialog-feedback").forEach((node) => node.remove());

      const isError = toast.classList.contains("toast-error");
      const isSuccess = toast.classList.contains("toast-success");
      const box = document.createElement("div");
      box.className = `green-dialog-feedback ${isError ? "green-owner-inline-error" : "green-owner-inline-warning"}`;
      box.setAttribute("role", isError ? "alert" : "status");
      box.innerHTML = `<strong>${isError ? "処理できませんでした" : isSuccess ? "処理結果" : "お知らせ"}</strong><span>${esc(toast.textContent || "")}</span>`;
      body.prepend(box);
      box.scrollIntoView({ block: "nearest", behavior: "smooth" });
    };

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof HTMLElement)) continue;
          if (node.classList.contains("toast")) mirrorToast(node);
          node.querySelectorAll?.(".toast").forEach(mirrorToast);
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    document.querySelectorAll(".toast").forEach(mirrorToast);
  }


  let replacementPlantPromise = null;

  async function loadReplacementPlants() {
    if (!replacementPlantPromise) {
      replacementPlantPromise = Green.api("/api/admin/assets?type=plant&limit=500")
        .then((result) => result?.data?.plants || [])
        .catch((error) => {
          replacementPlantPromise = null;
          throw error;
        });
    }
    return replacementPlantPromise;
  }

  async function installReplacementSiteAssetFilter() {
    const form = $("#replacement-form", dialog);
    if (!form || form.dataset.greenReplacementSiteFilter === VERSION) return;

    const customer = form.elements.customerId;
    const site = form.elements.siteId;
    const oldAsset = form.elements.oldPlantAssetId;
    if (!customer || !site || !oldAsset) return;

    form.dataset.greenReplacementSiteFilter = VERSION;
    const originalLabels = new Map(
      Array.from(oldAsset.options)
        .filter((option) => option.value)
        .map((option) => [option.value, option.textContent || option.value])
    );

    const hint = document.createElement("small");
    hint.className = "green-owner-field-hint";
    hint.textContent = "選択した拠点に現在設置中の植物だけを表示します。";
    oldAsset.closest("label")?.appendChild(hint);

    const plants = await loadReplacementPlants();

    const refresh = () => {
      const siteId = String(site.value || "");
      const previous = String(oldAsset.value || "");
      const candidates = siteId
        ? plants.filter((item) => item && item.is_active !== false && item.asset_status === "installed" && String(item.current_site_id || "") === siteId)
        : [];

      oldAsset.innerHTML = '<option value="">対象植物を選択</option>' + candidates.map((item) => {
        const value = String(item.id || "");
        const label = originalLabels.get(value) || `${item.display_name || item.asset_code || "植物"}（${item.asset_code || value}）`;
        return `<option value="${esc(value)}">${esc(label)}</option>`;
      }).join("");

      oldAsset.disabled = !siteId;
      if (previous && candidates.some((item) => String(item.id) === previous)) oldAsset.value = previous;

      hint.textContent = !siteId
        ? "先に拠点を選択してください。"
        : candidates.length
          ? `この拠点に設置中の植物 ${candidates.length}鉢から選択できます。`
          : "この拠点に交換対象として選べる設置中植物はありません。";
    };

    customer.addEventListener("change", () => setTimeout(refresh, 0));
    site.addEventListener("change", refresh);
    refresh();
  }

  function boot() {
    normalizeDialogShell();
    installDialogFeedbackBridge();
  setTimeout(() => { resumePendingSiteHandoff().catch(() => {}); }, 250);
    installLeadClickFix();
    installPhoneFix();
    installSiteCheckFix();
    installSiteCheckDetailStyles();
    installSiteCheckDetailFixR17();
    applyCustomerLedgerCopy();
    ensurePhoneHelp();
    ensureSiteCheckHelp();
    applySiteCheckRules();
    ensureSiteDetailActions();
    syncServiceStatusFromCustomer().catch(() => {});
    ensureIntegratedContainerModelField().catch(() => {});
    ensureIntegratedContainerModelDetail().catch(() => {});
    ensureInstallationEditPanel().catch(() => {});
    ensureInstallationItemClarity().catch(() => {});
    installReplacementSiteAssetFilter().catch(() => {});
    const observer = new MutationObserver(() => {
      ensurePhoneHelp();
      ensureSiteCheckHelp();
      applyScheduleRules();
      applySiteCheckRules();
      applyCustomerLedgerCopy();
      ensureSiteDetailActions();
      syncServiceStatusFromCustomer().catch(() => {});
      ensureIntegratedContainerModelField().catch(() => {});
      ensureIntegratedContainerModelDetail().catch(() => {});
      ensureInstallationEditPanel().catch(() => {});
      ensureInstallationItemClarity().catch(() => {});
      installReplacementSiteAssetFilter().catch(() => {});
    });
    observer.observe(dialog, { childList: true, subtree: true });
    updateSessionCountdown();
    setInterval(updateSessionCountdown, 30000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
