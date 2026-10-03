/* DPRO GREEN / PUBLIC SHOP PAGINATION
 * Version: GREEN-SHOP-PAGINATION-R1.1-REAL-PRODUCTS-20261003
 * Production: 6 products per page.
 * BUILD ACCESS QA: ?dpro_build=1&shop_page_qa=1 adds visual-only clones up to 12 products.
 * QA clones never write to the product API and cannot be added to cart.
 */
(() => {
  "use strict";

  const VERSION = "GREEN-SHOP-PAGINATION-R1.1-REAL-PRODUCTS-20261003";
  const PAGE_SIZE = 6;
  const QA_TARGET_COUNT = PAGE_SIZE + 1;

  if (window.__DPRO_GREEN_SHOP_PAGINATION_R1__) return;
  window.__DPRO_GREEN_SHOP_PAGINATION_R1__ = VERSION;
  document.documentElement.dataset.greenShopPagination = VERSION;

  const params = new URLSearchParams(location.search);
  const qaMode =
    params.get("dpro_build") === "1" &&
    params.get("shop_page_qa") === "1";

  let page = 1;
  let queued = false;

  function installStyle() {
    if (document.getElementById("green-shop-pagination-r1-style")) return;

    const style = document.createElement("style");
    style.id = "green-shop-pagination-r1-style";
    style.textContent =
      ".shop-pagination-r1{display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;margin:28px auto 0;padding:14px 0 2px}" +
      ".shop-pagination-r1 button{min-height:44px;padding:0 18px;border:1px solid #c9d8cf;border-radius:999px;background:#fff;color:#173d2b;font:inherit;font-weight:900;cursor:pointer}" +
      ".shop-pagination-r1 button:hover:not(:disabled){background:#edf5ef}" +
      ".shop-pagination-r1 button:disabled{opacity:.35;cursor:not-allowed}" +
      ".shop-pagination-r1-status{min-width:150px;text-align:center;color:#53665b;font-size:13px;font-weight:800}" +
      ".shop-pagination-r1-page{display:inline-block;margin-right:5px;color:#173d2b;font-size:15px;font-weight:900}" +
      ".shop-pagination-r1-qa{margin:0 0 16px;padding:12px 14px;border:1px solid #dfc96b;border-radius:14px;background:#fff7cf;color:#624f0f;font-size:12px;font-weight:800;line-height:1.7}" +
      ".shop-pagination-r1-qa strong{display:block;font-size:13px;margin-bottom:2px}" +
      ".product[hidden]{display:none!important}" +
      ".product[data-shop-qa-clone='1']{position:relative}" +
      ".product[data-shop-qa-clone='1']::after{content:'QA表示';position:absolute;top:10px;left:10px;z-index:3;padding:5px 8px;border-radius:999px;background:#745b00;color:#fff;font-size:10px;font-weight:900;letter-spacing:.04em}" +
      ".product[data-shop-qa-clone='1'] button{opacity:.55;cursor:not-allowed}" +
      "@media(max-width:620px){.shop-pagination-r1{gap:8px}.shop-pagination-r1 button{min-height:46px;padding:0 15px}.shop-pagination-r1-status{order:-1;width:100%}}";

    document.head.append(style);
  }

  function grid() {
    return document.getElementById("product-grid");
  }

  function realCards() {
    const g = grid();
    if (!g) return [];
    return Array.from(g.children).filter((el) =>
      el.classList?.contains("product") &&
      el.dataset.shopQaClone !== "1"
    );
  }

  function allCards() {
    const g = grid();
    if (!g) return [];
    return Array.from(g.children).filter((el) =>
      el.classList?.contains("product")
    );
  }

  function ensureQaBanner() {
    const g = grid();
    if (!g) return;

    let banner = document.getElementById("shop-pagination-r1-qa");

    if (!qaMode) {
      banner?.remove();
      return;
    }

    if (!banner) {
      banner = document.createElement("div");
      banner.id = "shop-pagination-r1-qa";
      banner.className = "shop-pagination-r1-qa";
      banner.innerHTML =
        "<strong>BUILD ACCESS｜2ページ表示確認</strong>" +
        "本番公開商品が7件以上ある場合は実商品だけでページ分けを確認します。7件未満の場合だけ、この画面にQA確認用の商品を1件補います。商品DBは変更しません。";
      g.parentNode.insertBefore(banner, g);
    }
  }

  function ensureQaCards() {
    if (!qaMode) return;

    const g = grid();
    const originals = realCards();
    if (!g || !originals.length) return;

    if (originals.length > PAGE_SIZE) return;

    let current = allCards();
    if (current.length >= QA_TARGET_COUNT) return;

    let index = current.length;

    while (index < QA_TARGET_COUNT) {
      const source = originals[index % originals.length];
      const clone = source.cloneNode(true);

      clone.dataset.shopQaClone = "1";
      clone.classList.add("is-visible");

      const title = clone.querySelector("h3");
      if (title) {
        title.textContent =
          "QA確認用・追加商品 " + (index + 1);
      }

      clone.querySelectorAll("button").forEach((button) => {
        button.disabled = true;
        button.removeAttribute("data-add");
        button.removeAttribute("data-line-product");

        if (button.classList.contains("add")) {
          button.textContent = "QA表示";
        }
        if (button.classList.contains("quick-add")) {
          button.textContent = "QA";
        }
      });

      g.append(clone);
      index += 1;
      current = allCards();
    }
  }

  function ensurePager() {
    const g = grid();
    if (!g) return null;

    let pager = document.getElementById("shop-pagination-r1");

    if (!pager) {
      pager = document.createElement("nav");
      pager.id = "shop-pagination-r1";
      pager.className = "shop-pagination-r1";
      pager.setAttribute("aria-label", "商品一覧のページ切り替え");
      pager.innerHTML =
        "<button type='button' data-page-prev>← 前へ</button>" +
        "<div class='shop-pagination-r1-status' data-page-status></div>" +
        "<button type='button' data-page-next>次へ →</button>";

      g.insertAdjacentElement("afterend", pager);

      pager
        .querySelector("[data-page-prev]")
        .addEventListener("click", () => {
          if (page <= 1) return;
          page -= 1;
          applyPagination(true);
        });

      pager
        .querySelector("[data-page-next]")
        .addEventListener("click", () => {
          const pages = Math.max(
            1,
            Math.ceil(allCards().length / PAGE_SIZE)
          );
          if (page >= pages) return;
          page += 1;
          applyPagination(true);
        });
    }

    return pager;
  }

  function applyPagination(scroll) {
    installStyle();
    ensureQaBanner();
    ensureQaCards();

    const cards = allCards();
    const pager = ensurePager();

    if (!pager) return;

    if (!cards.length) {
      pager.hidden = true;
      return;
    }

    const pages = Math.max(
      1,
      Math.ceil(cards.length / PAGE_SIZE)
    );

    page = Math.min(Math.max(page, 1), pages);

    const start = (page - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;

    cards.forEach((card, index) => {
      card.hidden =
        index < start ||
        index >= end;

      if (!card.hidden) {
        card.classList.add("is-visible");
      }
    });

    pager.hidden = pages <= 1;

    const prev =
      pager.querySelector("[data-page-prev]");
    const next =
      pager.querySelector("[data-page-next]");
    const status =
      pager.querySelector("[data-page-status]");

    if (prev) {
      prev.disabled = page <= 1;
    }

    if (next) {
      next.disabled = page >= pages;
    }

    if (status) {
      const visibleFrom = start + 1;
      const visibleTo = Math.min(
        end,
        cards.length
      );

      status.innerHTML =
        "<span class='shop-pagination-r1-page'>" +
        page +
        " / " +
        pages +
        "ページ</span>" +
        "（" +
        visibleFrom +
        "〜" +
        visibleTo +
        " / " +
        cards.length +
        "商品）";
    }

    if (scroll) {
      document
        .getElementById("products")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
    }
  }

  function queueApply() {
    if (queued) return;

    queued = true;

    setTimeout(() => {
      queued = false;
      applyPagination(false);
    }, 30);
  }

  function bindFilterReset() {
    const filters =
      document.getElementById("filters");

    if (
      !filters ||
      filters.dataset.shopPaginationR1Bound === "1"
    ) {
      return;
    }

    filters.dataset.shopPaginationR1Bound = "1";

    filters.addEventListener("click", (event) => {
      const button =
        event.target.closest("[data-cat]");

      if (!button) return;

      page = 1;

      setTimeout(() => {
        applyPagination(false);
      }, 50);
    });
  }

  function start() {
    installStyle();
    bindFilterReset();

    const g = grid();
    if (!g) return;

    const observer =
      new MutationObserver(queueApply);

    observer.observe(g, {
      childList: true
    });

    applyPagination(false);

    window.addEventListener(
      "dpro-green-shop-ready",
      () => {
        page = 1;

        setTimeout(() => {
          bindFilterReset();
          applyPagination(false);
        }, 30);
      }
    );

    window.addEventListener(
      "pageshow",
      () => {
        setTimeout(() => {
          bindFilterReset();
          applyPagination(false);
        }, 30);
      }
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      start,
      { once: true }
    );
  } else {
    start();
  }
})();
