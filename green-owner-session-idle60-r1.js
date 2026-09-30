(() => {
  "use strict";

  const VERSION = "GREEN-OWNER-SESSION-IDLE60-R1.0-20260930";
  if (window.__DPRO_GREEN_OWNER_SESSION_IDLE60_R1__) return;
  window.__DPRO_GREEN_OWNER_SESSION_IDLE60_R1__ = VERSION;

  const IDLE_MS = 60 * 60 * 1000;
  const WARNING_MS = 55 * 60 * 1000;
  const REFRESH_THROTTLE_MS = 5 * 60 * 1000;
  const DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000;
  const ACTIVITY_KEY = "green_owner_last_activity_r1";
  const REFRESH_KEY = "green_owner_last_refresh_r1";
  const DRAFT_PREFIX = "green_owner_draft_r1:";

  let lastActivity = Number(sessionStorage.getItem(ACTIVITY_KEY) || Date.now());
  let lastRefresh = Number(sessionStorage.getItem(REFRESH_KEY) || 0);
  let refreshInFlight = null;
  let warningShown = false;
  let saveTimer = 0;

  function now() { return Date.now(); }

  function markActivity() {
    lastActivity = now();
    sessionStorage.setItem(ACTIVITY_KEY, String(lastActivity));
    warningShown = false;
    queueRefresh();
  }

  function formKey(form) {
    if (!form) return null;
    const id = form.id || "anonymous-form";
    const kicker = document.querySelector("#dialog-kicker")?.textContent?.trim() || "";
    const title = document.querySelector("#dialog-title")?.textContent?.trim() || "";
    return `${DRAFT_PREFIX}${location.pathname}:${id}:${kicker}:${title}`;
  }

  function safeField(field) {
    if (!field || field.disabled) return false;
    const type = String(field.type || "").toLowerCase();
    if (["password", "file", "submit", "button", "reset"].includes(type)) return false;
    const name = field.name || field.id || "";
    if (!name) return false;
    if (/code|password|secret|token|csrf/i.test(name)) return false;
    return true;
  }

  function serializeForm(form) {
    const fields = {};
    form.querySelectorAll("input,select,textarea").forEach((field) => {
      if (!safeField(field)) return;
      const key = field.name || field.id;
      if (field.type === "checkbox" || field.type === "radio") {
        fields[key] ??= [];
        fields[key].push({ value: field.value, checked: field.checked, type: field.type });
        return;
      }
      if (field.multiple) {
        fields[key] = Array.from(field.selectedOptions).map((o) => o.value);
        return;
      }
      fields[key] = field.value;
    });
    return { savedAt: now(), fields };
  }

  function saveFormDraft(form) {
    const key = formKey(form);
    if (!key) return;
    try {
      sessionStorage.setItem(key, JSON.stringify(serializeForm(form)));
      form.dataset.greenDraftSaved = VERSION;
    } catch {}
  }

  function queueDraftSave(target) {
    const form = target?.closest?.("form");
    if (!form) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveFormDraft(form), 180);
  }

  function restoreFormDraft(form) {
    const key = formKey(form);
    if (!key || form.dataset.greenDraftRestored === VERSION) return;
    let draft = null;
    try { draft = JSON.parse(sessionStorage.getItem(key) || "null"); } catch {}
    if (!draft?.savedAt || now() - draft.savedAt > DRAFT_MAX_AGE_MS) {
      try { sessionStorage.removeItem(key); } catch {}
      form.dataset.greenDraftRestored = VERSION;
      return;
    }

    let restored = 0;
    form.querySelectorAll("input,select,textarea").forEach((field) => {
      if (!safeField(field)) return;
      const keyName = field.name || field.id;
      if (!(keyName in draft.fields)) return;
      const value = draft.fields[keyName];

      if (field.type === "checkbox" || field.type === "radio") {
        const entries = Array.isArray(value) ? value : [];
        const match = entries.find((x) => String(x.value) === String(field.value) && x.type === field.type);
        if (match) {
          field.checked = Boolean(match.checked);
          restored++;
        }
        return;
      }

      if (field.multiple && Array.isArray(value)) {
        Array.from(field.options).forEach((o) => { o.selected = value.includes(o.value); });
        restored++;
        return;
      }

      if (typeof value === "string") {
        field.value = value;
        restored++;
      }
    });

    form.dataset.greenDraftRestored = VERSION;
    if (restored > 0 && !form.querySelector(".green-draft-restore-note")) {
      const note = document.createElement("div");
      note.className = "green-draft-restore-note";
      note.style.cssText = "grid-column:1/-1;padding:10px 12px;border:1px solid #cfe2d4;border-radius:10px;background:#f2faf4;color:#174b35;font-weight:800;margin-bottom:4px";
      note.textContent = "✓ 入力途中の内容を復元しました。";
      form.prepend(note);
    }
  }

  function clearCurrentDraft() {
    const form = document.querySelector("#owner-dialog form");
    const key = formKey(form);
    if (!key) return;
    try { sessionStorage.removeItem(key); } catch {}
  }

  async function refreshSession() {
    if (refreshInFlight) return refreshInFlight;
    if (!window.Green?.api || !window.Green?.setSessionToken) return null;

    refreshInFlight = (async () => {
      try {
        const result = await window.Green.api("/api/admin/session");
        const data = result?.data || {};
        if (data.sessionToken) window.Green.setSessionToken("admin", data.sessionToken);
        if (data.csrfToken) window.Green.setCsrfToken(data.csrfToken);
        lastRefresh = now();
        sessionStorage.setItem(REFRESH_KEY, String(lastRefresh));

        const expiry = document.querySelector("#session-expiry");
        if (expiry && data.expiresAt) {
          const d = new Date(data.expiresAt);
          expiry.textContent = Number.isNaN(d.getTime())
            ? "操作中｜自動延長"
            : `操作中｜無操作60分でログアウト（更新 ${d.toLocaleTimeString("ja-JP",{hour:"2-digit",minute:"2-digit"})}）`;
        }
        return result;
      } catch (error) {
        if (["session_expired","session_required","invalid_session"].includes(error?.code)) {
          document.querySelectorAll("#owner-dialog form").forEach(saveFormDraft);
          window.Green?.toast?.("ログイン期限が切れました。入力内容はこのタブに保存しています。再ログイン後に復元できます。","error");
        }
        return null;
      } finally {
        refreshInFlight = null;
      }
    })();

    return refreshInFlight;
  }

  function queueRefresh() {
    const elapsed = now() - lastRefresh;
    if (elapsed < REFRESH_THROTTLE_MS) return;
    setTimeout(() => {
      if (now() - lastActivity < IDLE_MS) refreshSession();
    }, 250);
  }

  function idleTick() {
    const idleFor = now() - lastActivity;
    const expiry = document.querySelector("#session-expiry");

    if (idleFor >= IDLE_MS) {
      if (expiry) expiry.textContent = "無操作60分｜次の操作で再ログインが必要です";
      return;
    }

    if (idleFor >= WARNING_MS) {
      if (!warningShown) {
        warningShown = true;
        window.Green?.toast?.("まもなく無操作60分です。操作すると自動でログイン時間を延長します。","info");
      }
      if (expiry) {
        const remain = Math.max(1, Math.ceil((IDLE_MS - idleFor) / 60000));
        expiry.textContent = `無操作 ${Math.floor(idleFor/60000)}分｜あと約${remain}分`;
      }
      return;
    }

    if (now() - lastRefresh >= REFRESH_THROTTLE_MS && idleFor < 10 * 60 * 1000) {
      refreshSession();
    }
  }

  function observeForms() {
    const scan = () => document.querySelectorAll("#owner-dialog form").forEach((form) => setTimeout(() => restoreFormDraft(form), 60));
    new MutationObserver(scan).observe(document.body, { childList:true, subtree:true });
    scan();
  }

  document.addEventListener("input", (e) => { markActivity(); queueDraftSave(e.target); }, true);
  document.addEventListener("change", (e) => { markActivity(); queueDraftSave(e.target); }, true);
  document.addEventListener("pointerdown", markActivity, true);
  document.addEventListener("keydown", markActivity, true);
  document.addEventListener("touchstart", markActivity, { capture:true, passive:true });

  // Clear a draft only after a success/result screen replaces the editing form.
  new MutationObserver(() => {
    const kicker = document.querySelector("#dialog-kicker")?.textContent?.trim() || "";
    if (/^(REGISTERED|SAVED)$/i.test(kicker)) {
      // Remove all drafts whose form no longer exists in the dialog.
      try {
        for (let i = sessionStorage.length - 1; i >= 0; i--) {
          const key = sessionStorage.key(i);
          if (key?.startsWith(DRAFT_PREFIX)) sessionStorage.removeItem(key);
        }
      } catch {}
    }
  }).observe(document.getElementById("owner-dialog") || document.body, { childList:true, subtree:true });

  observeForms();
  setInterval(idleTick, 60 * 1000);

  // Initial refresh after the app has had time to restore/login.
  setTimeout(() => {
    lastActivity = now();
    sessionStorage.setItem(ACTIVITY_KEY, String(lastActivity));
    refreshSession();
  }, 1800);
})();