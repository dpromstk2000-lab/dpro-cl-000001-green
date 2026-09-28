(() => {
  "use strict";

  const VERSION = "GREEN-OWNER-LEAD-UX-R1.1-20260928";
  if (window.__DPRO_GREEN_OWNER_LEAD_UX_R11__) return;
  window.__DPRO_GREEN_OWNER_LEAD_UX_R11__ = VERSION;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const dialog = $("#owner-dialog");
  if (!dialog) return;

  function installStyle() {
    if ($("#green-owner-lead-ux-r1-style")) return;
    const style = document.createElement("style");
    style.id = "green-owner-lead-ux-r1-style";
    style.textContent = `
      .green-lead-tabs-r1{
        display:flex;gap:8px;overflow-x:auto;padding:3px 1px 10px;margin:0 0 12px;
        border-bottom:1px solid #dbe6df;scrollbar-width:thin
      }
      .green-lead-tab-r1{
        flex:0 0 auto;min-height:42px;padding:0 14px;border:1px solid #cbd9d1;border-radius:11px;
        background:#fff;color:#335447;font:inherit;font-weight:900;cursor:pointer;white-space:nowrap
      }
      .green-lead-tab-r1.is-active{background:#174c35;border-color:#174c35;color:#fff}
      .green-lead-tab-r1:active{transform:scale(.985)}
      .green-lead-panel-r1[hidden]{display:none!important}
      .green-lead-panel-r1{display:grid;gap:12px}
      .green-lead-next-state-r1{
        display:flex;justify-content:space-between;align-items:flex-start;gap:12px;
        padding:12px 14px;border:1px solid #d4e3da;border-radius:12px;background:#f6faf7
      }
      .green-lead-next-state-r1 strong{display:block;color:#173d2f}
      .green-lead-next-state-r1 span{display:block;margin-top:4px;color:#61736a;font-size:12px;line-height:1.55}
      .green-lead-next-state-r1.is-warning{background:#fff8e9;border-color:#e4bf64}
      .green-lead-next-state-r1.is-warning strong{color:#7b5800}
      .green-lead-next-state-r1 .state-chip{
        flex:0 0 auto;padding:4px 8px;border-radius:999px;background:#dff0e5;color:#1d6543;
        font-size:11px;font-weight:900
      }
      .green-lead-next-state-r1.is-warning .state-chip{background:#ffe7ad;color:#7b5800}
      .green-lead-section-title-r1{margin:2px 0 0;font-size:17px;color:#173d2f}
      .green-lead-section-note-r1{margin:-6px 0 2px;color:#6a7971;font-size:12px}
      #lead-update-form.green-lead-form-r1{padding:0}
      #lead-update-form.green-lead-form-r1 [name="nextAction"]{min-height:90px}
      #lead-activity-form.green-lead-form-r1{margin-top:0}
      #green-lead-customer-handoff.green-lead-customer-r1{margin:0}
      .green-lead-history-wrap-r1{display:grid;gap:12px}
      .green-lead-history-wrap-r1>.owner-dialog-section{margin:0}
      .green-lead-footer-help-r1{
        margin-right:auto;align-self:center;color:#63756d;font-size:12px;font-weight:700
      }
      @media(max-width:680px){
        .green-lead-tab-r1{min-height:40px;padding:0 11px;font-size:12px}
        .green-lead-next-state-r1{display:grid}
      }
    `;
    document.head.append(style);
  }

  function fieldLabel(form, name) {
    const input = $(`[name="${name}"]`, form);
    return input?.closest("label") || null;
  }

  function updateNextState(form) {
    const box = $("#green-lead-next-state-r1", dialog);
    if (!box || !form) return;
    const action = String($('[name="nextAction"]', form)?.value || "").trim();
    const at = String($('[name="nextActionAt"]', form)?.value || "").trim();
    const complete = !!action && !!at;

    box.classList.toggle("is-warning", !complete);
    box.innerHTML = complete
      ? `<div><strong>次回対応は設定済みです</strong><span>一覧画面でも次回対応と日時を確認できます。</span></div><span class="state-chip">設定済み</span>`
      : `<div><strong>次回対応が未設定です</strong><span>「何をするか」と「いつ対応するか」を決めておくと、対応忘れを防げます。</span></div><span class="state-chip">要設定</span>`;
  }

  function activateTab(key) {
    const tabs = $("#green-lead-tabs-r1", dialog);
    if (!tabs) return;

    $$("[data-green-lead-tab-r1]", tabs).forEach((b) => {
      const active = b.dataset.greenLeadTabR1 === key;
      b.classList.toggle("is-active", active);
      b.setAttribute("aria-selected", active ? "true" : "false");
    });
    $$("[data-green-lead-panel-r1]", dialog).forEach((p) => {
      p.hidden = p.dataset.greenLeadPanelR1 !== key;
    });

    const add = $("#add-lead-activity", dialog);
    if (add) add.hidden = key !== "history";

    const save = $("#save-lead", dialog);
    if (save) save.textContent = key === "next" ? "案件を保存" : "案件を保存";

    try { sessionStorage.setItem("green_lead_active_tab_r1", key); } catch {}
  }

  function enhanceLeadDialog() {
    const form = $("#lead-update-form", dialog);
    if (!form || form.dataset.greenLeadUxR1 === VERSION) return;

    const handoff = $("#green-lead-customer-handoff", dialog);
    const activity = $("#lead-activity-form", dialog);
    const historySection = Array.from($$(".owner-dialog-section", dialog))
      .find((section) => section !== handoff && section !== activity &&
        String($("h3", section)?.textContent || "").trim() === "対応履歴");

    if (!handoff || !activity || !historySection) return;

    form.dataset.greenLeadUxR1 = VERSION;
    form.classList.add("green-lead-form-r1");
    activity.classList.add("green-lead-form-r1");
    handoff.classList.add("green-lead-customer-r1");

    const tabs = document.createElement("nav");
    tabs.id = "green-lead-tabs-r1";
    tabs.className = "green-lead-tabs-r1";
    tabs.setAttribute("role", "tablist");
    tabs.innerHTML = `
      <button type="button" class="green-lead-tab-r1" data-green-lead-tab-r1="next" role="tab">① 次回対応</button>
      <button type="button" class="green-lead-tab-r1" data-green-lead-tab-r1="history" role="tab">② 対応履歴</button>
      <button type="button" class="green-lead-tab-r1" data-green-lead-tab-r1="customer" role="tab">③ 顧客台帳</button>
    `;

    const nextPanel = document.createElement("section");
    nextPanel.className = "green-lead-panel-r1";
    nextPanel.dataset.greenLeadPanelR1 = "next";

    const state = document.createElement("div");
    state.id = "green-lead-next-state-r1";
    state.className = "green-lead-next-state-r1";

    const nextTitle = document.createElement("h3");
    nextTitle.className = "green-lead-section-title-r1";
    nextTitle.textContent = "次にやることを決める";
    const nextNote = document.createElement("p");
    nextNote.className = "green-lead-section-note-r1";
    nextNote.textContent = "次回対応と日時を決めておくと、ダッシュボードや一覧から対応漏れを防げます。";

    nextPanel.append(state, nextTitle, nextNote, form);

    // Put "次回対応" before status visually, while preserving existing inputs/events.
    const nextAction = fieldLabel(form, "nextAction");
    const nextAt = fieldLabel(form, "nextActionAt");
    const status = fieldLabel(form, "status");
    const follow = fieldLabel(form, "followUpOn");
    const hold = fieldLabel(form, "holdReason");
    const lost = fieldLabel(form, "lostReason");
    [nextAction, nextAt, status, follow, hold, lost].filter(Boolean).forEach((el) => form.append(el));

    const historyPanel = document.createElement("section");
    historyPanel.className = "green-lead-panel-r1 green-lead-history-wrap-r1";
    historyPanel.dataset.greenLeadPanelR1 = "history";
    const historyTitle = document.createElement("h3");
    historyTitle.className = "green-lead-section-title-r1";
    historyTitle.textContent = "これまでの対応と、新しい履歴";
    const historyNote = document.createElement("p");
    historyNote.className = "green-lead-section-note-r1";
    historyNote.textContent = "電話・LINE・メール・面談などの対応を時系列で残します。";
    historyPanel.append(historyTitle, historyNote, historySection, activity);

    const customerPanel = document.createElement("section");
    customerPanel.className = "green-lead-panel-r1";
    customerPanel.dataset.greenLeadPanelR1 = "customer";
    const customerTitle = document.createElement("h3");
    customerTitle.className = "green-lead-section-title-r1";
    customerTitle.textContent = "顧客台帳への引き継ぎ";
    const customerNote = document.createElement("p");
    customerNote.className = "green-lead-section-note-r1";
    customerNote.textContent = "現地確認後、見込み顧客として顧客台帳へ引き継ぐと、その後の拠点・契約・設置管理につながります。";
    customerPanel.append(customerTitle, customerNote, handoff);

    const body = $("#dialog-body", dialog);
    body.prepend(tabs);
    tabs.insertAdjacentElement("afterend", nextPanel);
    nextPanel.insertAdjacentElement("afterend", historyPanel);
    historyPanel.insertAdjacentElement("afterend", customerPanel);

    $$("[data-green-lead-tab-r1]", tabs).forEach((button) => {
      button.addEventListener("click", () => activateTab(button.dataset.greenLeadTabR1));
    });

    form.addEventListener("input", () => updateNextState(form));
    form.addEventListener("change", () => updateNextState(form));

    const footer = $("#dialog-footer", dialog);
    if (footer && !$(".green-lead-footer-help-r1", footer)) {
      const help = document.createElement("span");
      help.className = "green-lead-footer-help-r1";
      help.textContent = "必要な項目だけ入力して保存できます。";
      footer.prepend(help);
    }

    updateNextState(form);
    let initial = "next";
    try {
      const saved = sessionStorage.getItem("green_lead_active_tab_r1");
      if (["next","history","customer"].includes(saved)) initial = saved;
    } catch {}
    activateTab(initial);
  }

  let timer = 0;
  const observer = new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(enhanceLeadDialog, 40);
  });

  function boot() {
    if (!/\/owner\.html$/.test(location.pathname)) return;
    installStyle();
    observer.observe(dialog, { childList: true, subtree: true });
    enhanceLeadDialog();

    // Other owner modules may finish rebuilding the dialog slightly later.
    // Retry a few times; the dataset guard keeps this idempotent.
    [120, 300, 700, 1200].forEach((ms) => setTimeout(enhanceLeadDialog, ms));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();