(() => {
  "use strict";

  const VERSION = "GREEN-SHOP-OWNER-V3.1.2-DIALOG-HARDFIT-20260927";
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
  const MAX_MEDIA = 6;

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));

  const state={
    settings:null,
    products:[],
    orders:[],
    capabilities:{},
    loading:false,
    editProduct:null,
    editingTab:"basic",
    pendingFiles:[],
    uploadBusy:false,
  };

  const PRODUCT_TYPE_LABELS={
    plant:"観葉植物",
    pot:"鉢・鉢カバー",
    accessory:"小物・用品",
    gift:"ギフト",
    other:"その他",
  };
  const TX_LABELS={
    sale:"通常販売",
    reserve:"取り置き",
    rental:"レンタル",
    inquiry:"問い合わせ",
  };
  const FULFILL_LABELS={
    shipping:"配送",
    pickup:"店頭受取",
    local_delivery:"自店配達",
    rental_delivery:"レンタル配達",
  };
  const STATUS_LABELS={
    active:"通常",
    draft:"下書き",
    archived:"アーカイブ",
  };
  const ORDER_STATUS_LABELS={
    new:"新規",
    confirmed:"確認済み",
    payment_pending:"決済待ち",
    paid:"支払済み",
    preparing:"準備中",
    shipped:"発送・引渡済み",
    cancelled:"キャンセル",
  };

  function esc(v){
    return String(v??"").replace(/[&<>'"]/g,c=>({
      "&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"
    }[c]));
  }
  function yen(n){
    return new Intl.NumberFormat("ja-JP",{
      style:"currency",currency:"JPY",maximumFractionDigits:0
    }).format(Number(n)||0);
  }
  function safeInt(v,fallback=0){
    const n=Math.floor(Number(v));
    return Number.isFinite(n)?n:fallback;
  }
  function token(){
    return window.DPRO_AUTH?.getToken?.() ||
      sessionStorage.getItem("green_admin_session_token") || "";
  }
  function buildCode(){
    if(!window.__DPRO_BUILD_ACCESS__) return "";
    let code=sessionStorage.getItem(BUILD_CODE_KEY)||"";
    if(!code){
      code=prompt("構築・QA用の管理コードを入力してください。")||"";
      if(code) sessionStorage.setItem(BUILD_CODE_KEY,code);
    }
    return code;
  }
  async function csrf(){
    try{
      return (await window.Green.api("/api/admin/session")).data?.csrfToken || "";
    }catch{
      return "";
    }
  }
  async function authHeaders({json=false}={}){
    const t=token();
    const b=buildCode();
    if(!t&&!b) throw new Error("オーナーセッションを確認できません。");
    const headers=new Headers();
    if(t) headers.set("Authorization",`Bearer ${t}`);
    if(b) headers.set("X-DPRO-Build-Code",b);
    if(json) headers.set("Content-Type","application/json");
    return {headers,t,b};
  }
  async function request(path,options={}){
    const {headers,t,b}=await authHeaders({json:options.json!==undefined});
    if(options.headers){
      new Headers(options.headers).forEach((v,k)=>headers.set(k,v));
    }
    if(!["GET","HEAD"].includes(String(options.method||"GET").toUpperCase())){
      const c=await csrf();
      if(c) headers.set("X-CSRF-Token",c);
    }
    const init={
      method:options.method||"GET",
      headers,
      body:options.json===undefined?options.body:JSON.stringify(options.json),
      cache:"no-store",
    };
    let res=await fetch(API+path,init);
    let data=await res.json().catch(()=>({}));

    if((res.status===401 || data?.error==="session_invalid") &&
       window.__DPRO_BUILD_ACCESS__ && b && options.__buildRetry!==false){
      sessionStorage.removeItem(BUILD_CODE_KEY);
      const retryCode=prompt("構築・QA用の管理コードをもう一度入力してください。")||"";
      if(retryCode){
        sessionStorage.setItem(BUILD_CODE_KEY,retryCode);
        const retryHeaders=new Headers(headers);
        retryHeaders.set("X-DPRO-Build-Code",retryCode);
        res=await fetch(API+path,{...init,headers:retryHeaders});
        data=await res.json().catch(()=>({}));
      }
    }

    if(!res.ok||data.ok===false){
      throw new Error(data.message||"SHOP API処理に失敗しました。");
    }
    return data;
  }

  async function uploadRequest(path,formData){
    const {headers,b}=await authHeaders({json:false});
    const c=await csrf();
    if(c) headers.set("X-CSRF-Token",c);

    let res=await fetch(API+path,{
      method:"POST",
      headers,
      body:formData,
      cache:"no-store",
    });
    let data=await res.json().catch(()=>({}));

    if((res.status===401 || data?.error==="session_invalid") &&
       window.__DPRO_BUILD_ACCESS__ && b){
      sessionStorage.removeItem(BUILD_CODE_KEY);
      const retryCode=prompt("構築・QA用の管理コードをもう一度入力してください。")||"";
      if(retryCode){
        sessionStorage.setItem(BUILD_CODE_KEY,retryCode);
        headers.set("X-DPRO-Build-Code",retryCode);
        res=await fetch(API+path,{method:"POST",headers,body:formData,cache:"no-store"});
        data=await res.json().catch(()=>({}));
      }
    }
    if(!res.ok||data.ok===false){
      throw new Error(data.message||"写真を保存できませんでした。");
    }
    return data;
  }

  function installStyle(){
    if($("#green-shop-v3-style")) return;
    const s=document.createElement("style");
    s.id="green-shop-v3-style";
    s.textContent=`
      .shopv3-shell{display:grid;gap:16px}
      .shopv3-note{padding:14px 16px;border:1px solid #d9e8df;border-radius:14px;background:#f6fbf8;color:#264b39;line-height:1.65}
      .shopv3-note strong{color:#12382d}
      .shopv3-card{border:1px solid #dbe6e0;border-radius:18px;background:#fff;padding:16px;box-shadow:0 10px 30px #173d2b0a}
      .shopv3-card h3{margin:0 0 4px}
      .shopv3-card p{margin:0;color:#6b7771}
      .shopv3-setting-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:14px}
      .shopv3-setting{display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid #e2ebe6;border-radius:12px;padding:11px;background:#fbfdfc}
      .shopv3-setting strong{font-size:13px}
      .shopv3-switch{display:flex;align-items:center;gap:6px;font-size:12px}
      .shopv3-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
      .shopv3-stat{border:1px solid #dfe9e3;border-radius:14px;background:#fff;padding:14px}
      .shopv3-stat strong{display:block;font-size:24px;color:#12382d}
      .shopv3-stat span{font-size:12px;color:#6b7771}
      .shopv3-toolbar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:14px 0}
      .shopv3-toolbar input,.shopv3-toolbar select{min-height:40px;border:1px solid #ccd9d2;border-radius:10px;padding:8px 10px;font:inherit;background:#fff}
      .shopv3-toolbar input{min-width:240px;flex:1}
      .shopv3-products{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
      .shopv3-product{display:grid;grid-template-columns:132px minmax(0,1fr);gap:14px;border:1px solid #dfe8e3;border-radius:16px;background:#fff;padding:12px}
      .shopv3-product-media{position:relative;min-height:132px;border-radius:13px;overflow:hidden;background:#f2f5f3;border:1px solid #e5ece8}
      .shopv3-product-media img{width:100%;height:100%;min-height:132px;object-fit:cover;display:block}
      .shopv3-photo-count{position:absolute;right:7px;bottom:7px;background:#102d23dc;color:#fff;padding:4px 7px;border-radius:999px;font-size:11px;font-weight:800}
      .shopv3-product-body{min-width:0;display:grid;align-content:start;gap:7px}
      .shopv3-product-title{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}
      .shopv3-product-title strong{font-size:15px;line-height:1.45}
      .shopv3-meta{display:flex;gap:6px;flex-wrap:wrap}
      .shopv3-badge{display:inline-flex;align-items:center;padding:4px 8px;border-radius:999px;background:#e9f5ee;color:#17643d;font-size:11px;font-weight:800}
      .shopv3-badge.warn{background:#fff0c8;color:#725000}
      .shopv3-badge.off{background:#edf0ee;color:#6c7771}
      .shopv3-badge.danger{background:#fde9e7;color:#923b31}
      .shopv3-price{font-size:17px;font-weight:900;color:#153d2d}
      .shopv3-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:4px}
      .shopv3-mini{border:1px solid #cddbd4;background:#fff;color:#244a38;border-radius:9px;padding:7px 10px;font-weight:800;cursor:pointer}
      .shopv3-mini.primary{background:#1f7a51;border-color:#1f7a51;color:#fff}
      .shopv3-mini.danger{color:#a43b32;border-color:#e7c8c5}
      .shopv3-warning{font-size:11px;color:#8a5a00;background:#fff8df;border-radius:8px;padding:6px 8px}
      .shopv3-orders{overflow:auto;border:1px solid #dfe8e3;border-radius:14px}
      .shopv3-orders table{width:100%;border-collapse:collapse;min-width:920px}
      .shopv3-orders th,.shopv3-orders td{padding:10px 11px;border-bottom:1px solid #edf1ef;text-align:left;vertical-align:middle}
      .shopv3-orders th{font-size:11px;color:#65736c;background:#f8faf9}
      .shopv3-orders select{border:1px solid #ccd9d2;border-radius:8px;padding:7px;background:#fff}
      .shopv3-dialog{box-sizing:border-box!important;position:fixed!important;inset:6px!important;width:min(980px,calc(100vw - 12px))!important;height:calc(100vh - 12px)!important;height:calc(100dvh - 12px)!important;max-width:none!important;max-height:none!important;border:0;border-radius:18px;padding:0;box-shadow:0 28px 90px #0005;overflow:hidden!important;margin:auto!important}
      .shopv3-dialog[open]{display:grid!important;grid-template-rows:auto auto minmax(0,1fr)!important}
      .shopv3-dialog:not([open]){display:none!important}
      .shopv3-dialog::backdrop{background:#0a2118ba}
      .shopv3-dialog-head{padding:16px 20px;border-bottom:1px solid #e2e9e5;background:#fbfdfc;display:flex;align-items:center;justify-content:space-between;gap:12px;flex:0 0 auto}
      .shopv3-dialog-head strong{font-size:17px}
      .shopv3-close{border:0;background:#eef3f0;border-radius:10px;padding:8px 11px;cursor:pointer}
      .shopv3-tabs{display:flex;gap:4px;padding:10px 14px;border-bottom:1px solid #edf1ef;overflow-x:auto;overflow-y:hidden;background:#fff;flex:0 0 auto}
      .shopv3-tab{border:0;background:transparent;padding:9px 12px;border-radius:9px;font-weight:800;white-space:nowrap;color:#64726b;cursor:pointer}
      .shopv3-tab.is-active{background:#e8f4ed;color:#175c3b}
      .shopv3-dialog form#shopv3-form{display:grid!important;grid-template-rows:minmax(0,1fr) auto!important;min-height:0!important;height:100%!important;overflow:hidden!important}
      .shopv3-dialog-body{box-sizing:border-box;padding:18px 20px 120px!important;overflow-y:auto!important;overflow-x:hidden!important;max-height:none!important;min-height:0!important;height:auto!important;overscroll-behavior:contain;scrollbar-gutter:stable;scroll-padding-bottom:120px}
      .shopv3-pane{display:none}
      .shopv3-pane.is-active{display:block}
      .shopv3-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}
      .shopv3-grid .wide{grid-column:1/-1}
      .shopv3-field{display:grid;gap:6px}
      .shopv3-field>span{font-size:12px;font-weight:900;color:#274a39}
      .shopv3-field input,.shopv3-field select,.shopv3-field textarea{width:100%;box-sizing:border-box;border:1px solid #cbd9d2;border-radius:10px;padding:10px;font:inherit;background:#fff}
      .shopv3-field textarea{min-height:100px;resize:vertical}
      .shopv3-help{font-size:11px;color:#74817a;line-height:1.55}
      .shopv3-choice-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
      .shopv3-choice{display:flex;gap:8px;align-items:flex-start;border:1px solid #dfe8e3;border-radius:12px;padding:10px;background:#fbfdfc}
      .shopv3-choice strong{display:block;font-size:13px}
      .shopv3-choice small{display:block;color:#74817a;line-height:1.45;margin-top:2px}
      .shopv3-media-toolbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px}
      .shopv3-drop{border:2px dashed #bcd0c5;border-radius:14px;padding:16px;text-align:center;background:#f9fcfa}
      .shopv3-drop input{display:none}
      .shopv3-file-button{display:inline-flex;align-items:center;justify-content:center;min-height:44px;margin-top:10px;padding:0 18px;border-radius:11px;background:#1f7a51;color:#fff;font-weight:900;cursor:pointer;box-shadow:0 6px 18px #1f7a5120}
      .shopv3-file-button:hover{filter:brightness(.97)}
      .shopv3-pending-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:12px}
      .shopv3-pending-card{border:1px solid #dce6e1;border-radius:13px;overflow:hidden;background:#fff}
      .shopv3-pending-card img{width:100%;aspect-ratio:4/3;object-fit:cover;display:block;background:#f2f4f3}
      .shopv3-pending-card>div{padding:8px;display:grid;gap:6px}
      .shopv3-pending-name{font-size:11px;font-weight:800;word-break:break-all;color:#42534a}
      .shopv3-legacy-photo{display:grid;grid-template-columns:150px 1fr;gap:12px;align-items:center;border:1px solid #dce6e1;border-radius:13px;padding:10px;margin-top:12px;background:#fff}
      .shopv3-legacy-photo img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:10px;background:#f2f4f3}
      .shopv3-media-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:12px}
      .shopv3-media-item{border:1px solid #dce6e1;border-radius:13px;overflow:hidden;background:#fff}
      .shopv3-media-item img{width:100%;aspect-ratio:4/3;object-fit:cover;display:block;background:#f2f4f3}
      .shopv3-media-item>div{padding:9px;display:grid;gap:7px}
      .shopv3-media-item input{width:100%;box-sizing:border-box}
      .shopv3-media-actions{display:flex;gap:5px;flex-wrap:wrap}
      .shopv3-pending{border:1px dashed #c9d7d0;border-radius:10px;padding:8px;background:#fbfdfc;font-size:12px}
      .shopv3-dialog-foot{box-sizing:border-box;padding:13px 20px calc(13px + env(safe-area-inset-bottom));border-top:1px solid #e2e9e5;display:flex;justify-content:space-between;gap:10px;background:#fff;position:sticky!important;bottom:0!important;z-index:10;box-shadow:0 -8px 20px #173d2b18}
      .shopv3-dialog-foot>div{display:flex;gap:8px;flex-wrap:wrap}
      .shopv3-preview{border:1px solid #dce6e1;border-radius:16px;padding:14px;background:#f9fcfa}
      .shopv3-preview-card{display:grid;grid-template-columns:170px 1fr;gap:16px;align-items:start}
      .shopv3-preview-card img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:12px;background:#eef3f0}
      .shopv3-empty{padding:28px;text-align:center;color:#6f7c75;border:1px dashed #cad8d1;border-radius:14px}
      @media(max-width:1100px){
        .shopv3-setting-grid,.shopv3-summary{grid-template-columns:repeat(2,minmax(0,1fr))}
        .shopv3-products{grid-template-columns:1fr}
      }
      @media(max-width:680px){
        .shopv3-dialog{inset:4px!important;width:calc(100vw - 8px)!important;height:calc(100dvh - 8px)!important;border-radius:14px}
        .shopv3-dialog-body{padding:14px 14px 120px!important}
        .shopv3-dialog-foot{padding-left:14px;padding-right:14px}
        .shopv3-setting-grid,.shopv3-summary,.shopv3-grid,.shopv3-choice-grid{grid-template-columns:1fr}
        .shopv3-product{grid-template-columns:92px minmax(0,1fr)}
        .shopv3-product-media,.shopv3-product-media img{min-height:92px}
        .shopv3-media-grid,.shopv3-pending-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
        .shopv3-legacy-photo{grid-template-columns:110px 1fr}
        .shopv3-preview-card{grid-template-columns:1fr}
      }
    `;
    document.head.append(s);
  }

  function install(){
    if(!/\/owner\.html$/.test(location.pathname)) return;
    installStyle();

    const nav=$(".owner-nav");
    if(!nav) return;

    let button=$("#green-shop-prod-nav");
    if(!button){
      button=document.createElement("button");
      button.id="green-shop-prod-nav";
      button.dataset.view="shop-sales";
      button.innerHTML="<span>販</span>販売・SHOP";
      const feature=nav.querySelector('[data-view="features"]');
      if(feature) nav.insertBefore(button,feature); else nav.append(button);
    }

    const main=$("#owner-main");
    let section=$('[data-view-panel="shop-sales"]',main);
    if(!section){
      section=document.createElement("section");
      section.className="owner-view";
      section.dataset.viewPanel="shop-sales";
      main.append(section);
    }

    section.innerHTML=`
      <div class="owner-heading">
        <div>
          <p class="eyebrow">ONLINE SHOP</p>
          <h2>販売・SHOP</h2>
          <p>商品写真・販売方法・在庫・公開・注文を、ここだけで管理します。</p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <a class="btn btn--secondary" href="${esc(WEBSITE_URL)}" target="_blank" rel="noopener">公開SHOPを見る</a>
          <button class="btn btn--secondary" id="green-shop-reload">再読込</button>
        </div>
      </div>
      <div id="green-shop-prod-root"><div class="owner-empty">SHOPデータを読み込みます…</div></div>
    `;

    button.onclick=open;
    $("#green-shop-reload").onclick=load;

    document.documentElement.dataset.greenShopOwnerVersion=VERSION;
  }

  function open(){
    $$("[data-view-panel]").forEach(p=>p.classList.toggle("is-active",p.dataset.viewPanel==="shop-sales"));
    $$("[data-view]").forEach(b=>b.classList.toggle("is-active",b.dataset.view==="shop-sales"));
    const t=$("#view-title"); if(t)t.textContent="販売・SHOP";
    $("#owner-sidebar")?.classList.remove("is-open");
    load();
  }

  async function load(){
    const root=$("#green-shop-prod-root");
    if(!root||state.loading) return;
    state.loading=true;
    root.innerHTML='<div class="owner-empty">SHOP本番データを読み込み中…</div>';
    try{
      const r=await request("/api/admin/bootstrap");
      state.settings=r.data.settings||{};
      state.products=r.data.products||[];
      state.orders=r.data.orders||[];
      state.capabilities=r.data.capabilities||{};
      render();
    }catch(e){
      root.innerHTML=`<div class="owner-warning-box"><strong>SHOPを読み込めませんでした。</strong><br>${esc(e.message)}</div>`;
    }finally{
      state.loading=false;
    }
  }

  function publishedCount(){return state.products.filter(p=>p.published&&p.productStatus!=="archived").length}
  function photoReadyCount(){return state.products.filter(p=>(p.media||[]).length>0).length}
  function lowStockCount(){
    return state.products.filter(p=>p.stockMode==="managed"&&p.published&&Number(p.stock)<=Number(p.lowStockThreshold||3)).length;
  }

  function render(){
    const s=state.settings||{};
    const root=$("#green-shop-prod-root");
    root.innerHTML=`
      <div class="shopv3-shell">
        <div class="shopv3-note">
          <strong>本番SHOP管理</strong>｜
          商品一覧はすっきり見せ、商品を開いたときに最大${state.capabilities.maxProductMedia||MAX_MEDIA}枚の写真を表示できる構成です。
          商品ごとに「通常販売・取り置き・レンタル・問い合わせ」と「配送・店頭受取・自店配達・レンタル配達」を設定できます。
        </div>

        <div class="shopv3-summary">
          <div class="shopv3-stat"><strong>${state.products.length}</strong><span>登録商品</span></div>
          <div class="shopv3-stat"><strong>${publishedCount()}</strong><span>公開中</span></div>
          <div class="shopv3-stat"><strong>${photoReadyCount()}</strong><span>新写真登録済み</span></div>
          <div class="shopv3-stat"><strong>${lowStockCount()}</strong><span>在庫注意</span></div>
        </div>

        <article class="shopv3-card">
          <div class="owner-panel-head">
            <div><h3>SHOP全体設定</h3><p>今使う機能だけON。将来使う機能は必要になった時にONにできます。</p></div>
          </div>
          <div class="shopv3-setting-grid">
            ${setting("enabled","SHOP機能",s.enabled)}
            ${setting("onlineShop","公開SHOP",s.onlineShop)}
            ${setting("orderingEnabled","注文受付",s.orderingEnabled)}
            ${setting("delivery","配送",s.delivery)}
            ${setting("pickup","店頭受取",s.pickup)}
            ${setting("reservation","取り置き",s.reservation)}
            ${setting("localDelivery","自店配達",s.localDelivery)}
            ${setting("rental","レンタル",s.rental)}
            ${setting("rentalDelivery","レンタル配達",s.rentalDelivery)}
            ${setting("gift","ギフト",s.gift)}
            ${setting("squareEnabled","Square実決済",s.squareEnabled,true)}
          </div>
          <div class="green-shop-prod-actions" style="margin-top:12px">
            <button class="btn btn--primary" id="shopv3-save-settings">設定を保存</button>
          </div>
        </article>

        <article class="shopv3-card">
          <div class="owner-panel-head">
            <div>
              <h3>商品管理</h3>
              <p>写真・価格・在庫・販売方法・公開状態を商品ごとに管理します。</p>
            </div>
            <button class="btn btn--primary" id="shopv3-add-product">＋ 商品を登録</button>
          </div>
          <div class="shopv3-toolbar">
            <input id="shopv3-search" placeholder="商品名・商品コード・カテゴリで検索">
            <select id="shopv3-type-filter">
              <option value="">すべての商品</option>
              ${Object.entries(PRODUCT_TYPE_LABELS).map(([v,l])=>`<option value="${v}">${l}</option>`).join("")}
            </select>
            <select id="shopv3-publish-filter">
              <option value="">公開状態すべて</option>
              <option value="published">公開中</option>
              <option value="hidden">非公開</option>
              <option value="archived">アーカイブ</option>
            </select>
          </div>
          <div id="shopv3-product-list"></div>
        </article>

        <article class="shopv3-card">
          <div class="owner-panel-head">
            <div><h3>注文管理</h3><p>現在の通常販売注文を管理します。取り置き・レンタル受付画面は後工程で公開SHOPへ接続します。</p></div>
          </div>
          ${ordersTable()}
        </article>
      </div>
    `;

    $("#shopv3-save-settings").onclick=saveSettings;
    $("#shopv3-add-product").onclick=()=>openEditor();
    $("#shopv3-search").oninput=renderProductList;
    $("#shopv3-type-filter").onchange=renderProductList;
    $("#shopv3-publish-filter").onchange=renderProductList;
    $$("[data-order-status]").forEach(sel=>sel.onchange=()=>updateOrder(sel.dataset.orderStatus,sel.value));

    renderProductList();
  }

  function setting(key,label,value,disabled=false){
    return `<label class="shopv3-setting">
      <strong>${esc(label)}</strong>
      <span class="shopv3-switch">
        <input type="checkbox" data-shop-setting="${esc(key)}" ${value?"checked":""} ${disabled?"disabled":""}>
        ${disabled?"準備中":"ON / OFF"}
      </span>
    </label>`;
  }

  function productPhoto(p){
    const media=(p.media||[]).find(x=>x.isPrimary)||(p.media||[])[0];
    if(media?.url) return media.url;
    const img=String(p.image||"");
    if(/^https?:\/\//i.test(img)) return img;
    if(img) return WEBSITE_BASE+img.replace(/^\/+/,"");
    return "";
  }

  function productWarning(p){
    const warnings=[];
    if(!(p.media||[]).length) warnings.push("写真は旧固定画像です");
    if(!String(p.description||"").trim()) warnings.push("説明なし");
    if(p.stockMode==="managed"&&Number(p.stock)<=Number(p.lowStockThreshold||3)) warnings.push("在庫注意");
    return warnings;
  }

  function renderProductList(){
    const target=$("#shopv3-product-list");
    if(!target) return;

    const q=String($("#shopv3-search")?.value||"").trim().toLowerCase();
    const type=$("#shopv3-type-filter")?.value||"";
    const pub=$("#shopv3-publish-filter")?.value||"";

    let products=state.products.filter(p=>{
      if(q){
        const hay=[p.name,p.id,p.category].join(" ").toLowerCase();
        if(!hay.includes(q)) return false;
      }
      if(type&&p.productType!==type) return false;
      if(pub==="published" && !(p.published&&p.productStatus!=="archived")) return false;
      if(pub==="hidden" && p.published) return false;
      if(pub==="archived" && p.productStatus!=="archived") return false;
      return true;
    });

    if(!products.length){
      target.innerHTML='<div class="shopv3-empty">条件に合う商品はありません。</div>';
      return;
    }

    target.innerHTML=`<div class="shopv3-products">${products.map(p=>{
      const photo=productPhoto(p);
      const warnings=productWarning(p);
      const tx=(p.transactionModes||["sale"]).map(x=>TX_LABELS[x]||x);
      return `<article class="shopv3-product">
        <div class="shopv3-product-media">
          ${photo?`<img src="${esc(photo)}" alt="${esc(p.name)}">`:`<div style="display:grid;place-items:center;height:100%;min-height:132px;color:#7a867f">写真なし</div>`}
          <span class="shopv3-photo-count">写真 ${(p.media||[]).length}/${state.capabilities.maxProductMedia||MAX_MEDIA}</span>
        </div>
        <div class="shopv3-product-body">
          <div class="shopv3-product-title">
            <strong>${esc(p.name)}</strong>
            <span class="shopv3-badge ${p.published?"":"off"}">${p.published?"公開":"非公開"}</span>
          </div>
          <div class="shopv3-meta">
            <span class="shopv3-badge">${esc(PRODUCT_TYPE_LABELS[p.productType]||p.category||"その他")}</span>
            ${(tx||[]).map(x=>`<span class="shopv3-badge">${esc(x)}</span>`).join("")}
            ${p.featured?'<span class="shopv3-badge">おすすめ</span>':""}
            ${p.productStatus==="archived"?'<span class="shopv3-badge off">アーカイブ</span>':""}
          </div>
          <div class="shopv3-price">${yen(p.price)}${(p.transactionModes||[]).includes("rental")&&Number(p.rentalMonthlyYen)>0?` <small>／レンタル ${yen(p.rentalMonthlyYen)}/月</small>`:""}</div>
          <div style="font-size:12px;color:#68766f">
            ${p.stockMode==="managed"?`在庫 ${Number(p.stock)||0}`:p.stockMode==="unlimited"?"在庫数を表示しない":"在庫は要確認"}
            ｜ ${esc(p.category||"")}
          </div>
          ${warnings.map(w=>`<div class="shopv3-warning">${esc(w)}</div>`).join("")}
          <div class="shopv3-actions">
            <button class="shopv3-mini primary" data-shop-edit="${esc(p.dbId)}">編集</button>
            <button class="shopv3-mini" data-shop-photo="${esc(p.dbId)}">写真</button>
            <button class="shopv3-mini" data-shop-duplicate="${esc(p.dbId)}">複製</button>
            ${p.productStatus!=="archived"
              ?`<button class="shopv3-mini" data-shop-archive="${esc(p.dbId)}">アーカイブ</button>`
              :`<button class="shopv3-mini" data-shop-restore="${esc(p.dbId)}">戻す</button>`}
            <button class="shopv3-mini danger" data-shop-delete="${esc(p.dbId)}">削除</button>
          </div>
        </div>
      </article>`;
    }).join("")}</div>`;

    $$("[data-shop-edit]").forEach(b=>b.onclick=()=>openEditor(b.dataset.shopEdit,"basic"));
    $$("[data-shop-photo]").forEach(b=>b.onclick=()=>openEditor(b.dataset.shopPhoto,"photos"));
    $$("[data-shop-duplicate]").forEach(b=>b.onclick=()=>duplicateProduct(b.dataset.shopDuplicate));
    $$("[data-shop-archive]").forEach(b=>b.onclick=()=>archiveProduct(b.dataset.shopArchive,true));
    $$("[data-shop-restore]").forEach(b=>b.onclick=()=>archiveProduct(b.dataset.shopRestore,false));
    $$("[data-shop-delete]").forEach(b=>b.onclick=()=>deleteProduct(b.dataset.shopDelete));
  }

  function ordersTable(){
    if(!state.orders.length) return '<div class="shopv3-empty">注文はまだありません。</div>';
    const opts=Object.keys(ORDER_STATUS_LABELS);
    return `<div class="shopv3-orders"><table>
      <thead><tr><th>注文番号</th><th>お客様</th><th>受取</th><th>合計</th><th>決済</th><th>状態</th><th>日時</th></tr></thead>
      <tbody>${state.orders.map(o=>`<tr>
        <td><strong>${esc(o.order_number)}</strong></td>
        <td>${esc(o.customer_name)}<br><small>${esc(o.customer_phone)}</small></td>
        <td>${esc(o.delivery_method||o.fulfillment_mode||"")}</td>
        <td>${yen(o.total_yen)}</td>
        <td>${esc(o.payment_status)}</td>
        <td><select data-order-status="${esc(o.id)}">${opts.map(x=>`<option value="${x}" ${x===o.status?"selected":""}>${esc(ORDER_STATUS_LABELS[x])}</option>`).join("")}</select></td>
        <td>${esc(new Date(o.created_at).toLocaleString("ja-JP"))}</td>
      </tr>`).join("")}</tbody>
    </table></div>`;
  }

  async function saveSettings(){
    const payload={};
    $$("[data-shop-setting]").forEach(x=>payload[x.dataset.shopSetting]=x.checked);
    payload.squareEnabled=false;
    try{
      await request("/api/admin/settings",{method:"PATCH",json:payload});
      window.Green.toast("SHOP設定を保存しました。","success");
      await load();
    }catch(e){
      window.Green.toast(e.message,"error");
    }
  }

  function ensureDialog(){
    let d=$("#shopv3-dialog");
    if(d) return d;
    d=document.createElement("dialog");
    d.id="shopv3-dialog";
    d.className="shopv3-dialog";
    document.body.append(d);
    return d;
  }

  function freshProduct(){
    return {
      dbId:"",
      id:"",
      name:"",
      category:"観葉植物",
      productType:"plant",
      price:0,
      rentalMonthlyYen:0,
      stock:0,
      stockMode:"managed",
      lowStockThreshold:3,
      image:"",
      media:[],
      shortDescription:"",
      description:"",
      lead:"",
      transactionModes:["sale"],
      fulfillmentModes:["shipping","pickup"],
      featured:false,
      featuredRank:100,
      published:false,
      productStatus:"active",
      sortOrder:100,
    };
  }

  function cloneForEdit(p){
    return JSON.parse(JSON.stringify(p||freshProduct()));
  }

  function clearPendingFiles(){
    for(const item of state.pendingFiles||[]){
      try{ if(item?.previewUrl) URL.revokeObjectURL(item.previewUrl); }catch{}
    }
    state.pendingFiles=[];
  }

  function normalizePendingFiles(files){
    const currentCount=(state.editProduct?.media||[]).length;
    const max=state.capabilities.maxProductMedia||MAX_MEDIA;
    const room=Math.max(0,max-currentCount-state.pendingFiles.length);
    const selected=Array.from(files||[]).slice(0,room);

    if(!selected.length && Array.from(files||[]).length){
      window.Green.toast(`商品写真は最大${max}枚です。`,"error");
      return;
    }

    for(const file of selected){
      if(!["image/jpeg","image/png","image/webp"].includes(file.type)){
        window.Green.toast(`${file.name} はJPEG・PNG・WebPではありません。`,"error");
        continue;
      }
      if(file.size<=0 || file.size>8*1024*1024){
        window.Green.toast(`${file.name} は8MB以下にしてください。`,"error");
        continue;
      }
      state.pendingFiles.push({
        file,
        previewUrl:URL.createObjectURL(file),
      });
    }
  }

  function openEditor(dbId="",tab="basic",preset=null){
    clearPendingFiles();
    state.editProduct=preset?cloneForEdit(preset):cloneForEdit(state.products.find(x=>x.dbId===dbId)||freshProduct());
    state.editingTab=tab;
    drawEditor();
  }

  function fitDialogToViewport(d){
    if(!d) return;
    const apply=()=>{
      const vv=window.visualViewport;
      const h=Math.max(360,Math.floor((vv?.height||window.innerHeight)-12));
      const w=Math.max(320,Math.floor((vv?.width||window.innerWidth)-12));
      d.style.setProperty("height",`${h}px`,"important");
      d.style.setProperty("max-height",`${h}px`,"important");
      d.style.setProperty("width",`${Math.min(980,w)}px`,"important");
      d.style.setProperty("max-width",`${w}px`,"important");
      d.style.setProperty("top","6px","important");
      d.style.setProperty("bottom","auto","important");
      d.style.setProperty("left","0","important");
      d.style.setProperty("right","0","important");
      d.style.setProperty("margin","0 auto","important");
    };
    apply();
    if(!d.__shopv3ViewportBound){
      d.__shopv3ViewportBound=true;
      window.addEventListener("resize",apply,{passive:true});
      window.visualViewport?.addEventListener("resize",apply,{passive:true});
    }
  }

  function drawEditor(){
    const d=ensureDialog();
    const p=state.editProduct;
    const isNew=!p.dbId;

    d.innerHTML=`
      <div class="shopv3-dialog-head">
        <div>
          <strong>${isNew?"商品を登録":"商品を編集"}</strong>
          <div class="shopv3-help">${isNew?"まず基本情報を入力してください。写真も同時に追加できます。":esc(p.name)}</div>
        </div>
        <button type="button" class="shopv3-close" id="shopv3-close">閉じる</button>
      </div>

      <div class="shopv3-tabs">
        ${tabButton("basic","① 基本")}
        ${tabButton("photos","② 写真")}
        ${tabButton("sales","③ 販売方法")}
        ${tabButton("fulfillment","④ 受取方法")}
        ${tabButton("publish","⑤ 公開")}
      </div>

      <form id="shopv3-form">
        <div class="shopv3-dialog-body">
          ${paneBasic(p,isNew)}
          ${panePhotos(p)}
          ${paneSales(p)}
          ${paneFulfillment(p)}
          ${panePublish(p)}
        </div>
        <div class="shopv3-dialog-foot">
          <div>
            ${p.dbId?`<button type="button" class="shopv3-mini" id="shopv3-preview-shop">公開SHOPを確認</button>`:""}
          </div>
          <div>
            <button type="button" class="btn btn--secondary" id="shopv3-cancel">キャンセル</button>
            <button type="submit" class="btn btn--primary">${isNew?"商品を登録":"変更を保存"}</button>
          </div>
        </div>
      </form>
    `;

    $("#shopv3-close",d).onclick=()=>{clearPendingFiles();d.close();};
    $("#shopv3-cancel",d).onclick=()=>{clearPendingFiles();d.close();};
    $("#shopv3-preview-shop",d)?.addEventListener("click",()=>window.open(WEBSITE_URL,"_blank","noopener"));

    $$("[data-shopv3-tab]",d).forEach(b=>b.onclick=()=>{
      state.editingTab=b.dataset.shopv3Tab;
      syncFormToState(d);
      drawEditor();
    });

    bindPhotoControls(d);
    bindLivePreview(d);

    $("#shopv3-form",d).onsubmit=async e=>{
      e.preventDefault();
      await saveProductFromDialog(d);
    };

    if(!d.open) d.showModal();
    fitDialogToViewport(d);
    requestAnimationFrame(()=>{
      const body=$(".shopv3-dialog-body",d);
      if(body && !d.__shopv3KeepScroll) body.scrollTop=0;
      d.__shopv3KeepScroll=false;
    });
  }

  function tabButton(key,label){
    return `<button type="button" class="shopv3-tab ${state.editingTab===key?"is-active":""}" data-shopv3-tab="${key}">${label}</button>`;
  }

  function paneClass(key){return `shopv3-pane ${state.editingTab===key?"is-active":""}`}

  function paneBasic(p,isNew){
    return `<section class="${paneClass("basic")}">
      <div class="shopv3-grid">
        <label class="shopv3-field">
          <span>商品種別</span>
          <select name="productType">
            ${Object.entries(PRODUCT_TYPE_LABELS).map(([v,l])=>`<option value="${v}" ${p.productType===v?"selected":""}>${l}</option>`).join("")}
          </select>
        </label>
        <label class="shopv3-field">
          <span>カテゴリー</span>
          <input name="category" value="${esc(p.category)}" placeholder="例：観葉植物 / 鉢・鉢カバー">
        </label>
        <label class="shopv3-field wide">
          <span>商品名</span>
          <input name="name" required value="${esc(p.name)}" placeholder="例：パキラ 6号（ホワイト鉢カバー付き）">
        </label>
        <label class="shopv3-field">
          <span>商品コード</span>
          <input name="id" required value="${esc(p.id)}" ${isNew?"":"readonly"} placeholder="例：pachira-6">
          <small class="shopv3-help">英数字・ハイフン推奨。登録後は変更しません。</small>
        </label>
        <label class="shopv3-field">
          <span>表示順</span>
          <input name="sortOrder" type="number" min="0" value="${esc(p.sortOrder)}">
          <small class="shopv3-help">小さい数字ほど先に表示されます。</small>
        </label>
        <label class="shopv3-field wide">
          <span>一覧に出す一言説明</span>
          <input name="shortDescription" value="${esc(p.shortDescription||"")}" placeholder="例：明るい受付やご自宅に合わせやすい定番グリーン">
        </label>
        <label class="shopv3-field wide">
          <span>商品説明</span>
          <textarea name="description" placeholder="特徴・おすすめの置き場所・注意点など">${esc(p.description||"")}</textarea>
        </label>
        <label class="shopv3-field wide">
          <span>お渡し・発送目安</span>
          <input name="lead" value="${esc(p.lead||"")}" placeholder="例：発送目安 3〜5営業日 / 店頭準備 1〜2営業日">
        </label>
      </div>
    </section>`;
  }

  function panePhotos(p){
    const media=p.media||[];
    const currentPhoto=productPhoto(p);
    const hasLegacyOnly=media.length===0 && !!currentPhoto;
    return `<section class="${paneClass("photos")}">
      <div class="shopv3-note" style="margin-bottom:12px">
        <strong>一覧はメイン写真1枚だけ。</strong>
        商品を開いたときに複数写真を見せる設計です。植物は正面・斜め・葉・鉢・設置イメージ・サイズ感の3〜6枚がおすすめです。
      </div>

      ${hasLegacyOnly?`
        <div class="shopv3-legacy-photo">
          <img src="${esc(currentPhoto)}" alt="${esc(p.name)}">
          <div>
            <strong>現在公開中の画像</strong>
            <div class="shopv3-help">これは従来の固定画像です。新しい写真を1枚保存すると、その写真がメイン写真になり、以後はこの管理画面から差し替えできます。</div>
          </div>
        </div>
      `:""}

      <div class="shopv3-drop" style="margin-top:12px" id="shopv3-drop-zone">
        <strong>商品写真を追加</strong>
        <div class="shopv3-help">JPEG / PNG / WebP、1枚8MBまで。最大${state.capabilities.maxProductMedia||MAX_MEDIA}枚。</div>
        <label class="shopv3-file-button" for="shopv3-file-input">＋ 写真を選ぶ</label>
        <input id="shopv3-file-input" type="file" accept="image/jpeg,image/png,image/webp" multiple>
        <div class="shopv3-help" style="margin-top:8px">PCでは複数選択できます。スマホでは写真フォルダから選択できます。</div>
      </div>

      <div id="shopv3-pending-files">${pendingFilesHtml()}</div>

      ${media.length
        ?`<div style="margin-top:14px"><strong>登録済み写真 ${media.length}枚</strong></div>
          <div class="shopv3-media-grid">${media.map((m,i)=>mediaItemHtml(m,i)).join("")}</div>`
        :`<div class="shopv3-empty" style="margin-top:12px">新しい写真はまだ登録されていません。<br><small>写真を選ぶと、保存前にここへプレビュー表示します。</small></div>`}
    </section>`;
  }

  function pendingFilesHtml(){
    if(!state.pendingFiles.length) return "";
    return `<div style="margin-top:14px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">
        <strong>保存予定の写真 ${state.pendingFiles.length}枚</strong>
        <span class="shopv3-help">下の「変更を保存」で登録されます。</span>
      </div>
      <div class="shopv3-pending-grid">
        ${state.pendingFiles.map((item,i)=>`<article class="shopv3-pending-card">
          <img src="${esc(item.previewUrl)}" alt="">
          <div>
            <div class="shopv3-pending-name">${esc(item.file.name)}</div>
            <div class="shopv3-help">${Math.max(1,Math.round(item.file.size/1024))}KB</div>
            <button type="button" class="shopv3-mini danger" data-pending-remove="${i}">この写真を外す</button>
          </div>
        </article>`).join("")}
      </div>
    </div>`;
  }

  function mediaItemHtml(m,i){
    return `<article class="shopv3-media-item">
      <img src="${esc(m.url)}" alt="${esc(m.altText||state.editProduct.name)}">
      <div>
        <span class="shopv3-badge ${m.isPrimary?"":"off"}">${m.isPrimary?"メイン写真":`写真 ${i+1}`}</span>
        <label class="shopv3-field"><span>写真の説明</span><input data-media-alt="${esc(m.id)}" value="${esc(m.altText||"")}"></label>
        <div class="shopv3-media-actions">
          ${m.isPrimary?"":`<button type="button" class="shopv3-mini" data-media-primary="${esc(m.id)}">メインにする</button>`}
          <button type="button" class="shopv3-mini" data-media-up="${esc(m.id)}" ${i===0?"disabled":""}>← 前へ</button>
          <button type="button" class="shopv3-mini" data-media-down="${esc(m.id)}" ${i===state.editProduct.media.length-1?"disabled":""}>後ろへ →</button>
          <button type="button" class="shopv3-mini danger" data-media-delete="${esc(m.id)}">削除</button>
        </div>
      </div>
    </article>`;
  }

  function paneSales(p){
    const tx=p.transactionModes||["sale"];
    return `<section class="${paneClass("sales")}">
      <div class="shopv3-grid">
        <div class="shopv3-field wide">
          <span>この商品の扱い方</span>
          <div class="shopv3-choice-grid">
            ${choice("transactionModes","sale","通常販売","通常の商品として注文を受け付ける",tx.includes("sale"))}
            ${choice("transactionModes","reserve","取り置き","店頭や後日の受取用に取り置く",tx.includes("reserve"))}
            ${choice("transactionModes","rental","レンタル","月額レンタル商品として扱う",tx.includes("rental"))}
            ${choice("transactionModes","inquiry","問い合わせ","価格確定前・大型商品など相談で受付",tx.includes("inquiry"))}
          </div>
        </div>
        <label class="shopv3-field">
          <span>販売価格（税込）</span>
          <input name="price" type="number" min="0" value="${esc(p.price)}">
        </label>
        <label class="shopv3-field">
          <span>レンタル月額（税込）</span>
          <input name="rentalMonthlyYen" type="number" min="0" value="${esc(p.rentalMonthlyYen||0)}">
          <small class="shopv3-help">レンタルを使わない商品は0円のままでOKです。</small>
        </label>
        <label class="shopv3-field">
          <span>在庫の管理方法</span>
          <select name="stockMode">
            <option value="managed" ${p.stockMode==="managed"?"selected":""}>数量で管理</option>
            <option value="unlimited" ${p.stockMode==="unlimited"?"selected":""}>在庫数を表示しない</option>
            <option value="inquiry" ${p.stockMode==="inquiry"?"selected":""}>在庫は問い合わせ</option>
          </select>
        </label>
        <label class="shopv3-field">
          <span>現在庫</span>
          <input name="stock" type="number" min="0" value="${esc(p.stock)}">
        </label>
        <label class="shopv3-field">
          <span>在庫注意ライン</span>
          <input name="lowStockThreshold" type="number" min="0" value="${esc(p.lowStockThreshold||3)}">
          <small class="shopv3-help">この数以下になると管理画面で注意表示します。</small>
        </label>
      </div>
    </section>`;
  }

  function paneFulfillment(p){
    const f=p.fulfillmentModes||[];
    return `<section class="${paneClass("fulfillment")}">
      <div class="shopv3-note" style="margin-bottom:12px">
        商品ごとに受取方法を変えられます。大型植物だけ「自店配達」、鉢だけ「配送」のような運用も可能です。
      </div>
      <div class="shopv3-choice-grid">
        ${choice("fulfillmentModes","shipping","配送","宅配・配送でお届け",f.includes("shipping"))}
        ${choice("fulfillmentModes","pickup","店頭受取","店舗で取り置き・受取",f.includes("pickup"))}
        ${choice("fulfillmentModes","local_delivery","自店配達","粕屋店スタッフ等が直接配達",f.includes("local_delivery"))}
        ${choice("fulfillmentModes","rental_delivery","レンタル配達","レンタル契約に伴う搬入・設置",f.includes("rental_delivery"))}
      </div>
    </section>`;
  }

  function panePublish(p){
    const img=productPhoto(p);
    return `<section class="${paneClass("publish")}">
      <div class="shopv3-grid">
        <label class="shopv3-field">
          <span>商品状態</span>
          <select name="productStatus">
            ${Object.entries(STATUS_LABELS).map(([v,l])=>`<option value="${v}" ${p.productStatus===v?"selected":""}>${l}</option>`).join("")}
          </select>
        </label>
        <label class="shopv3-field">
          <span>公開</span>
          <select name="published">
            <option value="true" ${p.published?"selected":""}>公開する</option>
            <option value="false" ${!p.published?"selected":""}>非公開</option>
          </select>
        </label>
        <label class="shopv3-choice">
          <input name="featured" type="checkbox" ${p.featured?"checked":""}>
          <span><strong>おすすめ商品にする</strong><small>公開SHOPのおすすめ枠に使えるようにします。</small></span>
        </label>
        <label class="shopv3-field">
          <span>おすすめ表示順</span>
          <input name="featuredRank" type="number" min="0" value="${esc(p.featuredRank||100)}">
        </label>
        <div class="wide shopv3-preview">
          <strong>公開イメージ</strong>
          <div class="shopv3-preview-card" style="margin-top:10px">
            ${img?`<img id="shopv3-preview-img" src="${esc(img)}" alt="">`:`<div id="shopv3-preview-img" style="min-height:130px;border-radius:12px;background:#eef3f0;display:grid;place-items:center">写真なし</div>`}
            <div>
              <div class="shopv3-badge">${esc(PRODUCT_TYPE_LABELS[p.productType]||"商品")}</div>
              <h3 id="shopv3-preview-name" style="margin:8px 0">${esc(p.name||"商品名")}</h3>
              <p id="shopv3-preview-description">${esc(p.shortDescription||p.description||"商品説明")}</p>
              <div class="shopv3-price" id="shopv3-preview-price" style="margin-top:8px">${yen(p.price)}</div>
            </div>
          </div>
        </div>
      </div>
    </section>`;
  }

  function choice(name,value,title,help,checked){
    return `<label class="shopv3-choice">
      <input type="checkbox" name="${esc(name)}" value="${esc(value)}" ${checked?"checked":""}>
      <span><strong>${esc(title)}</strong><small>${esc(help)}</small></span>
    </label>`;
  }

  function bindPhotoControls(d){
    $("#shopv3-file-input",d)?.addEventListener("change",e=>{
      normalizePendingFiles(e.target.files);
      drawEditor();
    });

    const drop=$("#shopv3-drop-zone",d);
    if(drop){
      drop.addEventListener("dragover",e=>{e.preventDefault();drop.style.background="#eef8f2";});
      drop.addEventListener("dragleave",()=>{drop.style.background="";});
      drop.addEventListener("drop",e=>{
        e.preventDefault();
        drop.style.background="";
        normalizePendingFiles(e.dataTransfer?.files);
        drawEditor();
      });
    }

    $$("[data-pending-remove]",d).forEach(b=>b.onclick=()=>{
      const i=Number(b.dataset.pendingRemove);
      const item=state.pendingFiles[i];
      try{ if(item?.previewUrl) URL.revokeObjectURL(item.previewUrl); }catch{}
      state.pendingFiles.splice(i,1);
      drawEditor();
    });

    $$("[data-media-primary]",d).forEach(b=>b.onclick=()=>mediaPrimary(b.dataset.mediaPrimary));
    $$("[data-media-delete]",d).forEach(b=>b.onclick=()=>mediaDelete(b.dataset.mediaDelete));
    $$("[data-media-up]",d).forEach(b=>b.onclick=()=>mediaMove(b.dataset.mediaUp,-1));
    $$("[data-media-down]",d).forEach(b=>b.onclick=()=>mediaMove(b.dataset.mediaDown,1));
    $$("[data-media-alt]",d).forEach(inp=>inp.onchange=()=>mediaAlt(inp.dataset.mediaAlt,inp.value));
  }

  function bindLivePreview(d){
    ["name","shortDescription","description","price"].forEach(name=>{
      const el=$(`[name="${name}"]`,d);
      if(!el)return;
      el.addEventListener("input",()=>{
        if(name==="name" && $("#shopv3-preview-name",d)) $("#shopv3-preview-name",d).textContent=el.value||"商品名";
        if((name==="shortDescription"||name==="description") && $("#shopv3-preview-description",d)){
          const short=$('[name="shortDescription"]',d)?.value||"";
          const desc=$('[name="description"]',d)?.value||"";
          $("#shopv3-preview-description",d).textContent=short||desc||"商品説明";
        }
        if(name==="price" && $("#shopv3-preview-price",d)) $("#shopv3-preview-price",d).textContent=yen(el.value);
      });
    });
  }

  function syncFormToState(d){
    const form=$("#shopv3-form",d);
    if(!form)return;
    const fd=new FormData(form);
    const p=state.editProduct;
    p.id=String(fd.get("id")||p.id||"").trim();
    p.name=String(fd.get("name")||p.name||"").trim();
    p.category=String(fd.get("category")||p.category||"その他").trim();
    p.productType=String(fd.get("productType")||p.productType||"plant");
    p.price=safeInt(fd.get("price"),p.price||0);
    p.rentalMonthlyYen=safeInt(fd.get("rentalMonthlyYen"),p.rentalMonthlyYen||0);
    p.stock=safeInt(fd.get("stock"),p.stock||0);
    p.stockMode=String(fd.get("stockMode")||p.stockMode||"managed");
    p.lowStockThreshold=safeInt(fd.get("lowStockThreshold"),p.lowStockThreshold||3);
    p.shortDescription=String(fd.get("shortDescription")||p.shortDescription||"").trim();
    p.description=String(fd.get("description")||p.description||"").trim();
    p.lead=String(fd.get("lead")||p.lead||"").trim();
    p.sortOrder=safeInt(fd.get("sortOrder"),p.sortOrder||100);
    p.productStatus=String(fd.get("productStatus")||p.productStatus||"active");
    if(fd.has("published")) p.published=String(fd.get("published"))==="true";
    if($('[name="featured"]',form)) p.featured=$('[name="featured"]',form).checked;
    p.featuredRank=safeInt(fd.get("featuredRank"),p.featuredRank||100);

    const tx=$$('input[name="transactionModes"]:checked',form).map(x=>x.value);
    if($('input[name="transactionModes"]',form)) p.transactionModes=tx;
    const ff=$$('input[name="fulfillmentModes"]:checked',form).map(x=>x.value);
    if($('input[name="fulfillmentModes"]',form)) p.fulfillmentModes=ff;
  }

  function payloadFromState(p){
    return {
      id:p.id,
      name:p.name,
      category:p.category,
      productType:p.productType,
      price:safeInt(p.price),
      rentalMonthlyYen:safeInt(p.rentalMonthlyYen),
      stock:safeInt(p.stock),
      stockMode:p.stockMode,
      lowStockThreshold:safeInt(p.lowStockThreshold,3),
      image:p.image||"",
      shortDescription:p.shortDescription||"",
      description:p.description||"",
      lead:p.lead||"",
      transactionModes:(p.transactionModes||[]).length?p.transactionModes:["sale"],
      fulfillmentModes:p.fulfillmentModes||[],
      featured:!!p.featured,
      featuredRank:safeInt(p.featuredRank,100),
      published:!!p.published,
      productStatus:p.productStatus||"active",
      sortOrder:safeInt(p.sortOrder,100),
    };
  }

  async function saveProductFromDialog(d){
    if(state.uploadBusy) return;
    syncFormToState(d);
    const p=state.editProduct;

    if(!p.name){
      state.editingTab="basic"; drawEditor();
      window.Green.toast("商品名を入力してください。","error");
      return;
    }
    if(!p.id){
      state.editingTab="basic"; drawEditor();
      window.Green.toast("商品コードを入力してください。","error");
      return;
    }
    if(!(p.transactionModes||[]).length){
      state.editingTab="sales"; drawEditor();
      window.Green.toast("販売方法を1つ以上選択してください。","error");
      return;
    }

    state.uploadBusy=true;
    const submit=$('#shopv3-form button[type="submit"]',d);
    if(submit){submit.disabled=true;submit.textContent="保存中…";}

    try{
      const result=await request(
        p.dbId?`/api/admin/products/${p.dbId}`:"/api/admin/products",
        {method:p.dbId?"PATCH":"POST",json:payloadFromState(p)}
      );
      const saved=result.data;
      p.dbId=saved.dbId;
      p.media=saved.media||p.media||[];

      if(state.pendingFiles.length){
        const total=state.pendingFiles.length;
        for(let i=0;i<total;i++){
          if(submit) submit.textContent=`写真 ${i+1}/${total} 保存中…`;
          const fd=new FormData();
          fd.set("file",state.pendingFiles[i].file);
          fd.set("altText",p.name);
          fd.set("sortOrder",String(((p.media||[]).length+i+1)*10));
          fd.set("isPrimary",String((p.media||[]).length===0 && i===0));
          await uploadRequest(`/api/admin/products/${p.dbId}/media`,fd);
        }
      }

      clearPendingFiles();
      d.close();
      window.Green.toast("商品を保存しました。","success");
      await load();
    }catch(e){
      window.Green.toast(e.message,"error");
      if(submit){submit.disabled=false;submit.textContent=p.dbId?"変更を保存":"商品を登録";}
    }finally{
      state.uploadBusy=false;
    }
  }

  async function mediaPrimary(mediaId){
    const p=state.editProduct;
    try{
      await request(`/api/admin/products/${p.dbId}/media/${mediaId}`,{
        method:"PATCH",json:{isPrimary:true}
      });
      const r=await request(`/api/admin/products/${p.dbId}/media`);
      p.media=r.data||[];
      drawEditor();
      window.Green.toast("メイン写真を変更しました。","success");
    }catch(e){window.Green.toast(e.message,"error");}
  }

  async function mediaAlt(mediaId,value){
    const p=state.editProduct;
    try{
      await request(`/api/admin/products/${p.dbId}/media/${mediaId}`,{
        method:"PATCH",json:{altText:value}
      });
      const m=p.media.find(x=>x.id===mediaId);
      if(m)m.altText=value;
      window.Green.toast("写真の説明を保存しました。","success");
    }catch(e){window.Green.toast(e.message,"error");}
  }

  async function mediaMove(mediaId,delta){
    const p=state.editProduct;
    const media=[...(p.media||[])];
    const idx=media.findIndex(x=>x.id===mediaId);
    const to=idx+delta;
    if(idx<0||to<0||to>=media.length)return;
    [media[idx],media[to]]=[media[to],media[idx]];
    try{
      await Promise.all(media.map((m,i)=>request(`/api/admin/products/${p.dbId}/media/${m.id}`,{
        method:"PATCH",json:{sortOrder:(i+1)*10}
      })));
      const r=await request(`/api/admin/products/${p.dbId}/media`);
      p.media=r.data||[];
      drawEditor();
    }catch(e){window.Green.toast(e.message,"error");}
  }

  async function mediaDelete(mediaId){
    const p=state.editProduct;
    if(!confirm("この写真を削除しますか？"))return;
    try{
      await request(`/api/admin/products/${p.dbId}/media/${mediaId}`,{method:"DELETE",json:{}});
      const r=await request(`/api/admin/products/${p.dbId}/media`);
      p.media=r.data||[];
      drawEditor();
      window.Green.toast("写真を削除しました。","success");
    }catch(e){window.Green.toast(e.message,"error");}
  }

  async function duplicateProduct(id){
    const src=state.products.find(x=>x.dbId===id);
    if(!src)return;
    const p=cloneForEdit(src);
    p.dbId="";
    p.id=`${src.id}-copy`;
    p.name=`${src.name}（コピー）`;
    p.published=false;
    p.productStatus="draft";
    p.featured=false;
    p.media=[];
    p.image=src.image||"";
    openEditor("","basic",p);
  }

  async function archiveProduct(id,archive){
    const p=state.products.find(x=>x.dbId===id);
    if(!p)return;
    const copy=cloneForEdit(p);
    copy.productStatus=archive?"archived":"active";
    copy.published=archive?false:copy.published;
    try{
      await request(`/api/admin/products/${id}`,{
        method:"PATCH",json:payloadFromState(copy)
      });
      window.Green.toast(archive?"商品をアーカイブしました。":"商品を戻しました。","success");
      await load();
    }catch(e){window.Green.toast(e.message,"error");}
  }

  async function deleteProduct(id){
    const p=state.products.find(x=>x.dbId===id);
    if(!p)return;
    const answer=prompt(`「${p.name}」を完全に削除します。\n注文履歴がある場合は削除できないことがあります。\n削除するには商品コード「${p.id}」を入力してください。`);
    if(answer!==p.id)return;
    try{
      await request(`/api/admin/products/${id}`,{method:"DELETE",json:{}});
      window.Green.toast("商品を削除しました。","success");
      await load();
    }catch(e){
      window.Green.toast(`${e.message}　削除できない場合は「アーカイブ」を使用してください。`,"error");
    }
  }

  async function updateOrder(id,status){
    try{
      await request(`/api/admin/orders/${id}`,{method:"PATCH",json:{status}});
      window.Green.toast("注文状態を更新しました。","success");
      await load();
    }catch(e){window.Green.toast(e.message,"error");}
  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",install,{once:true});
  }else{
    install();
  }
})();
