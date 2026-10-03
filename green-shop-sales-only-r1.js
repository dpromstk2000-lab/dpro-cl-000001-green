/* DPRO GREEN / OWNER SHOP SALES-ONLY PRESENTATION
 * Version: GREEN-SHOP-SALES-ONLY-R1.0-20261003
 *
 * Current Kasuya policy:
 * - Public SHOP is operated as sales-only.
 * - Rental data/fields remain stored internally for future use.
 * - This file only hides rental controls/copy from the normal Owner workflow.
 * - Hidden form controls remain in the DOM so existing future-use values are preserved.
 */
(() => {
  "use strict";

  const VERSION = "GREEN-SHOP-SALES-ONLY-R1.0-20261003";
  if (window.__DPRO_GREEN_SHOP_SALES_ONLY_R1__) return;
  window.__DPRO_GREEN_SHOP_SALES_ONLY_R1__ = VERSION;
  document.documentElement.dataset.greenShopSalesMode = "sales-only";

  function installStyle() {
    if (document.getElementById("green-shop-sales-only-r1-style")) return;
    const style = document.createElement("style");
    style.id = "green-shop-sales-only-r1-style";
    style.textContent = `
      [data-green-shop-sales-only-hidden="1"]{display:none!important}
      .green-shop-sales-only-note{
        margin:0 0 14px;
        padding:12px 14px;
        border:1px solid #cfe1d6;
        border-radius:14px;
        background:#f2f8f4;
        color:#315543;
        font-size:12px;
        line-height:1.7;
      }
      .green-shop-sales-only-note strong{
        display:block;
        color:#173d2b;
        font-size:13px;
        margin-bottom:2px;
      }
    `;
    document.head.append(style);
  }

  function hideHost(input) {
    if (!input) return;
    const host =
      input.closest(".shopv3-choice") ||
      input.closest(".shopv3-setting") ||
      input.closest("label") ||
      input.parentElement;
    if (host) host.dataset.greenShopSalesOnlyHidden = "1";
  }

  function replaceText(el, from, to) {
    if (!el || !el.textContent.includes(from)) return;
    el.textContent = el.textContent.replace(from, to);
  }

  function apply() {
    installStyle();

    document
      .querySelectorAll('[data-shop-setting="rental"],[data-shop-setting="rentalDelivery"]')
      .forEach(hideHost);

    document
      .querySelectorAll('input[name="transactionModes"][value="rental"]')
      .forEach(hideHost);

    document
      .querySelectorAll('input[name="fulfillmentModes"][value="rental_delivery"]')
      .forEach(hideHost);

    document
      .querySelectorAll('input[name="rentalMonthlyYen"]')
      .forEach(hideHost);

    document
      .querySelectorAll(".shopv3-price small")
      .forEach((el) => {
        if (el.textContent.includes("レンタル")) {
          el.dataset.greenShopSalesOnlyHidden = "1";
        }
      });

    document
      .querySelectorAll(".shopv3-note,.owner-panel-head p,#shop-sales-tab-help-r41")
      .forEach((el) => {
        replaceText(
          el,
          "商品ごとに「通常販売・取り置き・レンタル・問い合わせ」と「配送・店頭受取・自店配達・レンタル配達」を設定できます。",
          "現在の粕屋店SHOPは販売専用です。商品ごとに「通常販売・取り置き・問い合わせ」と「配送・店頭受取・自店配達」を設定できます。"
        );
        replaceText(
          el,
          "現在の通常販売注文を管理します。取り置き・レンタル受付画面は後工程で公開SHOPへ接続します。",
          "通常販売と取り置きの注文・受付を管理します。"
        );
        replaceText(
          el,
          "通常販売・取り置き・レンタル・問い合わせの受付を確認し、次の対応へ進めます。日々の注文対応はここを使います。",
          "通常販売・取り置き・問い合わせの受付を確認し、次の対応へ進めます。日々の注文対応はここを使います。"
        );
        replaceText(
          el,
          "配送・店頭受取・レンタルなどSHOP全体の機能を切り替えます。通常は頻繁に変更しない設定です。",
          "配送・店頭受取などSHOP全体の機能を切り替えます。通常は頻繁に変更しない設定です。"
        );
      });

    const shell = document.querySelector(".shopv3-shell");
    if (shell && !document.getElementById("green-shop-sales-only-note")) {
      const note = document.createElement("div");
      note.id = "green-shop-sales-only-note";
      note.className = "green-shop-sales-only-note";
      note.innerHTML =
        "<strong>現在のSHOP運用：販売専用</strong>" +
        "レンタル機能の将来用データは内部に残していますが、通常の商品登録・公開操作では表示しません。";
      const first = shell.querySelector(".shopv3-note");
      if (first) first.insertAdjacentElement("afterend", note);
      else shell.prepend(note);
    }
  }

  let queued = false;
  const queue = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      apply();
    });
  };

  apply();

  const observer = new MutationObserver(queue);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  window.addEventListener("pageshow", queue);
})();
