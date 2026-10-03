(() => {
  "use strict";

  const VERSION = "GREEN-DATETIME-STANDARD-R1.3-CUSTOM-PICKER-20261003";
  if (window.__DPRO_GREEN_DATETIME_STANDARD_R1__) return;
  window.__DPRO_GREEN_DATETIME_STANDARD_R1__ = VERSION;
  document.documentElement.dataset.greenDatetimeStandard = VERSION;

  const pad = (n) => String(n).padStart(2, "0");
  const $all = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function inferIntervalMinutes(input) {
    const explicit = Number(input.dataset.dproIntervalMinutes || 0);
    if ([5, 10, 15, 20, 30, 60].includes(explicit)) return explicit;

    const stepSeconds = Number(input.step || 0);
    if (Number.isFinite(stepSeconds) && stepSeconds >= 60 && stepSeconds % 60 === 0) {
      const stepMinutes = stepSeconds / 60;
      if ([5, 10, 15, 20, 30, 60].includes(stepMinutes)) return stepMinutes;
    }

    const key = `${input.id || ""} ${input.name || ""}`.toLowerCase();
    if (/announcement-(from|until)|announcement(from|until)/.test(key)) return 30;
    if (/plannedtime|preferredtime|opentime|closetime|timefrom|timeto/.test(key)) return 30;
    if (/nextactionat|activityat|scheduledstart|scheduledend|scheduledat/.test(key)) return 15;
    return input.type === "time" ? 30 : 15;
  }

  function formatDisplay(type, value) {
    const text = String(value || "").trim();
    if (!text) return "";
    if (type === "date") {
      const m = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      return m ? `${m[1]}/${m[2]}/${m[3]}` : text;
    }
    const m = text.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    return m ? `${m[1]}/${m[2]}/${m[3]} ${m[4]}:${m[5]}` : text;
  }

  function parseDisplay(type, value) {
    const text = String(value || "").trim();
    if (!text) return "";
    if (type === "date") {
      const m = text.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
      if (!m) return null;
      return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
    }
    const m = text.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})[ T](\d{1,2}):(\d{2})$/);
    if (!m) return null;
    return `${m[1]}-${pad(m[2])}-${pad(m[3])}T${pad(m[4])}:${m[5]}`;
  }

  function normalizeDateTimeToStep(input) {
    if (input.type !== "datetime-local" || !input.value) return;
    const interval = inferIntervalMinutes(input);
    const m = String(input.value).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (!m) return;
    const minute = Number(m[5]);
    if (minute % interval === 0) return;

    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), minute, 0, 0);
    const total = d.getHours() * 60 + d.getMinutes();
    let rounded = Math.round(total / interval) * interval;
    if (rounded >= 24 * 60) {
      d.setDate(d.getDate() + 1);
      rounded = 0;
    }
    d.setHours(Math.floor(rounded / 60), rounded % 60, 0, 0);
    input.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function ensureStep(input) {
    if (!input || !["time", "datetime-local"].includes(input.type)) return;
    if (input.step && input.step !== "any" && Number(input.step) > 0) return;
    input.step = String(inferIntervalMinutes(input) * 60);
  }

  function syncDateDisplay(input) {
    const wrapper = input.closest(".dpro-dt-wrap");
    const display = wrapper?.querySelector(".dpro-dt-display");
    if (!display) return;
    if (document.activeElement !== display) display.value = formatDisplay(input.type, input.value);
    display.setCustomValidity("");
  }

  function commitDateDisplay(input, display) {
    const parsed = parseDisplay(input.type, display.value);
    if (parsed === null) {
      display.setCustomValidity(input.type === "date" ? "YYYY/MM/DD 形式で入力してください。" : "YYYY/MM/DD HH:mm 形式で入力してください。");
      display.reportValidity();
      return false;
    }
    input.value = parsed;
    normalizeDateTimeToStep(input);
    display.value = formatDisplay(input.type, input.value);
    display.setCustomValidity("");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  function localDateValue(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function parseDateValue(value) {
    const m = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return null;
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0, 0);
  }

  function todayLocalValue() {
    return localDateValue(new Date());
  }

  function ensureFutureMin(input) {
    if (!input || input.min) return;
    const key = `${input.id || ""} ${input.name || ""}`.toLowerCase();
    if (/(preferreddate|revisitcandidateon|nextactionon)/.test(key)) {
      input.min = todayLocalValue();
    }
  }

  function openDproPicker(input) {
    if (!input) return;
    ensureFutureMin(input);

    const type = input.type || "date";
    const interval = inferIntervalMinutes(input);
    const minDate = parseDateValue(input.min);
    const maxDate = parseDateValue(input.max);

    let selected = parseDateValue(input.value) || new Date();
    selected.setHours(12, 0, 0, 0);
    if (minDate && selected < minDate) selected = new Date(minDate);
    if (maxDate && selected > maxDate) selected = new Date(maxDate);

    let viewYear = selected.getFullYear();
    let viewMonth = selected.getMonth();

    let hourValue = 9;
    let minuteValue = 0;
    if (type === "datetime-local" && input.value) {
      const m = String(input.value).match(/T(\d{2}):(\d{2})/);
      if (m) {
        hourValue = Number(m[1]);
        minuteValue = Number(m[2]);
      }
    }

    const existing = document.getElementById("dpro-datetime-standard-picker");
    if (existing) {
      try { existing.close?.(); } catch (_) {}
      existing.remove();
    }

    const dialog = document.createElement("dialog");
    dialog.id = "dpro-datetime-standard-picker";
    dialog.innerHTML = `
      <div class="dpro-picker-shell" role="dialog" aria-modal="true">
        <div class="dpro-picker-head">
          <strong>${type === "date" ? "日付を選択" : "日時を選択"}</strong>
          <button type="button" class="dpro-picker-close" aria-label="閉じる">×</button>
        </div>
        <div class="dpro-picker-month-row">
          <button type="button" class="dpro-picker-nav" data-dir="-1" aria-label="前の月">‹</button>
          <strong class="dpro-picker-month-label"></strong>
          <button type="button" class="dpro-picker-nav" data-dir="1" aria-label="次の月">›</button>
        </div>
        <div class="dpro-picker-week">
          <span>日</span><span>月</span><span>火</span><span>水</span><span>木</span><span>金</span><span>土</span>
        </div>
        <div class="dpro-picker-days"></div>
        ${type === "datetime-local" ? `
          <div class="dpro-picker-time">
            <label>時<select class="dpro-picker-hour"></select></label>
            <label>分<select class="dpro-picker-minute"></select></label>
          </div>
          <div class="dpro-picker-note">${interval}分刻みで選択します。</div>
        ` : `<div class="dpro-picker-note">日付を選択します。</div>`}
        <div class="dpro-picker-actions">
          <button type="button" class="dpro-picker-cancel">取消</button>
          <button type="button" class="dpro-picker-ok">決定</button>
        </div>
      </div>
    `;
    document.body.append(dialog);

    const days = dialog.querySelector(".dpro-picker-days");
    const label = dialog.querySelector(".dpro-picker-month-label");
    const hour = dialog.querySelector(".dpro-picker-hour");
    const minute = dialog.querySelector(".dpro-picker-minute");

    if (hour) {
      hour.innerHTML = Array.from({length:24}, (_, i) =>
        `<option value="${i}">${pad(i)}</option>`
      ).join("");
      hour.value = String(hourValue);
    }

    if (minute) {
      const minutes = [];
      for (let m = 0; m < 60; m += interval) minutes.push(m);
      if (!minutes.includes(minuteValue)) minutes.push(minuteValue);
      minutes.sort((a,b)=>a-b);
      minute.innerHTML = minutes.map((m) =>
        `<option value="${m}">${pad(m)}</option>`
      ).join("");
      minute.value = String(minuteValue);
    }

    function renderCalendar() {
      label.textContent = `${viewYear}年 ${viewMonth + 1}月`;
      days.innerHTML = "";
      const first = new Date(viewYear, viewMonth, 1, 12, 0, 0, 0);
      const startDay = first.getDay();
      const lastDay = new Date(viewYear, viewMonth + 1, 0).getDate();

      for (let i = 0; i < startDay; i++) {
        const empty = document.createElement("span");
        empty.className = "dpro-picker-empty";
        days.append(empty);
      }

      for (let day = 1; day <= lastDay; day++) {
        const date = new Date(viewYear, viewMonth, day, 12, 0, 0, 0);
        const button = document.createElement("button");
        button.type = "button";
        button.className = "dpro-picker-day";
        button.textContent = String(day);

        const value = localDateValue(date);
        if (value === localDateValue(selected)) button.classList.add("is-selected");
        if (value === todayLocalValue()) button.classList.add("is-today");

        button.disabled = Boolean(
          (minDate && date < minDate) ||
          (maxDate && date > maxDate)
        );

        button.addEventListener("click", () => {
          selected = date;
          renderCalendar();
        });
        days.append(button);
      }
    }

    dialog.querySelectorAll(".dpro-picker-nav").forEach((button) => {
      button.addEventListener("click", () => {
        viewMonth += Number(button.dataset.dir || 0);
        if (viewMonth < 0) { viewMonth = 11; viewYear -= 1; }
        if (viewMonth > 11) { viewMonth = 0; viewYear += 1; }
        renderCalendar();
      });
    });

    const close = () => {
      try { dialog.close?.(); } catch (_) {}
      dialog.remove();
    };

    dialog.querySelector(".dpro-picker-close").addEventListener("click", close);
    dialog.querySelector(".dpro-picker-cancel").addEventListener("click", close);
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      close();
    });

    dialog.querySelector(".dpro-picker-ok").addEventListener("click", () => {
      const datePart = localDateValue(selected);
      if (type === "datetime-local") {
        const hh = Number(hour?.value || 0);
        const mm = Number(minute?.value || 0);
        input.value = `${datePart}T${pad(hh)}:${pad(mm)}`;
      } else {
        input.value = datePart;
      }
      input.dispatchEvent(new Event("input", { bubbles:true }));
      input.dispatchEvent(new Event("change", { bubbles:true }));
      syncDateDisplay(input);
      close();
    });

    renderCalendar();
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function enhanceDateInput(input) {
    // Owner already has the established DPRO date/datetime UI.
    // Never add a second date/datetime wrapper in Owner.
    if (document.body?.classList.contains("owner-body")) return;
    if (!input || input.dataset.dproDtStandard === VERSION) return;
    if (input.classList.contains("green-candidate-native")) return;
    if (input.closest(".dpro-dt-wrap")) return;

    ensureStep(input);
    ensureFutureMin(input);

    // Adopt an existing GREEN clean-date wrapper instead of nesting another wrapper.
    const oldWrap = input.closest(".green-clean-date-wrap");
    if (oldWrap) {
      oldWrap.classList.add("dpro-dt-wrap", "dpro-dt-wrap--adopted");
      const oldDisplay = oldWrap.querySelector(".green-clean-date-display");
      const oldPicker = oldWrap.querySelector(".green-clean-date-picker, .green-clean-date-button");
      if (oldDisplay) {
        oldDisplay.classList.add("dpro-dt-display");
        oldDisplay.placeholder = input.type === "date" ? "YYYY/MM/DD" : "YYYY/MM/DD HH:mm";
      }
      if (oldPicker) oldPicker.classList.add("dpro-dt-button");
      input.dataset.dproDtStandard = VERSION;
      input.dataset.dproDtInterval = String(inferIntervalMinutes(input));
      if (oldDisplay) {
        oldDisplay.value = formatDisplay(input.type, input.value);
        oldDisplay.addEventListener("change", () => commitDateDisplay(input, oldDisplay));
      }
      if (oldPicker) {
        oldPicker.addEventListener("click", (event) => {
          if (oldPicker.tagName === "BUTTON") event.preventDefault();
          event.stopPropagation();
          openDproPicker(input);
        }, true);
      }
      input.addEventListener("input", () => { normalizeDateTimeToStep(input); syncDateDisplay(input); });
      input.addEventListener("change", () => { normalizeDateTimeToStep(input); syncDateDisplay(input); });
      return;
    }

    const wrapper = document.createElement("span");
    wrapper.className = "dpro-dt-wrap";
    wrapper.dataset.dproDtVersion = VERSION;

    const display = document.createElement("input");
    display.type = "text";
    display.className = "dpro-dt-display";
    display.inputMode = "numeric";
    display.autocomplete = "off";
    display.placeholder = input.type === "date" ? "YYYY/MM/DD" : "YYYY/MM/DD HH:mm";
    display.value = formatDisplay(input.type, input.value);
    display.setAttribute("aria-label", input.type === "date" ? "日付" : "日時");

    const button = document.createElement("button");
    button.type = "button";
    button.className = "dpro-dt-button";
    button.setAttribute("aria-label", input.type === "date" ? "日付をカレンダーから選択" : "日時をカレンダーから選択");
    button.title = button.getAttribute("aria-label");
    button.textContent = "📅";

    input.dataset.dproDtStandard = VERSION;
    input.dataset.dproDtInterval = String(inferIntervalMinutes(input));
    input.classList.add("dpro-dt-native");
    input.tabIndex = -1;

    input.parentNode.insertBefore(wrapper, input);
    wrapper.append(display, button, input);

    display.addEventListener("change", () => commitDateDisplay(input, display));
    display.addEventListener("blur", () => {
      if (!display.value.trim()) {
        input.value = "";
        display.setCustomValidity("");
        input.dispatchEvent(new Event("change", { bubbles: true }));
        return;
      }
      commitDateDisplay(input, display);
    });
    button.addEventListener("click", () => openDproPicker(input));
    input.addEventListener("input", () => { normalizeDateTimeToStep(input); syncDateDisplay(input); });
    input.addEventListener("change", () => { normalizeDateTimeToStep(input); syncDateDisplay(input); });
    input.addEventListener("invalid", (event) => {
      event.preventDefault();
      display.focus();
      display.setCustomValidity(input.validationMessage || "入力内容を確認してください。");
      display.reportValidity();
    });
  }

  function timeOptions(interval, currentValue) {
    const values = [];
    for (let total = 0; total < 24 * 60; total += interval) {
      values.push(`${pad(Math.floor(total / 60))}:${pad(total % 60)}`);
    }
    if (currentValue && !values.includes(currentValue)) values.push(currentValue);
    return values.sort();
  }

  function enhanceTimeInput(input) {
    if (!input || input.dataset.dproDtStandard === VERSION) return;
    if (input.closest(".dpro-time-wrap")) return;
    ensureStep(input);

    const interval = inferIntervalMinutes(input);
    const wrapper = document.createElement("span");
    wrapper.className = "dpro-time-wrap";
    wrapper.dataset.dproDtVersion = VERSION;

    const select = document.createElement("select");
    select.className = "dpro-time-select";
    select.setAttribute("aria-label", input.getAttribute("aria-label") || input.name || "時刻");

    const blank = document.createElement("option");
    blank.value = "";
    blank.textContent = "選択してください";
    select.append(blank);

    for (const value of timeOptions(interval, input.value)) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.append(option);
    }
    select.value = input.value || "";

    const note = document.createElement("small");
    note.className = "dpro-time-note";
    note.textContent = `${interval}分単位`;

    input.dataset.dproDtStandard = VERSION;
    input.dataset.dproDtInterval = String(interval);
    input.classList.add("dpro-time-native");
    input.tabIndex = -1;

    input.parentNode.insertBefore(wrapper, input);
    wrapper.append(select, note, input);

    select.addEventListener("change", () => {
      input.value = select.value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    input.addEventListener("input", () => { if (select.value !== input.value) select.value = input.value || ""; });
    input.addEventListener("change", () => { if (select.value !== input.value) select.value = input.value || ""; });
    input.addEventListener("invalid", (event) => {
      event.preventDefault();
      select.focus();
      select.setCustomValidity(input.validationMessage || "時刻を選択してください。");
      select.reportValidity();
      select.setCustomValidity("");
    });
  }

  function cleanupOwnerDateDuplicates(root = document) {
    if (!document.body?.classList.contains("owner-body")) return;

    const labels = $all("#owner-dialog label", root);
    for (const label of labels) {
      const directChildren = Array.from(label.children || []);
      const standardWraps = directChildren.filter((node) =>
        node.classList?.contains("dpro-dt-wrap")
      );
      if (!standardWraps.length) continue;

      // R1.1のDPRO標準UIを1つだけ残す。
      const keep = standardWraps[standardWraps.length - 1];

      for (const node of directChildren) {
        if (node === keep) continue;

        const isLegacyWrap =
          node.classList?.contains("green-clean-date-wrap") ||
          node.classList?.contains("green-clean-datetime-wrap");

        const isRawDateInput =
          node.matches?.('input[type="date"],input[type="datetime-local"]');

        if (isLegacyWrap || isRawDateInput) {
          node.hidden = true;
          node.setAttribute("aria-hidden", "true");
          node.dataset.dproDatetimeDuplicateHidden = VERSION;
        }
      }
    }
  }

  function installStyles() {
    if (document.getElementById("dpro-datetime-standard-r1-style")) return;
    const style = document.createElement("style");
    style.id = "dpro-datetime-standard-r1-style";
    style.textContent = [
      ".dpro-dt-wrap{display:grid;grid-template-columns:minmax(0,1fr)48px;gap:8px;align-items:stretch;width:100%;min-width:0;position:relative}",
      ".dpro-dt-display,.dpro-time-select{width:100%;min-width:0;min-height:46px;box-sizing:border-box;border:1px solid #cbd7ce;border-radius:12px;background:#fff;color:#173d2f;padding:10px 12px;font:inherit;font-weight:750}",
      ".dpro-dt-display:focus,.dpro-time-select:focus{outline:3px solid rgba(31,122,83,.16);outline-offset:1px;border-color:#65a484}",
      ".dpro-dt-button{width:48px;min-width:48px;min-height:46px;border:1px solid #cbd7ce;border-radius:12px;background:#fff;display:grid;place-items:center;cursor:pointer;font-size:20px;line-height:1}",
      ".dpro-dt-button:hover{background:#f3f8f5}",
      ".dpro-dt-native{position:absolute!important;left:-10000px!important;width:1px!important;height:1px!important;opacity:0!important;pointer-events:none!important}",
      ".dpro-time-wrap{display:grid;grid-template-columns:minmax(0,1fr)auto;gap:8px;align-items:center;width:100%;min-width:0}",
      ".dpro-time-note{white-space:nowrap;color:#6a7c72;font-size:11px;font-weight:800}",
      ".dpro-time-native{position:absolute!important;left:-10000px!important;width:1px!important;height:1px!important;opacity:0!important;pointer-events:none!important}",
      "#dpro-datetime-standard-picker{border:0;padding:0;background:transparent;max-width:none;max-height:none}",
      "#dpro-datetime-standard-picker::backdrop{background:rgba(20,38,31,.42)}",
      "#dpro-datetime-standard-picker .dpro-picker-shell{width:min(520px,calc(100vw - 28px));box-sizing:border-box;background:#fff;border:1px solid #d5e0d9;border-radius:22px;padding:18px;box-shadow:0 24px 70px rgba(18,56,45,.22);color:#173d2f}",
      "#dpro-datetime-standard-picker .dpro-picker-head,#dpro-datetime-standard-picker .dpro-picker-month-row{display:flex;align-items:center;justify-content:space-between;gap:12px}",
      "#dpro-datetime-standard-picker .dpro-picker-head strong{font-size:20px}",
      "#dpro-datetime-standard-picker .dpro-picker-close,#dpro-datetime-standard-picker .dpro-picker-nav{width:48px;height:48px;border:1px solid #d0ddd5;border-radius:12px;background:#fff;font:inherit;font-weight:900;cursor:pointer}",
      "#dpro-datetime-standard-picker .dpro-picker-month-row{margin:14px 0 10px}",
      "#dpro-datetime-standard-picker .dpro-picker-month-label{font-size:20px}",
      "#dpro-datetime-standard-picker .dpro-picker-week,#dpro-datetime-standard-picker .dpro-picker-days{display:grid;grid-template-columns:repeat(7,1fr);gap:7px}",
      "#dpro-datetime-standard-picker .dpro-picker-week{margin-bottom:7px;color:#6a7c72;font-size:12px;font-weight:900;text-align:center}",
      "#dpro-datetime-standard-picker .dpro-picker-day{min-height:46px;border:1px solid #d5e0d9;border-radius:11px;background:#fff;color:#173d2f;font:inherit;font-weight:900;cursor:pointer}",
      "#dpro-datetime-standard-picker .dpro-picker-day.is-selected{background:#174c35;color:#fff;border-color:#174c35}",
      "#dpro-datetime-standard-picker .dpro-picker-day.is-today:not(.is-selected){box-shadow:0 0 0 2px #d4b255 inset}",
      "#dpro-datetime-standard-picker .dpro-picker-day:disabled{opacity:.25;cursor:not-allowed;background:#f5f7f5}",
      "#dpro-datetime-standard-picker .dpro-picker-empty{min-height:46px}",
      "#dpro-datetime-standard-picker .dpro-picker-time{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px}",
      "#dpro-datetime-standard-picker .dpro-picker-time label{font-weight:900}",
      "#dpro-datetime-standard-picker .dpro-picker-time select{width:100%;min-height:50px;margin-top:6px;border:1px solid #cbd7ce;border-radius:12px;background:#fff;padding:0 12px;font:inherit;font-weight:800}",
      "#dpro-datetime-standard-picker .dpro-picker-note{margin:12px 0 0;padding:10px 12px;border-radius:11px;background:#f2f7f4;color:#65776d;font-size:12px}",
      "#dpro-datetime-standard-picker .dpro-picker-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:14px;padding-top:14px;border-top:1px solid #e0e8e3}",
      "#dpro-datetime-standard-picker .dpro-picker-actions button{min-height:46px;padding:0 18px;border:1px solid #cbd7ce;border-radius:12px;background:#fff;font:inherit;font-weight:900;cursor:pointer}",
      "#dpro-datetime-standard-picker .dpro-picker-actions .dpro-picker-ok{background:#174c35;color:#fff;border-color:#174c35}",
      ".dpro-dt-wrap--adopted .green-clean-date-native{pointer-events:none!important;inset:auto!important;top:0!important;left:-10000px!important;width:1px!important;min-width:1px!important;height:1px!important;min-height:1px!important}",
      ".owner-body #owner-dialog label>.green-clean-date-wrap[aria-hidden=\"true\"],.owner-body #owner-dialog label>.green-clean-datetime-wrap[aria-hidden=\"true\"],.owner-body #owner-dialog label>input[data-dpro-datetime-duplicate-hidden]{display:none!important}",
      "@media(max-width:620px){.dpro-dt-wrap{grid-template-columns:minmax(0,1fr)46px}.dpro-dt-display,.dpro-time-select{min-height:50px;font-size:16px}.dpro-dt-button{width:46px;min-width:46px;min-height:50px}.dpro-time-wrap{grid-template-columns:1fr}.dpro-time-note{margin-top:-3px}}"
    ].join("");
    document.head.append(style);
  }

  function scan(root = document) {
    installStyles();
    $all('input[type="date"],input[type="datetime-local"]', root).forEach(enhanceDateInput);
    $all('input[type="time"]', root).forEach(enhanceTimeInput);
  }

  function start() {
    scan(document);
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes || []) {
          if (!(node instanceof Element)) continue;
          if (node.matches?.('input[type="date"],input[type="datetime-local"],input[type="time"]')) scan(node.parentElement || node);
          else if (node.querySelector?.('input[type="date"],input[type="datetime-local"],input[type="time"]')) scan(node);
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.setTimeout(() => scan(document), 100);
    window.setTimeout(() => scan(document), 500);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
