(() => {
  "use strict";

  const VERSION = "GREEN-SHOP-OWNER-DISPLAY-SLOTS-R4.4-DIRECT-ORDERS-20260928";
  if (window.__DPRO_GREEN_SHOP_OWNER_DISPLAY_SLOTS_R4__) return;
  window.__DPRO_GREEN_SHOP_OWNER_DISPLAY_SLOTS_R4__ = VERSION;

  const API = String(
    window.GREEN_CONFIG?.SHOP_MODULE?.apiBase ||
    "https://dpro-cl-000001-green-shop.dpromstk2000.workers.dev"
  ).replace(/\/$/, "");
  const WEBSITE_URL = String(
    window.GREEN_CONFIG?.SHOP_MODULE?.websiteUrl ||
    "https://dpromstk2000-lab.github.io/dpro-green-website/shop.html"
  );
  const WEBSITE_BASE = WEBSITE_URL.replace(/\/[^/]*$/, "/");
  const BUILD_CODE_KEY = "dpro_green_shop_build_code";
  const SHOP_TAB_KEY = "dpro_green_shop_owner_active_tab_r41";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  const state = {
    products: [],
    collections: [],
    collectionItems: [],
    loading: false,
    observer: null,
  };

  const STATIC_FEATURED = [
    {
      id: "pachira-6",
      title: "やさしく始める、パキラ。",
      description: "明るいリビングや受付に。白い鉢で清潔感のある印象に。",
    },
    {
      id: "sansevieria-6",
      title: "省スペースでも映える。",
      description: "シャープな葉姿で、デスク横や玄関にも。",
    },
    {
      id: "benjamin-8",
      title: "贈りものに、上品な存在感。",
      description: "開店・移転祝いにも使いやすいボリューム感。",
    },
  ];

  const STATIC_SETS = [
    {
      plantId: "pachira-6",
      potId: "pot-white-6",
      title: "パキラ × ホワイト",
      description: "受付・クリニック・明るいリビングに。清潔感を重視した組み合わせ。",
    },
    {
      plantId: "monstera-8",
      potId: "pot-charcoal-8",
      title: "モンステラ × チャコール",
      description: "店舗・オフィスを引き締める、存在感のあるモダンスタイル。",
    },
    {
      plantId: "sansevieria-6",
      potId: "pot-woven-6",
      title: "サンセベリア × ナチュラル",
      description: "木の家具やナチュラル空間に合わせやすい、やわらかな組み合わせ。",
    },
  ];

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

    if (!t && !b) throw new Error("オーナーセッションを確認できません。");
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
      throw new Error(data.message || "SHOP表示設定の処理に失敗しました。");
    }
    return data;
  }

  function toast(message, type = "success") {
    if (window.Green?.toast) window.Green.toast(message, type);
    else alert(message);
  }

  function shopShell() {
    return $("#green-shop-prod-root .shopv3-shell");
  }

  function regularProducts() {
    return state.products.filter((p) =>
      p &&
      p.productStatus !== "archived" &&
      String(p.id || "") !== "dpro-shop-display-config" &&
      String(p.category || "") !== "__DPRO_SYSTEM__"
    );
  }

  function publicProducts() {
    return regularProducts().filter((p) => p.published);
  }

  function plantProducts() {
    return publicProducts().filter((p) => p.productType === "plant");
  }

  function potProducts() {
    return publicProducts().filter((p) => p.productType === "pot");
  }

  function productByDbId(dbId) {
    return regularProducts().find((p) => String(p.dbId) === String(dbId)) || null;
  }

  function productByPublicId(id) {
    return regularProducts().find((p) => String(p.id) === String(id)) || null;
  }

  function itemProductDbId(item) {
    return String(item?.product_id || item?.productId || "");
  }

  function productPhoto(p) {
    if (!p) return "";
    const media = Array.isArray(p.media) ? p.media : [];
    const primary = media.find((x) => x?.isPrimary && x?.url) || media.find((x) => x?.url);
    if (primary?.url) return primary.url;
    const img = String(p.image || "");
    if (/^https?:\/\//i.test(img)) return img;
    return img ? WEBSITE_BASE + img.replace(/^\/+/, "") : "";
  }

  function shortName(p) {
    if (!p) return "";
    let name = String(p.name || "");
    name = name.replace(/[（(][^）)]*(鉢カバー|鉢|号対応)[^）)]*[）)]/g, "");
    name = name.replace(/\s{2,}/g, " ").trim();
    return name || String(p.name || "");
  }

  function installStyle() {
    if ($("#shop-display-r4-style")) return;
    const style = document.createElement("style");
    style.id = "shop-display-r4-style";
    style.textContent = `
      .shop-display-r4{border:2px solid #b7d8c5!important;background:linear-gradient(180deg,#fbfefc,#f5faf7)!important}
      .shop-display-r4-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap}
      .shop-display-r4-head h3{margin:0 0 5px;color:#12382d}
      .shop-display-r4-head p{margin:0;color:#607269;line-height:1.65}
      .shop-display-r4-actions{display:flex;gap:8px;flex-wrap:wrap}
      .shop-display-r4-note{margin-top:12px;padding:12px 14px;border-radius:12px;background:#eaf5ee;color:#315543;font-size:12px;line-height:1.7}
      .shop-display-r4-section{margin-top:18px;border-top:1px solid #d9e7df;padding-top:16px}
      .shop-display-r4-section:first-of-type{border-top:0}
      .shop-display-r4-section-title{display:flex;gap:10px;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;margin-bottom:10px}
      .shop-display-r4-section-title h4{margin:0;color:#173d2b;font-size:16px}
      .shop-display-r4-section-title p{margin:3px 0 0;color:#6a7971;font-size:12px}
      .shop-display-r4-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
      .shop-display-r4-slot{border:1px solid #d8e5de;border-radius:14px;background:#fff;padding:12px;display:grid;gap:10px;min-width:0}
      .shop-display-r4-slot-top{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}
      .shop-display-r4-slot-title{font-weight:900;color:#173d2b}
      .shop-display-r4-position{font-size:10px;font-weight:900;color:#4e6659;background:#eef5f1;padding:4px 7px;border-radius:999px;white-space:nowrap}
      .shop-display-r4-preview{display:grid;grid-template-columns:72px minmax(0,1fr);gap:10px;align-items:center;padding:8px;border-radius:11px;background:#f7faf8;border:1px solid #e5ece8}
      .shop-display-r4-preview img{width:72px;height:72px;object-fit:cover;border-radius:9px;background:#eef2ef}
      .shop-display-r4-preview strong{display:block;font-size:12px;line-height:1.45;color:#213d31;word-break:break-word}
      .shop-display-r4-preview small{display:block;color:#74817a;margin-top:3px}
      .shop-display-r4-field{display:grid;gap:5px}
      .shop-display-r4-field>span{font-size:11px;font-weight:900;color:#315543}
      .shop-display-r4-field select,.shop-display-r4-field input,.shop-display-r4-field textarea{width:100%;box-sizing:border-box;border:1px solid #cbd9d2;border-radius:9px;padding:9px;font:inherit;background:#fff}
      .shop-display-r4-field textarea{min-height:78px;resize:vertical}
      .shop-display-r4-set-products{display:grid;grid-template-columns:1fr 1fr;gap:8px}
      .shop-display-r4-plus{text-align:center;font-weight:900;color:#527061;margin:-4px 0}
      .shop-display-r4-footer{display:flex;justify-content:flex-end;gap:8px;margin-top:16px;position:sticky;bottom:8px;z-index:4}
      .shop-display-r4-footer .btn{box-shadow:0 8px 24px #173d2b22}
      .shop-display-r4-saving{opacity:.65;pointer-events:none}
      .shop-sales-tabs-r41{display:flex;gap:8px;align-items:center;overflow-x:auto;padding:4px;margin:4px 0 14px;scrollbar-width:thin}
      .shop-sales-tab-r41{flex:0 0 auto;min-height:44px;border:1px solid #cbdad2;border-radius:12px;background:#fff;color:#335344;padding:0 15px;font:inherit;font-weight:900;cursor:pointer;white-space:nowrap;transition:.15s ease}
      .shop-sales-tab-r41:hover{background:#f5faf7}
      .shop-sales-tab-r41.is-active{background:#174c35;border-color:#174c35;color:#fff;box-shadow:0 7px 18px #174c3520}
      .shop-sales-tab-r41 small{display:block;font-size:9px;font-weight:700;opacity:.8;margin-top:1px}
      .shop-sales-tab-help-r41{margin:-6px 0 14px;padding:10px 12px;border-radius:10px;background:#f4f8f6;color:#52675c;font-size:12px;line-height:1.65}
      .shop-sales-tab-panel-hidden-r41{display:none!important}
      .shop-sales-global-summary-r41{margin-bottom:10px}
      @media(max-width:1050px){.shop-display-r4-grid{grid-template-columns:1fr}}
      @media(max-width:680px){
        .shop-sales-tabs-r41{margin-left:-2px;margin-right:-2px;padding-bottom:7px}
        .shop-sales-tab-r41{min-height:42px;padding:0 12px;font-size:12px}
        .shop-display-r4-set-products{grid-template-columns:1fr}
        .shop-display-r4-preview{grid-template-columns:58px minmax(0,1fr)}
        .shop-display-r4-preview img{width:58px;height:58px}
      }
    `;
    document.head.append(style);
  }

  function productOptions(list, selectedDbId = "") {
    return [
      '<option value="">商品を選択してください</option>',
      ...list.map((p) =>
        `<option value="${esc(p.dbId)}" ${String(p.dbId) === String(selectedDbId) ? "selected" : ""}>${esc(p.name)}${p.published ? "" : "（非公開）"}</option>`
      )
    ].join("");
  }

  function collectionItems(collectionId) {
    return state.collectionItems
      .filter((x) => String(x.collection_id) === String(collectionId))
      .sort((a, b) => Number(a.sort_order || 100) - Number(b.sort_order || 100));
  }

  function collectionsByKind(kind) {
    return state.collections
      .filter((c) => c.kind === kind)
      .sort((a, b) => Number(a.sort_order || 100) - Number(b.sort_order || 100));
  }

  function existingByCode(code) {
    return state.collections.find((c) => String(c.collection_code || c.code || "") === String(code)) || null;
  }

  function featuredDefaults() {
    const existing = collectionsByKind("featured").slice(0, 3);
    if (existing.length) {
      return [0,1,2].map((i) => {
        const c = existing[i];
        const item = c ? collectionItems(c.id)[0] : null;
        return {
          collection: c || null,
          productDbId: itemProductDbId(item),
          title: String(c?.title || ""),
          description: String(c?.description || ""),
        };
      });
    }

    return STATIC_FEATURED.map((d) => {
      const p = productByPublicId(d.id);
      return {
        collection: null,
        productDbId: p?.dbId || "",
        title: d.title,
        description: d.description,
      };
    });
  }

  function setDefaults() {
    const existing = collectionsByKind("set").slice(0, 3);
    if (existing.length) {
      return [0,1,2].map((i) => {
        const c = existing[i];
        const items = c ? collectionItems(c.id) : [];
        return {
          collection: c || null,
          plantDbId: itemProductDbId(items[0]),
          potDbId: itemProductDbId(items[1]),
          title: String(c?.title || ""),
          description: String(c?.description || ""),
        };
      });
    }

    return STATIC_SETS.map((d) => {
      const plant = productByPublicId(d.plantId);
      const pot = productByPublicId(d.potId);
      return {
        collection: null,
        plantDbId: plant?.dbId || "",
        potDbId: pot?.dbId || "",
        title: d.title,
        description: d.description,
      };
    });
  }

  function staffDefaults() {
    const ranked = publicProducts()
      .filter((p) => p.featured)
      .sort((a, b) => Number(a.featuredRank || 100) - Number(b.featuredRank || 100));
    const fallbackIds = ["monstera-8", "pot-charcoal-8", "pachira-6"];
    const result = [];
    for (let i = 0; i < 3; i++) {
      const p = ranked[i] || productByPublicId(fallbackIds[i]);
      result.push(p?.dbId || "");
    }
    return result;
  }

  function previewHtml(p, label = "") {
    const photo = productPhoto(p);
    return `
      <div class="shop-display-r4-preview">
        ${photo ? `<img src="${esc(photo)}" alt="">` : `<div style="width:72px;height:72px;border-radius:9px;background:#eef2ef;display:grid;place-items:center;font-size:10px;color:#718078">写真なし</div>`}
        <div>
          <strong>${esc(p?.name || "商品未選択")}</strong>
          <small>${esc(label || (p?.published ? "公開中" : p ? "非公開" : "選択してください"))}</small>
        </div>
      </div>
    `;
  }

  function render() {
    const shell = shopShell();
    if (!shell) return;

    let card = $("#shop-display-r4-card");
    if (!card) {
      card = document.createElement("article");
      card.id = "shop-display-r4-card";
      card.className = "shopv3-card shop-display-r4";

      const productCard = $$(":scope > article", shell).find((a) =>
        $("h3", a)?.textContent?.trim() === "商品管理"
      );
      if (productCard) shell.insertBefore(card, productCard);
      else shell.prepend(card);
    }

    const staff = staffDefaults();
    const featured = featuredDefaults();
    const sets = setDefaults();

    card.innerHTML = `
      <div class="shop-display-r4-head">
        <div>
          <h3>公開SHOPの表示設定</h3>
          <p>公開ページと同じ名前で、どの商品をどこに出すか設定します。ページのデザイン自体は変わりません。</p>
        </div>
        <div class="shop-display-r4-actions">
          <a class="btn btn--secondary btn--small" href="${esc(WEBSITE_URL)}" target="_blank" rel="noopener">公開SHOPを確認</a>
          <button type="button" class="btn btn--secondary btn--small" id="shop-display-r4-reload">再読込</button>
        </div>
      </div>

      <div class="shop-display-r4-note">
        <strong>使い方：</strong>
        商品を先に「商品管理」で登録・公開し、この画面では<strong>表示する場所だけ</strong>を選びます。
        季節や在庫に合わせて入れ替えても、SHOPのレイアウトは崩れません。
      </div>

      <section class="shop-display-r4-section">
        <div class="shop-display-r4-section-title">
          <div>
            <h4>① STAFF PICK</h4>
            <p>ページ最上部の3商品です。1が一番大きく表示されます。</p>
          </div>
        </div>
        <div class="shop-display-r4-grid">
          ${staff.map((dbId, i) => {
            const p = productByDbId(dbId);
            const pos = ["最上部・大", "右上", "右下"][i];
            return `
              <article class="shop-display-r4-slot">
                <div class="shop-display-r4-slot-top">
                  <span class="shop-display-r4-slot-title">STAFF PICK ${i + 1}</span>
                  <span class="shop-display-r4-position">${pos}</span>
                </div>
                <div data-staff-preview="${i}">${previewHtml(p)}</div>
                <label class="shop-display-r4-field">
                  <span>表示する商品</span>
                  <select data-staff-slot="${i}">${productOptions(publicProducts(), dbId)}</select>
                </label>
              </article>
            `;
          }).join("")}
        </div>
      </section>

      <section class="shop-display-r4-section">
        <div class="shop-display-r4-section-title">
          <div>
            <h4>② 今、選びたいグリーン</h4>
            <p>商品一覧の上にある3枚のおすすめカードです。1＝左、2＝中央、3＝右。</p>
          </div>
        </div>
        <div class="shop-display-r4-grid">
          ${featured.map((slot, i) => {
            const p = productByDbId(slot.productDbId);
            return `
              <article class="shop-display-r4-slot">
                <div class="shop-display-r4-slot-top">
                  <span class="shop-display-r4-slot-title">今、選びたいグリーン ${i + 1}</span>
                  <span class="shop-display-r4-position">${["左", "中央", "右"][i]}</span>
                </div>
                <div data-feature-preview="${i}">${previewHtml(p)}</div>
                <label class="shop-display-r4-field">
                  <span>表示する植物</span>
                  <select data-feature-slot="${i}">${productOptions(plantProducts(), slot.productDbId)}</select>
                </label>
                <label class="shop-display-r4-field">
                  <span>見出し</span>
                  <input data-feature-title="${i}" value="${esc(slot.title)}" placeholder="商品変更時は自動で入ります">
                </label>
                <label class="shop-display-r4-field">
                  <span>紹介文</span>
                  <textarea data-feature-description="${i}" placeholder="商品変更時は自動で入ります">${esc(slot.description)}</textarea>
                </label>
              </article>
            `;
          }).join("")}
        </div>
      </section>

      <section class="shop-display-r4-section">
        <div class="shop-display-r4-section-title">
          <div>
            <h4>③ 植物と鉢、セットで選ぶ。</h4>
            <p>3つのセットを管理します。各セットは「植物1商品＋鉢1商品」で選びます。</p>
          </div>
        </div>
        <div class="shop-display-r4-grid">
          ${sets.map((slot, i) => {
            const plant = productByDbId(slot.plantDbId);
            const pot = productByDbId(slot.potDbId);
            return `
              <article class="shop-display-r4-slot">
                <div class="shop-display-r4-slot-top">
                  <span class="shop-display-r4-slot-title">セット ${i + 1}</span>
                  <span class="shop-display-r4-position">${["左", "中央", "右"][i]}</span>
                </div>
                <div class="shop-display-r4-set-products">
                  <div data-set-plant-preview="${i}">${previewHtml(plant, "植物")}</div>
                  <div data-set-pot-preview="${i}">${previewHtml(pot, "鉢・鉢カバー")}</div>
                </div>
                <label class="shop-display-r4-field">
                  <span>植物</span>
                  <select data-set-plant="${i}">${productOptions(plantProducts(), slot.plantDbId)}</select>
                </label>
                <div class="shop-display-r4-plus">＋</div>
                <label class="shop-display-r4-field">
                  <span>鉢・鉢カバー</span>
                  <select data-set-pot="${i}">${productOptions(potProducts(), slot.potDbId)}</select>
                </label>
                <label class="shop-display-r4-field">
                  <span>セット名</span>
                  <input data-set-title="${i}" value="${esc(slot.title)}" placeholder="例：モンステラ × チャコール">
                </label>
                <label class="shop-display-r4-field">
                  <span>紹介文</span>
                  <textarea data-set-description="${i}" placeholder="この組み合わせのおすすめポイント">${esc(slot.description)}</textarea>
                </label>
              </article>
            `;
          }).join("")}
        </div>
      </section>

      <div class="shop-display-r4-footer">
        <button type="button" class="btn btn--primary" id="shop-display-r4-save">表示設定を保存</button>
      </div>
    `;

    bind(card);
    card.dataset.shopDisplayR4 = VERSION;
    ensureTabs();
  }

  function updatePreview(root, selector, p, label = "") {
    const target = $(selector, root);
    if (target) target.innerHTML = previewHtml(p, label);
  }

  function bind(card) {
    $("#shop-display-r4-reload", card)?.addEventListener("click", refresh);

    $$("[data-staff-slot]", card).forEach((select) => {
      select.addEventListener("change", () => {
        const i = Number(select.dataset.staffSlot);
        updatePreview(card, `[data-staff-preview="${i}"]`, productByDbId(select.value));
      });
    });

    $$("[data-feature-slot]", card).forEach((select) => {
      select.addEventListener("change", () => {
        const i = Number(select.dataset.featureSlot);
        const p = productByDbId(select.value);
        updatePreview(card, `[data-feature-preview="${i}"]`, p);
        const title = $(`[data-feature-title="${i}"]`, card);
        const desc = $(`[data-feature-description="${i}"]`, card);
        if (title) title.value = String(p?.shortDescription || p?.name || "");
        if (desc) desc.value = String(p?.description || p?.shortDescription || "");
      });
    });

    $$("[data-set-plant]", card).forEach((select) => {
      select.addEventListener("change", () => {
        const i = Number(select.dataset.setPlant);
        const plant = productByDbId(select.value);
        updatePreview(card, `[data-set-plant-preview="${i}"]`, plant, "植物");
        syncSetCopy(card, i);
      });
    });

    $$("[data-set-pot]", card).forEach((select) => {
      select.addEventListener("change", () => {
        const i = Number(select.dataset.setPot);
        const pot = productByDbId(select.value);
        updatePreview(card, `[data-set-pot-preview="${i}"]`, pot, "鉢・鉢カバー");
        syncSetCopy(card, i);
      });
    });

    $("#shop-display-r4-save", card)?.addEventListener("click", saveAll);
  }

  function syncSetCopy(card, i) {
    const plant = productByDbId($(`[data-set-plant="${i}"]`, card)?.value || "");
    const pot = productByDbId($(`[data-set-pot="${i}"]`, card)?.value || "");
    const title = $(`[data-set-title="${i}"]`, card);
    const desc = $(`[data-set-description="${i}"]`, card);

    if (title) {
      title.value = plant && pot
        ? `${shortName(plant)} × ${shortName(pot)}`
        : "";
    }
    if (desc) {
      desc.value = plant && pot
        ? `${shortName(plant)}と${shortName(pot)}を合わせた、おすすめの組み合わせです。`
        : "";
    }
  }

  function readForm() {
    const card = $("#shop-display-r4-card");
    if (!card) throw new Error("表示設定画面を確認できません。");

    const staff = [0,1,2].map((i) => $(`[data-staff-slot="${i}"]`, card)?.value || "");
    const featured = [0,1,2].map((i) => ({
      productDbId: $(`[data-feature-slot="${i}"]`, card)?.value || "",
      title: String($(`[data-feature-title="${i}"]`, card)?.value || "").trim(),
      description: String($(`[data-feature-description="${i}"]`, card)?.value || "").trim(),
    }));
    const sets = [0,1,2].map((i) => ({
      plantDbId: $(`[data-set-plant="${i}"]`, card)?.value || "",
      potDbId: $(`[data-set-pot="${i}"]`, card)?.value || "",
      title: String($(`[data-set-title="${i}"]`, card)?.value || "").trim(),
      description: String($(`[data-set-description="${i}"]`, card)?.value || "").trim(),
    }));
    return { staff, featured, sets };
  }

  function validateForm(data) {
    if (data.staff.some((x) => !x)) throw new Error("STAFF PICK 1〜3の商品をすべて選択してください。");
    if (new Set(data.staff).size !== 3) throw new Error("STAFF PICK 1〜3は別々の商品を選んでください。");

    const featureIds = data.featured.map((x) => x.productDbId);
    if (featureIds.some((x) => !x)) throw new Error("「今、選びたいグリーン」1〜3をすべて選択してください。");
    if (new Set(featureIds).size !== 3) throw new Error("「今、選びたいグリーン」1〜3は別々の植物を選んでください。");

    const topSix = [...data.staff, ...featureIds];
    if (new Set(topSix).size !== topSix.length) {
      throw new Error("STAFF PICKと「今、選びたいグリーン」で同じ商品が重複しています。上部6枠は別々の商品を選んでください。");
    }

    for (let i = 0; i < data.featured.length; i++) {
      const x = data.featured[i];
      if (!x.title) throw new Error(`「今、選びたいグリーン ${i + 1}」の見出しを入力してください。`);
      if (!x.description) throw new Error(`「今、選びたいグリーン ${i + 1}」の紹介文を入力してください。`);
    }

    for (let i = 0; i < data.sets.length; i++) {
      const x = data.sets[i];
      if (!x.plantDbId || !x.potDbId) throw new Error(`セット ${i + 1} の植物と鉢を選択してください。`);
      if (!x.title) throw new Error(`セット ${i + 1} のセット名を入力してください。`);
      if (!x.description) throw new Error(`セット ${i + 1} の紹介文を入力してください。`);
    }
  }

  function productPayload(p, overrides = {}) {
    return {
      id: p.id,
      name: p.name,
      category: p.category,
      productType: p.productType,
      price: Math.max(0, Math.floor(Number(p.price) || 0)),
      rentalMonthlyYen: Math.max(0, Math.floor(Number(p.rentalMonthlyYen) || 0)),
      stock: Math.max(0, Math.floor(Number(p.stock) || 0)),
      stockMode: p.stockMode || "managed",
      lowStockThreshold: Math.max(0, Math.floor(Number(p.lowStockThreshold) || 3)),
      image: p.image || "",
      shortDescription: p.shortDescription || "",
      description: p.description || "",
      lead: p.lead || "",
      transactionModes: Array.isArray(p.transactionModes) && p.transactionModes.length ? p.transactionModes : ["sale"],
      fulfillmentModes: Array.isArray(p.fulfillmentModes) ? p.fulfillmentModes : [],
      featured: !!p.featured,
      featuredRank: Math.max(0, Math.floor(Number(p.featuredRank) || 100)),
      published: !!p.published,
      productStatus: p.productStatus || "active",
      sortOrder: Math.max(0, Math.floor(Number(p.sortOrder) || 100)),
      ...overrides,
    };
  }

  async function saveStaff(staffDbIds) {
    const selected = new Map(staffDbIds.map((id, i) => [String(id), i + 1]));
    const changed = regularProducts().filter((p) => {
      const rank = selected.get(String(p.dbId));
      if (rank) return !p.featured || Number(p.featuredRank) !== rank;
      return !!p.featured;
    });

    for (const p of changed) {
      const rank = selected.get(String(p.dbId));
      await request(`/api/admin/products/${p.dbId}`, {
        method: "PATCH",
        json: productPayload(p, {
          featured: !!rank,
          featuredRank: rank || 100,
        }),
      });
    }
  }

  async function upsertCollection({ code, kind, title, description, sortOrder, items }) {
    let c = existingByCode(code);

    if (!c) {
      const sameKind = collectionsByKind(kind);
      const targetIndex = Math.max(0, Math.round(Number(sortOrder) / 10) - 1);
      c = sameKind[targetIndex] || null;
    }

    const payload = {
      code,
      kind,
      title,
      description,
      published: true,
      sortOrder,
    };

    let collectionId = c?.id || "";
    if (collectionId) {
      await request(`/api/admin/collections/${collectionId}`, {
        method: "PATCH",
        json: payload,
      });
    } else {
      const created = await request("/api/admin/collections", {
        method: "POST",
        json: payload,
      });
      collectionId = created.data?.id || "";
    }

    if (!collectionId) throw new Error(`${title} の保存先を確認できませんでした。`);

    await request(`/api/admin/collections/${collectionId}/items`, {
      method: "PUT",
      json: {
        items: items.map((x, i) => ({
          productId: x.productDbId,
          quantity: Math.max(1, Number(x.quantity || 1)),
          sortOrder: (i + 1) * 10,
        })),
      },
    });
  }

  async function saveAll() {
    const card = $("#shop-display-r4-card");
    const button = $("#shop-display-r4-save", card);
    try {
      const data = readForm();
      validateForm(data);

      card.classList.add("shop-display-r4-saving");
      if (button) button.textContent = "保存中…";

      await saveStaff(data.staff);

      for (let i = 0; i < 3; i++) {
        const x = data.featured[i];
        await upsertCollection({
          code: `homepage-featured-${i + 1}`,
          kind: "featured",
          title: x.title,
          description: x.description,
          sortOrder: (i + 1) * 10,
          items: [{ productDbId: x.productDbId, quantity: 1 }],
        });
      }

      for (let i = 0; i < 3; i++) {
        const x = data.sets[i];
        await upsertCollection({
          code: `homepage-set-${i + 1}`,
          kind: "set",
          title: x.title,
          description: x.description,
          sortOrder: (i + 1) * 10,
          items: [
            { productDbId: x.plantDbId, quantity: 1 },
            { productDbId: x.potDbId, quantity: 1 },
          ],
        });
      }

      // 公開レイアウトは「おすすめ3枠・セット3枠」で固定するため、
      // 過去の余分な featured / set コレクションはここで整理します。
      for (const extra of collectionsByKind("featured").slice(3)) {
        await request(`/api/admin/collections/${extra.id}`, { method: "DELETE", json: {} });
      }
      for (const extra of collectionsByKind("set").slice(3)) {
        await request(`/api/admin/collections/${extra.id}`, { method: "DELETE", json: {} });
      }

      toast("公開SHOPの表示設定を保存しました。", "success");
      await refresh();
    } catch (e) {
      toast(e.message || "保存できませんでした。", "error");
    } finally {
      card?.classList.remove("shop-display-r4-saving");
      if (button) button.textContent = "表示設定を保存";
    }
  }


  function shellDirectCards() {
    const shell = shopShell();
    if (!shell) return [];
    return Array.from(shell.children).filter((el) => el.matches?.("article.shopv3-card"));
  }

  function cardByHeading(text) {
    return shellDirectCards().find((card) => {
      const h = $("h3", card);
      return h && String(h.textContent || "").trim().includes(text);
    }) || null;
  }

  function tabCards() {
    return {
      display: $("#shop-display-r4-card"),
      products: cardByHeading("商品管理"),
      orders: cardByHeading("注文"),
      settings: cardByHeading("SHOP全体設定"),
    };
  }

  function tabDescription(key) {
    return {
      display: "季節・在庫・売りたい商品に合わせて、公開SHOPの見せ方を変更します。商品そのものの登録・価格変更は「商品管理」で行います。",
      products: "商品写真・商品名・価格・在庫・販売方法・公開状態を管理します。新しい商品を追加するときもここを使います。",
      orders: "通常販売・取り置き・レンタル・問い合わせの受付を確認し、次の対応へ進めます。日々の注文対応はここを使います。",
      settings: "配送・店頭受取・レンタルなどSHOP全体の機能を切り替えます。通常は頻繁に変更しない設定です。",
    }[key] || "";
  }

  function currentTab() {
    const saved = sessionStorage.getItem(SHOP_TAB_KEY);
    return ["display","products","orders","settings"].includes(saved) ? saved : "display";
  }

  function applyTab(key, {remember=true} = {}) {
    const tabs = $("#shop-sales-tabs-r41");
    const help = $("#shop-sales-tab-help-r41");
    if (!tabs) return;

    const valid = ["display","products","orders","settings"].includes(key) ? key : "display";
    if (remember) sessionStorage.setItem(SHOP_TAB_KEY, valid);

    $$("[data-shop-sales-tab-r41]", tabs).forEach((b) => {
      const active = b.dataset.shopSalesTabR41 === valid;
      b.classList.toggle("is-active", active);
      b.setAttribute("aria-selected", active ? "true" : "false");
      b.tabIndex = active ? 0 : -1;
    });

    const cards = tabCards();
    Object.entries(cards).forEach(([name, card]) => {
      if (!card) return;
      card.classList.toggle("shop-sales-tab-panel-hidden-r41", name !== valid);
      card.hidden = false;
    });

    if (help) help.textContent = tabDescription(valid);

    const shell = shopShell();
    if (shell) shell.dataset.shopSalesActiveTabR41 = valid;
  }

  function ensureTabs() {
    const shell = shopShell();
    if (!shell) return;

    let tabs = $("#shop-sales-tabs-r41");
    let help = $("#shop-sales-tab-help-r41");

    if (!tabs || !tabs.isConnected) {
      tabs = document.createElement("nav");
      tabs.id = "shop-sales-tabs-r41";
      tabs.className = "shop-sales-tabs-r41";
      tabs.setAttribute("role", "tablist");
      tabs.setAttribute("aria-label", "販売・SHOP メニュー");
      tabs.innerHTML = `
        <button type="button" class="shop-sales-tab-r41" data-shop-sales-tab-r41="display" role="tab">
          ① 公開SHOP表示<small>季節商品の入替</small>
        </button>
        <button type="button" class="shop-sales-tab-r41" data-shop-sales-tab-r41="products" role="tab">
          ② 商品管理<small>商品・写真・価格・在庫</small>
        </button>
        <button type="button" class="shop-sales-tab-r41" data-shop-sales-tab-r41="orders" role="tab">
          ③ 注文・受付管理<small>日々の対応</small>
        </button>
        <button type="button" class="shop-sales-tab-r41" data-shop-sales-tab-r41="settings" role="tab">
          ④ SHOP設定<small>機能ON / OFF</small>
        </button>
      `;

      help = document.createElement("div");
      help.id = "shop-sales-tab-help-r41";
      help.className = "shop-sales-tab-help-r41";

      const summary = $(".shopv3-summary", shell);
      if (summary) {
        summary.classList.add("shop-sales-global-summary-r41");
        summary.insertAdjacentElement("afterend", tabs);
      } else {
        shell.prepend(tabs);
      }
      tabs.insertAdjacentElement("afterend", help);

      $$("[data-shop-sales-tab-r41]", tabs).forEach((b) => {
        b.addEventListener("click", () => applyTab(b.dataset.shopSalesTabR41));
        b.addEventListener("keydown", (e) => {
          if (!["ArrowLeft","ArrowRight"].includes(e.key)) return;
          const buttons = $$("[data-shop-sales-tab-r41]", tabs);
          const index = buttons.indexOf(b);
          const delta = e.key === "ArrowRight" ? 1 : -1;
          const next = buttons[(index + delta + buttons.length) % buttons.length];
          next?.focus();
          next?.click();
        });
      });
    }

    const settings = tabCards().settings;
    const display = tabCards().display;
    const products = tabCards().products;
    const orders = tabCards().orders;

    // Keep the physical DOM order aligned with the visual index.
    if (display && tabs) {
      let anchor = help || tabs;
      if (display.previousElementSibling !== anchor) anchor.insertAdjacentElement("afterend", display);
      if (products && products.previousElementSibling !== display) display.insertAdjacentElement("afterend", products);
      if (orders && orders.previousElementSibling !== products) (products || display).insertAdjacentElement("afterend", orders);
      if (settings) (orders || products || display).insertAdjacentElement("afterend", settings);
    }

    applyTab(currentTab(), {remember:false});
    document.documentElement.dataset.greenShopOwnerTabsR41 = VERSION;
  }

  if (!window.__DPRO_GREEN_SHOP_TAB_EVENT_R44__) {
    window.__DPRO_GREEN_SHOP_TAB_EVENT_R44__ = true;
    window.addEventListener("dpro-green-shop-open-tab", (event) => {
      const key = String(event?.detail?.tab || "");
      if (!["display","products","orders","settings"].includes(key)) return;
      ensureTabs();
      applyTab(key);
    });
  }

  function hideLegacyCollectionsCard() {
    const old = $("#shopv3e-collections-card");
    if (old) old.hidden = true;
  }

  async function refresh() {
    if (state.loading) return;
    state.loading = true;
    try {
      const r = await request("/api/admin/bootstrap");
      state.products = Array.isArray(r.data?.products) ? r.data.products : [];
      state.collections = Array.isArray(r.data?.collections) ? r.data.collections : [];
      state.collectionItems = Array.isArray(r.data?.collectionItems) ? r.data.collectionItems : [];
      render();
      hideLegacyCollectionsCard();
      ensureTabs();
    } catch (e) {
      const card = $("#shop-display-r4-card");
      if (card) {
        card.innerHTML = `<div class="owner-warning-box"><strong>公開SHOP表示設定を読み込めませんでした。</strong><br>${esc(e.message)}</div>`;
      }
    } finally {
      state.loading = false;
    }
  }

  function watch() {
    if (state.observer) return;
    let timer = 0;
    state.observer = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        hideLegacyCollectionsCard();
        const shell = shopShell();
        if (!shell) return;
        const card = $("#shop-display-r4-card");
        if (!card || !card.isConnected) {
          refresh();
        } else {
          ensureTabs();
        }
      }, 120);
    });
    state.observer.observe(document.body, { childList: true, subtree: true });
  }

  function boot() {
    if (!/\/owner\.html$/.test(location.pathname)) return;
    installStyle();
    watch();

    const start = () => {
      if (!shopShell()) {
        setTimeout(start, 150);
        return;
      }
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

/* DPRO GREEN OWNER ACTION CENTER R4.2 / 2026-09-28
   Standard flow:
   Dashboard alert -> direct work screen -> one-click return to dashboard.
   Adds SHOP new-order count without changing the core dashboard API. */
(() => {
  "use strict";

  const VERSION = "GREEN-OWNER-ACTION-CENTER-R4.4-DIRECT-ORDERS-20260928";
  if (window.__DPRO_GREEN_OWNER_ACTION_CENTER_R42__) return;
  window.__DPRO_GREEN_OWNER_ACTION_CENTER_R42__ = VERSION;

  const API = String(
    window.GREEN_CONFIG?.SHOP_MODULE?.apiBase ||
    "https://dpro-cl-000001-green-shop.dpromstk2000.workers.dev"
  ).replace(/\/$/, "");
  const BUILD_CODE_KEY = "dpro_green_shop_build_code";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  let newCount = 0;
  let loading = false;
  let timer = 0;
  let observer = null;

  function token() {
    return window.DPRO_AUTH?.getToken?.() ||
      sessionStorage.getItem("green_admin_session_token") || "";
  }

  function buildCode({promptIfMissing=false}={}) {
    if (!window.__DPRO_BUILD_ACCESS__) return "";
    let code = sessionStorage.getItem(BUILD_CODE_KEY) || "";
    if (!code && promptIfMissing) {
      code = prompt("構築・QA用の管理コードを入力してください。") || "";
      if (code) sessionStorage.setItem(BUILD_CODE_KEY, code);
    }
    return code;
  }

  async function shopRequest(path) {
    const headers = new Headers();
    const t = token();
    const b = buildCode({promptIfMissing:false});
    if (!t && !b) return null;
    if (t) headers.set("Authorization", `Bearer ${t}`);
    if (b) headers.set("X-DPRO-Build-Code", b);

    const res = await fetch(API + path, {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => ({}));
    if (data?.ok === false) return null;
    return data?.data || null;
  }

  function installStyle() {
    if ($("#green-action-center-r42-style")) return;
    const style = document.createElement("style");
    style.id = "green-action-center-r42-style";
    style.textContent = `
      .green-action-count-r42{
        display:inline-grid;place-items:center;min-width:20px;height:20px;padding:0 6px;
        margin-left:auto;border-radius:999px;background:#c43d32;color:#fff;
        font-size:11px;font-weight:900;line-height:1;box-sizing:border-box
      }
      .green-action-count-r42[hidden]{display:none!important}
      #green-shop-prod-nav{position:relative}
      #green-shop-prod-nav .green-action-count-r42{margin-left:8px}
      .green-action-shop-card-r42.is-alert{
        border-color:#e4b44b!important;background:#fffaf0!important;
        box-shadow:0 0 0 2px #f3d58a55 inset
      }
      .green-action-shop-card-r42 .green-action-direct-r42{
        display:block;margin-top:4px;color:#805900;font-size:11px;font-weight:900
      }
      .green-action-attention-r42{
        width:100%;border:0;text-align:left;cursor:pointer;font:inherit
      }
      .green-action-attention-r42:hover{filter:brightness(.98)}
      .green-action-back-r42{
        min-height:38px!important;display:inline-flex!important;align-items:center!important;gap:5px!important
      }
      .shop-sales-tab-r41 .green-action-count-r42{margin-left:6px;vertical-align:middle}
      @media(max-width:680px){
        .green-action-back-r42{min-height:36px!important}
      }
    `;
    document.head.append(style);
  }

  function clickDashboard() {
    const native = $('.owner-nav [data-view="dashboard"]');
    if (native) {
      native.click();
      setTimeout(() => window.scrollTo({top:0,behavior:"smooth"}), 30);
    }
  }

  function openOrders() {
    const panel = $('[data-view-panel="shop-sales"]');
    const shopNav = $("#green-shop-prod-nav");

    // Activate the SHOP view immediately.
    if (panel) {
      $$("[data-view-panel]").forEach((p) => {
        p.classList.toggle("is-active", p.dataset.viewPanel === "shop-sales");
      });
      $$("[data-view]").forEach((b) => {
        b.classList.toggle("is-active", b.dataset.view === "shop-sales");
      });
      const title = $("#view-title");
      if (title) title.textContent = "販売・SHOP";
      $("#owner-sidebar")?.classList.remove("is-open");
    }

    // Only invoke the normal SHOP loader when the SHOP shell has not been built yet.
    // Re-clicking after it exists causes an async re-render that can wipe the selected tab.
    if (!$("#green-shop-prod-root .shopv3-shell")) {
      try { shopNav?.click(); } catch {}
    }

    let tries = 0;
    const go = () => {
      tries += 1;
      const shell = $("#green-shop-prod-root .shopv3-shell");

      if (shell) {
        // Ask the tab module to show only "③ 注文・受付管理".
        window.dispatchEvent(new CustomEvent("dpro-green-shop-open-tab", {
          detail: {tab: "orders"}
        }));

        const ordersTab = $('[data-shop-sales-tab-r41="orders"]');
        if (ordersTab) ordersTab.click();

        // Hard fallback: even if the tab UI is still being reconstructed,
        // show the order card only. The normal tab module will take over immediately after.
        const cards = Array.from(shell.children).filter((el) => el.matches?.("article.shopv3-card"));
        for (const card of cards) {
          const h = $("h3", card);
          const text = String(h?.textContent || "");
          const isOrders = text.includes("注文");
          card.classList.toggle("shop-sales-tab-panel-hidden-r41", !isOrders);
        }

        requestAnimationFrame(() => {
          const target = cards.find((card) => String($("h3", card)?.textContent || "").includes("注文")) || panel;
          target?.scrollIntoView({behavior:"smooth",block:"start"});
        });

        // Re-assert the requested tab after late async SHOP renders finish.
        setTimeout(() => window.dispatchEvent(new CustomEvent("dpro-green-shop-open-tab", {
          detail: {tab: "orders"}
        })), 250);
        setTimeout(() => window.dispatchEvent(new CustomEvent("dpro-green-shop-open-tab", {
          detail: {tab: "orders"}
        })), 700);
        return;
      }

      if (panel) panel.classList.add("is-active");
      if (tries < 60) setTimeout(go, 100);
    };
    go();
  }

  function ensureBackButton() {
    const panel = $('[data-view-panel="shop-sales"]');
    const heading = $(".owner-heading", panel);
    if (!heading || $("#green-action-back-r42", heading)) return;

    const actions = heading.lastElementChild;
    const button = document.createElement("button");
    button.type = "button";
    button.id = "green-action-back-r42";
    button.className = "btn btn--secondary green-action-back-r42";
    button.textContent = "← ダッシュボードへ戻る";
    button.addEventListener("click", clickDashboard);

    if (actions && actions !== heading.firstElementChild) actions.prepend(button);
    else heading.append(button);
  }

  function ensureNavBadge() {
    const nav = $("#green-shop-prod-nav");
    if (!nav) return;
    let badge = $(".green-action-count-r42", nav);
    if (!badge) {
      badge = document.createElement("span");
      badge.className = "green-action-count-r42";
      badge.setAttribute("aria-label", "未対応の新規注文・受付件数");
      nav.append(badge);
    }
    badge.textContent = String(newCount);
    badge.hidden = newCount <= 0;
    nav.title = newCount > 0
      ? `未対応の新規注文・受付が${newCount}件あります`
      : "販売・SHOP";
  }

  function ensureOrdersTabBadge() {
    const tab = $('[data-shop-sales-tab-r41="orders"]');
    if (!tab) return;
    let badge = $(".green-action-count-r42", tab);
    if (!badge) {
      badge = document.createElement("span");
      badge.className = "green-action-count-r42";
      tab.append(badge);
    }
    badge.textContent = String(newCount);
    badge.hidden = newCount <= 0;
  }

  function ensureDashboardCard() {
    const stats = $("#dashboard-stats");
    if (!stats) return;

    let card = $("#green-action-shop-card-r42", stats);
    if (!card) {
      card = document.createElement("button");
      card.type = "button";
      card.id = "green-action-shop-card-r42";
      card.className = "owner-stat green-action-shop-card-r42";
      card.addEventListener("click", openOrders);
      stats.prepend(card);
    }

    card.classList.toggle("is-alert", newCount > 0);
    card.innerHTML = `
      <small>新規注文・受付</small>
      <strong>${newCount}</strong>
      <span>${newCount > 0 ? "未対応があります" : "新規受付はありません"}</span>
      <span class="green-action-direct-r42">押すと注文・受付管理を開きます →</span>
    `;
  }

  function ensureAttention() {
    const root = $("#dashboard-attention");
    if (!root) return;

    const old = $("#green-action-shop-attention-r42", root);
    if (newCount <= 0) {
      old?.remove();
      return;
    }

    // Remove the core "nothing pending" message when SHOP itself has pending work.
    if (root.children.length === 1 && root.firstElementChild?.classList.contains("owner-empty")) {
      root.innerHTML = "";
    }

    let item = $("#green-action-shop-attention-r42", root);
    if (!item) {
      const list = root.querySelector(".owner-attention-list") || (() => {
        const div = document.createElement("div");
        div.className = "owner-attention-list";
        root.append(div);
        return div;
      })();

      item = document.createElement("button");
      item.type = "button";
      item.id = "green-action-shop-attention-r42";
      item.className = "owner-attention-item green-action-attention-r42";
      item.addEventListener("click", openOrders);
      list.prepend(item);
    }

    item.innerHTML = `
      <span>
        <strong>SHOP注文・受付</strong>
        <small class="owner-row-sub">未対応 ${newCount}件｜押すと確認場所へ移動</small>
      </span>
      <span class="owner-status-chip is-warning">要確認</span>
    `;
  }

  function paint() {
    installStyle();
    ensureNavBadge();
    ensureOrdersTabBadge();
    ensureBackButton();

    const dashboard = $('[data-view-panel="dashboard"]');
    if (dashboard?.classList.contains("is-active")) {
      ensureDashboardCard();
      ensureAttention();
    }

    document.documentElement.dataset.greenOwnerActionCenterR42 = VERSION;
  }

  async function refresh() {
    if (loading) return;
    loading = true;
    try {
      let payload = await shopRequest("/api/admin/order-workflow");
      if (!payload) {
        const fallback = await shopRequest("/api/admin/bootstrap");
        payload = fallback || {};
      }

      const orders = Array.isArray(payload?.orders) ? payload.orders : [];
      newCount = orders.filter((o) => String(o?.status || "") === "new").length;
      paint();
    } catch (e) {
      console.warn(VERSION, e);
      paint();
    } finally {
      loading = false;
    }
  }

  function watch() {
    if (observer) return;
    let mutationTimer = 0;
    observer = new MutationObserver(() => {
      clearTimeout(mutationTimer);
      mutationTimer = setTimeout(paint, 80);
    });
    observer.observe(document.body, {childList:true,subtree:true});
  }

  function boot() {
    if (!/\/owner\.html$/.test(location.pathname)) return;
    installStyle();
    watch();
    paint();
    refresh();

    timer = window.setInterval(refresh, 60000);
    window.addEventListener("focus", refresh, {passive:true});
    window.addEventListener("pageshow", refresh);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) refresh();
    });

    // Refresh shortly after status/action buttons are used in the SHOP order screen.
    document.addEventListener("click", (e) => {
      if (e.target.closest?.("[data-shopv3f-next],#shopv3f-save")) {
        setTimeout(refresh, 900);
      }
    }, true);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, {once:true});
  } else {
    boot();
  }
})();
