/**
 * DPRO GREEN RENTAL × DPRO CONTACT
 * HARDENED CONTACT R3.11
 * PUBLIC config only. Never store Secrets here.
 */
window.DPRO_CONTACT_CONFIG = Object.freeze({
  version: "DPRO-CONTACT-GREEN-HARDENED-R3.11-20260927",
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
    homeUrl: new URLSearchParams(location.search).get("dpro_build") === "1" ? "owner.html?dpro_build=1" : "owner.html",
    homeLabel: "GREEN管理画面",
    loginUrl: new URLSearchParams(location.search).get("dpro_build") === "1" ? "owner.html?dpro_build=1" : "owner.html",
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

/* BUILD QA only: an expired normal admin session must not override BUILD auth. */
(() => {
  "use strict";
  if (new URLSearchParams(location.search).get("dpro_build") !== "1") return;
  try { sessionStorage.removeItem("green_admin_session_token"); } catch {}
})();
