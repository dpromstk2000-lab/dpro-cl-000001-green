/** DPRO GREEN LINE / CONTACT-V1-7-GREEN-1 / CUSTOMER-HERO-2 / SHOP-R1.2 / OWNER-FLOW-R1 / OWNER-UX-FIX-R1 */
window.GREEN_CONFIG = Object.freeze({
  API_BASE: "https://dpro-cl-000001-green-core.dpromstk2000.workers.dev",
  FACILITY_CODE: "cl_000001_green",
  LIFF_ID: "2011750460-EpN149VY",
  DEMO_MEMBER_TOKEN: "",
  DEMO_CUSTOMER_NUMBER: "",
  MAX_PHOTOS: 4,
  MAX_IMAGE_EDGE: 1600,
  JPEG_QUALITY: 0.82,
  CONTACT_ENABLED: true,
  CONTACT_URL: "contact-green.html",
  SHOP_MODULE: Object.freeze({
    enabled: false,
    websiteUrl: "",
    storageMode: "disabled",
  }),
  CUSTOMER_HERO: Object.freeze({
    enabled: true,
    desktopImage: "https://dpromstk2000-lab.github.io/dpro-green-website/owner-hero.webp",
    mobileImage: "https://dpromstk2000-lab.github.io/dpro-green-website/hero-mobile-lobby.webp",
    eyebrow: "GREEN RENTAL CUSTOMER PORTAL",
    title: "空間に、やすらぎと品格を。",
    badge: "ご利用中のお客様専用マイページ",
    lead: "設置植物・次回訪問・作業報告・ご相談を、ひとつの画面で。",
    alt: "観葉植物のある心地よい空間",
  }),
});

window.DPRO_CUSTOMER_HERO_CONFIG = window.GREEN_CONFIG.CUSTOMER_HERO;

