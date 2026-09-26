(() => {
  "use strict";

  const VERSION = "GREEN-OWNER-JST-DATETIME-FIX-R1.4-20260916";
  const REPLACEMENT_CANDIDATE_FIX_VERSION = "GREEN-REPLACEMENT-CANDIDATE-FIX-R1.1-20260916";
  const DATE_DISPLAY_FIX_VERSION = "GREEN-DATE-DISPLAY-FIX-R1.0-20260916";
  if (!/\/owner\.html$/.test(location.pathname)) return;
  if (typeof window.fetch !== "function") return;

  document.documentElement.dataset.greenOwnerJstDatetimeFix = VERSION;

  function installReplacementCandidateFix() {
    if (document.querySelector('script[data-green-replacement-candidate-fix]')) return;
    const script = document.createElement("script");
    script.src = `green-replacement-candidate-fix.js?v=${encodeURIComponent(REPLACEMENT_CANDIDATE_FIX_VERSION)}`;
    script.defer = true;
    script.dataset.greenReplacementCandidateFix = REPLACEMENT_CANDIDATE_FIX_VERSION;
    document.head.append(script);
  }

  installReplacementCandidateFix();

  const originalFetch = window.fetch.bind(window);
  let lastReplacementScheduledAt = "";

  function withTokyoOffset(value) {
    if (!value || typeof value !== "string") return value;
    const text = value.trim();
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(text)) return value;
    return `${text.length === 16 ? `${text}:00` : text}+09:00`;
  }

  function tokyoInputValue(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      })
        .formatToParts(date)
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, part.value])
    );

    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
  }

  function replacementPath(urlLike) {
    try {
      return new URL(String(urlLike), location.href).pathname;
    } catch {
      return "";
    }
  }

  function isReplacementApiPath(path) {
    return /^\/api\/admin\/replacements(?:\/|$)/.test(path);
  }

  function isReplacementDetailPath(path) {
    return /^\/api\/admin\/replacements\/[0-9a-f-]{36}$/i.test(path);
  }

  function patchJsonBody(body) {
    if (typeof body !== "string" || !body.trim().startsWith("{")) return body;

    let json;
    try {
      json = JSON.parse(body);
    } catch {
      return body;
    }

    let changed = false;

    if (typeof json.scheduledAt === "string") {
      const next = withTokyoOffset(json.scheduledAt);
      if (next !== json.scheduledAt) {
        json.scheduledAt = next;
        changed = true;
      }
    }

    if (typeof json.scheduled_at === "string") {
      const next = withTokyoOffset(json.scheduled_at);
      if (next !== json.scheduled_at) {
        json.scheduled_at = next;
        changed = true;
      }
    }

    return changed ? JSON.stringify(json) : body;
  }

  function applyReplacementInputFix() {
    const dialog = document.querySelector("#owner-dialog");
    if (!dialog || !dialog.open || !lastReplacementScheduledAt) return;

    const form =
      dialog.querySelector("#replacement-edit-form") ||
      dialog.querySelector("#replacement-approve-form");

    if (!form) return;

    const input = form.querySelector('input[name="scheduledAt"]');
    if (!input) return;

    const corrected = tokyoInputValue(lastReplacementScheduledAt);
    if (!corrected) return;

    input.value = corrected;
    input.step = "900";
    input.dataset.greenJstFixed = VERSION;
    input.title = "日本時間（Asia/Tokyo）で入力します。";
  }

  function ensureCleanDateStyles() {
    if (document.querySelector(`style[data-green-date-display-fix="${DATE_DISPLAY_FIX_VERSION}"]`)) return;
    const style = document.createElement("style");
    style.dataset.greenDateDisplayFix = DATE_DISPLAY_FIX_VERSION;
    style.textContent = `
      #owner-dialog .green-clean-date-wrap {
        display:grid;
        grid-template-columns:minmax(0,1fr) 46px;
        gap:8px;
        align-items:stretch;
        width:100%;
        position:relative;
      }
      #owner-dialog .green-clean-date-display {
        width:100%;
        min-width:0;
      }
      #owner-dialog .green-clean-date-button {
        min-width:46px;
        min-height:46px;
        padding:0;
        border:1px solid var(--line);
        border-radius:12px;
        background:#fff;
        color:var(--ink);
        font:inherit;
        font-size:20px;
        cursor:pointer;
      }
      #owner-dialog .green-clean-date-button:hover {
        background:#f7faf7;
      }
      #owner-dialog .green-clean-date-native {
        position:absolute !important;
        left:-10000px !important;
        top:auto !important;
        width:1px !important;
        min-width:1px !important;
        height:1px !important;
        min-height:1px !important;
        padding:0 !important;
        margin:0 !important;
        opacity:0 !important;
        pointer-events:none !important;
      }
    `;
    document.head.append(style);
  }

  function cleanDisplayValue(type, value) {
    const text = String(value || "");
    if (!text) return "";
    if (type === "datetime-local") {
      const match = text.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
      return match ? `${match[1]}/${match[2]}/${match[3]} ${match[4]}:${match[5]}` : text;
    }
    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? `${match[1]}/${match[2]}/${match[3]}` : text;
  }

  function parseCleanDisplay(type, value) {
    const text = String(value || "").trim();
    if (!text) return "";
    if (type === "datetime-local") {
      const match = text.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})[ T](\d{1,2}):(\d{2})$/);
      if (!match) return null;
      return `${match[1]}-${String(match[2]).padStart(2, "0")}-${String(match[3]).padStart(2, "0")}T${String(match[4]).padStart(2, "0")}:${match[5]}`;
    }
    const match = text.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
    if (!match) return null;
    return `${match[1]}-${String(match[2]).padStart(2, "0")}-${String(match[3]).padStart(2, "0")}`;
  }

  function syncCleanDateField(input) {
    const wrapper = input.closest(".green-clean-date-wrap");
    const display = wrapper?.querySelector(".green-clean-date-display");
    if (!display) return;
    const type = input.dataset.greenOriginalDateType || "date";
    const next = cleanDisplayValue(type, input.value);
    if (document.activeElement !== display && display.value !== next) display.value = next;
    display.setCustomValidity("");
  }

  function commitCleanDateDisplay(input, display) {
    const type = input.dataset.greenOriginalDateType || "date";
    const parsed = parseCleanDisplay(type, display.value);
    if (parsed === null) {
      input.value = "";
      display.setCustomValidity(type === "datetime-local" ? "YYYY/MM/DD HH:mm 形式で入力してください。" : "YYYY/MM/DD 形式で入力してください。");
      return false;
    }
    input.value = parsed;
    display.value = cleanDisplayValue(type, parsed);
    display.setCustomValidity("");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  function installCleanDateField(input) {
    if (!input || input.dataset.greenCleanDateFixed === DATE_DISPLAY_FIX_VERSION) {
      if (input) syncCleanDateField(input);
      return;
    }
    if (!input.matches('input[type="date"], input[type="datetime-local"]')) return;

    const type = input.type;
    const wrapper = document.createElement("span");
    wrapper.className = "green-clean-date-wrap";
    wrapper.dataset.greenCleanDateWrap = DATE_DISPLAY_FIX_VERSION;

    const display = document.createElement("input");
    display.type = "text";
    display.className = "green-clean-date-display";
    display.inputMode = "numeric";
    display.autocomplete = "off";
    display.placeholder = type === "datetime-local" ? "YYYY/MM/DD HH:mm" : "YYYY/MM/DD";
    display.value = cleanDisplayValue(type, input.value);
    display.setAttribute("aria-label", type === "datetime-local" ? "日時" : "日付");

    const button = document.createElement("button");
    button.type = "button";
    button.className = "green-clean-date-button";
    button.setAttribute("aria-label", type === "datetime-local" ? "日時をカレンダーから選択" : "日付をカレンダーから選択");
    button.title = button.getAttribute("aria-label");
    button.textContent = "📅";

    input.dataset.greenOriginalDateType = type;
    input.dataset.greenCleanDateFixed = DATE_DISPLAY_FIX_VERSION;
    input.classList.add("green-clean-date-native");
    input.tabIndex = -1;

    input.parentNode.insertBefore(wrapper, input);
    wrapper.append(display, button, input);

    display.addEventListener("input", () => {
      const parsed = parseCleanDisplay(type, display.value);
      if (parsed === "") {
        input.value = "";
        display.setCustomValidity("");
      } else if (parsed) {
        input.value = parsed;
        display.setCustomValidity("");
      } else {
        input.value = "";
      }
    });
    display.addEventListener("change", () => commitCleanDateDisplay(input, display));
    display.addEventListener("blur", () => {
      if (display.value.trim()) commitCleanDateDisplay(input, display);
      else display.setCustomValidity("");
    });
    input.addEventListener("input", () => syncCleanDateField(input));
    input.addEventListener("change", () => syncCleanDateField(input));
    button.addEventListener("click", () => {
      try {
        if (typeof input.showPicker === "function") input.showPicker();
        else input.click();
      } catch {
        input.click();
      }
    });
  }

  function applyCleanDateDisplayFix() {
    const dialog = document.querySelector("#owner-dialog");
    if (!dialog || !dialog.open) return;
    ensureCleanDateStyles();
    dialog.querySelectorAll('input[type="date"], input[type="datetime-local"]').forEach(installCleanDateField);
    dialog.querySelectorAll("input.green-clean-date-native").forEach(syncCleanDateField);
  }

  function scheduleCleanDateSync() {
    [0, 50, 150, 400].forEach((delay) => setTimeout(applyCleanDateDisplayFix, delay));
  }

  function applyOwnerDialogFixes() {
    applyReplacementInputFix();
    applyCleanDateDisplayFix();
  }

  window.fetch = async function greenJstFetch(input, init = undefined) {
    const url = typeof input === "string" ? input : input?.url;
    const path = replacementPath(url);
    let nextInit = init;

    if (isReplacementApiPath(path) && init && typeof init === "object") {
      const patchedBody = patchJsonBody(init.body);
      if (patchedBody !== init.body) {
        nextInit = { ...init, body: patchedBody };
      }
    }

    const response = await originalFetch(input, nextInit);

    const method = String(nextInit?.method || "GET").toUpperCase();
    if (method === "GET" && isReplacementDetailPath(path)) {
      response.clone().json().then((payload) => {
        lastReplacementScheduledAt = payload?.data?.request?.scheduled_at || "";
        queueMicrotask(applyOwnerDialogFixes);
        setTimeout(applyOwnerDialogFixes, 0);
        setTimeout(applyOwnerDialogFixes, 50);
        setTimeout(applyOwnerDialogFixes, 150);
      }).catch(() => {});
    }

    return response;
  };

  const dialog = document.querySelector("#owner-dialog");
  if (dialog) {
    const observer = new MutationObserver(() => {
      applyOwnerDialogFixes();
      scheduleCleanDateSync();
    });
    observer.observe(dialog, { childList: true, subtree: true });
  }

  applyOwnerDialogFixes();
  scheduleCleanDateSync();

  console.info(`[DPRO GREEN] ${VERSION} active`);
})();
