/**
 * DPRO GREEN RENTAL × DPRO CONTACT
 * CONTACT-V1-7-GREEN-1 / OWNER-FLOW-R1.1
 * PUBLIC config only. Never store Secrets here.
 */
window.DPRO_CONTACT_CONFIG = Object.freeze({
  version: "DPRO-CONTACT-GREEN-LINE-STANDARD-R3.10-20260927",
  enabled: true,
  features: {
    line: true, lineReply: true, search: true, statusManagement: true,
    autoRefresh: false, attachments: true, templates: false,
    assignment: false, aiSuggestions: false, email: false
  },
  apiBaseUrl: "https://dpro-cl-000001-green-line.dpromstk2000.workers.dev",
  layout: "standalone",
  density: "normal",
  branding: {
    brandName: "DPRO GREEN",
    systemName: "GREEN RENTAL / CONTACT",
    brandMark: "葉",
    pageTitle: "LINEでの継続対応を\nひとつに",
    pageLead: "相談受付後や契約中のお客様とのLINE会話を確認し、そのまま返信できます。新しい相談の一覧はGREEN管理画面の「相談受付」で確認します。",
    topbarDescription: "LINEで継続中の会話を確認・返信",
    channelName: "GREEN RENTAL LINE公式",
    homeUrl: "owner.html",
    homeLabel: "GREEN管理画面",
    loginUrl: "owner.html",
    primaryColor: "#1e6a52",
    primaryColor2: "#2f8b68",
    deepColor: "#12382d",
    softColor: "#e7f3ec"
  },
  auth: {
    mode: "adapter",
    publicConfigUrl: "",
    supabaseUrl: "",
    supabasePublishableKey: "",
    sessionStorageKey: "",
    supabaseJsUrl: ""
  },
  operator: {
    defaultName: "GREEN管理者",
    defaultRole: "管理者",
    readOnlyRoles: ["read_only"],
    roleLabels: { owner_admin: "管理者", read_only: "閲覧専用" }
  },
  ui: { autoRefreshSeconds: 30, closeSidebarAfterNavigate: true, showSecurityNote: true }
});

(() => {
  "use strict";
  if (!/\/contact-green\.html$/.test(location.pathname)) return;
  const VERSION = "DPRO-CONTACT-STANDARD-R3.3-20260927";
  if (!document.querySelector('link[data-dpro-contact-r3]')) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `green-contact-standard-r3.css?v=${encodeURIComponent(VERSION)}`;
    link.dataset.dproContactR3 = VERSION;
    document.head.append(link);
  }
  if (!document.querySelector('script[data-dpro-contact-r3]')) {
    const script = document.createElement("script");
    script.src = `green-contact-standard-r3.js?v=${encodeURIComponent(VERSION)}`;
    script.defer = true;
    script.dataset.dproContactR3 = VERSION;
    document.head.append(script);
  }
})();

(() => {
  "use strict";
  if (!/\/contact-green\.html$/.test(location.pathname)) return;
  const VERSION = "DPRO-CONTACT-SCROLL-LOCK-R2-20260927";

  if (!document.querySelector('link[data-dpro-contact-scroll-lock-r2]')) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `green-contact-scroll-lock-r2.css?v=${encodeURIComponent(VERSION)}`;
    link.dataset.dproContactScrollLockR2 = VERSION;
    document.head.append(link);
  }

  if (!document.querySelector('script[data-dpro-contact-scroll-lock-r2]')) {
    const script = document.createElement("script");
    script.src = `green-contact-scroll-lock-r2.js?v=${encodeURIComponent(VERSION)}`;
    script.defer = true;
    script.dataset.dproContactScrollLockR2 = VERSION;
    document.head.append(script);
  }
})();
