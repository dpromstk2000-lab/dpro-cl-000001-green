/* DPRO GREEN CONTACT / NO-REBUILD SMART POLL + HARD POSITION LOCK
 * Version: DPRO-CONTACT-SCROLL-LOCK-R3-20260927
 *
 * Key rule:
 * - Poll every 30s, but NEVER rebuild the visible conversation when nothing changed.
 * - If a new message arrives at the newest position, refresh once and pin to bottom.
 * - If a new message arrives while reading old history, do not rebuild; show notice.
 */
(() => {
  "use strict";

  const VERSION = "DPRO-CONTACT-SCROLL-LOCK-R3-20260927";
  const POLL_MS = 30000;
  const BOTTOM_TOLERANCE = 90;

  let timer = null;
  let readingHistory = false;
  let lastThreadId = "";
  let button = null;
  let userInteractingUntil = 0;
  let lockedIndex = -1;
  let lockedOffset = 0;
  let guardTimer = null;

  const list = () => document.getElementById("messageList");
  const apiBase = () => String(window.DPRO_CONTACT_CONFIG?.apiBaseUrl || "").replace(/\/$/, "");
  const currentThreadId = () => String(window.DPRO_CONTACT_UI?.getSelectedThreadId?.() || "");
  const messages = (el) => [...(el?.children || [])].filter((n) => n.classList?.contains("dc-message"));

  function distanceFromBottom(el) {
    return Math.max(0, el.scrollHeight - el.scrollTop - el.clientHeight);
  }

  function isReading(el) {
    return Boolean(el && distanceFromBottom(el) > BOTTOM_TOLERANCE);
  }

  function setReading(value) {
    readingHistory = Boolean(value);
    window.__DPRO_CONTACT_READING_HISTORY__ = readingHistory;
  }

  function markUserInteraction() {
    userInteractingUntil = Date.now() + 500;
  }

  function captureLock(el) {
    if (!el) return;
    const rows = messages(el);
    if (!rows.length) {
      lockedIndex = -1;
      lockedOffset = 0;
      return;
    }
    const top = el.scrollTop;
    let index = rows.findIndex((node) => node.offsetTop + node.offsetHeight > top + 2);
    if (index < 0) index = rows.length - 1;
    lockedIndex = index;
    lockedOffset = rows[index].offsetTop - top;
  }

  function restoreLock() {
    if (!readingHistory || Date.now() < userInteractingUntil) return;
    const el = list();
    const rows = messages(el);
    if (!el || lockedIndex < 0 || !rows.length) return;
    const target = rows[Math.min(lockedIndex, rows.length - 1)];
    if (!target) return;
    const desired = Math.max(0, target.offsetTop - lockedOffset);
    if (Math.abs(el.scrollTop - desired) > 1) el.scrollTop = desired;
  }

  function pinBottomBurst() {
    [0,40,120,260,500,900,1500].forEach((ms) => {
      setTimeout(() => {
        if (readingHistory) return;
        const el = list();
        if (el) el.scrollTop = el.scrollHeight;
      }, ms);
    });
  }

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
      setReading(false);
      lockedIndex = -1;
      try { await window.DPRO_CONTACT_UI?.refresh?.(); }
      finally { pinBottomBurst(); }
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

  async function fetchServerMessages(threadId) {
    const token = await accessToken();
    if (!token || !apiBase()) return null;

    const response = await fetch(
      `${apiBase()}/api/contact/threads/${encodeURIComponent(threadId)}/messages`,
      {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        cache: "no-store"
      }
    );
    if (!response.ok) return null;
    const data = await response.json().catch(() => ({}));
    return Array.isArray(data.messages) ? data.messages : null;
  }

  async function smartPoll() {
    if (document.hidden) return;

    const ui = window.DPRO_CONTACT_UI;
    const el = list();
    const threadId = currentThreadId();
    if (!ui?.refresh || !el || !threadId) return;

    if (threadId !== lastThreadId) {
      lastThreadId = threadId;
      setReading(isReading(el));
      if (readingHistory) captureLock(el);
      hideNotice();
    }

    const serverMessages = await fetchServerMessages(threadId);
    if (!serverMessages) return;

    const visibleCount = messages(el).length;
    const newCount = Math.max(0, serverMessages.length - visibleCount);

    /* Most important R3.10.3 rule:
       no new message = no DOM rebuild = no spontaneous scroll movement. */
    if (newCount <= 0) {
      if (readingHistory) restoreLock();
      return;
    }

    if (isReading(el) || readingHistory) {
      setReading(true);
      captureLock(el);
      showNotice(newCount);
      return;
    }

    /* User is already at newest position and actual new data exists.
       Refresh once, then keep the viewport pinned to the newest message,
       including delayed image/layout growth. */
    setReading(false);
    hideNotice();
    try { await ui.refresh(); }
    catch {}
    pinBottomBurst();
  }

  function onScroll() {
    const el = list();
    if (!el) return;

    const nowReading = isReading(el);
    if (nowReading) {
      setReading(true);
      captureLock(el);
      return;
    }

    const wasReading = readingHistory;
    setReading(false);
    lockedIndex = -1;

    if (wasReading && button && !button.hidden) button.click();
    else hideNotice();
  }

  function install() {
    const el = list();
    if (!el) return false;

    ensureButton();

    ["wheel","touchstart","pointerdown","keydown"].forEach((type) => {
      el.addEventListener(type, markUserInteraction, { passive: type !== "keydown" });
    });
    el.addEventListener("scroll", onScroll, { passive: true });

    /* Attachment images can finish loading long after the message DOM exists.
       Re-lock the same message after those layout changes. */
    el.addEventListener("load", () => {
      if (readingHistory) setTimeout(restoreLock, 0);
      else if (distanceFromBottom(el) < BOTTOM_TOLERANCE * 2) pinBottomBurst();
    }, true);

    const mutationObserver = new MutationObserver(() => {
      if (readingHistory) {
        [0,40,120,300,700].forEach((ms) => setTimeout(restoreLock, ms));
      }
    });
    mutationObserver.observe(el, { childList: true, subtree: true });

    /* Continuous low-cost guard only while reading old history.
       It does not fight manual scrolling because user interaction opens a 500ms window,
       after which the newly chosen position becomes the lock point via onScroll(). */
    guardTimer = setInterval(() => {
      if (readingHistory) restoreLock();
    }, 250);

    timer = setInterval(smartPoll, POLL_MS);

    window.addEventListener("beforeunload", () => {
      if (timer) clearInterval(timer);
      if (guardTimer) clearInterval(guardTimer);
      mutationObserver.disconnect();
      window.__DPRO_CONTACT_READING_HISTORY__ = false;
    }, { once: true });

    document.documentElement.dataset.dproContactScrollLock = VERSION;
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
