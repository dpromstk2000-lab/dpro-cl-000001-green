/* DPRO GREEN CONTACT / SEND CONFIRM
 * Version: DPRO-CONTACT-SEND-CONFIRM-R1-20260927
 *
 * Plain-text replies use the base contact handler.
 * Attachment replies already have their own confirmation in R3.
 * This capture listener restores confirmation for plain-text replies only.
 */
(() => {
  "use strict";

  const VERSION = "DPRO-CONTACT-SEND-CONFIRM-R1-20260927";

  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || form.id !== "replyForm") return;

    // Attachment sends are already confirmed by green-contact-standard-r3.js.
    if (document.querySelector("#dcR3Attachments .dc-r3-attachment")) return;

    const text = String(document.getElementById("replyText")?.value || "").trim();
    if (!text) return;

    const ok = window.confirm(
      "この内容をLINEへ送信します。\n\n" +
      text +
      "\n\n送信してよろしいですか？"
    );

    if (!ok) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }
  }, true);

  document.documentElement.dataset.dproContactSendConfirm = VERSION;
})();
