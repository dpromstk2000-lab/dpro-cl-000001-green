(() => {
  "use strict";

  const VERSION = "DPRO-CONTACT-MANUAL-REFRESH-READ-R1-20261002";
  if (window.__DPRO_CONTACT_MANUAL_REFRESH_READ_R1__ === VERSION) return;
  window.__DPRO_CONTACT_MANUAL_REFRESH_READ_R1__ = VERSION;

  const refresh = document.getElementById("refreshButton");
  if (!refresh) return;

  let manualRefreshPending = false;
  let savedScrollTop = 0;

  refresh.addEventListener("click", () => {
    const active = document.querySelector(".dc-thread-item.active");
    const unread = active?.querySelector(".dc-badge");
    if (!active || !unread) {
      manualRefreshPending = false;
      return;
    }

    manualRefreshPending = true;
    const list = document.getElementById("messageList");
    savedScrollTop = list?.scrollTop || 0;
  }, true);

  window.addEventListener("dpro-contact:messages-rendered", () => {
    if (!manualRefreshPending) return;
    manualRefreshPending = false;

    requestAnimationFrame(() => {
      const active = document.querySelector(".dc-thread-item.active");
      const unread = active?.querySelector(".dc-badge");
      if (!active || !unread) return;

      const list = document.getElementById("messageList");
      const wasNearBottom = list
        ? (list.scrollHeight - list.scrollTop - list.clientHeight) <= 90
        : true;

      active.click();

      if (!wasNearBottom && list) {
        const restore = () => {
          list.scrollTop = Math.max(0, savedScrollTop);
        };
        setTimeout(restore, 120);
        setTimeout(restore, 300);
      }
    });
  });
})();