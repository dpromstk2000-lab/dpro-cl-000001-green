/* DPRO GREEN CONTACT / HARD SCROLL LOCK + BACKGROUND NEW MESSAGE CHECK
 * Version: DPRO-CONTACT-SCROLL-LOCK-R2-20260927
 */
(() => {
  "use strict";

  const VERSION = "DPRO-CONTACT-SCROLL-LOCK-R2-20260927";
  const POLL_MS = 30000;
  const BOTTOM_TOLERANCE = 90;

  let timer = null;
  let readingHistory = false;
  let restoring = false;
  let anchorIndex = -1;
  let anchorOffset = 0;
  let lastThreadId = "";
  let button = null;
  let mutationObserver = null;
  let resizeObserver = null;
  let restoreTimers = [];

  const list = () => document.getElementById("messageList");
  const apiBase = () => String(window.DPRO_CONTACT_CONFIG?.apiBaseUrl || "").replace(/\/$/, "");
  const currentThreadId = () => String(window.DPRO_CONTACT_UI?.getSelectedThreadId?.() || "");

  function distanceFromBottom(el) {
    return Math.max(0, el.scrollHeight - el.scrollTop - el.clientHeight);
  }
  function isReading(el) {
    return Boolean(el && distanceFromBottom(el) > BOTTOM_TOLERANCE);
  }
  function messageChildren(el) {
    return [...el.children].filter((node) => node.classList?.contains("dc-message"));
  }
  function captureAnchor(el) {
    if (!el) return;
    const children = messageChildren(el);
    if (!children.length) { anchorIndex = -1; anchorOffset = 0; return; }
    const top = el.scrollTop;
    let index = children.findIndex((node) => node.offsetTop + node.offsetHeight > top + 2);
    if (index < 0) index = children.length - 1;
    anchorIndex = index;
    anchorOffset = children[index].offsetTop - top;
  }
  function restoreAnchorNow() {
    const el = list();
    if (!el || !readingHistory || anchorIndex < 0) return;
    const children = messageChildren(el);
    if (!children.length) return;
    const target = children[Math.min(anchorIndex, children.length - 1)];
    if (!target) return;
    restoring = true;
    el.scrollTop = Math.max(0, target.offsetTop - anchorOffset);
    requestAnimationFrame(() => {
      el.scrollTop = Math.max(0, target.offsetTop - anchorOffset);
      restoring = false;
    });
  }
  function scheduleRestoreBurst() {
    if (!readingHistory) return;
    restoreTimers.forEach(clearTimeout);
    restoreTimers = [0,30,90,180,360,700,1200].map((ms) => setTimeout(restoreAnchorNow, ms));
  }
  function ensureButton() {
    if (button?.isConnected) return button;
    const messageList = list();
    if (!messageList) return null;
    button = document.createElement("button");
    button.type = "button";
    button.id = "dcNewMessageNotice";
    button.className = "dc-new-message-notice";
    button.hidden = true;
    button.textContent = "新しいメッセージがあります ↓";
    messageList.insertAdjacentElement("afterend", button);
    button.addEventListener("click", async () => {
      button.hidden = true;
      readingHistory = false;
      anchorIndex = -1;
      try { await window.DPRO_CONTACT_UI?.refresh?.(); }
      finally {
        setTimeout(() => {
          const el = list();
          if (el) el.scrollTop = el.scrollHeight;
        }, 80);
      }
    });
    return button;
  }
  function showNotice(count = 0) {
    const b = ensureButton();
    if (!b) return;
    b.textContent = count > 1 ? `新しいメッセージが${count}件あります ↓` : "新しいメッセージがあります ↓";
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
  async function pollWithoutRendering() {
    if (document.hidden) return;
    const ui = window.DPRO_CONTACT_UI;
    if (!ui?.refresh) return;
    const el = list();
    const threadId = currentThreadId();
    if (!threadId || !el) { hideNotice(); return; }

    if (threadId !== lastThreadId) {
      lastThreadId = threadId;
      readingHistory = isReading(el);
      if (readingHistory) captureAnchor(el);
      hideNotice();
    }

    if (!isReading(el)) {
      readingHistory = false;
      anchorIndex = -1;
      hideNotice();
      try { await ui.refresh(); } catch {}
      return;
    }

    readingHistory = true;
    captureAnchor(el);

    const token = await accessToken();
    if (!token || !apiBase()) return;

    try {
      const response = await fetch(
        `${apiBase()}/api/contact/threads/${encodeURIComponent(threadId)}/messages`,
        { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }, cache: "no-store" }
      );
      if (!response.ok) return;
      const data = await response.json().catch(() => ({}));
      const serverMessages = Array.isArray(data.messages) ? data.messages : [];
      const visibleCount = messageChildren(el).length;
      const newCount = Math.max(0, serverMessages.length - visibleCount);
      if (newCount > 0) showNotice(newCount);
    } catch {}
  }
  function updateReadState() {
    const el = list();
    if (!el || restoring) return;
    const nowReading = isReading(el);
    if (nowReading) {
      readingHistory = true;
      captureAnchor(el);
      return;
    }
    const wasReading = readingHistory;
    readingHistory = false;
    anchorIndex = -1;
    if (wasReading && button && !button.hidden) button.click();
    else hideNotice();
  }
  function installObservers() {
    const el = list();
    if (!el) return false;

    ensureButton();
    el.addEventListener("scroll", updateReadState, { passive: true });

    ["wheel","touchstart","pointerdown"].forEach((type) => {
      el.addEventListener(type, () => {
        if (isReading(el)) {
          readingHistory = true;
          captureAnchor(el);
        }
      }, { passive: true });
    });

    mutationObserver = new MutationObserver((records) => {
      if (!readingHistory) return;
      if (records.some((r) => r.target === el || el.contains(r.target))) scheduleRestoreBurst();
    });
    mutationObserver.observe(el, { childList: true, subtree: true });

    if ("ResizeObserver" in window) {
      resizeObserver = new ResizeObserver(() => {
        if (readingHistory) scheduleRestoreBurst();
      });
      resizeObserver.observe(el);
    }

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && readingHistory) {
        const current = list();
        if (current) {
          captureAnchor(current);
          scheduleRestoreBurst();
        }
      }
    });

    timer = setInterval(pollWithoutRendering, POLL_MS);

    window.addEventListener("beforeunload", () => {
      if (timer) clearInterval(timer);
      mutationObserver?.disconnect();
      resizeObserver?.disconnect();
      restoreTimers.forEach(clearTimeout);
    }, { once: true });

    document.documentElement.dataset.dproContactScrollLock = VERSION;
    return true;
  }
  function boot() {
    if (installObservers()) return;
    const observer = new MutationObserver(() => {
      if (installObservers()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
