(() => {
  "use strict";

  const VERSION = "GREEN-INSTALLATION-UI-R32-20260917";
  if (!/\/owner\.html$/.test(location.pathname)) return;

  const ITEM_STATUS_LABELS = Object.freeze({
    installed: "設置済み",
  });

  function detailValue(dialog, label) {
    const item = Array.from(dialog.querySelectorAll(".owner-detail-item"))
      .find((el) => el.querySelector("small")?.textContent.trim() === label);
    return item?.querySelector("strong")?.textContent.trim() || "";
  }

  function sectionByTitle(dialog, title) {
    return Array.from(dialog.querySelectorAll(".owner-dialog-section"))
      .find((section) => section.querySelector("h3")?.textContent.trim() === title);
  }

  function localizeAssetRows(section) {
    if (!section) return;
    section.querySelectorAll(".owner-mini-item").forEach((row) => {
      const parts = row.textContent.split("／");
      if (parts.length < 2) return;
      const rawStatus = parts[1].trim();
      const label = ITEM_STATUS_LABELS[rawStatus];
      if (!label) return;
      parts[1] = label;
      row.textContent = parts.join("／");
    });
  }

  function improveEmptyCopy(section, text) {
    const empty = section?.querySelector(".owner-empty");
    if (!empty) return;
    empty.textContent = text;
  }

  function apply() {
    const dialog = document.getElementById("owner-dialog");
    const kicker = document.getElementById("dialog-kicker");
    if (!dialog || !kicker || kicker.textContent.trim() !== "INSTALLATION DETAIL") return;

    const mode = detailValue(dialog, "管理方式");
    const assetSection = sectionByTitle(dialog, "一鉢資産");
    const countSection = sectionByTitle(dialog, "本数管理");

    localizeAssetRows(assetSection);

    if (mode === "一鉢管理") {
      improveEmptyCopy(countSection, "一鉢管理のため、本数管理は使用していません。");
    } else if (mode === "本数管理") {
      improveEmptyCopy(assetSection, "本数管理のため、一鉢資産は使用していません。");
    } else if (mode === "併用管理") {
      improveEmptyCopy(assetSection, "現在、一鉢資産の登録はありません。");
      improveEmptyCopy(countSection, "現在、本数管理の登録はありません。");
    }

    document.documentElement.dataset.greenInstallationUiR32 = VERSION;
  }

  function start() {
    apply();
    const target = document.getElementById("owner-dialog") || document.body;
    const observer = new MutationObserver(() => {
      clearTimeout(start._timer);
      start._timer = setTimeout(apply, 0);
    });
    observer.observe(target, { childList: true, subtree: true, characterData: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();