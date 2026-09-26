(() => {
  "use strict";

  const HISTORY_ID = "member-inquiry-history-r18";
  const TYPE_LABELS = {
    plant_condition: "植物の状態相談",
    maintenance: "メンテナンス",
    visit_change: "訪問日時・利用内容の変更",
    plant_addition: "植物追加",
    spot_event: "スポット対応",
    pickup_disposal: "引取り・処分",
    other: "その他",
  };
  const CUSTOMER_STATUS_LABELS = {
    open: "受付済み",
    reviewing: "対応中",
    action_planned: "対応予定",
    resolved: "対応済み",
    closed: "完了",
  };

  function esc(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
    }[char]));
  }

  function typeLabel(value) {
    return TYPE_LABELS[value] || value || "ご相談";
  }

  function customerStatus(value) {
    return CUSTOMER_STATUS_LABELS[value] || window.Green?.statusLabel?.(value) || value || "受付済み";
  }

  async function renderHistory() {
    const grid = document.querySelector("#tab-content .request-grid");
    if (!grid || !window.Green?.api) return;

    let region = document.getElementById(HISTORY_ID);
    if (!region) {
      region = document.createElement("section");
      region.id = HISTORY_ID;
      region.className = "portal-section";
      region.style.marginTop = "32px";
      grid.closest(".portal-section")?.appendChild(region);
    }

    region.innerHTML = '<div class="section-heading"><div><p class="eyebrow">YOUR INQUIRIES</p><h2>送信済み・対応中のご相談</h2></div></div><div class="loading-panel"><span class="spinner"></span>確認中…</div>';

    try {
      const response = await window.Green.api("/api/member/overview");
      const items = response?.data?.activeIssues || [];
      const issueCount = document.querySelector("#issue-count");
      if (issueCount) issueCount.textContent = String(items.length);

      if (!items.length) {
        region.innerHTML = '<div class="section-heading"><div><p class="eyebrow">YOUR INQUIRIES</p><h2>送信済み・対応中のご相談</h2></div></div><div class="empty-state"><span aria-hidden="true">🌱</span><p>現在対応中のご相談はありません。</p></div>';
        return;
      }

      const cards = items.map((item) => {
        const status = customerStatus(item.status);
        const number = item.issue_number || item.issueNumber || "";
        return `<article class="detail-card"><div class="detail-card-head"><div><span class="status-chip">${esc(status)}</span><h3>${esc(typeLabel(item.issue_type || item.issueType))}</h3></div>${number ? `<span>${esc(number)}</span>` : ""}</div><p>${esc(item.description || "相談内容を確認中です。")}</p></article>`;
      }).join("");

      region.innerHTML = `<div class="section-heading"><div><p class="eyebrow">YOUR INQUIRIES</p><h2>送信済み・対応中のご相談</h2></div></div><p class="label-note">送信した相談内容と現在の対応状況を確認できます。</p><div class="stack">${cards}</div>`;
    } catch (error) {
      region.innerHTML = `<div class="section-heading"><div><p class="eyebrow">YOUR INQUIRIES</p><h2>送信済み・対応中のご相談</h2></div></div><div class="alert alert-error">相談状況を読み込めませんでした。${error?.requestId ? `（確認番号：${esc(error.requestId)}）` : ""}</div>`;
    }
  }

  const observer = new MutationObserver(() => {
    if (document.querySelector("#tab-content .request-grid") && !document.getElementById(HISTORY_ID)) {
      renderHistory();
    }
  });

  document.addEventListener("DOMContentLoaded", () => {
    const content = document.querySelector("#tab-content");
    if (content) observer.observe(content, { childList: true, subtree: true });
  });

  document.addEventListener("submit", (event) => {
    if (["issue-form", "change-form", "additional-form"].includes(event.target?.id)) {
      window.setTimeout(renderHistory, 1200);
    }
  }, true);
})();