(() => {
  "use strict";

  const VERSION = "GREEN-SITE-CHECK-DETAIL-TABS-R1.0-20260929";
  if (window.__DPRO_GREEN_SITE_CHECK_DETAIL_TABS_R1__) return;
  window.__DPRO_GREEN_SITE_CHECK_DETAIL_TABS_R1__ = VERSION;

  const dialog = document.getElementById("owner-dialog");
  if (!dialog) return;

  function installStyle() {
    if (document.getElementById("green-site-check-detail-tabs-r1-style")) return;
    const style = document.createElement("style");
    style.id = "green-site-check-detail-tabs-r1-style";
    style.textContent = `
      .green-site-tabs-r1{
        display:flex;gap:8px;overflow-x:auto;padding:2px 0 10px;margin:0 0 12px;
        border-bottom:1px solid #dbe6df;scrollbar-width:thin
      }
      .green-site-tab-r1{
        flex:0 0 auto;min-height:42px;padding:0 14px;border:1px solid #cbd9d1;
        border-radius:11px;background:#fff;color:#335447;font:inherit;font-weight:900;
        cursor:pointer;white-space:nowrap
      }
      .green-site-tab-r1.is-active{
        background:#174c35;border-color:#174c35;color:#fff
      }
      .green-site-tab-r1:active{transform:scale(.985)}
      .green-site-panel-r1{
        display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);
        gap:14px 16px;align-items:start
      }
      .green-site-panel-r1[hidden]{display:none!important}
      .green-site-panel-r1>.full,
      .green-site-panel-r1>.green-site-section,
      .green-site-panel-r1>.green-site-next{
        grid-column:1/-1
      }
      .green-site-panel-r1 .green-site-section{
        margin:0 0 2px
      }
      .green-site-tab-summary-r1{
        display:flex;align-items:center;gap:8px;margin:-2px 0 12px;
        color:#63756d;font-size:12px;font-weight:700
      }
      .green-site-tab-summary-r1::before{
        content:"";width:8px;height:8px;border-radius:999px;background:#2f8a5d;flex:0 0 auto
      }
      #green-site-detail-form[data-green-site-tabs-r1] .green-owner-schedule-note + .green-owner-schedule-note{
        display:none!important
      }
      @media(max-width:760px){
        .green-site-panel-r1{grid-template-columns:1fr}
        .green-site-panel-r1>.full,
        .green-site-panel-r1>.green-site-section,
        .green-site-panel-r1>.green-site-next{grid-column:auto}
        .green-site-tab-r1{min-height:40px;padding:0 11px;font-size:12px}
      }
    `;
    document.head.append(style);
  }

  function activate(key) {
    const form = document.getElementById("green-site-detail-form");
    const tabs = document.getElementById("green-site-tabs-r1");
    if (!form || !tabs) return;

    tabs.querySelectorAll("[data-green-site-tab-r1]").forEach((button) => {
      const active = button.dataset.greenSiteTabR1 === key;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
    });

    form.querySelectorAll("[data-green-site-panel-r1]").forEach((panel) => {
      panel.hidden = panel.dataset.greenSitePanelR1 !== key;
    });

    try { sessionStorage.setItem("green_site_detail_tab_r1", key); } catch (_) {}
    const body = document.getElementById("dialog-body");
    if (body) body.scrollTop = 0;
  }

  function sectionTitle(node) {
    return node?.matches?.(".green-site-section")
      ? String(node.querySelector("h3")?.textContent || "").trim()
      : "";
  }

  function dedupeScheduleNotes(form) {
    ["scheduledStart", "scheduledEnd"].forEach((name) => {
      const input = form.querySelector(`[name="${name}"]`);
      const label = input?.closest("label");
      if (!label) return;
      const notes = Array.from(label.querySelectorAll(".green-owner-schedule-note"));
      if (notes.length <= 1) return;

      // Prefer the more informative original detail note.
      const keep =
        notes.find((n) => /履歴編集可|開始より後/.test(n.textContent || "")) ||
        notes[0];
      notes.forEach((n) => { if (n !== keep) n.remove(); });
    });
  }

  function enhance() {
    const kicker = String(document.getElementById("dialog-kicker")?.textContent || "").trim();
    const form = document.getElementById("green-site-detail-form");
    if (kicker !== "SITE CHECK DETAIL" || !form) return;
    if (form.dataset.greenSiteTabsR1 === VERSION) {
      dedupeScheduleNotes(form);
      return;
    }

    installStyle();

    const directChildren = Array.from(form.children);
    const resultSection = directChildren.find((n) => sectionTitle(n) === "現地確認結果");
    const photoSection = directChildren.find((n) => sectionTitle(n) === "現地写真");
    if (!resultSection || !photoSection) return;

    const resultIndex = directChildren.indexOf(resultSection);
    const photoIndex = directChildren.indexOf(photoSection);
    if (resultIndex <= 0 || photoIndex <= resultIndex) return;

    const visitNodes = directChildren.slice(0, resultIndex);
    const resultNodes = directChildren.slice(resultIndex, photoIndex);
    const photoNodes = directChildren.slice(photoIndex);

    const tabs = document.createElement("nav");
    tabs.id = "green-site-tabs-r1";
    tabs.className = "green-site-tabs-r1";
    tabs.setAttribute("role", "tablist");
    tabs.innerHTML = `
      <button type="button" class="green-site-tab-r1" data-green-site-tab-r1="visit" role="tab">① 訪問予定</button>
      <button type="button" class="green-site-tab-r1" data-green-site-tab-r1="result" role="tab">② 現地確認結果</button>
      <button type="button" class="green-site-tab-r1" data-green-site-tab-r1="photo" role="tab">③ 写真・引き継ぎ</button>
    `;

    const visitPanel = document.createElement("section");
    visitPanel.className = "green-site-panel-r1";
    visitPanel.dataset.greenSitePanelR1 = "visit";

    const resultPanel = document.createElement("section");
    resultPanel.className = "green-site-panel-r1";
    resultPanel.dataset.greenSitePanelR1 = "result";

    const photoPanel = document.createElement("section");
    photoPanel.className = "green-site-panel-r1";
    photoPanel.dataset.greenSitePanelR1 = "photo";

    visitNodes.forEach((n) => visitPanel.append(n));
    resultNodes.forEach((n) => resultPanel.append(n));
    photoNodes.forEach((n) => photoPanel.append(n));

    const body = document.getElementById("dialog-body");
    body.insertBefore(tabs, form);
    form.append(visitPanel, resultPanel, photoPanel);
    form.dataset.greenSiteTabsR1 = VERSION;

    tabs.querySelectorAll("[data-green-site-tab-r1]").forEach((button) => {
      button.addEventListener("click", () => activate(button.dataset.greenSiteTabR1));
    });

    dedupeScheduleNotes(form);

    let initial = "visit";
    try {
      const saved = sessionStorage.getItem("green_site_detail_tab_r1");
      if (["visit","result","photo"].includes(saved)) initial = saved;
    } catch (_) {}
    activate(initial);
  }

  let timer = 0;
  const observer = new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(enhance, 40);
  });

  function boot() {
    installStyle();
    observer.observe(dialog, { childList:true, subtree:true });
    [0, 80, 220, 500, 900].forEach((ms) => setTimeout(enhance, ms));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once:true });
  } else {
    boot();
  }
})();