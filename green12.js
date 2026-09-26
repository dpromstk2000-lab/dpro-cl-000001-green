(() => {
  "use strict";
  const VERSION = "GREEN12-ANNOUNCEMENT-JST-R1.2-20260916";
  const Green = window.Green;
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
  const weekdayNames = ["日曜日","月曜日","火曜日","水曜日","木曜日","金曜日","土曜日"];
  const TZ_RE = /(?:Z|[+-]\d{2}:\d{2})$/;
  let calendar = null;
  let announcements = [];


  const CLEAN_DATE_DISPLAY_VERSION = "GREEN-CLEAN-DATETIME-R1.3-20260916";

  function ensureCleanDateStyles() {
    if (document.querySelector(`style[data-green-clean-datetime="${CLEAN_DATE_DISPLAY_VERSION}"]`)) return;
    const style = document.createElement("style");
    style.dataset.greenCleanDatetime = CLEAN_DATE_DISPLAY_VERSION;
    style.textContent = `
      .green-clean-date-wrap { display:grid; grid-template-columns:minmax(0,1fr) 46px; gap:8px; align-items:stretch; width:100%; position:relative; }
      .green-clean-date-display { width:100%; min-width:0; }
      .green-clean-date-picker { position:relative; min-width:46px; min-height:46px; border:1px solid #cbd7ce; border-radius:12px; background:#fff; display:grid; place-items:center; overflow:hidden; cursor:pointer; }
      .green-clean-date-picker:hover { background:#f7faf7; } .green-clean-date-picker-icon { pointer-events:none; font-size:20px; line-height:1; }
      .green-clean-date-native { position:absolute !important; inset:0 !important; width:100% !important; min-width:100% !important; height:100% !important; min-height:100% !important; padding:0 !important; margin:0 !important; border:0 !important; opacity:0 !important; pointer-events:auto !important; cursor:pointer !important; z-index:2 !important; }
    `;
    document.head.append(style);
  }

  function cleanDateDisplayValue(value) {
    const text = String(value || "");
    if (!text) return "";
    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    return match ? `${match[1]}/${match[2]}/${match[3]} ${match[4]}:${match[5]}` : text;
  }

  function parseCleanDateDisplay(value) {
    const text = String(value || "").trim();
    if (!text) return "";
    const match = text.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})[ T](\d{1,2}):(\d{2})$/);
    if (!match) return null;
    return `${match[1]}-${String(match[2]).padStart(2,"0")}-${String(match[3]).padStart(2,"0")}T${String(match[4]).padStart(2,"0")}:${match[5]}`;
  }

  function syncCleanDateField(input) {
    if (!input) return;
    const wrapper = input.closest(".green-clean-date-wrap");
    const display = wrapper?.querySelector(".green-clean-date-display");
    if (!display) return;
    const next = cleanDateDisplayValue(input.value);
    if (document.activeElement !== display && display.value !== next) display.value = next;
    display.setCustomValidity("");
  }

  function commitCleanDateDisplay(input, display) {
    const parsed = parseCleanDateDisplay(display.value);
    if (parsed === null) {
      input.value = "";
      display.setCustomValidity("YYYY/MM/DD HH:mm 形式で入力してください。");
      return false;
    }
    input.value = parsed;
    display.value = cleanDateDisplayValue(parsed);
    display.setCustomValidity("");
    input.dispatchEvent(new Event("input", { bubbles:true }));
    input.dispatchEvent(new Event("change", { bubbles:true }));
    return true;
  }

  function installCleanDateField(input) {
    if (!input) return;
    if (input.dataset.greenCleanDateFixed === CLEAN_DATE_DISPLAY_VERSION) { syncCleanDateField(input); return; }
    if (!input.matches('input[type="datetime-local"]')) return;
    ensureCleanDateStyles();
    const wrapper = document.createElement("span"); wrapper.className = "green-clean-date-wrap"; wrapper.dataset.greenCleanDateWrap = CLEAN_DATE_DISPLAY_VERSION;
    const display = document.createElement("input"); display.type = "text"; display.className = "green-clean-date-display"; display.inputMode = "numeric"; display.autocomplete = "off"; display.placeholder = "YYYY/MM/DD HH:mm"; display.value = cleanDateDisplayValue(input.value); display.setAttribute("aria-label", "日時");
    const picker = document.createElement("span"); picker.className = "green-clean-date-picker"; picker.title = "日時をカレンダーから選択"; const pickerIcon = document.createElement("span"); pickerIcon.className = "green-clean-date-picker-icon"; pickerIcon.textContent = "📅"; picker.append(pickerIcon);
    input.dataset.greenCleanDateFixed = CLEAN_DATE_DISPLAY_VERSION; input.classList.add("green-clean-date-native"); input.setAttribute("aria-label", "日時をカレンダーから選択");
    input.parentNode.insertBefore(wrapper, input); picker.append(input); wrapper.append(display, picker);
    display.addEventListener("input", () => { const parsed = parseCleanDateDisplay(display.value); if (parsed === "") { input.value = ""; display.setCustomValidity(""); } else if (parsed) { input.value = parsed; display.setCustomValidity(""); } else { input.value = ""; } });
    display.addEventListener("change", () => commitCleanDateDisplay(input, display));
    display.addEventListener("blur", () => { if (display.value.trim()) commitCleanDateDisplay(input, display); else display.setCustomValidity(""); });
    input.addEventListener("input", () => syncCleanDateField(input)); input.addEventListener("change", () => syncCleanDateField(input));
    // The real datetime-local input overlays the calendar cell, so the browser receives a genuine user click.
  }

  function installAnnouncementCleanDates() {
    installCleanDateField($("#announcement-from"));
    installCleanDateField($("#announcement-until"));
  }

  const halfHourOptions = (selected = "") => {
    const items = [];
    for (let hour = 0; hour < 24; hour += 1) {
      for (const minute of [0, 30]) {
        const value = `${String(hour).padStart(2,"0")}:${String(minute).padStart(2,"0")}`;
        items.push(`<option value="${value}"${value === selected ? " selected" : ""}>${value}</option>`);
      }
    }
    return items.join("");
  };

  function withTokyoOffset(value) {
    if (value === null || value === undefined || value === "") return null;
    const text = String(value).trim();
    if (!text) return null;
    if (TZ_RE.test(text)) return text;
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(text)) return text;
    return `${text.length === 16 ? `${text}:00` : text}+09:00`;
  }

  function toTokyoInput(value) {
    if (!value) return "";
    const text = String(value).trim();
    if (!TZ_RE.test(text)) return text.slice(0, 16);

    const date = new Date(text);
    if (Number.isNaN(date.getTime())) return text.slice(0, 16);
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);
    const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}`;
  }

  function toTokyoDisplay(value) {
    if (!value) return "";
    const text = String(value).trim();

    // 旧データの「タイムゾーンなし日時」は従来値をそのまま表示する。
    if (!TZ_RE.test(text)) {
      const normalized = text.slice(0, 19).replace("T", " ");
      const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})[ ](\d{2}):(\d{2})(?::(\d{2}))?$/);
      if (!match) return text;
      const [, y, m, d, hh, mm, ss = "00"] = match;
      return `${Number(y)}/${Number(m)}/${Number(d)} ${Number(hh)}:${mm}:${ss}`;
    }

    const date = new Date(text);
    if (Number.isNaN(date.getTime())) return text;
    return new Intl.DateTimeFormat("ja-JP", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).format(date);
  }

  function renderHours() {
    const rows = new Map((calendar?.businessHours || []).map((row) => [Number(row.weekday), row]));
    $("#business-hours-list").innerHTML = [1,2,3,4,5,6,0].map((weekday) => {
      const row = rows.get(weekday) || { weekday, is_open: weekday >= 1 && weekday <= 5, open_time: "09:00", close_time: "17:30" };
      return `<div class="green12-hour-row" data-weekday="${weekday}"><strong>${weekdayNames[weekday]}</strong><label class="owner-check"><input data-hour="isOpen" type="checkbox"${row.is_open ? " checked" : ""}>営業</label><label>開始<select data-hour="openTime">${halfHourOptions(String(row.open_time || "09:00").slice(0,5))}</select></label><label>終了<select data-hour="closeTime">${halfHourOptions(String(row.close_time || "17:30").slice(0,5))}</select></label><label>補足<input data-hour="note" value="${esc(row.note || "")}" placeholder="受付のみ等"></label></div>`;
    }).join("");
    $("#national-holiday-policy").checked = Boolean(calendar?.settings?.nationalHolidayPolicy);
    $("#website-sync-enabled").checked = calendar?.settings?.websiteSyncEnabled !== false;
  }

  function groupHolidays(items) {
    const groups = new Map();
    for (const row of items || []) {
      const groupId = row.metadata?.groupId || row.id;
      if (!groups.has(groupId)) groups.set(groupId, []);
      groups.get(groupId).push(row);
    }
    return Array.from(groups.entries()).map(([groupId, rows]) => ({
      groupId,
      rows: rows.sort((a,b) => a.holiday_date.localeCompare(b.holiday_date)),
    }));
  }

  function renderHolidays() {
    const groups = groupHolidays(calendar?.holidays || []);
    $("#holiday-list").innerHTML = groups.length ? groups.map(({groupId, rows}) => {
      const first = rows[0], last = rows[rows.length - 1];
      const meta = first.metadata || {};
      const type = first.is_closed ? (meta.sourceType === "national_holiday" ? "祝日休業" : "臨時休業") : "特別営業";
      const period = first.holiday_date === last.holiday_date ? first.holiday_date : `${first.holiday_date}〜${last.holiday_date}`;
      const time = !first.is_closed && meta.specialOpenTime ? ` ${meta.specialOpenTime}〜${meta.specialCloseTime || ""}` : "";
      return `<article class="green12-list-item"><div><span class="owner-status">${type}</span><h3>${esc(first.holiday_name || type)}</h3><p>${period}${time}</p>${first.note ? `<small>${esc(first.note)}</small>` : ""}<div class="green12-targets">${meta.showWebsite ? "ホームページ " : ""}${meta.showPublicForm ? "公開相談 " : ""}${meta.showMember ? "お客様画面" : ""}</div></div><button class="btn btn--secondary btn--small" data-delete-holiday-group="${esc(groupId)}">削除</button></article>`;
    }).join("") : '<p class="owner-empty">今後の臨時休業・特別営業はありません。</p>';

    $$("[data-delete-holiday-group]").forEach((button) => button.addEventListener("click", async () => {
      if (!confirm("この期間設定を削除しますか？")) return;
      try {
        await Green.api(`/api/admin/holiday-groups/${encodeURIComponent(button.dataset.deleteHolidayGroup)}`, { method: "DELETE", json: {} });
        Green.toast("休日設定を削除しました。","success");
        await loadCalendar();
      } catch (error) {
        Green.toast(error.message,"error");
      }
    }));
  }

  function renderCalendarPreview() {
    const preview = calendar?.publicPreview || {};
    const hours = preview.businessHoursSummary || "営業時間未設定";
    const closed = preview.closedDaysSummary || "定休日未設定";
    const upcoming = (preview.upcomingNotices || []).map((item) => `<li><strong>${esc(item.title)}</strong><span>${esc(item.period || "")}</span></li>`).join("");
    $("#calendar-public-preview").innerHTML = `<div class="green12-preview-grid"><div><small>営業時間</small><strong>${esc(hours)}</strong></div><div><small>定休日</small><strong>${esc(closed)}</strong></div></div>${upcoming ? `<ul>${upcoming}</ul>` : "<p>現在表示予定の休業案内はありません。</p>"}`;
  }

  async function loadCalendar() {
    $("#business-hours-list").innerHTML = '<div class="owner-loading">読み込み中です。</div>';
    const response = await Green.api("/api/admin/business-calendar");
    calendar = response.data;
    renderHours();
    renderHolidays();
    renderCalendarPreview();
  }

  async function saveHours() {
    const rows = $$(".green12-hour-row").map((row) => ({
      weekday: Number(row.dataset.weekday),
      isOpen: $('[data-hour="isOpen"]', row).checked,
      openTime: $('[data-hour="openTime"]', row).value,
      closeTime: $('[data-hour="closeTime"]', row).value,
      note: $('[data-hour="note"]', row).value.trim(),
    }));
    const button = $("#business-hours-save");
    Green.setBusy(button,true,"保存中…");
    try {
      await Green.api("/api/admin/business-hours", {
        method:"PUT",
        json:{
          businessHours:rows,
          nationalHolidayPolicy:$("#national-holiday-policy").checked,
          websiteSyncEnabled:$("#website-sync-enabled").checked,
        },
      });
      Green.toast("通常営業時間を保存しました。","success");
      await loadCalendar();
    } catch (error) {
      Green.toast(error.message,"error");
    } finally {
      Green.setBusy(button,false);
    }
  }

  function updateHolidayTimeVisibility() {
    const special = $("#holiday-type").value === "special_open";
    $$(".green12-special-time").forEach((label) => { label.hidden = !special; });
  }

  async function addHoliday() {
    const form = $("#holiday-form");
    if (!form.reportValidity()) return;
    const button = $("#holiday-add");
    Green.setBusy(button,true,"登録中…");
    try {
      await Green.api("/api/admin/holidays", {
        method:"POST",
        json:{
          fromDate:$("#holiday-from").value,
          toDate:$("#holiday-to").value,
          type:$("#holiday-type").value,
          title:$("#holiday-title").value.trim(),
          note:$("#holiday-note").value.trim(),
          openTime:$("#holiday-open-time").value,
          closeTime:$("#holiday-close-time").value,
          showWebsite:$("#holiday-show-website").checked,
          showPublicForm:$("#holiday-show-public").checked,
          showMember:$("#holiday-show-member").checked,
          createAnnouncement:$("#holiday-create-announcement").checked,
        },
      });
      form.reset();
      $("#holiday-show-website").checked =
        $("#holiday-show-public").checked =
        $("#holiday-show-member").checked =
        $("#holiday-create-announcement").checked = true;
      updateHolidayTimeVisibility();
      Green.toast("休日・特別営業を登録しました。","success");
      await loadCalendar();
    } catch (error) {
      Green.toast(error.message,"error");
    } finally {
      Green.setBusy(button,false);
    }
  }

  function announcementPayload() {
    return {
      announcementType:$("#announcement-type").value,
      status:$("#announcement-status").value,
      title:$("#announcement-title").value.trim(),
      body:$("#announcement-body").value.trim(),
      publishFrom:withTokyoOffset($("#announcement-from").value),
      publishUntil:withTokyoOffset($("#announcement-until").value),
      isImportant:$("#announcement-important").checked,
      showWebsite:$("#announcement-website").checked,
      showPublicForm:$("#announcement-public").checked,
      showMember:$("#announcement-member").checked,
      lineCopy:$("#announcement-line-copy").value.trim(),
    };
  }

  function openAnnouncementEditor(item = null) {
    $("#announcement-editor").hidden = false;
    $("#announcement-editor-title").textContent = item ? "お知らせを編集" : "お知らせを作成";
    $("#announcement-id").value = item?.id || "";
    $("#announcement-type").value = item?.announcement_type || "general";
    $("#announcement-status").value = item?.status || "draft";
    $("#announcement-title").value = item?.title || "";
    $("#announcement-body").value = item?.body || "";
    $("#announcement-from").value = item?.publish_from ? toTokyoInput(item.publish_from) : "";
    $("#announcement-until").value = item?.publish_until ? toTokyoInput(item.publish_until) : "";
    $("#announcement-important").checked = Boolean(item?.is_important);
    $("#announcement-website").checked = item ? Boolean(item.show_website) : true;
    $("#announcement-public").checked = item ? Boolean(item.show_public_form) : true;
    $("#announcement-member").checked = item ? Boolean(item.show_member) : true;
    $("#announcement-line-copy").value = item?.line_copy || "";
    installAnnouncementCleanDates();
    syncCleanDateField($("#announcement-from"));
    syncCleanDateField($("#announcement-until"));
    $("#announcement-title").focus();
  }

  function renderAnnouncements() {
    $("#announcement-list").innerHTML = announcements.length ? announcements.map((item) => {
      const period = `${item.publish_from ? toTokyoDisplay(item.publish_from) : "すぐ公開"}〜${item.publish_until ? toTokyoDisplay(item.publish_until) : "終了日なし"}`;
      return `<article class="green12-list-item${item.is_important ? " is-important" : ""}"><div><span class="owner-status" data-status="${esc(item.status)}">${item.status === "published" ? "公開" : item.status === "draft" ? "下書き" : "保管"}</span><h3>${esc(item.title)}</h3><p>${esc(item.body).replace(/\n/g,"<br>")}</p><small>${esc(period)}</small><div class="green12-targets">${item.show_website ? "ホームページ " : ""}${item.show_public_form ? "公開相談 " : ""}${item.show_member ? "お客様画面" : ""}</div></div><div class="green12-list-actions"><button class="btn btn--secondary btn--small" data-edit-announcement="${item.id}">編集</button><button class="btn btn--secondary btn--small" data-copy-announcement="${item.id}">LINE文面</button><button class="btn btn--secondary btn--small" data-delete-announcement="${item.id}">削除</button></div></article>`;
    }).join("") : '<p class="owner-empty">お知らせはまだありません。</p>';

    $$("[data-edit-announcement]").forEach((button) =>
      button.addEventListener("click", () =>
        openAnnouncementEditor(announcements.find((item) => item.id === button.dataset.editAnnouncement))
      )
    );

    $$("[data-copy-announcement]").forEach((button) => button.addEventListener("click", async () => {
      const item = announcements.find((row) => row.id === button.dataset.copyAnnouncement);
      const text = item.line_copy || `${item.title}\n${item.body}`;
      try {
        await navigator.clipboard.writeText(text);
        Green.toast("LINE配信用文面をコピーしました。","success");
      } catch {
        Green.toast("コピーできませんでした。","error");
      }
    }));

    $$("[data-delete-announcement]").forEach((button) => button.addEventListener("click", async () => {
      if (!confirm("このお知らせを削除しますか？")) return;
      try {
        await Green.api(`/api/admin/announcements/${button.dataset.deleteAnnouncement}`, { method:"DELETE", json:{} });
        Green.toast("お知らせを削除しました。","success");
        await loadAnnouncements();
      } catch (error) {
        Green.toast(error.message,"error");
      }
    }));
  }

  async function loadAnnouncements() {
    const response = await Green.api("/api/admin/announcements");
    announcements = response.data.items || [];
    renderAnnouncements();
  }

  async function saveAnnouncement() {
    const form = $("#announcement-form");
    if (!form.reportValidity()) return;
    const id = $("#announcement-id").value;
    const button = $("#announcement-save");
    Green.setBusy(button,true,"保存中…");
    try {
      await Green.api(id ? `/api/admin/announcements/${id}` : "/api/admin/announcements", {
        method:id ? "PATCH" : "POST",
        json:announcementPayload(),
      });
      Green.toast("お知らせを保存しました。","success");
      $("#announcement-editor").hidden = true;
      await loadAnnouncements();
    } catch (error) {
      Green.toast(error.message,"error");
    } finally {
      Green.setBusy(button,false);
    }
  }

  function exceptionRow(item = {}) {
    return `<div class="green12-site-exception-row"><label>日付<input data-site-exception="date" type="date" value="${esc(item.date || "")}" required></label><label>区分<select data-site-exception="type"><option value="closed"${item.type !== "special_open" ? " selected" : ""}>訪問不可</option><option value="special_open"${item.type === "special_open" ? " selected" : ""}>特別訪問可</option></select></label><label>名称<input data-site-exception="title" value="${esc(item.title || "")}" placeholder="施設休館"></label><label>開始<input data-site-exception="timeFrom" type="time" step="1800" value="${esc(item.timeFrom || "")}"></label><label>終了<input data-site-exception="timeTo" type="time" step="1800" value="${esc(item.timeTo || "")}"></label><label>メモ<input data-site-exception="note" value="${esc(item.note || "")}"></label><button type="button" class="owner-link-button" data-remove-site-exception>削除</button></div>`;
  }

  function initSiteScheduleEditor() {
    const root = $(".green12-site-exceptions");
    if (!root || root.dataset.ready === "1") return;
    root.dataset.ready = "1";
    let existing = [];
    try { existing = JSON.parse(root.dataset.existing || "[]"); } catch { existing = []; }
    const list = $("[data-site-exception-list]", root);
    list.innerHTML = existing.map(exceptionRow).join("");
    $("[data-add-site-exception]", root).addEventListener("click", () => {
      list.insertAdjacentHTML("beforeend", exceptionRow());
      bindExceptionRemove(root);
    });
    bindExceptionRemove(root);
  }

  function bindExceptionRemove(root) {
    $$("[data-remove-site-exception]", root).forEach((button) => {
      if (button.dataset.ready) return;
      button.dataset.ready = "1";
      button.addEventListener("click", () => button.closest(".green12-site-exception-row")?.remove());
    });
  }

  function serializeSiteScheduleEditor() {
    const root = $(".green12-site-exceptions");
    if (!root) return;
    const items = $$(".green12-site-exception-row", root).map((row) => ({
      id: crypto.randomUUID?.() || `site-date-${Date.now()}-${Math.random()}`,
      date:$('[data-site-exception="date"]',row).value,
      type:$('[data-site-exception="type"]',row).value,
      title:$('[data-site-exception="title"]',row).value.trim(),
      timeFrom:$('[data-site-exception="timeFrom"]',row).value,
      timeTo:$('[data-site-exception="timeTo"]',row).value,
      note:$('[data-site-exception="note"]',row).value.trim(),
    })).filter((item) => item.date);
    $('input[name="scheduleExceptionsJson"]', root).value = JSON.stringify(items);
  }

  function bind() {
    $("#business-hours-save")?.addEventListener("click", saveHours);
    $("#holiday-add")?.addEventListener("click", addHoliday);
    $("#holiday-type")?.addEventListener("change", updateHolidayTimeVisibility);
    $("#announcement-new")?.addEventListener("click", () => openAnnouncementEditor());
    $("#announcement-cancel")?.addEventListener("click", () => { $("#announcement-editor").hidden = true; });
    $("#announcement-save")?.addEventListener("click", saveAnnouncement);
    updateHolidayTimeVisibility();
    installAnnouncementCleanDates();
  }

  window.Green12 = { loadCalendar, loadAnnouncements, initSiteScheduleEditor, serializeSiteScheduleEditor };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind, {once:true});
  else bind();

  console.info(`[DPRO GREEN] ${VERSION} active`);
})();
