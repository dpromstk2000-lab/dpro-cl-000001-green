(() => {
  "use strict";

  const VERSION = "GREEN-SHOP-OWNER-ORDERS-V3F1.1-20260927";
  if (window.__DPRO_GREEN_SHOP_OWNER_ORDERS_V3F1__) return;
  window.__DPRO_GREEN_SHOP_OWNER_ORDERS_V3F1__ = VERSION;

  const API = String(
    window.GREEN_CONFIG?.SHOP_MODULE?.apiBase ||
    "https://dpro-cl-000001-green-shop.dpromstk2000.workers.dev"
  ).replace(/\/$/, "");
  const BUILD_CODE_KEY = "dpro_green_shop_build_code";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  const WORKFLOWS = {
    sale: ["new", "confirmed", "payment_pending", "paid", "preparing", "shipped"],
    reserve: ["new", "reserve_check", "reserve_confirmed", "reserve_completed"],
    rental: ["new", "rental_check", "rental_site_check", "rental_confirmed", "rental_active"],
    inquiry: ["new", "inquiry_answering", "inquiry_completed"],
  };

  const STATUS_LABEL = {
    new: "新規",
    confirmed: "確認済み",
    payment_pending: "決済待ち",
    paid: "支払済み",
    preparing: "準備中",
    shipped: "発送・受取完了",
    reserve_check: "在庫確認",
    reserve_confirmed: "取り置き確定",
    reserve_completed: "受取完了",
    rental_check: "内容確認",
    rental_site_check: "現地・条件確認",
    rental_confirmed: "契約確定",
    rental_active: "稼働中",
    inquiry_answering: "対応中",
    inquiry_completed: "対応完了",
    cancelled: "キャンセル",
  };

  const MODE_LABEL = {
    sale: "通常販売",
    reserve: "取り置き",
    rental: "レンタル",
    inquiry: "問い合わせ",
  };

  const PAYMENT_LABEL = {
    unpaid: "未決済",
    pending: "確認中",
    paid: "支払済み",
    refunded: "返金済み",
    failed: "決済エラー",
  };

  const NEXT_ACTION = {
    sale: {
      new: "注文内容を確認",
      confirmed: "決済方法を案内",
      payment_pending: "入金を確認",
      paid: "商品を準備",
      preparing: "発送・受渡を完了",
    },
    reserve: {
      new: "在庫・受取条件を確認",
      reserve_check: "取り置きを確定",
      reserve_confirmed: "受取完了を登録",
    },
    rental: {
      new: "相談内容を確認",
      rental_check: "現地・条件確認へ",
      rental_site_check: "契約内容を確定",
      rental_confirmed: "レンタル開始",
      rental_active: "稼働中・定期運用",
    },
    inquiry: {
      new: "内容を確認して対応開始",
      inquiry_answering: "回答・対応を完了",
    },
  };

  const state = {
    orders: [],
    orderItems: [],
    orderStatusHistory: [],
    filter: "all",
    loading: false,
    observer: null,
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

  function yen(n) {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
      maximumFractionDigits: 0,
    }).format(Number(n) || 0);
  }

  function token() {
    return window.DPRO_AUTH?.getToken?.() ||
      sessionStorage.getItem("green_admin_session_token") || "";
  }

  function buildCode() {
    if (!window.__DPRO_BUILD_ACCESS__) return "";
    let code = sessionStorage.getItem(BUILD_CODE_KEY) || "";
    if (!code) {
      code = prompt("構築・QA用の管理コードを入力してください。") || "";
      if (code) sessionStorage.setItem(BUILD_CODE_KEY, code);
    }
    return code;
  }

  async function csrf() {
    try {
      return (await window.Green.api("/api/admin/session")).data?.csrfToken || "";
    } catch {
      return "";
    }
  }

  async function request(path, options = {}) {
    const method = String(options.method || "GET").toUpperCase();
    const headers = new Headers();
    const t = token();
    const b = buildCode();

    if (t) headers.set("Authorization", `Bearer ${t}`);
    if (b) headers.set("X-DPRO-Build-Code", b);
    if (options.json !== undefined) headers.set("Content-Type", "application/json");

    if (!["GET", "HEAD"].includes(method)) {
      const c = await csrf();
      if (c) headers.set("X-CSRF-Token", c);
    }

    const res = await fetch(API + path, {
      method,
      headers,
      body: options.json === undefined ? undefined : JSON.stringify(options.json),
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) {
      throw new Error(data.message || "注文・受付管理の処理に失敗しました。");
    }
    return data;
  }

  function installStyle() {
    if ($("#shopv3f-style")) return;
    const style = document.createElement("style");
    style.id = "shopv3f-style";
    style.textContent = `
      .shopv3f-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap}
      .shopv3f-head h3{margin:0}
      .shopv3f-head p{margin:4px 0 0;color:#68766f;font-size:12px}
      .shopv3f-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:14px 0}
      .shopv3f-stat{border:1px solid #dce7e1;border-radius:12px;padding:10px;background:#fbfdfc}
      .shopv3f-stat strong{display:block;font-size:20px;color:#163d2b}
      .shopv3f-stat span{font-size:11px;color:#69766f}
      .shopv3f-filters{display:flex;gap:7px;flex-wrap:wrap;margin:10px 0 14px}
      .shopv3f-filter{border:1px solid #cad8d1;background:#fff;color:#294d3c;border-radius:999px;padding:7px 11px;font-weight:800;cursor:pointer}
      .shopv3f-filter.is-active{background:#1f7a51;border-color:#1f7a51;color:#fff}
      .shopv3f-list{display:grid;gap:10px}
      .shopv3f-order{border:1px solid #dce7e1;border-radius:15px;padding:12px;background:#fff;display:grid;gap:10px}
      .shopv3f-order.is-new{box-shadow:inset 4px 0 0 #d69a18}
      .shopv3f-order-top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
      .shopv3f-order-no{font-weight:900;color:#173d2b;word-break:break-all}
      .shopv3f-date{font-size:11px;color:#79857f;margin-top:3px}
      .shopv3f-pills{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}
      .shopv3f-pill{display:inline-flex;align-items:center;padding:4px 8px;border-radius:999px;background:#edf5f0;color:#315441;font-size:11px;font-weight:900}
      .shopv3f-pill.mode{background:#e5f4ea;color:#17613e}
      .shopv3f-pill.status-new{background:#fff4d8;color:#795600}
      .shopv3f-pill.status-done{background:#e9efff;color:#294e8a}
      .shopv3f-main{display:grid;grid-template-columns:1.1fr 1.4fr 1fr;gap:10px}
      .shopv3f-cell{min-width:0}
      .shopv3f-cell b{display:block;font-size:11px;color:#758079;margin-bottom:3px}
      .shopv3f-cell strong,.shopv3f-cell span{font-size:13px;color:#263e33}
      .shopv3f-items{display:flex;gap:5px;flex-wrap:wrap}
      .shopv3f-item{padding:5px 7px;border-radius:8px;background:#f4f7f5;font-size:11px;color:#485b51}
      .shopv3f-next{display:flex;justify-content:space-between;gap:10px;align-items:center;border-radius:11px;background:#f5faf7;padding:9px 10px}
      .shopv3f-next-copy{font-size:12px;color:#365444}
      .shopv3f-next-copy b{color:#174c35}
      .shopv3f-actions{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end}
      .shopv3f-btn{border:1px solid #c8d7cf;background:#fff;color:#214936;border-radius:9px;padding:7px 10px;font-weight:900;cursor:pointer}
      .shopv3f-btn.primary{background:#1f7a51;border-color:#1f7a51;color:#fff}
      .shopv3f-btn.danger{border-color:#e3c5c1;color:#a53c32}
      .shopv3f-note{padding:7px 9px;border-radius:9px;background:#fff8df;color:#745b0e;font-size:11px;line-height:1.55}
      .shopv3f-empty{padding:24px;text-align:center;border:1px dashed #cbd9d2;border-radius:12px;color:#69766f}
      .shopv3f-dialog{width:min(820px,calc(100vw - 18px));max-height:calc(100dvh - 18px);border:0;border-radius:18px;padding:0;box-shadow:0 28px 90px #0005}
      .shopv3f-dialog::backdrop{background:#0a2118ba}
      .shopv3f-dialog-wrap{display:grid;grid-template-rows:auto minmax(0,1fr) auto;max-height:calc(100dvh - 18px)}
      .shopv3f-dialog-head,.shopv3f-dialog-foot{padding:14px 16px;background:#fff}
      .shopv3f-dialog-head{border-bottom:1px solid #e2e9e5;display:flex;justify-content:space-between;gap:10px;align-items:center}
      .shopv3f-dialog-body{overflow:auto;padding:16px;display:grid;gap:14px}
      .shopv3f-dialog-foot{border-top:1px solid #e2e9e5;display:flex;justify-content:space-between;gap:8px;align-items:center}
      .shopv3f-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
      .shopv3f-detail{border:1px solid #e0e8e4;border-radius:11px;padding:10px;background:#fbfdfc}
      .shopv3f-detail b{display:block;font-size:11px;color:#738078;margin-bottom:4px}
      .shopv3f-field{display:grid;gap:5px}
      .shopv3f-field>span{font-size:12px;font-weight:900;color:#274a39}
      .shopv3f-field select,.shopv3f-field textarea{width:100%;box-sizing:border-box;border:1px solid #cbd9d2;border-radius:10px;padding:10px;font:inherit;background:#fff}
      .shopv3f-field textarea{min-height:88px;resize:vertical}
      .shopv3f-history{display:grid;gap:7px}
      .shopv3f-history-row{border-left:3px solid #b7cdc1;padding:6px 9px;background:#f8fbf9;border-radius:0 8px 8px 0}
      .shopv3f-history-row b{font-size:12px;color:#284b3a}
      .shopv3f-history-row small{display:block;color:#77837d;margin-top:3px}
      .shopv3f-phone{color:#17613e;text-decoration:none;font-weight:900}
      @media(max-width:820px){
        .shopv3f-main,.shopv3f-detail-grid,.shopv3f-stats{grid-template-columns:1fr}
        .shopv3f-order-top,.shopv3f-next{align-items:flex-start;flex-direction:column}
        .shopv3f-pills,.shopv3f-actions{justify-content:flex-start}
      }
    `;
    document.head.append(style);
  }

  function shell() {
    return $("#green-shop-prod-root .shopv3-shell");
  }

  function orderCard() {
    const s = shell();
    if (!s) return null;
    return $$(":scope > article", s).find((a) => $("h3", a)?.textContent?.includes("注文管理")) || null;
  }

  function workflow(mode) {
    return WORKFLOWS[mode] || WORKFLOWS.sale;
  }

  function isTerminal(o) {
    return (
      o.status === "cancelled" ||
      (o.transaction_mode === "sale" && o.status === "shipped") ||
      (o.transaction_mode === "reserve" && o.status === "reserve_completed") ||
      (o.transaction_mode === "inquiry" && o.status === "inquiry_completed")
    );
  }

  function nextStatus(o) {
    const flow = workflow(o.transaction_mode);
    const i = flow.indexOf(o.status);
    if (i < 0 || i >= flow.length - 1) return "";
    return flow[i + 1];
  }

  function orderItems(orderId) {
    return state.orderItems.filter((x) => String(x.order_id) === String(orderId));
  }

  function history(orderId) {
    return state.orderStatusHistory
      .filter((x) => String(x.order_id) === String(orderId))
      .sort((a,b) => new Date(b.changed_at) - new Date(a.changed_at));
  }

  function formatDate(v) {
    if (!v) return "";
    try {
      return new Date(v).toLocaleString("ja-JP", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return String(v);
    }
  }

  function moneyLabel(o) {
    if (o.transaction_mode === "rental") return `月額参考 ${yen(o.total_yen)}`;
    if (o.transaction_mode === "inquiry") return "金額未確定";
    return yen(o.total_yen);
  }

  function requested(o) {
    const date = String(o.requested_date || "");
    const time = String(o.requested_time_window || "");
    return [date, time].filter(Boolean).join(" ") || "指定なし";
  }

  function contactLink() {
    const u = new URL("contact-green.html", location.href);
    if (new URL(location.href).searchParams.get("dpro_build") === "1") {
      u.searchParams.set("dpro_build", "1");
    }
    return u.href;
  }

  async function load() {
    if (state.loading) return;
    state.loading = true;
    try {
      let r;
      try {
        r = await request("/api/admin/order-workflow");
      } catch (primaryError) {
        console.warn(VERSION, "dedicated order endpoint failed; fallback bootstrap", primaryError);
        r = await request("/api/admin/bootstrap");
      }

      const payload = r?.data || {};
      state.orders = Array.isArray(payload.orders) ? payload.orders : [];
      state.orderItems = Array.isArray(payload.orderItems) ? payload.orderItems : [];
      state.orderStatusHistory = Array.isArray(payload.orderStatusHistory) ? payload.orderStatusHistory : [];

      render();
    } catch (e) {
      const card = orderCard();
      if (card) {
        card.innerHTML = `<div class="owner-warning-box"><strong>注文・受付管理を読み込めませんでした。</strong><br>${esc(e.message)}</div>`;
      }
    } finally {
      state.loading = false;
    }
  }

  function filteredOrders() {
    return state.orders.filter((o) => state.filter === "all" || o.transaction_mode === state.filter);
  }

  function render() {
    const card = orderCard();
    if (!card) return;

    const newCount = state.orders.filter((o) => o.status === "new").length;
    const completed = state.orders.filter(isTerminal).length;
    const active = Math.max(0, state.orders.length - newCount - completed);
    const rows = filteredOrders();

    card.dataset.shopv3fOrderWorkflow = VERSION;
    card.innerHTML = `
      <div class="shopv3f-head">
        <div>
          <h3>注文・受付管理</h3>
          <p>通常販売・取り置き・レンタル・問い合わせを、次にやることが分かる形でまとめて管理します。</p>
        </div>
        <button type="button" class="shopv3f-btn" id="shopv3f-reload">再読込</button>
      </div>

      <div class="shopv3f-stats">
        <div class="shopv3f-stat"><strong>${newCount}</strong><span>新規・要確認</span></div>
        <div class="shopv3f-stat"><strong>${active}</strong><span>進行中</span></div>
        <div class="shopv3f-stat"><strong>${completed}</strong><span>完了・終了</span></div>
      </div>

      <div class="shopv3f-filters">
        ${[
          ["all","すべて"],
          ["sale","通常販売"],
          ["reserve","取り置き"],
          ["rental","レンタル"],
          ["inquiry","問い合わせ"],
        ].map(([key,label]) => `
          <button type="button" class="shopv3f-filter ${state.filter===key?"is-active":""}" data-shopv3f-filter="${key}">
            ${label}
          </button>
        `).join("")}
      </div>

      <div class="shopv3f-list">
        ${rows.length ? rows.map(orderHtml).join("") : `<div class="shopv3f-empty">該当する注文・受付はありません。</div>`}
      </div>
    `;

    $("#shopv3f-reload", card)?.addEventListener("click", load);
    $$("[data-shopv3f-filter]", card).forEach((b) => {
      b.onclick = () => {
        state.filter = b.dataset.shopv3fFilter;
        render();
      };
    });
    $$("[data-shopv3f-detail]", card).forEach((b) => b.onclick = () => openDetail(b.dataset.shopv3fDetail));
    $$("[data-shopv3f-next]", card).forEach((b) => b.onclick = () => quickNext(b.dataset.shopv3fNext));
  }

  function orderHtml(o) {
    const items = orderItems(o.id);
    const next = nextStatus(o);
    const action = NEXT_ACTION[o.transaction_mode]?.[o.status] || (isTerminal(o) ? "対応完了" : "状態を確認");
    const done = isTerminal(o);
    const phone = String(o.customer_phone || "");
    const statusClass = o.status === "new" ? "status-new" : done ? "status-done" : "";
    const itemSummary = items.length
      ? items.map((x) => `<span class="shopv3f-item">${esc(x.product_name)} ×${esc(x.quantity)}</span>`).join("")
      : `<span class="shopv3f-item">商品明細を確認中</span>`;

    return `
      <article class="shopv3f-order ${o.status==="new"?"is-new":""}">
        <div class="shopv3f-order-top">
          <div>
            <div class="shopv3f-order-no">${esc(o.order_number)}</div>
            <div class="shopv3f-date">${formatDate(o.created_at)}</div>
          </div>
          <div class="shopv3f-pills">
            <span class="shopv3f-pill mode">${esc(MODE_LABEL[o.transaction_mode] || o.transaction_mode)}</span>
            <span class="shopv3f-pill ${statusClass}">${esc(STATUS_LABEL[o.status] || o.status)}</span>
            <span class="shopv3f-pill">${esc(PAYMENT_LABEL[o.payment_status] || o.payment_status || "")}</span>
          </div>
        </div>

        <div class="shopv3f-main">
          <div class="shopv3f-cell">
            <b>お客様</b>
            <strong>${esc(o.customer_name)}</strong><br>
            ${phone ? `<a class="shopv3f-phone" href="tel:${esc(phone)}">${esc(phone)}</a>` : ""}
          </div>
          <div class="shopv3f-cell">
            <b>商品・内容</b>
            <div class="shopv3f-items">${itemSummary}</div>
          </div>
          <div class="shopv3f-cell">
            <b>受取・希望</b>
            <span>${esc(o.delivery_method || o.fulfillment_mode || "")}</span><br>
            <span>${esc(requested(o))}</span>
          </div>
        </div>

        <div class="shopv3f-main">
          <div class="shopv3f-cell">
            <b>金額</b>
            <strong>${esc(moneyLabel(o))}</strong>
          </div>
          <div class="shopv3f-cell">
            <b>希望連絡</b>
            <span>${esc(o.contact_method || "未指定")}</span>
          </div>
          <div class="shopv3f-cell">
            <b>最終更新</b>
            <span>${formatDate(o.status_updated_at || o.updated_at || o.created_at)}</span>
          </div>
        </div>

        ${o.status_note ? `<div class="shopv3f-note">メモ：${esc(o.status_note)}</div>` : ""}

        <div class="shopv3f-next">
          <div class="shopv3f-next-copy">
            <b>次にやること：</b>${esc(action)}
          </div>
          <div class="shopv3f-actions">
            ${o.contact_method === "LINE" ? `<a class="shopv3f-btn" href="${esc(contactLink())}" target="_blank" rel="noopener">LINE顧客対応</a>` : ""}
            <button type="button" class="shopv3f-btn" data-shopv3f-detail="${esc(o.id)}">詳細・更新</button>
            ${next ? `<button type="button" class="shopv3f-btn primary" data-shopv3f-next="${esc(o.id)}">次へ：${esc(STATUS_LABEL[next])}</button>` : ""}
          </div>
        </div>
      </article>
    `;
  }

  async function quickNext(id) {
    const o = state.orders.find((x) => String(x.id) === String(id));
    if (!o) return;
    const next = nextStatus(o);
    if (!next) return;
    const label = STATUS_LABEL[next] || next;
    if (!confirm(`「${o.order_number}」を「${label}」へ進めますか？`)) return;

    try {
      await request(`/api/admin/orders/${o.id}`, {
        method: "PATCH",
        json: { status: next },
      });
      window.Green.toast(`「${label}」へ更新しました。`, "success");
      await load();
    } catch (e) {
      window.Green.toast(e.message, "error");
    }
  }

  function ensureDialog() {
    let d = $("#shopv3f-dialog");
    if (d) return d;
    d = document.createElement("dialog");
    d.id = "shopv3f-dialog";
    d.className = "shopv3f-dialog";
    document.body.append(d);
    return d;
  }

  function statusOptions(o) {
    const values = [...workflow(o.transaction_mode), "cancelled"];
    return values.map((x) => `
      <option value="${esc(x)}" ${x===o.status?"selected":""}>${esc(STATUS_LABEL[x] || x)}</option>
    `).join("");
  }

  function openDetail(id) {
    const o = state.orders.find((x) => String(x.id) === String(id));
    if (!o) return;
    const items = orderItems(o.id);
    const logs = history(o.id);
    const d = ensureDialog();

    d.innerHTML = `
      <div class="shopv3f-dialog-wrap">
        <div class="shopv3f-dialog-head">
          <div>
            <strong>${esc(MODE_LABEL[o.transaction_mode] || o.transaction_mode)}｜${esc(o.order_number)}</strong>
            <div style="font-size:11px;color:#728078;margin-top:3px">${formatDate(o.created_at)}</div>
          </div>
          <button type="button" class="shopv3f-btn" data-shopv3f-close>閉じる</button>
        </div>

        <div class="shopv3f-dialog-body">
          <div class="shopv3f-detail-grid">
            <div class="shopv3f-detail"><b>お客様</b>${esc(o.customer_name)}<br>${esc(o.customer_phone || "")}<br>${esc(o.customer_email || "")}</div>
            <div class="shopv3f-detail"><b>希望連絡方法</b>${esc(o.contact_method || "未指定")}</div>
            <div class="shopv3f-detail"><b>受取・お届け</b>${esc(o.delivery_method || o.fulfillment_mode || "")}</div>
            <div class="shopv3f-detail"><b>希望日・時間帯</b>${esc(requested(o))}</div>
            ${o.customer_address ? `<div class="shopv3f-detail" style="grid-column:1/-1"><b>住所</b>${esc(o.customer_address)}</div>` : ""}
            <div class="shopv3f-detail" style="grid-column:1/-1"><b>商品・明細</b>
              ${items.length ? items.map((x)=>`${esc(x.product_name)} ×${esc(x.quantity)}　${yen(x.line_total_yen)}`).join("<br>") : "商品明細なし"}
            </div>
            <div class="shopv3f-detail"><b>金額</b>${esc(moneyLabel(o))}</div>
            <div class="shopv3f-detail"><b>決済</b>${esc(PAYMENT_LABEL[o.payment_status] || o.payment_status || "")}</div>
            ${o.note ? `<div class="shopv3f-detail" style="grid-column:1/-1"><b>お客様のご希望・相談内容</b>${esc(o.note).replace(/\n/g,"<br>")}</div>` : ""}
          </div>

          <label class="shopv3f-field">
            <span>進捗状態</span>
            <select id="shopv3f-status">${statusOptions(o)}</select>
          </label>

          <label class="shopv3f-field">
            <span>オーナー内部メモ</span>
            <textarea id="shopv3f-status-note" placeholder="例：9/28 在庫確認済み。15時受取予定。">${esc(o.status_note || "")}</textarea>
          </label>

          <div>
            <strong style="font-size:13px;color:#274a39">更新履歴</strong>
            <div class="shopv3f-history" style="margin-top:8px">
              ${logs.length ? logs.map((h) => `
                <div class="shopv3f-history-row">
                  <b>${esc(STATUS_LABEL[h.from_status] || h.from_status)} → ${esc(STATUS_LABEL[h.to_status] || h.to_status)}</b>
                  ${h.note ? `<div style="font-size:12px;margin-top:3px">${esc(h.note)}</div>` : ""}
                  <small>${formatDate(h.changed_at)}</small>
                </div>
              `).join("") : `<div class="shopv3f-empty">まだ更新履歴はありません。</div>`}
            </div>
          </div>
        </div>

        <div class="shopv3f-dialog-foot">
          <div>
            ${o.contact_method === "LINE" ? `<a class="shopv3f-btn" href="${esc(contactLink())}" target="_blank" rel="noopener">LINE顧客対応を開く</a>` : ""}
          </div>
          <div class="shopv3f-actions">
            <button type="button" class="shopv3f-btn" data-shopv3f-close>キャンセル</button>
            <button type="button" class="shopv3f-btn primary" id="shopv3f-save">状態・メモを保存</button>
          </div>
        </div>
      </div>
    `;

    $$("[data-shopv3f-close]", d).forEach((b) => b.onclick = () => d.close());
    $("#shopv3f-save", d).onclick = async () => {
      const status = $("#shopv3f-status", d).value;
      const statusNote = $("#shopv3f-status-note", d).value.trim();
      const button = $("#shopv3f-save", d);
      button.disabled = true;
      button.textContent = "保存中…";

      try {
        await request(`/api/admin/orders/${o.id}`, {
          method: "PATCH",
          json: { status, statusNote },
        });
        d.close();
        window.Green.toast("進捗とメモを保存しました。", "success");
        await load();
      } catch (e) {
        window.Green.toast(e.message, "error");
        button.disabled = false;
        button.textContent = "状態・メモを保存";
      }
    };

    if (!d.open) d.showModal();
  }

  function watch() {
    if (state.observer) return;
    let timer = 0;
    state.observer = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const card = orderCard();
        if (card && card.dataset.shopv3fOrderWorkflow !== VERSION && !state.loading && state.orders.length) {
          render();
        }
      }, 80);
    });
    state.observer.observe(document.body, { childList: true, subtree: true });
  }

  function boot() {
    if (!/\/owner\.html$/.test(location.pathname)) return;
    installStyle();
    watch();

    const start = () => {
      if (!orderCard()) {
        setTimeout(start, 120);
        return;
      }
      load();
    };
    start();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();