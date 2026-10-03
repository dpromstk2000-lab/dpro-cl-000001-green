(() => {
  "use strict";

  const VERSION = "GREEN-DATETIME-STANDARD-R1.0-20261003";
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

  function openNativePicker(input) {
    try {
      input.focus({ preventScroll: true });
      if (typeof input.showPicker === "function") input.showPicker();
      else input.click();
    } catch (_) {
      try { input.click(); } catch (_) {}
    }
  }

  function enhanceDateInput(input) {
    if (!input || input.dataset.dproDtStandard === VERSION) return;
    if (input.classList.contains("green-candidate-native")) return;
    if (input.closest(".dpro-dt-wrap")) return;

    ensureStep(input);

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
          openNativePicker(input);
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
    button.addEventListener("click", () => openNativePicker(input));
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
      ".dpro-dt-wrap--adopted .green-clean-date-native{pointer-events:none!important;inset:auto!important;top:0!important;left:-10000px!important;width:1px!important;min-width:1px!important;height:1px!important;min-height:1px!important}",
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
