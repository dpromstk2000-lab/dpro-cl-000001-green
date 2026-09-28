(() => {
  "use strict";

  const VERSION = "GREEN-DATE-PICKER-FIX-R1.0-20260928";
  if (window.__DPRO_GREEN_DATE_PICKER_FIX_R1__) return;
  window.__DPRO_GREEN_DATE_PICKER_FIX_R1__ = VERSION;

  function installStyle() {
    if (document.getElementById("green-date-picker-fix-r1-style")) return;
    const style = document.createElement("style");
    style.id = "green-date-picker-fix-r1-style";
    style.textContent = `
      /* The real native date/datetime input sits directly over the calendar icon.
         This avoids showPicker() failures caused by moving the input off-screen. */
      #owner-dialog .green-clean-date-wrap {
        position: relative !important;
      }

      #owner-dialog .green-clean-date-button {
        pointer-events: none !important;
      }

      #owner-dialog .green-clean-date-native {
        position: absolute !important;
        left: auto !important;
        right: 0 !important;
        top: 0 !important;
        width: 46px !important;
        min-width: 46px !important;
        height: 100% !important;
        min-height: 46px !important;
        padding: 0 !important;
        margin: 0 !important;
        opacity: 0.001 !important;
        pointer-events: auto !important;
        cursor: pointer !important;
        z-index: 5 !important;
      }

      #owner-dialog .green-clean-date-native::-webkit-calendar-picker-indicator {
        position: absolute !important;
        inset: 0 !important;
        width: 100% !important;
        height: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        cursor: pointer !important;
      }
    `;
    document.head.append(style);
  }

  function normalize() {
    installStyle();

    const dialog = document.getElementById("owner-dialog");
    if (!dialog) return;

    dialog.querySelectorAll(".green-clean-date-wrap").forEach((wrap) => {
      const native = wrap.querySelector(".green-clean-date-native");
      const button = wrap.querySelector(".green-clean-date-button");
      if (!native || !button) return;

      native.tabIndex = 0;
      native.setAttribute(
        "aria-label",
        native.dataset.greenOriginalDateType === "date"
          ? "日付をカレンダーから選択"
          : "日時をカレンダーから選択"
      );
    });
  }

  const dialog = document.getElementById("owner-dialog");
  if (dialog) {
    const observer = new MutationObserver(() => {
      clearTimeout(observer._timer);
      observer._timer = setTimeout(normalize, 20);
    });
    observer.observe(dialog, { childList: true, subtree: true });
  }

  [0, 100, 300, 800].forEach((ms) => setTimeout(normalize, ms));
})();