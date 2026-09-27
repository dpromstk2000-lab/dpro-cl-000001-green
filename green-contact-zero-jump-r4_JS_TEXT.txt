/* DPRO GREEN CONTACT / ZERO-JUMP BACKGROUND POLL
 * Version: DPRO-CONTACT-ZERO-JUMP-R4.1-20260927
 */
(() => {
  "use strict";

  const VERSION = "DPRO-CONTACT-ZERO-JUMP-R4.1-20260927";
  const POLL_MS = 30000;
  let timer = null;
  let button = null;
  let lastThreadId = "";

  const list = () => document.getElementById("messageList");
  const apiBase = () => String(window.DPRO_CONTACT_CONFIG?.apiBaseUrl || "").replace(/\/$/, "");
  const threadId = () => String(window.DPRO_CONTACT_UI?.getSelectedThreadId?.() || "");
  const visibleCount = () =>
    Number(window.DPRO_CONTACT_UI?.getVisibleMessageCount?.()) ||
    document.querySelectorAll("#messageList > .dc-message").length;

  function ensureButton() {
    if (button?.isConnected) return button;
    const el = list();
    if (!el) return null;

    button = document.createElement("button");
    button.type = "button";
    button.id = "dcNewMessageNotice";
    button.className = "dc-new-message-notice";
    button.hidden = true;
    button.textContent = "新しいメッセージがあります ↓";
    el.insertAdjacentElement("afterend", button);

    button.addEventListener("click", async () => {
      button.hidden = true;
      try {
        await window.DPRO_CONTACT_UI?.refresh?.({scrollMode:"bottom"});
      } finally {
        setTimeout(() => {
          const current = list();
          if (current) current.scrollTop = current.scrollHeight;
        }, 120);
      }
    });
    return button;
  }

  function showNotice(count) {
    const b = ensureButton();
    if (!b) return;
    b.textContent = count > 1
      ? `新しいメッセージが${count}件あります ↓`
      : "新しいメッセージがあります ↓";
    b.hidden = false;
  }

  function hideNotice() {
    const b = ensureButton();
    if (b) b.hidden = true;
  }

  async function accessToken() {
    try { return String(await window.DPRO_CONTACT_AUTH?.getAccessToken?.() || ""); }
    catch { return ""; }
  }

  async function poll() {
    if (document.hidden) return;

    const id = threadId();
    const el = list();
    if (!id || !el || !apiBase()) return;

    if (id !== lastThreadId) {
      lastThreadId = id;
      hideNotice();
    }

    const token = await accessToken();
    if (!token) return;

    try {
      const response = await fetch(
        `${apiBase()}/api/contact/threads/${encodeURIComponent(id)}/messages`,
        {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
          cache: "no-store"
        }
      );
      if (!response.ok) return;
      const data = await response.json().catch(() => ({}));
      const rows = Array.isArray(data.messages) ? data.messages : [];
      const newCount = Math.max(0, rows.length - visibleCount());
      if (newCount > 0) showNotice(newCount);
      else hideNotice();
    } catch {
      /* Background check is intentionally silent. */
    }
  }

  function install() {
    if (!list()) return false;
    ensureButton();
    timer = setInterval(poll, POLL_MS);

    window.addEventListener("beforeunload", () => {
      if (timer) clearInterval(timer);
      timer = null;
    }, { once: true });

    document.documentElement.dataset.dproContactZeroJump = VERSION;
    return true;
  }

  function boot() {
    if (install()) return;
    const observer = new MutationObserver(() => {
      if (install()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
