/* DPRO GREEN CONTACT / SCROLL STABILITY + SMART REFRESH
 * Version: DPRO-CONTACT-SCROLL-STABILITY-R1-20260927
 *
 * Goals:
 * - Do not drag the operator away from the place they are reading.
 * - Keep automatic updates while the conversation is at the newest message.
 * - When reading older history, pause automatic refresh instead of rebuilding the list.
 * - If another refresh path occurs, restore the visible anchor after DOM rebuild.
 */
(() => {
  "use strict";

  const VERSION = "DPRO-CONTACT-SCROLL-STABILITY-R1-20260927";
  const REFRESH_MS = 30000;
  const BOTTOM_TOLERANCE = 96;

  let timer = null;
  let pendingRefresh = false;
  let restoring = false;
  let readingHistory = false;
  let anchorIndex = -1;
  let anchorOffset = 0;

  const list = () => document.getElementById("messageList");

  function distanceFromBottom(el) {
    return Math.max(0, el.scrollHeight - el.scrollTop - el.clientHeight);
  }

  function captureAnchor(el) {
    const children = [...el.children];
    if (!children.length) {
      anchorIndex = -1;
      anchorOffset = 0;
      return;
    }

    const top = el.scrollTop;
    let index = children.findIndex((node) => node.offsetTop + node.offsetHeight > top + 2);
    if (index < 0) index = children.length - 1;

    anchorIndex = index;
    anchorOffset = children[index].offsetTop - top;
  }

  function updateReadingState() {
    const el = list();
    if (!el || restoring) return;
    readingHistory = distanceFromBottom(el) > BOTTOM_TOLERANCE;
    if (readingHistory) captureAnchor(el);

    if (!readingHistory && pendingRefresh) {
      pendingRefresh = false;
      window.setTimeout(() => smartRefresh(), 120);
    }
  }

  function restoreAnchor() {
    const el = list();
    if (!el || !readingHistory || anchorIndex < 0) return;

    const children = [...el.children];
    if (!children.length) return;

    const index = Math.min(anchorIndex, children.length - 1);
    const target = children[index];
    if (!target) return;

    restoring = true;
    el.scrollTop = Math.max(0, target.offsetTop - anchorOffset);

    requestAnimationFrame(() => {
      el.scrollTop = Math.max(0, target.offsetTop - anchorOffset);
      requestAnimationFrame(() => {
        el.scrollTop = Math.max(0, target.offsetTop - anchorOffset);
        restoring = false;
      });
    });
  }

  async function smartRefresh() {
    if (document.hidden) return;

    const ui = window.DPRO_CONTACT_UI;
    if (!ui?.refresh) return;

    const el = list();
    const hasConversation = Boolean(ui.getSelectedThreadId?.());

    if (hasConversation && el && distanceFromBottom(el) > BOTTOM_TOLERANCE) {
      readingHistory = true;
      captureAnchor(el);
      pendingRefresh = true;
      return;
    }

    pendingRefresh = false;
    readingHistory = false;

    try {
      await ui.refresh();
    } catch {
      // Base CONTACT UI already handles visible connection errors.
    }
  }

  function install() {
    const el = list();
    if (!el) return false;

    el.addEventListener("scroll", updateReadingState, { passive: true });
    ["wheel", "touchstart", "pointerdown"].forEach((type) => {
      el.addEventListener(type, () => {
        if (!restoring) {
          readingHistory = distanceFromBottom(el) > BOTTOM_TOLERANCE;
          if (readingHistory) captureAnchor(el);
        }
      }, { passive: true });
    });

    const observer = new MutationObserver((records) => {
      if (!readingHistory) return;
      const directChange = records.some((record) => record.target === el);
      if (!directChange) return;

      requestAnimationFrame(() => {
        requestAnimationFrame(restoreAnchor);
      });
    });
    observer.observe(el, { childList: true });

    timer = window.setInterval(smartRefresh, REFRESH_MS);

    window.addEventListener("beforeunload", () => {
      if (timer) window.clearInterval(timer);
      timer = null;
      observer.disconnect();
    }, { once: true });

    document.documentElement.dataset.dproContactScrollStability = VERSION;
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
