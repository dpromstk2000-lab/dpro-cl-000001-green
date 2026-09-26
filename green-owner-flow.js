(() => {
  "use strict";

  const VERSION = "GREEN-OWNER-FLOW-R1.2-20260901";
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const setTextIfChanged = (element, text) => {
    if (element && element.textContent !== text) element.textContent = text;
  };

  const VIEW_TEXT = Object.freeze({
    inquiries: {
      nav: "相談受付",
      title: "相談受付",
      description: "HP・LINE・電話から届いた新しい相談を確認します。継続して追う相談は「営業案件」へ引き継ぎます。",
      help: "新しい相談の入口",
    },
    leads: {
      nav: "営業案件",
      title: "営業案件",
      description: "相談受付から引き継いだ案件を、次回対応・現地確認・導入準備・成約まで追跡します。",
      help: "成約までの進捗管理",
    },
    "site-checks": {
      nav: "現地確認",
      title: "現地確認",
      help: "訪問して設置条件を確認",
    },
    customers: {
      nav: "顧客台帳",
      title: "顧客台帳",
      description: "成約後・利用中のお客様情報を管理します。相談や営業案件そのものを管理する画面ではありません。",
      help: "成約後のお客様情報",
    },
    messages: {
      nav: "LINE配信・通知",
      title: "LINE配信・通知",
      description: "作業完了などの定型文、通知待ち、送信ログを管理します。個別のLINE会話は「LINE・顧客対応」で確認します。",
      help: "定型文・通知ログ",
    },
  });

  const TOP_TITLE_MAP = Object.freeze({
    "問い合わせ": "相談受付",
    "営業対応": "営業案件",
    "顧客": "顧客台帳",
    "LINE・メッセージ": "LINE配信・通知",
  });

  const FLOW_STEPS = Object.freeze([
    { view: "inquiries", label: "相談受付", note: "新しい相談" },
    { view: "leads", label: "営業案件", note: "成約まで追う" },
    { view: "site-checks", label: "現地確認", note: "設置条件を確認" },
    { view: "customers", label: "顧客台帳", note: "成約後を管理" },
  ]);

  const GROUPS = Object.freeze([
    { label: "新規相談・営業", keys: ["inquiries", "leads", "site-checks"] },
    { label: "顧客・契約", keys: ["customers", "contracts", "sites"] },
    { label: "レンタル・現場", keys: ["assets", "installations", "visits", "reports", "replacements"] },
    { label: "コミュニケーション", keys: ["contact", "messages"] },
    { label: "販売・在庫", keys: ["stock", "shop"] },
    { label: "店舗設定", keys: ["facility-settings", "business-calendar", "announcements", "features"] },
  ]);

  function navNode(key) {
    if (key === "contact") return $("#green-contact-menu");
    if (key === "shop") return $("#green-shop-nav");
    return $(`.owner-nav > button[data-view="${key}"]`);
  }

  function setButtonLabel(button, label, title = "") {
    if (!button) return;
    const icon = button.querySelector(":scope > span")?.textContent || "";
    const badge = button.querySelector(":scope > em")?.outerHTML || "";
    button.innerHTML = `<span>${icon}</span><b class="owner-nav-text">${label}</b>${badge}`;
    if (title) button.title = title;
  }

  function syncNavLabels() {
    for (const [view, meta] of Object.entries(VIEW_TEXT)) {
      setButtonLabel(navNode(view), meta.nav, meta.help || "");
    }
    setButtonLabel($("#green-contact-menu"), "LINE・顧客対応", "LINEで継続中の会話を確認・返信");
    setButtonLabel($("#green-shop-nav"), "販売・SHOP", "商品登録・オンライン注文・販売管理");
  }

  let navObserver = null;
  let navArranging = false;
  function arrangeNav() {
    const nav = $(".owner-nav");
    if (!nav || navArranging) return;
    navArranging = true;
    if (navObserver) navObserver.disconnect();

    syncNavLabels();

    const allButtons = $$(":scope > button", nav);
    const dashboard = navNode("dashboard");
    const known = new Set();
    const fragment = document.createDocumentFragment();

    if (dashboard) {
      known.add(dashboard);
      fragment.append(dashboard);
    }

    for (const group of GROUPS) {
      const buttons = group.keys.map(navNode).filter(Boolean);
      if (!buttons.length) continue;
      const heading = document.createElement("div");
      heading.className = "owner-nav-group-label";
      heading.textContent = group.label;
      fragment.append(heading);
      buttons.forEach((button) => {
        known.add(button);
        fragment.append(button);
      });
    }

    const unknown = allButtons.filter((button) => !known.has(button));
    if (unknown.length) {
      const heading = document.createElement("div");
      heading.className = "owner-nav-group-label";
      heading.textContent = "その他";
      fragment.append(heading);
      unknown.forEach((button) => fragment.append(button));
    }

    nav.replaceChildren(fragment);

    if (navObserver) navObserver.observe(nav, { childList: true });
    navArranging = false;
  }

  function startNavObserver() {
    const nav = $(".owner-nav");
    if (!nav) return;
    navObserver = new MutationObserver(() => {
      window.clearTimeout(startNavObserver._timer);
      startNavObserver._timer = window.setTimeout(arrangeNav, 20);
    });
    navObserver.observe(nav, { childList: true });
    arrangeNav();
  }

  function clickView(view) {
    const button = navNode(view);
    if (button) button.click();
  }

  function makeFlowGuide(activeView) {
    const guide = document.createElement("section");
    guide.className = "owner-workflow-guide";
    guide.dataset.ownerFlowGuide = activeView;
    guide.innerHTML = `
      <div class="owner-workflow-guide__head">
        <strong>新規相談から顧客登録まで</strong>
        <span>仕事の順番に沿って確認できます</span>
      </div>
      <div class="owner-workflow-guide__steps">
        ${FLOW_STEPS.map((step, index) => `
          <button type="button" class="owner-workflow-step${step.view === activeView ? " is-current" : ""}" data-owner-flow-go="${step.view}">
            <small>STEP ${index + 1}</small>
            <strong>${step.label}</strong>
            <span>${step.note}</span>
          </button>
          ${index < FLOW_STEPS.length - 1 ? '<span class="owner-workflow-arrow" aria-hidden="true">→</span>' : ""}
        `).join("")}
      </div>`;
    $$("[data-owner-flow-go]", guide).forEach((button) => {
      button.addEventListener("click", () => clickView(button.dataset.ownerFlowGo));
    });
    return guide;
  }

  function makeRoleGuide() {
    const box = document.createElement("section");
    box.className = "owner-role-guide";
    box.id = "green-owner-role-guide";
    box.innerHTML = `
      <div class="owner-role-guide__title">
        <strong>3つの役割</strong>
        <span>迷ったら「今どの段階か」で選びます</span>
      </div>
      <div class="owner-role-guide__grid">
        <button type="button" data-role-go="inquiries">
          <span class="owner-role-guide__number">1</span>
          <strong>相談受付</strong>
          <small>HP・LINE・電話から届いた最初の相談</small>
        </button>
        <button type="button" data-role-go="leads">
          <span class="owner-role-guide__number">2</span>
          <strong>営業案件</strong>
          <small>ヒアリング・現地確認・成約までの進捗</small>
        </button>
        <button type="button" data-role-go="contact">
          <span class="owner-role-guide__number">3</span>
          <strong>LINE・顧客対応</strong>
          <small>LINEで継続中の会話を確認・返信</small>
        </button>
      </div>`;
    $$("[data-role-go]", box).forEach((button) => {
      button.addEventListener("click", () => {
        if (button.dataset.roleGo === "contact") {
          location.href = window.GREEN_CONFIG?.CONTACT_URL || "contact-green.html";
          return;
        }
        clickView(button.dataset.roleGo);
      });
    });
    return box;
  }

  function syncPanel(view) {
    const panel = $(`[data-view-panel="${view}"]`);
    const meta = VIEW_TEXT[view];
    if (!panel || !meta) return;
    const heading = $(".owner-heading", panel);
    if (heading) {
      const h2 = $("h2", heading);
      const p = $("p:not(.eyebrow)", heading);
      if (h2) h2.textContent = meta.title;
      if (p && meta.description) p.textContent = meta.description;
    }
  }

  function installGuides() {
    ["inquiries", "leads", "site-checks", "customers"].forEach((view) => {
      const panel = $(`[data-view-panel="${view}"]`);
      const heading = panel ? $(".owner-heading", panel) : null;
      if (!heading || $(`[data-owner-flow-guide="${view}"]`, panel)) return;
      heading.insertAdjacentElement("afterend", makeFlowGuide(view));
    });

    const inquiryPanel = $('[data-view-panel="inquiries"]');
    const flow = inquiryPanel ? $('[data-owner-flow-guide="inquiries"]', inquiryPanel) : null;
    if (inquiryPanel && flow && !$("#green-owner-role-guide", inquiryPanel)) {
      flow.insertAdjacentElement("afterend", makeRoleGuide());
    }
  }

  function syncStaticText() {
    Object.keys(VIEW_TEXT).forEach(syncPanel);

    const loginLead = $(".owner-login-card > p:not(.eyebrow):not(.owner-login-note)");
    if (loginLead) {
      loginLead.textContent = "相談受付、営業案件、顧客台帳、現地確認、レンタル業務を仕事の流れに沿ってまとめて管理します。";
    }

    $$('[data-action="phone-inquiry"]').forEach((button) => {
      const text = button.textContent.trim();
      if (text === "電話問い合わせを登録") button.textContent = "電話相談を登録";
      if (text === "＋ 電話受付") button.textContent = "＋ 電話相談";
    });

    const messagesPanel = $('[data-view-panel="messages"]');
    if (messagesPanel) {
      const eyebrow = $(".owner-heading .eyebrow", messagesPanel);
      if (eyebrow) eyebrow.textContent = "LINE DELIVERY / NOTIFICATION";
    }

    installGuides();
  }

  function syncTopTitle() {
    const title = $("#view-title");
    if (!title) return;
    const replacement = TOP_TITLE_MAP[title.textContent.trim()];
    if (replacement) title.textContent = replacement;
  }

  function syncDashboard() {
    const dashboard = $('[data-view-panel="dashboard"]');
    if (!dashboard) return;
    $$("small,strong,button", dashboard).forEach((el) => {
      const text = el.textContent.trim();
      if (text === "新着問い合わせ") el.textContent = "新着相談";
      if (text === "問い合わせ") el.textContent = "相談受付";
      if (text === "電話問い合わせを登録") el.textContent = "電話相談を登録";
    });
  }

  function syncDialog() {
    const dialog = $("#owner-dialog");
    if (!dialog) return;
    const title = $("#dialog-title");
    const kicker = $("#dialog-kicker");

    if (title) {
      let text = title.textContent.trim();
      if (text === "問い合わせ詳細") text = "相談受付詳細";
      else if (text === "電話問い合わせを登録") text = "電話相談を登録";
      else if (text.startsWith("問い合わせ ")) text = text.replace(/^問い合わせ /, "相談受付 ");
      setTextIfChanged(title, text);
    }

    if (kicker) {
      if (kicker.textContent.trim() === "INQUIRY DETAIL") setTextIfChanged(kicker, "INTAKE DETAIL");
      if (kicker.textContent.trim() === "PHONE INQUIRY") setTextIfChanged(kicker, "PHONE INTAKE");
    }

    const createLead = $("#create-lead-from-inquiry");
    const createCustomer = $("#create-customer-from-inquiry");
    if (createLead) {
      setTextIfChanged(createLead, "営業案件へ引き継ぐ");
      createLead.classList.remove("btn--secondary");
      createLead.classList.add("btn--primary");
    }
    if (createCustomer) setTextIfChanged(createCustomer, "顧客台帳へ登録");

    const saveInquiry = $("#save-inquiry");
    if (saveInquiry) setTextIfChanged(saveInquiry, "相談内容を保存");

    if (createLead && !$("#green-inquiry-handoff-note")) {
      const actions = createLead.closest(".owner-dialog-actions");
      if (actions) {
        const note = document.createElement("div");
        note.id = "green-inquiry-handoff-note";
        note.className = "owner-handoff-note";
        note.innerHTML = "<strong>次にどうする？</strong><span>継続して商談・現地確認へ進む場合は「営業案件へ引き継ぐ」。すでに成約済み・既存顧客なら「顧客台帳へ登録」を使います。</span>";
        actions.insertAdjacentElement("beforebegin", note);
      }
    }
  }

  function syncToast() {
    const region = $("#toast-region");
    if (!region) return;
    const walker = document.createTreeWalker(region, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      const current = node.nodeValue || "";
      const next = current
        .replaceAll("問い合わせを更新しました", "相談受付を更新しました")
        .replaceAll("問い合わせ", "相談");
      if (next !== current) node.nodeValue = next;
    });
  }

  function syncGuideText() {
    $$(".dpro-guide-card,.dpro-guide-menu").forEach((root) => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach((node) => {
        let text = node.nodeValue || "";
        text = text
          .replaceAll("問い合わせ", "相談受付")
          .replaceAll("営業対応", "営業案件")
          .replaceAll("「顧客」", "「顧客台帳」")
          .replaceAll("顧客対応", "LINE・顧客対応");
        if (text !== node.nodeValue) node.nodeValue = text;
      });
    });
  }

  function startGuideObserver() {
    if (!document.body) return;
    const observer = new MutationObserver(() => {
      window.clearTimeout(startGuideObserver._timer);
      startGuideObserver._timer = window.setTimeout(syncGuideText, 20);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    syncGuideText();
  }

  function startObservers() {
    const title = $("#view-title");
    if (title) new MutationObserver(syncTopTitle).observe(title, { childList: true, characterData: true, subtree: true });

    const dashboard = $('[data-view-panel="dashboard"]');
    if (dashboard) new MutationObserver(syncDashboard).observe(dashboard, { childList: true, subtree: true });

    const dialog = $("#owner-dialog");
    if (dialog) new MutationObserver(syncDialog).observe(dialog, { childList: true, subtree: true, characterData: true });

    const toast = $("#toast-region");
    if (toast) new MutationObserver(syncToast).observe(toast, { childList: true, subtree: true, characterData: true });
  }

  function boot() {
    if (!/\/owner\.html$/.test(location.pathname)) return;
    document.documentElement.dataset.greenOwnerFlow = VERSION;
    syncStaticText();
    syncTopTitle();
    syncDashboard();
    syncDialog();
    startNavObserver();
    startObservers();
    startGuideObserver();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
