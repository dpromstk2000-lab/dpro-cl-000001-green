/* DPRO GREEN KASUYA / LINE OFFICIAL QR LIVE
 * Version: GREEN-LINE-QR-LIVE-R1.2-SHOP-SALES-ONLY-LOADER-20261003
 * Adds the real LINE Official QR to the welcome quick-access overlay.
 * On standalone SHOP only, also loads the public product pagination add-on.
 */
(() => {
  "use strict";

  const VERSION = "GREEN-LINE-QR-LIVE-R1.2-SHOP-SALES-ONLY-LOADER-20261003";
  const QR_SRC = "kasuya-qr-line-official.png";
  const cfg = window.GREEN_WEB_CONFIG || {};
  const lineUrl = String(cfg?.links?.line || "").trim();
  const lineReady = cfg?.publication?.lineApproved === true && !!lineUrl;

  function loadShopPagination() {
    const standalone = document.querySelector('meta[name="dpro-green-shop-standalone"]');
    if (!standalone) return;
    if (document.querySelector('script[data-green-shop-pagination-r1]')) return;

    const script = document.createElement("script");
    script.src = "green-shop-pagination-r1.js?v=GREEN-SHOP-PAGINATION-R1.1-REAL-PRODUCTS-20261003";
    script.async = false;
    script.dataset.greenShopPaginationR1 = "GREEN-SHOP-PAGINATION-R1.1-REAL-PRODUCTS-20261003";
    document.head.appendChild(script);
  }

  loadShopPagination();

  function loadShopSalesOnly() {
    const standalone = document.querySelector('meta[name="dpro-green-shop-standalone"]');
    if (!standalone) return;
    if (document.querySelector('script[data-green-shop-sales-only-public-r1]')) return;

    const script = document.createElement("script");
    script.src = "green-shop-sales-only-public-r1.js?v=GREEN-SHOP-SALES-ONLY-PUBLIC-R1.0-20261003";
    script.async = false;
    script.dataset.greenShopSalesOnlyPublicR1 = "GREEN-SHOP-SALES-ONLY-PUBLIC-R1.0-20261003";
    document.head.appendChild(script);
  }

  loadShopSalesOnly();

  if (!lineReady) return;
  if (window.__DPRO_GREEN_LINE_QR_LIVE__) return;
  window.__DPRO_GREEN_LINE_QR_LIVE__ = VERSION;

  function install(root = document) {
    const cards = [...root.querySelectorAll(".welcome-service")];
    const lineCard = cards.find((card) => {
      const eyebrow = card.querySelector(".welcome-service__eyebrow");
      return String(eyebrow?.textContent || "").trim().toUpperCase() === "LINE OFFICIAL";
    });
    if (!lineCard) return false;

    if (lineCard.tagName === "A") {
      lineCard.href = lineUrl;
      lineCard.setAttribute("aria-label", "グリーン・ポケット福岡粕屋店のLINE公式を開く");
    }

    const visual = lineCard.querySelector(".welcome-service__visual");
    if (!visual) return false;

    let img = visual.querySelector('img[data-line-official-qr]');
    if (!img) {
      visual.replaceChildren();
      img = document.createElement("img");
      img.src = QR_SRC;
      img.alt = "グリーン・ポケット福岡粕屋店 LINE公式のQRコード";
      img.width = 132;
      img.height = 132;
      img.loading = "eager";
      img.decoding = "async";
      img.dataset.lineOfficialQr = VERSION;
      visual.append(img);
    }

    return true;
  }

  install();

  const observer = new MutationObserver(() => install());
  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener("pageshow", () => install());
  window.addEventListener("green:live-sync", () => {
    setTimeout(() => install(), 300);
  });
})();
