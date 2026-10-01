(() => {
  "use strict";
  const VERSION = "GREEN-MEMBER-REPORT-DATE-R1.0-20261001";
  if (window.__GREEN_MEMBER_REPORT_DATE_R1__) return;
  window.__GREEN_MEMBER_REPORT_DATE_R1__ = VERSION;

  function labelReportDates(root = document) {
    // 作業報告タブ: 上段の日付は published_at なので「公開日」と明示する。
    root.querySelectorAll(".report-card .report-card-head > div > span").forEach((el) => {
      const text = (el.textContent || "").trim();
      if (!text || text.startsWith("公開日：")) return;
      el.textContent = `公開日：${text}`;
      el.dataset.greenReportDateLabeled = VERSION;
    });

    // ホーム「最近の作業報告」カードでも、日付だけが出る場合は公開日と明示。
    const content = root.querySelector("#tab-content");
    if (!content) return;
    const latestHeading = [...content.querySelectorAll("h2")].find((h) => (h.textContent || "").trim() === "最近の作業報告");
    if (!latestHeading) return;
    const section = latestHeading.closest(".portal-section");
    if (!section) return;

    section.querySelectorAll(".card, .portal-card, .summary-card, .mini-card").forEach((card) => {
      [...card.querySelectorAll("p,span,small")].forEach((el) => {
        const text = (el.textContent || "").trim();
        if (!text || text.startsWith("公開日：")) return;
        if (/^\d{4}年\d{1,2}月\d{1,2}日$/.test(text) || /^\d{4}\/\d{1,2}\/\d{1,2}$/.test(text)) {
          el.textContent = `公開日：${text}`;
        }
      });
    });
  }

  let pending = false;
  function schedule() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      labelReportDates(document);
    });
  }

  function boot() {
    schedule();
    const target = document.querySelector("#tab-content") || document.body;
    new MutationObserver(schedule).observe(target, { childList: true, subtree: true, characterData: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();