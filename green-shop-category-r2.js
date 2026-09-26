(() => {
  "use strict";

  const VERSION = "GREEN-EVERGREEN-SHOP-CATEGORY-R2.1-20260923";
  const GROUP = "販売・SHOP";

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  function activate(group) {
    $$("[data-feature-group]").forEach((panel) => {
      panel.hidden = panel.dataset.featureGroup !== group;
    });

    $$("[data-feature-category]").forEach((button) => {
      const active = button.dataset.featureCategory === group;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-current", active ? "true" : "false");
    });

    const select = $("#feature-category-select");
    if (select && select.value !== group) select.value = group;
  }

  function sync() {
    const card = $("#green-shop-feature-card");
    const nav = $("#feature-category-nav");
    const select = $("#feature-category-select");
    if (!card || !nav) return;

    card.dataset.featureGroup = GROUP;

    let button = nav.querySelector(`[data-feature-category="${GROUP}"]`);
    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.dataset.featureCategory = GROUP;
      button.textContent = GROUP;
      nav.prepend(button);
      button.addEventListener("click", () => activate(GROUP));
    }

    if (select && !Array.from(select.options).some((option) => option.value === GROUP)) {
      select.add(new Option(GROUP, GROUP), 0);
    }

    const active =
      nav.querySelector("[data-feature-category].is-active")?.dataset.featureCategory ||
      select?.value ||
      "";

    card.hidden = active !== GROUP;
  }

  function boot() {
    const featureView = document.querySelector('[data-view-panel="features"]');
    if (!featureView) return;

    const observer = new MutationObserver(() => queueMicrotask(sync));
    observer.observe(featureView, { childList: true, subtree: true });

    document.addEventListener(
      "click",
      (event) => {
        if (!event.target.closest?.("[data-feature-category]")) return;
        setTimeout(sync, 0);
      },
      true
    );

    document.addEventListener(
      "change",
      (event) => {
        if (event.target?.id !== "feature-category-select") return;
        setTimeout(sync, 0);
      },
      true
    );

    sync();
    console.info(`[DPRO GREEN] ${VERSION} active`);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();