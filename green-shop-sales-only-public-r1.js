/* DPRO GREEN / PUBLIC SHOP SALES-ONLY PRESENTATION
 * Version: GREEN-SHOP-SALES-ONLY-PUBLIC-R1.0-20261003
 *
 * Current Kasuya operation:
 * - SHOP is sales-only.
 * - Rental service itself remains available through the main website/LINE.
 * - Future-use rental product data may remain in the API but is not shown as a SHOP transaction.
 */
(() => {
  "use strict";

  const VERSION = "GREEN-SHOP-SALES-ONLY-PUBLIC-R1.0-20261003";
  if (window.__DPRO_GREEN_SHOP_SALES_ONLY_PUBLIC_R1__) return;
  window.__DPRO_GREEN_SHOP_SALES_ONLY_PUBLIC_R1__ = VERSION;
  document.documentElement.dataset.greenShopSalesMode = "sales-only";

  function hide(el) {
    if (!el) return;
    el.hidden = true;
    el.style.setProperty("display", "none", "important");
    el.dataset.greenShopSalesOnlyHidden = "1";
  }

  function applyDetail() {
    document
      .querySelectorAll(".shopv3d-rental-price,[data-v3e-request='rental'],.shopv3e-rental")
      .forEach(hide);

    document.querySelectorAll(".shopv3d-note").forEach((el) => {
      if (el.textContent.includes("レンタル")) hide(el);
    });

    document.querySelectorAll(".shopv3d-section").forEach((section) => {
      const heading = section.querySelector("h3")?.textContent?.trim() || "";
      if (!["ご利用方法", "受取・お届け"].includes(heading)) return;

      section.querySelectorAll(".shopv3d-tags span").forEach((tag) => {
        const text = tag.textContent.trim();
        if (text === "レンタル" || text === "レンタル配達") hide(tag);
      });
    });
  }

  function genericProductLineHandoff(event) {
    const button = event.target.closest("[data-shopv3d-line]");
    if (!button) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const id = String(button.dataset.shopv3dLine || "");
    const products = window.DPROGreenShop?.products?.() || [];
    const product = products.find((p) => String(p.id) === id);

    sessionStorage.setItem(
      "dpro_green_shop_line_product",
      product?.name || "商品"
    );
    sessionStorage.setItem(
      "dpro_green_shop_line_product_id",
      product?.id || id
    );
    sessionStorage.setItem(
      "dpro_green_shop_line_intent",
      "product"
    );

    location.href = "line.html";
  }

  let queued = false;
  function queueApply() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      applyDetail();
    });
  }

  document.addEventListener("click", genericProductLineHandoff, true);

  applyDetail();

  const observer = new MutationObserver(queueApply);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  window.addEventListener("pageshow", queueApply);
  window.addEventListener("dpro-green-shop-ready", queueApply);
})();
