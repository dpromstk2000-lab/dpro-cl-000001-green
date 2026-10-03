(() => {
  "use strict";

  const VERSION = "GREEN-FINAL-BRUSHUP-R1.1-20261003";
  const ACTIVE_CARE_STATUSES = new Set(["planned", "in_care", "observing"]);
  const ACTIVE_CARE_LABELS = new Set(["養生予定", "養生中", "経過観察"]);
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  let currentReplacementId = "";
  let replacementHydrateToken = 0;
  let currentReplacementRequest = null;

  function jstDateKey(value = new Date()) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${map.year}-${map.month}-${map.day}`;
  }

  function isFutureJstDay(value) {
    if (!value) return false;
    const scheduled = jstDateKey(value);
    const today = jstDateKey(new Date());
    return Boolean(scheduled && today && scheduled > today);
  }

  function detailValue(dialog, label) {
    const item = $$(".owner-detail-item", dialog).find((node) => $("small", node)?.textContent.trim() === label);
    return item ? $("strong", item) : null;
  }

  function patchInquiryStatus(dialog) {
    const kicker = $("#dialog-kicker", dialog);
    if (!kicker || !["INQUIRY DETAIL", "INTAKE DETAIL"].includes(kicker.textContent.trim())) return;

    const stateValue = detailValue(dialog, "状態");
    if (stateValue?.textContent.trim() === "連絡済み") stateValue.textContent = "対応中";

    const statusSelect = $('#inquiry-update-form select[name="status"]', dialog);
    if (statusSelect) {
      Array.from(statusSelect.options).forEach((option) => {
        if (option.value === "contacted") option.textContent = "対応中";
      });
    }
  }

  function patchCareRows() {
    const tbody = $("#care-rows");
    if (!tbody) return;
    $$('tr', tbody).forEach((row) => {
      const status = $(".owner-status[data-status]", row)?.dataset.status || "";
      if (!status || ACTIVE_CARE_STATUSES.has(status)) return;
      const cells = row.querySelectorAll("td");
      if (cells.length >= 5 && cells[4].textContent.trim() !== "終了済み") {
        cells[4].textContent = "終了済み";
        cells[4].dataset.greenFinalBrushup = VERSION;
      }
    });
  }

  function patchCareDialog(dialog) {
    const kicker = $("#dialog-kicker", dialog);
    if (!kicker || kicker.textContent.trim() !== "CARE DETAIL") return;

    const stateValue = detailValue(dialog, "状態");
    const nextCheckValue = detailValue(dialog, "次回確認");
    if (!stateValue || !nextCheckValue) return;

    if (!ACTIVE_CARE_LABELS.has(stateValue.textContent.trim())) {
      nextCheckValue.textContent = "終了済み";
      nextCheckValue.dataset.greenFinalBrushup = VERSION;
    }
  }

  function ensureFutureGuardNote(dialog, scheduledAt) {
    let note = $("#green-replacement-future-guard", dialog);
    if (!note) {
      note = document.createElement("div");
      note.id = "green-replacement-future-guard";
      note.className = "owner-warning-box";
      const footer = $("#dialog-footer", dialog);
      if (footer?.parentElement) footer.parentElement.insertBefore(note, footer);
      else $("#dialog-body", dialog)?.appendChild(note);
    }
    const date = jstDateKey(scheduledAt).replaceAll("-", "/");
    note.textContent = `交換予定日（${date}）より前のため、交換完了はできません。予定日当日以降に操作してください。`;
  }

  async function patchReplacementDialog(dialog) {
    const kicker = $("#dialog-kicker", dialog);
    if (!kicker || kicker.textContent.trim() !== "REPLACEMENT DETAIL" || !currentReplacementId) return;

    const actions = $("#replacement-actions", dialog);
    const existingButton = $("#complete-replacement", dialog);
    if (dialog.dataset.greenFutureCheckId === currentReplacementId) return;
    dialog.dataset.greenFutureCheckId = currentReplacementId;

    const originalText = existingButton?.textContent || "現地交換を完了";
    if (existingButton) {
      existingButton.disabled = true;
      existingButton.textContent = "交換予定日を確認中…";
    }

    const token = ++replacementHydrateToken;
    try {
      const result = await window.Green.api(`/api/admin/replacements/${encodeURIComponent(currentReplacementId)}`);
      if (token !== replacementHydrateToken || !dialog.isConnected) return;
      const request = result?.data?.request;
      currentReplacementRequest = request || null;

      const button = $("#complete-replacement", dialog);
      const synthetic = $("#green-future-replacement-disabled", dialog);
      if (request && isFutureJstDay(request.scheduled_at)) {
        if (button) {
          button.disabled = true;
          button.textContent = "交換予定日まで完了できません";
          button.title = "未来日の交換予定は完了できません";
        } else if (actions && !synthetic) {
          const blocked = document.createElement("button");
          blocked.type = "button";
          blocked.id = "green-future-replacement-disabled";
          blocked.className = "btn btn--primary";
          blocked.disabled = true;
          blocked.textContent = "交換予定日まで完了できません";
          blocked.title = "未来日の交換予定は完了できません";
          actions.appendChild(blocked);
        }
        ensureFutureGuardNote(dialog, request.scheduled_at);
      } else {
        synthetic?.remove();
        $("#green-replacement-future-guard", dialog)?.remove();
        if (button) {
          button.disabled = false;
          button.textContent = originalText;
          button.removeAttribute("title");
        }
      }
    } catch {
      currentReplacementRequest = null;
      $("#green-future-replacement-disabled", dialog)?.remove();
      $("#green-replacement-future-guard", dialog)?.remove();
      const button = $("#complete-replacement", dialog);
      if (button) {
        button.disabled = false;
        button.textContent = originalText;
        button.removeAttribute("title");
      }
      delete dialog.dataset.greenFutureCheckId;
    }
  }

  function patchDialog() {
    const dialog = $("#owner-dialog");
    if (!dialog) return;
    patchInquiryStatus(dialog);
    patchCareDialog(dialog);
    void patchReplacementDialog(dialog);
  }

  function patchAll() {
    patchCareRows();
    patchDialog();
  }

  document.addEventListener("click", (event) => {
    const replacementRowButton = event.target.closest?.("[data-replacement]");
    if (replacementRowButton) {
      currentReplacementId = replacementRowButton.dataset.replacement || "";
      currentReplacementRequest = null;
      replacementHydrateToken += 1;
    }

    const completeButton = event.target.closest?.("#complete-replacement");
    if (completeButton && currentReplacementRequest && isFutureJstDay(currentReplacementRequest.scheduled_at)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      window.Green?.toast?.("交換予定日より前のため、交換完了はできません。", "error");
    }
  }, true);

  const observer = new MutationObserver(() => {
    window.clearTimeout(observer._greenTimer);
    observer._greenTimer = window.setTimeout(patchAll, 10);
  });

  function start() {
    if (!document.body) return;
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    patchAll();
    window.GREEN_FINAL_BRUSHUP_VERSION = VERSION;
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
