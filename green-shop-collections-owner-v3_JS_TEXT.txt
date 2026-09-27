(() => {
  "use strict";

  const VERSION = "GREEN-SHOP-OWNER-COLLECTIONS-V3E2-20260927";
  if (window.__DPRO_GREEN_SHOP_OWNER_COLLECTIONS_V3E2__) return;
  window.__DPRO_GREEN_SHOP_OWNER_COLLECTIONS_V3E2__ = VERSION;

  const API = String(
    window.GREEN_CONFIG?.SHOP_MODULE?.apiBase ||
    "https://dpro-cl-000001-green-shop.dpromstk2000.workers.dev"
  ).replace(/\/$/, "");
  const BUILD_CODE_KEY = "dpro_green_shop_build_code";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  const state = {
    products: [],
    orders: [],
    collections: [],
    collectionItems: [],
    loading: false,
    observer: null,
  };

  const KIND_LABEL = {
    featured: "おすすめ",
    set: "植物＋鉢セット",
    campaign: "特集",
  };
  const MODE_LABEL = {
    sale: "通常",
    reserve: "取り置き",
    rental: "レンタル",
    inquiry: "問合せ",
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
      throw new Error(data.message || "SHOP管理処理に失敗しました。");
    }
    return data;
  }

  function installStyle() {
    if ($("#shopv3e-owner-style")) return;
    const style = document.createElement("style");
    style.id = "shopv3e-owner-style";
    style.textContent = `
      .shopv3e-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap}
      .shopv3e-actions{display:flex;gap:8px;flex-wrap:wrap}
      .shopv3e-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:14px}
      .shopv3e-card{border:1px solid #dfe8e3;border-radius:14px;background:#fbfdfc;padding:12px;display:grid;gap:8px}
      .shopv3e-card-top{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}
      .shopv3e-card h4{margin:0;font-size:14px;color:#173d2b}
      .shopv3e-pill{display:inline-flex;padding:4px 8px;border-radius:999px;font-size:11px;font-weight:900;background:#e9f5ee;color:#17643d}
      .shopv3e-pill.off{background:#edf0ee;color:#6c7771}
      .shopv3e-items{display:flex;gap:6px;flex-wrap:wrap}
      .shopv3e-item{padding:5px 8px;border-radius:9px;background:#f0f5f2;font-size:11px;color:#40554a}
      .shopv3e-dialog{width:min(760px,calc(100vw - 18px));max-height:calc(100dvh - 18px);border:0;border-radius:18px;padding:0;box-shadow:0 28px 90px #0005}
      .shopv3e-dialog::backdrop{background:#0a2118ba}
      .shopv3e-dialog-wrap{display:grid;grid-template-rows:auto minmax(0,1fr) auto;max-height:calc(100dvh - 18px)}
      .shopv3e-dialog-head,.shopv3e-dialog-foot{padding:14px 16px;background:#fff}
      .shopv3e-dialog-head{border-bottom:1px solid #e2e9e5;display:flex;justify-content:space-between;gap:10px;align-items:center}
      .shopv3e-dialog-foot{border-top:1px solid #e2e9e5;display:flex;justify-content:flex-end;gap:8px}
      .shopv3e-dialog-body{overflow:auto;padding:16px;display:grid;gap:12px}
      .shopv3e-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
      .shopv3e-field{display:grid;gap:5px}
      .shopv3e-field.wide{grid-column:1/-1}
      .shopv3e-field>span{font-size:12px;font-weight:900;color:#274a39}
      .shopv3e-field input,.shopv3e-field select,.shopv3e-field textarea{width:100%;box-sizing:border-box;border:1px solid #cbd9d2;border-radius:10px;padding:10px;font:inherit;background:#fff}
      .shopv3e-field textarea{min-height:90px;resize:vertical}
      .shopv3e-product-row{display:grid;grid-template-columns:minmax(0,1fr) 90px auto;gap:7px;align-items:end}
      .shopv3e-empty{padding:20px;border:1px dashed #cbd8d1;border-radius:12px;text-align:center;color:#65736c;margin-top:12px}
      .shopv3e-order-mode{font-size:11px;font-weight:900;white-space:nowrap}
      @media(max-width:760px){
        .shopv3e-list,.shopv3e-grid{grid-template-columns:1fr}
        .shopv3e-product-row{grid-template-columns:1fr 80px auto}
      }
    `;
    document.head.append(style);
  }

  function shopShell() {
    return $("#green-shop-prod-root .shopv3-shell");
  }

  function orderCard(shell = shopShell()) {
    if (!shell) return null;
    return $$(":scope > article", shell).find((a) => $("h3", a)?.textContent?.includes("注文管理")) || null;
  }

  function ensureSection() {
    const shell = shopShell();
    if (!shell) return null;

    let card = $("#shopv3e-collections-card");
    if (card && card.isConnected) return card;

    card = document.createElement("article");
    card.id = "shopv3e-collections-card";
    card.className = "shopv3-card";
    const orders = orderCard(shell);
    if (orders) shell.insertBefore(card, orders);
    else shell.append(card);
    renderSection();
    return card;
  }

  function itemNames(collection) {
    const items = state.collectionItems
      .filter((x) => x.collection_id === collection.id)
      .sort((a, b) => Number(a.sort_order || 100) - Number(b.sort_order || 100));

    return items.map((item) => {
      const p = state.products.find((x) => x.dbId === item.product_id);
      return p ? `${p.name}${Number(item.quantity || 1) > 1 ? ` ×${item.quantity}` : ""}` : "商品未確認";
    });
  }

  function renderSection() {
    const card = $("#shopv3e-collections-card");
    if (!card) return;

    const list = state.collections
      .slice()
      .sort((a, b) => Number(a.sort_order || 100) - Number(b.sort_order || 100));

    card.innerHTML = `
      <div class="shopv3e-head">
        <div>
          <h3>おすすめ・セット管理</h3>
          <p>公開SHOPの「今、選びたいグリーン」と「植物と鉢、セットで選ぶ」をここから管理します。</p>
        </div>
        <div class="shopv3e-actions">
          ${!list.length ? `<button class="btn btn--secondary" id="shopv3e-seed">現在のおすすめ・セットを取り込む</button>` : ""}
          <button class="btn btn--secondary" id="shopv3e-add-featured">＋ おすすめ</button>
          <button class="btn btn--secondary" id="shopv3e-add-set">＋ セット</button>
          <button class="btn btn--secondary" id="shopv3e-reload">再読込</button>
        </div>
      </div>

      ${list.length ? `
        <div class="shopv3e-list">
          ${list.map((c) => `
            <article class="shopv3e-card">
              <div class="shopv3e-card-top">
                <div>
                  <span class="shopv3e-pill">${esc(KIND_LABEL[c.kind] || c.kind)}</span>
                  <h4 style="margin-top:7px">${esc(c.title)}</h4>
                </div>
                <span class="shopv3e-pill ${c.published ? "" : "off"}">${c.published ? "公開" : "非公開"}</span>
              </div>
              ${c.description ? `<div style="font-size:12px;color:#65736c;line-height:1.6">${esc(c.description)}</div>` : ""}
              <div class="shopv3e-items">
                ${itemNames(c).map((x) => `<span class="shopv3e-item">${esc(x)}</span>`).join("") || '<span class="shopv3e-item">商品未設定</span>'}
              </div>
              <div class="shopv3e-actions">
                <button class="shopv3-mini primary" data-shopv3e-edit="${esc(c.id)}">編集</button>
                <button class="shopv3-mini danger" data-shopv3e-delete="${esc(c.id)}">削除</button>
              </div>
            </article>
          `).join("")}
        </div>
      ` : `
        <div class="shopv3e-empty">
          まだ本番用のおすすめ・セットは登録されていません。<br>
          <strong>「現在のおすすめ・セットを取り込む」</strong>を押すと、今の公開SHOPの内容を初期値として登録できます。
        </div>
      `}
    `;

    $("#shopv3e-seed")?.addEventListener("click", seedDefaults);
    $("#shopv3e-add-featured")?.addEventListener("click", () => openEditor(null, "featured"));
    $("#shopv3e-add-set")?.addEventListener("click", () => openEditor(null, "set"));
    $("#shopv3e-reload")?.addEventListener("click", refresh);
    $$("[data-shopv3e-edit]").forEach((b) => b.onclick = () => openEditor(b.dataset.shopv3eEdit));
    $$("[data-shopv3e-delete]").forEach((b) => b.onclick = () => deleteCollection(b.dataset.shopv3eDelete));
  }

  async function refresh() {
    if (state.loading) return;
    state.loading = true;
    try {
      const r = await request("/api/admin/bootstrap");
      state.products = r.data.products || [];
      state.orders = r.data.orders || [];
      state.collections = r.data.collections || [];
      state.collectionItems = r.data.collectionItems || [];
      ensureSection();
      renderSection();
      decorateOrders();
    } catch (e) {
      const card = ensureSection();
      if (card) card.innerHTML = `<div class="owner-warning-box"><strong>おすすめ・セットを読み込めませんでした。</strong><br>${esc(e.message)}</div>`;
    } finally {
      state.loading = false;
    }
  }

  async function seedDefaults() {
    if (!confirm("現在公開中のおすすめ3件・セット3件を本番管理へ取り込みますか？")) return;
    try {
      await request("/api/admin/collections/seed-defaults", { method: "POST", json: {} });
      window.Green.toast("おすすめ・セットを取り込みました。", "success");
      await refresh();
    } catch (e) {
      window.Green.toast(e.message, "error");
    }
  }

  function selectedItems(collectionId) {
    return state.collectionItems
      .filter((x) => x.collection_id === collectionId)
      .sort((a, b) => Number(a.sort_order || 100) - Number(b.sort_order || 100))
      .map((x) => ({
        productId: x.product_id,
        quantity: Number(x.quantity || 1),
      }));
  }

  function ensureDialog() {
    let d = $("#shopv3e-collection-dialog");
    if (d) return d;
    d = document.createElement("dialog");
    d.id = "shopv3e-collection-dialog";
    d.className = "shopv3e-dialog";
    document.body.append(d);
    return d;
  }

  function productOptions(selected = "") {
    return state.products
      .filter((p) => p.productStatus !== "archived")
      .map((p) => `<option value="${esc(p.dbId)}" ${p.dbId === selected ? "selected" : ""}>${esc(p.name)}｜${esc(p.id)}</option>`)
      .join("");
  }

  function rowHtml(item = { productId: "", quantity: 1 }) {
    return `
      <div class="shopv3e-product-row">
        <label class="shopv3e-field">
          <span>商品</span>
          <select data-shopv3e-product>
            <option value="">商品を選択</option>
            ${productOptions(item.productId)}
          </select>
        </label>
        <label class="shopv3e-field">
          <span>数量</span>
          <input data-shopv3e-qty type="number" min="1" max="99" value="${esc(item.quantity || 1)}">
        </label>
        <button type="button" class="shopv3-mini danger" data-shopv3e-remove>外す</button>
      </div>
    `;
  }

  function openEditor(id = null, defaultKind = "featured") {
    const current = id ? state.collections.find((x) => x.id === id) : null;
    const items = current ? selectedItems(current.id) : [{ productId: "", quantity: 1 }];
    const d = ensureDialog();

    d.innerHTML = `
      <div class="shopv3e-dialog-wrap">
        <div class="shopv3e-dialog-head">
          <strong>${current ? "おすすめ・セットを編集" : "おすすめ・セットを追加"}</strong>
          <button type="button" class="shopv3-mini" data-shopv3e-close>閉じる</button>
        </div>
        <form id="shopv3e-form">
          <div class="shopv3e-dialog-body">
            <div class="shopv3e-grid">
              <label class="shopv3e-field">
                <span>種類</span>
                <select name="kind">
                  <option value="featured" ${(current?.kind || defaultKind) === "featured" ? "selected" : ""}>おすすめ</option>
                  <option value="set" ${(current?.kind || defaultKind) === "set" ? "selected" : ""}>植物＋鉢セット</option>
                  <option value="campaign" ${(current?.kind || defaultKind) === "campaign" ? "selected" : ""}>特集</option>
                </select>
              </label>
              <label class="shopv3e-field">
                <span>表示順</span>
                <input name="sortOrder" type="number" min="0" value="${esc(current?.sort_order || 100)}">
              </label>
              <label class="shopv3e-field wide">
                <span>タイトル</span>
                <input name="title" required value="${esc(current?.title || "")}" placeholder="例：パキラ × ホワイト">
              </label>
              <label class="shopv3e-field wide">
                <span>説明</span>
                <textarea name="description" placeholder="お客様に見せる短い説明">${esc(current?.description || "")}</textarea>
              </label>
              <label class="shopv3e-field">
                <span>公開</span>
                <select name="published">
                  <option value="true" ${current?.published !== false ? "selected" : ""}>公開する</option>
                  <option value="false" ${current?.published === false ? "selected" : ""}>非公開</option>
                </select>
              </label>
            </div>

            <div>
              <div class="shopv3e-head" style="align-items:center">
                <strong>構成商品</strong>
                <button type="button" class="shopv3-mini" id="shopv3e-add-row">＋ 商品を追加</button>
              </div>
              <div id="shopv3e-product-rows" style="display:grid;gap:8px;margin-top:8px">
                ${items.map(rowHtml).join("")}
              </div>
              <div style="margin-top:8px;font-size:11px;color:#74817a">
                おすすめは通常1商品、セットは2〜4商品程度がおすすめです。
              </div>
            </div>
          </div>
          <div class="shopv3e-dialog-foot">
            <button type="button" class="btn btn--secondary" data-shopv3e-close>キャンセル</button>
            <button type="submit" class="btn btn--primary">保存</button>
          </div>
        </form>
      </div>
    `;

    const bindRows = () => {
      $$("[data-shopv3e-remove]", d).forEach((b) => b.onclick = () => {
        const rows = $("#shopv3e-product-rows", d);
        if ($$(":scope > .shopv3e-product-row", rows).length <= 1) return;
        b.closest(".shopv3e-product-row")?.remove();
      });
    };
    bindRows();

    $("#shopv3e-add-row", d).onclick = () => {
      const rows = $("#shopv3e-product-rows", d);
      if ($$(":scope > .shopv3e-product-row", rows).length >= 4) {
        window.Green.toast("構成商品は最大4商品です。", "error");
        return;
      }
      rows.insertAdjacentHTML("beforeend", rowHtml());
      bindRows();
    };

    $$("[data-shopv3e-close]", d).forEach((b) => b.onclick = () => d.close());

    $("#shopv3e-form", d).onsubmit = async (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const fd = new FormData(form);
      const kind = String(fd.get("kind") || "featured");
      const title = String(fd.get("title") || "").trim();
      if (!title) return;

      let itemsPayload = $$("[data-shopv3e-product]", d)
        .map((select, index) => {
          const row = select.closest(".shopv3e-product-row");
          return {
            productId: select.value,
            quantity: Math.max(1, Number($("[data-shopv3e-qty]", row)?.value || 1)),
            sortOrder: (index + 1) * 10,
          };
        })
        .filter((x) => x.productId);

      if (!itemsPayload.length) {
        window.Green.toast("商品を1つ以上選択してください。", "error");
        return;
      }
      if (kind === "featured") itemsPayload = itemsPayload.slice(0, 1);

      const submit = $('button[type="submit"]', form);
      submit.disabled = true;
      submit.textContent = "保存中…";

      try {
        const payload = {
          code: current?.collection_code || `${kind}-${Date.now()}`,
          kind,
          title,
          description: String(fd.get("description") || "").trim(),
          published: String(fd.get("published")) === "true",
          sortOrder: Math.max(0, Number(fd.get("sortOrder") || 100)),
        };

        let collectionId = current?.id || "";
        if (collectionId) {
          await request(`/api/admin/collections/${collectionId}`, { method: "PATCH", json: payload });
        } else {
          const created = await request("/api/admin/collections", { method: "POST", json: payload });
          collectionId = created.data?.id || "";
        }
        if (!collectionId) throw new Error("保存先を確認できませんでした。");

        await request(`/api/admin/collections/${collectionId}/items`, {
          method: "PUT",
          json: { items: itemsPayload },
        });

        d.close();
        window.Green.toast("おすすめ・セットを保存しました。", "success");
        await refresh();
      } catch (err) {
        window.Green.toast(err.message, "error");
        submit.disabled = false;
        submit.textContent = "保存";
      }
    };

    if (!d.open) d.showModal();
  }

  async function deleteCollection(id) {
    const c = state.collections.find((x) => x.id === id);
    if (!c) return;
    if (!confirm(`「${c.title}」を削除しますか？`)) return;
    try {
      await request(`/api/admin/collections/${id}`, { method: "DELETE", json: {} });
      window.Green.toast("削除しました。", "success");
      await refresh();
    } catch (e) {
      window.Green.toast(e.message, "error");
    }
  }

  function decorateOrders() {
    const card = orderCard();
    const table = $("table", card || document);
    if (!table) return;

    const headRow = $("thead tr", table);
    if (headRow && !$("[data-shopv3e-mode-head]", headRow)) {
      const th = document.createElement("th");
      th.dataset.shopv3eModeHead = "1";
      th.textContent = "区分";
      const first = $("th", headRow);
      first?.after(th);
    }

    $$("tbody tr", table).forEach((tr) => {
      if ($("[data-shopv3e-mode-cell]", tr)) return;
      const first = $("td", tr);
      const orderNo = $("strong", first)?.textContent?.trim() || first?.textContent?.trim() || "";
      const order = state.orders.find((x) => String(x.order_number) === orderNo);
      if (!order || !first) return;

      const td = document.createElement("td");
      td.dataset.shopv3eModeCell = "1";
      const mode = String(order.transaction_mode || "sale");
      const date = order.requested_date ? `<br><small>${esc(order.requested_date)}${order.requested_time_window ? ` ${esc(order.requested_time_window)}` : ""}</small>` : "";
      td.innerHTML = `<span class="shopv3e-order-mode">${esc(MODE_LABEL[mode] || mode)}</span>${date}`;
      first.after(td);
    });
  }

  function watch() {
    if (state.observer) return;
    let timer = 0;
    state.observer = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (shopShell()) {
          ensureSection();
          decorateOrders();
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
      if (!shopShell()) {
        setTimeout(start, 120);
        return;
      }
      ensureSection();
      refresh();
    };
    start();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();