(() => {
  "use strict";

  const VERSION = "GREEN-LIFF-RICHMENU-ROUTER-R2-20260927";
  const STORAGE_KEY = "dpro_green_richmenu_route_r2";
  const allowedTabs = new Set(["home","contracts","plants","visits","reports","replacements","requests"]);
  const allowedRequests = new Set(["issue","change","additional"]);

  let routeInfo = null;
  let routed = false;
  let attempts = 0;
  const MAX_ATTEMPTS = 160;

  function sanitizeRoute(tab, request) {
    const safeTab = allowedTabs.has(tab) ? tab : "";
    const safeRequest = allowedRequests.has(request) ? request : "";
    return safeTab ? { tab: safeTab, request: safeRequest } : null;
  }

  function parseRouteFromSearch() {
    const params = new URLSearchParams(location.search);
    return sanitizeRoute(params.get("tab") || "", params.get("request") || "");
  }

  function loadStoredRoute() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      return sanitizeRoute(data?.tab || "", data?.request || "");
    } catch {
      return null;
    }
  }

  function storeRoute(info) {
    if (!info) return;
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(info)); } catch {}
  }

  function clearStoredRoute() {
    try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
  }

  function hasLiffParams() {
    const params = new URLSearchParams(location.search);
    return [...params.keys()].some((key) => key.startsWith("liff."));
  }

  async function initializeLiffBeforeReadingRoute() {
    if (!window.liff || !window.GREEN_CONFIG?.LIFF_ID) return;
    if (hasLiffParams() || location.search.includes("tab=") || loadStoredRoute()) {
      await window.liff.init({ liffId: window.GREEN_CONFIG.LIFF_ID });
    }
  }

  function portalInitialRenderReady() {
    const portal = document.getElementById("portal");
    const content = document.getElementById("tab-content");
    if (!portal || portal.hidden || !content) return false;
    return Boolean(content.querySelector(".portal-section, .alert, .empty-state"));
  }

  function buttonFor(tab) {
    return document.querySelector(`[data-tab="${CSS.escape(tab)}"]`);
  }

  function requestTarget(request) {
    if (request === "issue") return document.getElementById("issue-form");
    if (request === "change") return document.getElementById("change-form");
    if (request === "additional") return document.getElementById("additional-form");
    return null;
  }

  function focusRequestTarget(request) {
    if (!request) return;
    let count = 0;
    const timer = setInterval(() => {
      count += 1;
      const target = requestTarget(request);
      if (target) {
        clearInterval(timer);
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        target.classList.add("green-liff-deeplink-target");
        setTimeout(() => {
          target.querySelector("textarea,select,input,button")?.focus?.({ preventScroll: true });
        }, 350);
        setTimeout(() => target.classList.remove("green-liff-deeplink-target"), 2400);
      } else if (count > 50) {
        clearInterval(timer);
      }
    }, 100);
  }

  function cleanRouteParamsAfterRouting() {
    try {
      const clean = new URL(location.href);
      clean.searchParams.delete("tab");
      clean.searchParams.delete("request");
      history.replaceState(null, "", clean.pathname + clean.search + clean.hash);
    } catch {}
  }

  function route() {
    if (routed || !routeInfo || !portalInitialRenderReady()) return false;

    const button = buttonFor(routeInfo.tab);
    if (!button || button.hidden) {
      buttonFor("home")?.click();
      routed = true;
      clearStoredRoute();
      return true;
    }

    button.click();
    routed = true;

    if (routeInfo.tab === "requests") {
      focusRequestTarget(routeInfo.request);
    }

    clearStoredRoute();
    cleanRouteParamsAfterRouting();
    return true;
  }

  function installStyle() {
    if (document.getElementById("green-liff-richmenu-router-style")) return;
    const style = document.createElement("style");
    style.id = "green-liff-richmenu-router-style";
    style.textContent = `
      .green-liff-deeplink-target{
        outline:3px solid rgba(47,139,104,.35);
        box-shadow:0 0 0 7px rgba(47,139,104,.10);
      }
    `;
    document.head.appendChild(style);
  }

  async function boot() {
    installStyle();

    try {
      await initializeLiffBeforeReadingRoute();
    } catch (error) {
      console.warn("[DPRO GREEN] LIFF init for rich-menu routing failed.", error);
    }

    routeInfo = parseRouteFromSearch() || loadStoredRoute();
    if (!routeInfo) return;
    storeRoute(routeInfo);

    if (route()) return;

    const observer = new MutationObserver(() => {
      if (route()) observer.disconnect();
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["hidden","class"]
    });

    const timer = setInterval(() => {
      attempts += 1;
      if (route() || attempts >= MAX_ATTEMPTS) {
        clearInterval(timer);
        if (routed) observer.disconnect();
      }
    }, 250);
  }

  document.documentElement.dataset.greenLiffRichmenuRouter = VERSION;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();