(() => {
  "use strict";
  const HERO_ADMIN_VERSION = "DPRO-CUSTOMER-HERO-2-20260808";
  const SHOP_OWNER_VERSION = "GREEN-SHOP-OWNER-R1.3-20260923";
  const OWNER_FLOW_VERSION = "GREEN-OWNER-FLOW-R1.2-20260901";
  const OWNER_UX_FIX_VERSION = "GREEN-OWNER-UX-FIX-R2.9-20260915";
  const OWNER_JST_FIX_VERSION = "GREEN-OWNER-JST-DATETIME-FIX-R1.4-20260916";
  const ANNOUNCEMENT_JST_FIX_VERSION = "GREEN-ANNOUNCEMENT-JST-FIX-R1.2-20260916";
  const LINE_ACCESS_VERSION = "GREEN-LINE-ACCESS-R1-20260916";
  const BRUSHUP_VERSION = "GREEN-BRUSHUP-R30-20260916";
  const STAFF_MANAGEMENT_VERSION = "GREEN-STAFF-MANAGEMENT-R31.2-20260923";
  const INSTALLATION_UI_VERSION = "GREEN-INSTALLATION-UI-R32-20260917";
  const CARE_OVERDUE_VERSION = "GREEN-CARE-OVERDUE-R33-20260917";

  function installContactMenu() {
    if (!window.GREEN_CONFIG?.CONTACT_ENABLED) return;
    if (!/\/owner\.html$/.test(location.pathname)) return;
    const nav = document.querySelector(".owner-nav");
    if (!nav || document.getElementById("green-contact-menu")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.id = "green-contact-menu";
    button.innerHTML = "<span>話</span>LINE・顧客対応";
    button.setAttribute("aria-label", "LINEで継続中のお客様対応を開く");
    button.title = "LINEで継続中の会話を確認・返信";
    button.addEventListener("click", () => {
      location.href = window.GREEN_CONFIG.CONTACT_URL || "contact-green.html";
    });
    const messageButton = nav.querySelector('[data-view="messages"]');
    if (messageButton) nav.insertBefore(button, messageButton);
    else nav.append(button);
  }

  function installCustomerHeroAdmin() {
    if (!/\/owner\.html$/.test(location.pathname)) return;
    if (!document.querySelector('link[data-customer-hero-admin]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = `customer-hero-admin.css?v=${encodeURIComponent(HERO_ADMIN_VERSION)}`;
      link.dataset.customerHeroAdmin = HERO_ADMIN_VERSION;
      document.head.append(link);
    }
    if (!document.querySelector('script[data-customer-hero-admin]')) {
      const script = document.createElement("script");
      script.src = `customer-hero-admin.js?v=${encodeURIComponent(HERO_ADMIN_VERSION)}`;
      script.defer = true;
      script.dataset.customerHeroAdmin = HERO_ADMIN_VERSION;
      document.head.append(script);
    }
  }

  function installTutorialRuntime() {
    if (document.documentElement.dataset.dproTutorialRuntime === "green-r3") return;
    document.documentElement.dataset.dproTutorialRuntime = "green-r3";
    if (!document.querySelector('link[data-dpro-tutorial-green]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "dpro-tutorial-green.css?v=GREEN-TUTORIAL-R3.1-20260822";
      link.dataset.dproTutorialGreen = "R3";
      document.head.append(link);
    }
    if (!document.querySelector('script[data-dpro-tutorial-green]')) {
      const script = document.createElement("script");
      script.src = "dpro-tutorial-green.js?v=GREEN-TUTORIAL-R3.1-20260822";
      script.defer = true;
      script.dataset.dproTutorialGreen = "R3";
      document.head.append(script);
    }
  }

  function installShopModule() {
    if (!window.GREEN_CONFIG?.SHOP_MODULE?.enabled) return;
    if (!/\/owner\.html$/.test(location.pathname)) return;
    if (document.querySelector('script[data-green-shop-owner]')) return;
    const script = document.createElement("script");
    script.src = `green-shop-owner.js?v=${encodeURIComponent(SHOP_OWNER_VERSION)}`;
    script.defer = true;
    script.dataset.greenShopOwner = SHOP_OWNER_VERSION;
    document.head.append(script);
  }

  function installContactFlowCopy() {
    if (!/\/contact-green\.html$/.test(location.pathname)) return;

    const setTextIfChanged = (element, text) => {
      if (element && element.textContent !== text) element.textContent = text;
    };

    const apply = () => {
      const pageTitle = document.getElementById("pageTitle");
      const pageLead = document.getElementById("pageLead");
      const topDescription = document.getElementById("topbarDescription");

      setTextIfChanged(pageTitle, "LINEでの継続対応をひとつに");
      if (pageLead) {
        const preparing = window.DPRO_CONTACT_CONFIG?.features?.line === false;
        setTextIfChanged(
          pageLead,
          preparing
            ? "現在はLINE公式アカウント接続前の準備モードです。接続後は、相談受付後や契約中のお客様とのLINE会話をこの画面で確認・返信できます。"
            : "相談受付後や契約中のお客様とのLINE会話を確認し、そのまま返信できます。新しい相談の一覧はGREEN管理画面の「相談受付」で確認します。"
        );
      }
      if (window.DPRO_CONTACT_CONFIG?.features?.line !== false) {
        setTextIfChanged(topDescription, "LINEで継続中の会話を確認・返信");
      }
    };

    const start = () => {
      apply();
      const target = document.getElementById("app") || document.body;
      if (!target) return;
      const observer = new MutationObserver(() => {
        clearTimeout(start._timer);
        start._timer = setTimeout(apply, 10);
      });
      observer.observe(target, { childList: true, subtree: true, characterData: true });
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => setTimeout(start, 0), { once: true });
    } else {
      setTimeout(start, 0);
    }
  }

  function installOwnerFlowClarity() {
    if (!/\/owner\.html$/.test(location.pathname)) return;
    if (!document.querySelector('link[data-green-owner-flow]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = `green-owner-flow.css?v=${encodeURIComponent(OWNER_FLOW_VERSION)}`;
      link.dataset.greenOwnerFlow = OWNER_FLOW_VERSION;
      document.head.append(link);
    }
    if (!document.querySelector('script[data-green-owner-flow]')) {
      const script = document.createElement("script");
      script.src = `green-owner-flow.js?v=${encodeURIComponent(OWNER_FLOW_VERSION)}`;
      script.defer = true;
      script.dataset.greenOwnerFlow = OWNER_FLOW_VERSION;
      document.head.append(script);
    }
  }

  function installOwnerUxFix() {
    if (!/\/owner\.html$/.test(location.pathname)) return;
    if (!document.querySelector('link[data-green-owner-ux-fix]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = `green-owner-ux-fix.css?v=${encodeURIComponent(OWNER_UX_FIX_VERSION)}`;
      link.dataset.greenOwnerUxFix = OWNER_UX_FIX_VERSION;
      document.head.append(link);
    }
    if (!document.querySelector('script[data-green-owner-ux-fix]')) {
      const script = document.createElement("script");
      script.src = `green-owner-ux-fix.js?v=${encodeURIComponent(OWNER_UX_FIX_VERSION)}`;
      script.defer = true;
      script.dataset.greenOwnerUxFix = OWNER_UX_FIX_VERSION;
      document.head.append(script);
    }
  }

  function installOwnerJstDatetimeFix() {
    if (!/\/owner\.html$/.test(location.pathname)) return;
    if (document.querySelector('script[data-green-owner-jst-fix]')) return;
    const script = document.createElement("script");
    script.src = `green-owner-jst-fix.js?v=${encodeURIComponent(OWNER_JST_FIX_VERSION)}`;
    script.defer = true;
    script.dataset.greenOwnerJstFix = OWNER_JST_FIX_VERSION;
    document.head.append(script);
  }


  function installAnnouncementJstFix() {
    if (!/\/owner\.html$/.test(location.pathname)) return;
    if (document.querySelector('script[data-green-announcement-jst-fix]')) return;
    const script = document.createElement("script");
    script.src = `green-announcement-jst-fix.js?v=${encodeURIComponent(ANNOUNCEMENT_JST_FIX_VERSION)}`;
    script.defer = true;
    script.dataset.greenAnnouncementJstFix = ANNOUNCEMENT_JST_FIX_VERSION;
    document.head.append(script);
  }

  function installLineAccess() {
    const isOwner = /\/owner\.html$/.test(location.pathname);
    const isMember = /\/member\.html$/.test(location.pathname);
    if (!isOwner && !isMember) return;
    const key = isOwner ? "greenLineAccessOwner" : "greenLineAccessMember";
    if (document.querySelector(`script[data-${isOwner ? "green-line-access-owner" : "green-line-access-member"}]`)) return;
    const script = document.createElement("script");
    script.src = `${isOwner ? "green-line-access-owner.js" : "green-line-access-member.js"}?v=${encodeURIComponent(LINE_ACCESS_VERSION)}`;
    script.defer = true;
    if (isOwner) script.dataset.greenLineAccessOwner = LINE_ACCESS_VERSION;
    else script.dataset.greenLineAccessMember = LINE_ACCESS_VERSION;
    document.head.append(script);
    document.documentElement.dataset[key] = LINE_ACCESS_VERSION;
  }

  function installBrushupR30() {
    const isOwner = /\/owner\.html$/.test(location.pathname);
    const isMember = /\/member\.html$/.test(location.pathname);
    if (!isOwner && !isMember) return;
    if (document.querySelector('script[data-green-brushup-r30]')) return;
    const script = document.createElement("script");
    script.src = `green-brushup-r30.js?v=${encodeURIComponent(BRUSHUP_VERSION)}`;
    script.defer = true;
    script.dataset.greenBrushupR30 = BRUSHUP_VERSION;
    document.head.append(script);
  }

  function installStaffManagementR31() {
    if (!/\/owner\.html$/.test(location.pathname)) return;
    if (document.querySelector('script[data-green-staff-management-r31]')) return;
    const script = document.createElement("script");
    script.src = `green-staff-management-r31.js?v=${encodeURIComponent(STAFF_MANAGEMENT_VERSION)}`;
    script.defer = true;
    script.dataset.greenStaffManagementR31 = STAFF_MANAGEMENT_VERSION;
    document.head.append(script);
  }


  function installInstallationUiR32() {
    if (!/\/owner\.html$/.test(location.pathname)) return;
    if (document.querySelector('script[data-green-installation-ui-r32]')) return;
    const script = document.createElement("script");
    script.src = `green-installation-ui-r32.js?v=${encodeURIComponent(INSTALLATION_UI_VERSION)}`;
    script.defer = true;
    script.dataset.greenInstallationUiR32 = INSTALLATION_UI_VERSION;
    document.head.append(script);
  }


  function installCareOverdueR33() {
    if (!/\/owner\.html$/.test(location.pathname)) return;
    if (document.querySelector('script[data-green-care-overdue-r33]')) return;
    const script = document.createElement("script");
    script.src = `green-care-overdue-r33.js?v=${encodeURIComponent(CARE_OVERDUE_VERSION)}`;
    script.defer = true;
    script.dataset.greenCareOverdueR33 = CARE_OVERDUE_VERSION;
    document.head.append(script);
  }

  function boot() {
    installContactMenu();
    installCustomerHeroAdmin();
    installTutorialRuntime();
    installShopModule();
    installOwnerFlowClarity();
    installOwnerUxFix();
    installOwnerJstDatetimeFix();
    installAnnouncementJstFix();
    installLineAccess();
    installBrushupR30();
    installStaffManagementR31();
    installInstallationUiR32();
    installCareOverdueR33();
    installContactFlowCopy();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
