/* DPRO GREEN / OWNER SHOP SALES-ONLY PRESENTATION
 * Version: GREEN-SHOP-SALES-ONLY-R1.3-REGISTER-PREVIEW-20261003
 *
 * Current Kasuya policy:
 * - Public SHOP is operated as sales-only.
 * - Rental data/fields remain stored internally for future use.
 * - Rental controls and product rental badges are hidden from normal Owner workflow.
 * - Historical rental orders are preserved and folded under "過去レンタル履歴".
 */
(() => {
  "use strict";

  const VERSION = "GREEN-SHOP-SALES-ONLY-R1.3-REGISTER-PREVIEW-20261003";
  if (window.__DPRO_GREEN_SHOP_SALES_ONLY_R13__) return;
  window.__DPRO_GREEN_SHOP_SALES_ONLY_R13__ = VERSION;
  document.documentElement.dataset.greenShopSalesMode = "sales-only";

  function installStyle() {
    if (document.getElementById("green-shop-sales-only-r11-style")) return;

    const style = document.createElement("style");
    style.id = "green-shop-sales-only-r11-style";
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

      .green-shop-rental-history-r11{
        margin-top:14px;
        border:1px solid #d9e3de;
        border-radius:14px;
        background:#fafcfb;
        overflow:hidden;
      }
      .green-shop-rental-history-r11 summary{
        cursor:pointer;
        padding:12px 14px;
        color:#315543;
        font-size:12px;
        font-weight:900;
        list-style-position:inside;
      }
      .green-shop-rental-history-r11-note{
        margin:0 14px 10px;
        padding:9px 11px;
        border-radius:10px;
        background:#f4f7f5;
        color:#66756d;
        font-size:11px;
        line-height:1.6;
      }
      .green-shop-rental-history-r11-list{
        display:grid;
        gap:10px;
        padding:0 14px 14px;
      }
      .green-shop-rental-history-r11-list .shopv3f-order{
        opacity:.9;
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

    if (host) {
      host.dataset.greenShopSalesOnlyHidden = "1";
    }
  }

  function replaceText(el, from, to) {
    if (!el || !el.textContent.includes(from)) return;
    el.textContent = el.textContent.replace(from, to);
  }

  function hideRentalProductUi() {
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
      .querySelectorAll(".shopv3-product .shopv3-meta .shopv3-badge")
      .forEach((el) => {
        if (el.textContent.trim() === "レンタル") {
          el.dataset.greenShopSalesOnlyHidden = "1";
        }
      });
  }

  function applySalesCopy() {
    document
      .querySelectorAll(
        ".shopv3-note,.owner-panel-head p,#shop-sales-tab-help-r41,.shopv3f-head p"
      )
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
          "通常販売・取り置き・レンタル・問い合わせを、次にやることが分かる形でまとめて管理します。",
          "通常販売・取り置き・問い合わせを、次にやることが分かる形でまとめて管理します。"
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

  function foldRentalHistory() {
    const orderCard = document.querySelector(
      '[data-shopv3f-order-workflow]'
    );
    if (!orderCard) return;

    const rentalFilter = orderCard.querySelector(
      '[data-shopv3f-filter="rental"]'
    );

    if (rentalFilter?.classList.contains("is-active")) {
      const allFilter = orderCard.querySelector(
        '[data-shopv3f-filter="all"]'
      );
      allFilter?.click();
      return;
    }

    if (rentalFilter) {
      rentalFilter.dataset.greenShopSalesOnlyHidden = "1";
    }

    const list = orderCard.querySelector(".shopv3f-list");
    if (!list) return;

    const rentalOrders = Array.from(
      list.querySelectorAll(":scope > .shopv3f-order")
    ).filter((order) => {
      const mode = order.querySelector(".shopv3f-pill.mode");
      return mode?.textContent.trim() === "レンタル";
    });

    let details = orderCard.querySelector(
      "#green-shop-rental-history-r11"
    );

    const existingHistoryCount = details
      ? details.querySelectorAll(
          ".green-shop-rental-history-r11-list > .shopv3f-order"
        ).length
      : 0;

    if (!rentalOrders.length && !existingHistoryCount) {
      details?.remove();
      refreshStats(orderCard);
      return;
    }

    if (!details) {
      details = document.createElement("details");
      details.id = "green-shop-rental-history-r11";
      details.className = "green-shop-rental-history-r11";
      details.innerHTML = `
        <summary></summary>
        <div class="green-shop-rental-history-r11-note">
          現在の販売専用運用には含めません。過去の確認用・将来用履歴としてデータは残しています。
        </div>
        <div class="green-shop-rental-history-r11-list"></div>
      `;
      list.insertAdjacentElement("afterend", details);
    }

    const summary = details.querySelector("summary");
    const historyList = details.querySelector(
      ".green-shop-rental-history-r11-list"
    );

    rentalOrders.forEach((order) => {
      historyList.append(order);
    });

    const count = historyList.querySelectorAll(
      ":scope > .shopv3f-order"
    ).length;

    if (summary) {
      summary.textContent =
        "過去レンタル履歴（将来用） " + count + "件";
    }

    refreshStats(orderCard);
  }

  function refreshStats(orderCard) {
    const list = orderCard.querySelector(".shopv3f-list");
    if (!list) return;

    const operationalOrders = Array.from(
      list.querySelectorAll(":scope > .shopv3f-order")
    );

    const newCount = operationalOrders.filter((order) =>
      order.classList.contains("is-new")
    ).length;

    const completed = operationalOrders.filter((order) =>
      order.querySelector(".shopv3f-pill.status-done")
    ).length;

    const active = Math.max(
      0,
      operationalOrders.length - newCount - completed
    );

    const stats = orderCard.querySelectorAll(
      ".shopv3f-stat strong"
    );

    if (stats[0]) stats[0].textContent = String(newCount);
    if (stats[1]) stats[1].textContent = String(active);
    if (stats[2]) stats[2].textContent = String(completed);
  }


  let pendingPrimaryPreviewSrc = "";

  function isNewProductDialog(dialog) {
    if (!dialog?.open) return false;
    const title = dialog.querySelector(".shopv3-dialog-head strong");
    return String(title?.textContent || "").trim() === "商品を登録";
  }

  function capturePendingPrimaryPreview() {
    const dialog = document.querySelector("#shopv3-dialog");

    if (!dialog?.open) {
      pendingPrimaryPreviewSrc = "";
      return;
    }

    const activePane = dialog.querySelector(".shopv3-pane.is-active");
    const photoTabIsOpen = !!activePane?.querySelector("#shopv3-file-input");
    if (!photoTabIsOpen) return;

    const checked = dialog.querySelector(
      '#shopv3-pending-files input[name="pendingPrimary"]:checked'
    );

    const selectedCard = checked?.closest(".shopv3-pending-card");
    const selectedImage = selectedCard?.querySelector("img");

    const firstImage = dialog.querySelector(
      "#shopv3-pending-files .shopv3-pending-card img"
    );

    pendingPrimaryPreviewSrc = String(
      selectedImage?.src || firstImage?.src || ""
    );
  }

  function fixNewProductSaveCopy() {
    const dialog = document.querySelector("#shopv3-dialog");
    if (!isNewProductDialog(dialog)) return;

    const replacements = [
      [
        "下の「変更を保存」を押すと",
        "下の「商品を登録」を押すと"
      ],
      [
        "下の「変更を保存」で登録されます。",
        "下の「商品を登録」で登録されます。"
      ]
    ];

    const walker = document.createTreeWalker(
      dialog,
      NodeFilter.SHOW_TEXT
    );

    const nodes = [];

    while (walker.nextNode()) {
      nodes.push(walker.currentNode);
    }

    nodes.forEach((node) => {
      let value = node.nodeValue || "";

      replacements.forEach(([from, to]) => {
        if (value.includes(from)) {
          value = value.replace(from, to);
        }
      });

      if (value !== node.nodeValue) {
        node.nodeValue = value;
      }
    });
  }

  function applyPendingPublishPreview() {
    if (!pendingPrimaryPreviewSrc) return;

    const dialog = document.querySelector("#shopv3-dialog");
    if (!dialog?.open) return;

    const activePane = dialog.querySelector(".shopv3-pane.is-active");
    const current = activePane?.querySelector("#shopv3-preview-img");

    if (!current) return;

    if (
      current.tagName === "IMG" &&
      current.src === pendingPrimaryPreviewSrc
    ) {
      return;
    }

    const image = document.createElement("img");
    image.id = "shopv3-preview-img";
    image.src = pendingPrimaryPreviewSrc;
    image.alt = "保存予定のメイン写真";
    image.dataset.pendingPreview = "1";

    current.replaceWith(image);
  }

  function apply() {
    installStyle();
    capturePendingPrimaryPreview();
    hideRentalProductUi();
    applySalesCopy();
    foldRentalHistory();
    fixNewProductSaveCopy();
    applyPendingPublishPreview();
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
