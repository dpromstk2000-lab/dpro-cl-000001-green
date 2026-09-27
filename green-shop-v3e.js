(() => {
  "use strict";

  const VERSION = "GREEN-SHOP-PUBLIC-V3E2-20260927";
  if (window.__DPRO_GREEN_SHOP_PUBLIC_V3E2__) return;
  window.__DPRO_GREEN_SHOP_PUBLIC_V3E2__ = VERSION;

  const meta = document.querySelector('meta[name="dpro-shop-api"]');
  const API = String(
    meta?.content ||
    "https://dpro-cl-000001-green-shop.dpromstk2000.workers.dev"
  ).replace(/\/$/, "");

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  let activeProductId = "";
  let collections = [];
  let observer = null;

  const MODE_LABEL = {
    reserve: "取り置き",
    rental: "レンタル",
    inquiry: "問い合わせ",
  };
  const FULFILL_LABEL = {
    shipping: "配送",
    pickup: "店頭受取",
    local_delivery: "自店配達",
    rental_delivery: "レンタル配達",
  };

  function esc(v) {
    return String(v ?? "").replace(/[&<>'"]/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    }[c]));
  }

  function products() {
    return window.DPROGreenShop?.products?.() || [];
  }

  function settings() {
    return window.DPROGreenShop?.settings?.() || {};
  }

  function product(id) {
    return products().find((p) => String(p.id) === String(id)) || null;
  }

  function imageOf(p) {
    const media = Array.isArray(p?.media) ? p.media : [];
    const primary = media.find((x) => x.isPrimary) || media[0];
    return primary?.url || p?.image || "owner-office.webp";
  }

  function installStyle() {
    if ($("#shopv3e-public-style")) return;
    const style = document.createElement("style");
    style.id = "shopv3e-public-style";
    style.textContent = `
      .shopv3e-request-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:10px}
      .shopv3e-request-actions button{min-height:46px;border-radius:12px;font:inherit;font-weight:900;cursor:pointer}
      .shopv3e-reserve{border:1px solid #c8a95c;background:#fff9e9;color:#654b12}
      .shopv3e-rental{border:1px solid #7f9e8f;background:#eff7f2;color:#174c35}
      .shopv3e-request-overlay[hidden]{display:none!important}
      .shopv3e-request-overlay{position:fixed;inset:0;z-index:1000001;display:grid;place-items:center;padding:12px;background:#0b251bb8;backdrop-filter:blur(8px)}
      .shopv3e-request-card{width:min(720px,calc(100vw - 20px));max-height:calc(100dvh - 20px);overflow:auto;border-radius:22px;background:#fff;box-shadow:0 30px 100px #0005}
      .shopv3e-request-head{position:sticky;top:0;z-index:3;background:#fff;padding:16px 18px;border-bottom:1px solid #e4ebe7;display:flex;justify-content:space-between;gap:10px;align-items:center}
      .shopv3e-request-body{padding:18px;display:grid;gap:12px}
      .shopv3e-request-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
      .shopv3e-field{display:grid;gap:5px}
      .shopv3e-field.wide{grid-column:1/-1}
      .shopv3e-field>span{font-size:12px;font-weight:900;color:#274a39}
      .shopv3e-field input,.shopv3e-field select,.shopv3e-field textarea{width:100%;box-sizing:border-box;border:1px solid #cbd9d2;border-radius:10px;padding:11px;font:inherit;background:#fff}
      .shopv3e-field textarea{min-height:96px;resize:vertical}
      .shopv3e-request-foot{position:sticky;bottom:0;background:#fff;padding:12px 18px;border-top:1px solid #e4ebe7;display:flex;justify-content:flex-end;gap:8px}
      .shopv3e-request-foot button{min-height:44px;border-radius:11px;padding:0 16px;font:inherit;font-weight:900;cursor:pointer}
      .shopv3e-cancel{border:1px solid #cbd9d2;background:#fff;color:#244a38}
      .shopv3e-submit{border:1px solid #174c35;background:#174c35;color:#fff}
      .shopv3e-success{padding:34px 20px;text-align:center}
      .shopv3e-success strong{display:block;font-size:22px;color:#174c35;margin-bottom:8px}
      .shopv3e-dynamic .feature-card img{cursor:pointer}
      .shopv3e-dynamic .set-visual img{background:#f5f7f6}
      @media(max-width:680px){
        .shopv3e-request-actions,.shopv3e-request-grid{grid-template-columns:1fr}
      }
    `;
    document.head.append(style);
  }

  async function api(path, options = {}) {
    const res = await fetch(API + path, {
      method: options.method || "GET",
      headers: options.json !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: options.json === undefined ? undefined : JSON.stringify(options.json),
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) throw new Error(data.message || "SHOP処理に失敗しました。");
    return data.data;
  }

  function openDetail(id) {
    activeProductId = String(id);
    const target = document.querySelector(`[data-shopv3d-open="${CSS.escape(String(id))}"]`);
    if (target) {
      target.click();
      return;
    }
    document.querySelector("#products")?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => {
      document.querySelector(`[data-shopv3d-open="${CSS.escape(String(id))}"]`)?.click();
    }, 300);
  }

  function addToCart(id, qty = 1) {
    const button = document.querySelector(`[data-add="${CSS.escape(String(id))}"]`);
    if (!button) return false;
    for (let i = 0; i < Math.max(1, Number(qty) || 1); i++) button.click();
    return true;
  }

  function renderCollections() {
    if (!collections.length) return;

    const featured = collections.filter((c) => c.kind === "featured" && c.items?.length);
    const sets = collections.filter((c) => c.kind === "set" && c.items?.length >= 2);

    const featuredGrid = $(".featured-grid");
    if (featuredGrid && featured.length) {
      featuredGrid.classList.add("shopv3e-dynamic");
      featuredGrid.innerHTML = featured.map((c, i) => {
        const item = c.items[0];
        const p = item.product;
        return `
          <article class="feature-card ${i === 0 ? "feature-card--wide" : ""} reveal is-visible">
            <img src="${esc(imageOf(p))}" alt="${esc(p.name)}" data-v3e-detail="${esc(p.id)}">
            <div class="feature-copy">
              <span class="pill">${esc(p.productType === "plant" ? "おすすめ" : "PICK UP")}</span>
              <h3>${esc(c.title)}</h3>
              <p>${esc(c.description || p.shortDescription || p.description || "")}</p>
              <button type="button" data-v3e-detail="${esc(p.id)}">詳しく見る</button>
            </div>
          </article>
        `;
      }).join("");
    }

    const setGrid = $(".set-grid");
    if (setGrid && sets.length) {
      setGrid.classList.add("shopv3e-dynamic");
      setGrid.innerHTML = sets.map((c) => {
        const parts = c.items.slice(0, 4);
        const ids = parts.map((x) => `${x.product.id}:${x.quantity || 1}`).join(",");
        return `
          <article class="set-card reveal is-visible">
            <div class="set-visual">
              ${parts.map((x, i) => `
                ${i ? "<span>＋</span>" : ""}
                <img src="${esc(imageOf(x.product))}" alt="${esc(x.product.name)}" data-v3e-detail="${esc(x.product.id)}">
              `).join("")}
            </div>
            <div>
              <span class="pill">STYLE SET</span>
              <h3>${esc(c.title)}</h3>
              <p>${esc(c.description || "")}</p>
              <button type="button" data-v3e-set="${esc(ids)}">${parts.length}点をカートへ</button>
            </div>
          </article>
        `;
      }).join("");
    }
  }

  async function loadCollections() {
    try {
      collections = await api("/api/public/collections") || [];
      renderCollections();
    } catch (e) {
      console.warn(VERSION, "collections", e);
    }
  }

  function enabledFulfillment(p) {
    const s = settings();
    const enabled = new Set();
    if (s.delivery) enabled.add("shipping");
    if (s.pickup) enabled.add("pickup");
    if (s.localDelivery) enabled.add("local_delivery");
    if (s.rentalDelivery) enabled.add("rental_delivery");
    return (p.fulfillmentModes || []).filter((x) => enabled.has(x));
  }

  function decorateDetail() {
    const info = $(".shopv3d-info");
    if (!info || !activeProductId) return;
    const p = product(activeProductId);
    if (!p) return;

    const old = $(".shopv3e-request-actions", info);
    if (old?.dataset.productId === String(p.id)) return;
    old?.remove();

    const tx = Array.isArray(p.transactionModes) ? p.transactionModes : ["sale"];
    const s = settings();
    const buttons = [];

    if (tx.includes("reserve") && s.reservation) {
      buttons.push(`<button type="button" class="shopv3e-reserve" data-v3e-request="reserve">取り置きを希望</button>`);
    }
    if (tx.includes("rental") && s.rental) {
      buttons.push(`<button type="button" class="shopv3e-rental" data-v3e-request="rental">レンタルを相談</button>`);
    }
    if (!buttons.length) return;

    const wrap = document.createElement("div");
    wrap.className = "shopv3e-request-actions";
    wrap.dataset.productId = String(p.id);
    wrap.innerHTML = buttons.join("");

    const action = $(".shopv3d-actions", info);
    if (action) action.after(wrap);
    else info.append(wrap);

    $$("[data-v3e-request]", wrap).forEach((b) => {
      b.onclick = () => openRequest(p, b.dataset.v3eRequest);
    });
  }

  function todayJst() {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const map = Object.fromEntries(parts.map((x) => [x.type, x.value]));
    return `${map.year}-${map.month}-${map.day}`;
  }

  function ensureRequestOverlay() {
    let overlay = $(".shopv3e-request-overlay");
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.className = "shopv3e-request-overlay";
    overlay.hidden = true;
    document.body.append(overlay);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.hidden = true;
    });
    return overlay;
  }

  function openRequest(p, mode) {
    const overlay = ensureRequestOverlay();
    const choices = enabledFulfillment(p);

    if (!choices.length) {
      alert("この商品の受取・お届け方法は現在準備中です。LINEからご相談ください。");
      return;
    }

    const preferred = mode === "rental"
      ? (choices.includes("rental_delivery") ? "rental_delivery" : choices.includes("local_delivery") ? "local_delivery" : choices[0])
      : (choices.includes("pickup") ? "pickup" : choices[0]);

    overlay.innerHTML = `
      <section class="shopv3e-request-card" role="dialog" aria-modal="true">
        <div class="shopv3e-request-head">
          <div>
            <strong>${esc(MODE_LABEL[mode] || "受付")}｜${esc(p.name)}</strong>
            <div style="font-size:12px;color:#6d7972;margin-top:3px">
              ${mode === "reserve" ? "店舗確認後に取り置きが確定します。" : "設置場所・配達条件を確認後にご案内します。"}
            </div>
          </div>
          <button type="button" class="shopv3e-cancel" data-v3e-request-close>閉じる</button>
        </div>
        <form id="shopv3e-request-form">
          <div class="shopv3e-request-body">
            <div class="shopv3e-request-grid">
              <label class="shopv3e-field">
                <span>お名前</span>
                <input name="name" required autocomplete="name">
              </label>
              <label class="shopv3e-field">
                <span>電話番号</span>
                <input name="phone" required inputmode="tel" autocomplete="tel" placeholder="090-1234-5678">
              </label>
              <label class="shopv3e-field wide">
                <span>メールアドレス（任意）</span>
                <input name="email" type="email" autocomplete="email">
              </label>
              <label class="shopv3e-field">
                <span>受取・お届け方法</span>
                <select name="fulfillment">
                  ${choices.map((x) => `<option value="${esc(x)}" ${x === preferred ? "selected" : ""}>${esc(FULFILL_LABEL[x] || x)}</option>`).join("")}
                </select>
              </label>
              <label class="shopv3e-field">
                <span>希望日（任意）</span>
                <input name="requestedDate" type="date" min="${todayJst()}">
              </label>
              <label class="shopv3e-field">
                <span>希望時間帯</span>
                <select name="requestedTimeWindow">
                  <option value="">指定なし</option>
                  <option>午前</option>
                  <option>午後</option>
                  <option>夕方</option>
                </select>
              </label>
              <label class="shopv3e-field">
                <span>希望連絡方法</span>
                <select name="contactMethod">
                  <option>LINE</option>
                  <option>電話</option>
                  <option>メール</option>
                </select>
              </label>
              <label class="shopv3e-field wide" data-v3e-address>
                <span>住所</span>
                <input name="address" autocomplete="street-address" placeholder="福岡県…">
              </label>
              <label class="shopv3e-field wide">
                <span>ご希望・ご相談内容（任意）</span>
                <textarea name="note" placeholder="${mode === "rental" ? "設置場所、希望サイズ、交換頻度など" : "受取希望、用途など"}"></textarea>
              </label>
            </div>
            <div style="padding:10px 12px;border-radius:10px;background:#f6faf8;color:#4f6258;font-size:12px;line-height:1.7">
              ${mode === "reserve"
                ? "この送信で取り置きは確定しません。店舗が在庫を確認したあとに確定のご連絡をします。"
                : "レンタル料金・設置・配達条件は、店舗確認後に最終確定します。"}
            </div>
          </div>
          <div class="shopv3e-request-foot">
            <button type="button" class="shopv3e-cancel" data-v3e-request-close>戻る</button>
            <button type="submit" class="shopv3e-submit">${mode === "reserve" ? "取り置き希望を送る" : "レンタル希望を送る"}</button>
          </div>
        </form>
      </section>
    `;

    const addressField = $("[data-v3e-address]", overlay);
    const fulfillment = $('[name="fulfillment"]', overlay);
    const syncAddress = () => {
      const needs = ["shipping", "local_delivery", "rental_delivery"].includes(fulfillment.value);
      addressField.hidden = !needs;
      $('[name="address"]', addressField).required = needs;
    };
    fulfillment.onchange = syncAddress;
    syncAddress();

    $$("[data-v3e-request-close]", overlay).forEach((b) => b.onclick = () => overlay.hidden = true);

    $("#shopv3e-request-form", overlay).onsubmit = async (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const fd = new FormData(form);
      const submit = $('button[type="submit"]', form);
      submit.disabled = true;
      submit.textContent = "送信中…";

      try {
        const result = await api("/api/public/requests", {
          method: "POST",
          json: {
            transactionMode: mode,
            fulfillmentMode: String(fd.get("fulfillment") || ""),
            requestedDate: String(fd.get("requestedDate") || ""),
            requestedTimeWindow: String(fd.get("requestedTimeWindow") || ""),
            customer: {
              name: String(fd.get("name") || ""),
              phone: String(fd.get("phone") || ""),
              email: String(fd.get("email") || ""),
              address: String(fd.get("address") || ""),
              contactMethod: String(fd.get("contactMethod") || "LINE"),
            },
            note: String(fd.get("note") || ""),
            items: [{ id: p.id, qty: 1 }],
          },
        });

        $(".shopv3e-request-card", overlay).innerHTML = `
          <div class="shopv3e-success">
            <strong>${mode === "reserve" ? "取り置き希望を受け付けました" : "レンタル希望を受け付けました"}</strong>
            <p>受付番号 <b>${esc(result.orderNumber || "")}</b></p>
            <p>${esc(result.message || "店舗からご案内します。")}</p>
            <button type="button" class="shopv3e-submit" data-v3e-success-close style="padding:0 18px;min-height:44px;border-radius:11px">閉じる</button>
          </div>
        `;
        $("[data-v3e-success-close]", overlay).onclick = () => overlay.hidden = true;
      } catch (err) {
        alert(err.message || "受付できませんでした。");
        submit.disabled = false;
        submit.textContent = mode === "reserve" ? "取り置き希望を送る" : "レンタル希望を送る";
      }
    };

    overlay.hidden = false;
  }

  function bindEvents() {
    document.addEventListener("click", (e) => {
      const detail = e.target.closest("[data-shopv3d-open]");
      if (detail) activeProductId = String(detail.dataset.shopv3dOpen || "");

      const dynamicDetail = e.target.closest("[data-v3e-detail]");
      if (dynamicDetail) {
        e.preventDefault();
        openDetail(dynamicDetail.dataset.v3eDetail);
      }

      const setButton = e.target.closest("[data-v3e-set]");
      if (setButton) {
        e.preventDefault();
        const specs = String(setButton.dataset.v3eSet || "")
          .split(",")
          .map((x) => x.split(":"))
          .filter((x) => x[0]);

        let added = false;
        for (const [id, qty] of specs) {
          added = addToCart(id, Number(qty || 1)) || added;
        }
        if (added) setTimeout(() => document.querySelector("[data-cart-open]")?.click(), 80);
      }
    }, true);
  }

  function watchDetail() {
    if (observer) return;
    let timer = 0;
    observer = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(decorateDetail, 30);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function apply() {
    renderCollections();
    decorateDetail();
    document.body.dataset.greenShopPublicV3e2 = VERSION;
  }

  function boot() {
    if (!document.querySelector('meta[name="dpro-green-shop-standalone"]')) return;
    installStyle();
    bindEvents();
    watchDetail();
    loadCollections();
    window.addEventListener("dpro-green-shop-ready", () => {
      loadCollections();
      setTimeout(apply, 0);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();