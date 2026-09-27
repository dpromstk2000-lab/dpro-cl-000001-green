(() => {
  "use strict";

  const VERSION = "GREEN-LIFF-RICHMENU-ROUTER-R1-20260927";
  const params = new URLSearchParams(location.search);

  const allowedTabs = new Set([
    "home","contracts","plants","visits","reports","replacements","requests"
  ]);
  const requestedTab = allowedTabs.has(params.get("tab")) ? params.get("tab") : "";
  const requestedRequest = ["issue","change","additional"].includes(params.get("request"))
    ? params.get("request")
    : "";

  if (!requestedTab) {
    document.documentElement.dataset.greenLiffRichmenuRouter = VERSION;
    return;
  }

  let routed = false;
  let attempts = 0;
  const MAX_ATTEMPTS = 120;

  function portalReady() {
    const portal = document.getElementById("portal");
    return Boolean(portal && !portal.hidden);
  }

  function buttonFor(tab) {
    return document.querySelector(`[data-tab="${CSS.escape(tab)}"]`);
  }

  function requestTarget() {
    if (requestedRequest === "issue") return document.getElementById("issue-form");
    if (requestedRequest === "change") return document.getElementById("change-form");
    if (requestedRequest === "additional") return document.getElementById("additional-form");
    return null;
  }

  function focusRequestTarget() {
    if (requestedTab !== "requests" || !requestedRequest) return;

    let count = 0;
    const timer = setInterval(() => {
      count += 1;
      const target = requestTarget();
      if (target) {
        clearInterval(timer);
        target.scrollIntoView({behavior:"smooth", block:"start"});
        target.classList.add("green-liff-deeplink-target");
        const focusable = target.querySelector("textarea,select,input,button");
        setTimeout(() => focusable?.focus?.({preventScroll:true}), 350);
        setTimeout(() => target.classList.remove("green-liff-deeplink-target"), 2400);
      } else if (count > 40) {
        clearInterval(timer);
      }
    }, 100);
  }

  function route() {
    if (routed || !portalReady()) return false;

    const button = buttonFor(requestedTab);
    if (!button || button.hidden) {
      if (requestedTab !== "home") {
        const home = buttonFor("home");
        if (home) home.click();
      }
      routed = true;
      return true;
    }

    button.click();
    routed = true;
    focusRequestTarget();

    try {
      const clean = new URL(location.href);
      clean.searchParams.delete("tab");
      clean.searchParams.delete("request");
      history.replaceState(null, "", clean.pathname + clean.search + clean.hash);
    } catch {}

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
        transition:outline-color .25s ease,box-shadow .25s ease;
      }
    `;
    document.head.appendChild(style);
  }

  function boot() {
    installStyle();

    if (route()) return;

    const observer = new MutationObserver(() => {
      if (route()) observer.disconnect();
    });
    observer.observe(document.body, {
      childList:true,
      subtree:true,
      attributes:true,
      attributeFilter:["hidden"]
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
    document.addEventListener("DOMContentLoaded", boot, {once:true});
  } else {
    boot();
  }
})();