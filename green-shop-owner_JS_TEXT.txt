(() => {
  "use strict";
  const VERSION = "GREEN-SHOP-OWNER-PROD-R2.1-20260927";
  const API = String(window.GREEN_CONFIG?.SHOP_MODULE?.apiBase || "https://dpro-cl-000001-green-shop.dpromstk2000.workers.dev").replace(/\/$/, "");
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const state={settings:null,products:[],orders:[],loading:false};

  function esc(v){return String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));}
  function yen(n){return new Intl.NumberFormat("ja-JP",{style:"currency",currency:"JPY",maximumFractionDigits:0}).format(Number(n)||0);}
  const BUILD_CODE_KEY="dpro_green_shop_build_code";
  function token(){return window.DPRO_AUTH?.getToken?.() || sessionStorage.getItem("green_admin_session_token") || "";}
  function buildCode(){
    if(!window.__DPRO_BUILD_ACCESS__) return "";
    let code=sessionStorage.getItem(BUILD_CODE_KEY)||"";
    if(!code){
      code=prompt("構築・QA用の管理コードを入力してください。")||"";
      if(code) sessionStorage.setItem(BUILD_CODE_KEY,code);
    }
    return code;
  }
  async function csrf(){try{return (await window.Green.api("/api/admin/session")).data?.csrfToken || "";}catch{return "";}}
  async function api(path,options={}){
    const t=token();
    const b=buildCode();
    if(!t&&!b) throw new Error("オーナーセッションを確認できません。");
    const headers=new Headers(options.headers||{});
    if(t) headers.set("Authorization",`Bearer ${t}`);
    if(b) headers.set("X-DPRO-Build-Code",b);
    if(options.json!==undefined) headers.set("Content-Type","application/json");
    if(!["GET","HEAD"].includes(String(options.method||"GET").toUpperCase())){
      const c=await csrf(); if(c) headers.set("X-CSRF-Token",c);
    }
    const res=await fetch(API+path,{method:options.method||"GET",headers,body:options.json===undefined?undefined:JSON.stringify(options.json),cache:"no-store"});
    const data=await res.json().catch(()=>({}));
    if(!res.ok||data.ok===false) throw new Error(data.message||"SHOP API処理に失敗しました。");
    return data;
  }
  function installStyle(){
    if($("#green-shop-prod-style"))return;
    const s=document.createElement("style");s.id="green-shop-prod-style";s.textContent=`
      .green-shop-prod-card{border:1px solid #d9e5df;border-radius:16px;background:#fff;padding:16px}
      .green-shop-prod-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
      .green-shop-prod-grid label{display:grid;gap:6px;font-weight:800;font-size:12px}
      .green-shop-prod-grid input,.green-shop-prod-grid select,.green-shop-prod-grid textarea{border:1px solid #ccd9d2;border-radius:9px;padding:9px;font:inherit}
      .green-shop-prod-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
      .green-shop-prod-table{width:100%;border-collapse:collapse;min-width:900px}
      .green-shop-prod-table th,.green-shop-prod-table td{padding:11px;border-bottom:1px solid #edf1ef;text-align:left;vertical-align:middle}
      .green-shop-prod-table th{font-size:11px;background:#f8faf9;color:#607068}
      .green-shop-prod-wrap{overflow:auto;border:1px solid #dce6e1;border-radius:14px;background:#fff}
      .green-shop-prod-badge{display:inline-flex;padding:4px 8px;border-radius:999px;background:#e7f6ed;color:#12643b;font-size:11px;font-weight:900}
      .green-shop-prod-badge.off{background:#f0f1f0;color:#69736d}
      .green-shop-prod-note{padding:12px 14px;border-radius:12px;background:#fff7d6;color:#625000;font-size:12px;line-height:1.7}
      .green-shop-prod-dialog{width:min(720px,calc(100vw - 24px));border:0;border-radius:18px;padding:0;box-shadow:0 30px 80px #0004}
      .green-shop-prod-dialog::backdrop{background:#10251bb8}
      @media(max-width:900px){.green-shop-prod-grid{grid-template-columns:1fr 1fr}} @media(max-width:620px){.green-shop-prod-grid{grid-template-columns:1fr}}
    `;document.head.append(s);
  }
  function install(){
    if(!/\/owner\.html$/.test(location.pathname))return;
    installStyle();
    const nav=$(".owner-nav"); if(!nav||$("#green-shop-prod-nav"))return;
    const b=document.createElement("button");b.id="green-shop-prod-nav";b.dataset.view="shop-sales";b.innerHTML="<span>販</span>販売・SHOP";
    const feature=nav.querySelector('[data-view="features"]'); if(feature)nav.insertBefore(b,feature);else nav.append(b);
    const main=$("#owner-main");const sec=document.createElement("section");sec.className="owner-view";sec.dataset.viewPanel="shop-sales";sec.innerHTML=`<div class="owner-heading"><div><p class="eyebrow">ONLINE SHOP</p><h2>販売・SHOP</h2><p>商品・在庫・公開状態・注文を本番DBで管理します。</p></div><button class="btn btn--secondary" id="green-shop-reload">再読込</button></div><div id="green-shop-prod-root"><div class="owner-empty">SHOP本番データを読み込みます…</div></div>`;main.append(sec);
    b.addEventListener("click",open);
    $("#green-shop-reload").addEventListener("click",load);
  }
  function open(){
    $$("[data-view-panel]").forEach(p=>p.classList.toggle("is-active",p.dataset.viewPanel==="shop-sales"));
    $$("[data-view]").forEach(b=>b.classList.toggle("is-active",b.dataset.view==="shop-sales"));
    const t=$("#view-title");if(t)t.textContent="販売・SHOP";
    $("#owner-sidebar")?.classList.remove("is-open");
    load();
  }
  async function load(){
    const root=$("#green-shop-prod-root");if(!root||state.loading)return;
    state.loading=true;root.innerHTML='<div class="owner-empty">本番SHOPデータを読み込み中…</div>';
    try{
      const r=await api("/api/admin/bootstrap");state.settings=r.data.settings;state.products=r.data.products||[];state.orders=r.data.orders||[];render();
    }catch(e){root.innerHTML=`<div class="owner-warning-box">${esc(e.message)}</div>`;}finally{state.loading=false}
  }
  function render(){
    const s=state.settings||{};
    const root=$("#green-shop-prod-root");
    root.innerHTML=`
      <div class="green-shop-prod-note"><strong>本番DB同期</strong>｜商品・在庫・公開状態・注文はブラウザ保存ではなくSupabaseへ保存されます。Square実決済は次工程で接続するため、現在は「注文受付・決済待ち」です。</div>
      <article class="green-shop-prod-card" style="margin-top:14px">
        <h3>SHOP設定</h3>
        <div class="green-shop-prod-grid">
          ${check("enabled","販売機能",s.enabled)}
          ${check("onlineShop","ONLINE SHOP",s.onlineShop)}
          ${check("delivery","配送",s.delivery)}
          ${check("pickup","店頭受取",s.pickup)}
          ${check("gift","ギフト",s.gift)}
          ${check("orderingEnabled","注文受付",s.orderingEnabled)}
          ${check("squareEnabled","Square実決済",s.squareEnabled,true)}
        </div>
        <div class="green-shop-prod-actions"><button class="btn btn--primary" id="green-shop-save-settings">設定を保存</button><a class="btn btn--secondary" href="${esc(window.GREEN_CONFIG?.SHOP_MODULE?.websiteUrl||'#')}" target="_blank" rel="noopener">公開SHOPを確認</a></div>
      </article>
      <article class="green-shop-prod-card" style="margin-top:14px">
        <div class="owner-panel-head"><div><h3>販売商品</h3><p>${state.products.length}商品</p></div><button class="btn btn--primary" id="green-shop-add-product">＋ 商品登録</button></div>
        ${productsTable()}
      </article>
      <article class="green-shop-prod-card" style="margin-top:14px">
        <div class="owner-panel-head"><div><h3>注文管理</h3><p>決済導入前は payment=unpaid で受付します。</p></div></div>
        ${ordersTable()}
      </article>`;
    $("#green-shop-save-settings").onclick=saveSettings;
    $("#green-shop-add-product").onclick=()=>editProduct();
    $$("[data-shop-edit]").forEach(b=>b.onclick=()=>editProduct(b.dataset.shopEdit));
    $$("[data-shop-delete]").forEach(b=>b.onclick=()=>deleteProduct(b.dataset.shopDelete));
    $$("[data-order-status]").forEach(sel=>sel.onchange=()=>updateOrder(sel.dataset.orderStatus,sel.value));
  }
  function check(key,label,value,disabled=false){return `<label><span>${esc(label)}</span><span><input type="checkbox" data-shop-setting="${esc(key)}" ${value?"checked":""} ${disabled?"disabled":""}> ${disabled?"次工程で接続":"ON / OFF"}</span></label>`;}
  function productsTable(){
    if(!state.products.length)return'<div class="owner-empty">商品はまだありません。</div>';
    return `<div class="green-shop-prod-wrap"><table class="green-shop-prod-table"><thead><tr><th>商品</th><th>分類</th><th>価格</th><th>在庫</th><th>公開</th><th>操作</th></tr></thead><tbody>${state.products.map(p=>`<tr><td><strong>${esc(p.name)}</strong><br><small>${esc(p.id)}</small></td><td>${esc(p.category)}</td><td>${yen(p.price)}</td><td>${Number(p.stock)||0}</td><td><span class="green-shop-prod-badge ${p.published?"":"off"}">${p.published?"公開":"非公開"}</span></td><td><button class="green-shop-mini" data-shop-edit="${esc(p.dbId)}">編集</button> <button class="green-shop-mini danger" data-shop-delete="${esc(p.dbId)}">削除</button></td></tr>`).join("")}</tbody></table></div>`;
  }
  function ordersTable(){
    if(!state.orders.length)return'<div class="owner-empty">注文はまだありません。</div>';
    const opts=["new","confirmed","payment_pending","paid","preparing","shipped","cancelled"];
    return `<div class="green-shop-prod-wrap"><table class="green-shop-prod-table"><thead><tr><th>注文番号</th><th>お客様</th><th>合計</th><th>決済</th><th>状態</th><th>日時</th></tr></thead><tbody>${state.orders.map(o=>`<tr><td><strong>${esc(o.order_number)}</strong></td><td>${esc(o.customer_name)}<br><small>${esc(o.customer_phone)}</small></td><td>${yen(o.total_yen)}</td><td>${esc(o.payment_status)}</td><td><select data-order-status="${esc(o.id)}">${opts.map(x=>`<option value="${x}" ${x===o.status?"selected":""}>${x}</option>`).join("")}</select></td><td>${esc(new Date(o.created_at).toLocaleString("ja-JP"))}</td></tr>`).join("")}</tbody></table></div>`;
  }
  async function saveSettings(){
    const payload={};$$("[data-shop-setting]").forEach(x=>payload[x.dataset.shopSetting]=x.checked);payload.squareEnabled=false;
    try{await api("/api/admin/settings",{method:"PATCH",json:payload});window.Green.toast("SHOP設定を保存しました。","success");await load();}catch(e){window.Green.toast(e.message,"error");}
  }
  function ensureDialog(){let d=$("#green-shop-prod-dialog");if(d)return d;d=document.createElement("dialog");d.id="green-shop-prod-dialog";d.className="green-shop-prod-dialog";document.body.append(d);return d;}
  function editProduct(dbId=""){
    const d=ensureDialog(),p=state.products.find(x=>x.dbId===dbId)||{id:"",name:"",category:"観葉植物",price:0,stock:0,image:"",description:"",lead:"",published:false,sortOrder:100};
    d.innerHTML=`<form method="dialog" id="green-shop-prod-form"><div style="padding:18px 20px;border-bottom:1px solid #e5ebe7"><strong>${dbId?"商品を編集":"商品を登録"}</strong></div><div class="green-shop-prod-grid" style="padding:20px"><label>商品コード<input name="id" required value="${esc(p.id)}" ${dbId?"readonly":""}></label><label>商品名<input name="name" required value="${esc(p.name)}"></label><label>カテゴリー<input name="category" value="${esc(p.category)}"></label><label>価格（税込）<input name="price" type="number" min="0" value="${esc(p.price)}"></label><label>在庫<input name="stock" type="number" min="0" value="${esc(p.stock)}"></label><label>画像ファイル<input name="image" value="${esc(p.image)}"></label><label>表示順<input name="sortOrder" type="number" min="0" value="${esc(p.sortOrder)}"></label><label>公開<span><input name="published" type="checkbox" ${p.published?"checked":""}> 公開する</span></label><label style="grid-column:1/-1">発送目安<input name="lead" value="${esc(p.lead)}"></label><label style="grid-column:1/-1">説明<textarea name="description">${esc(p.description)}</textarea></label></div><div style="display:flex;justify-content:flex-end;gap:8px;padding:15px 20px;border-top:1px solid #e5ebe7"><button type="button" class="btn btn--secondary" id="shop-dialog-close">キャンセル</button><button type="submit" class="btn btn--primary">保存</button></div></form>`;
    $("#shop-dialog-close",d).onclick=()=>d.close();
    $("#green-shop-prod-form",d).onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.currentTarget);const payload={id:String(fd.get("id")||"").trim(),name:String(fd.get("name")||"").trim(),category:String(fd.get("category")||"その他"),price:Number(fd.get("price"))||0,stock:Number(fd.get("stock"))||0,image:String(fd.get("image")||""),lead:String(fd.get("lead")||""),description:String(fd.get("description")||""),sortOrder:Number(fd.get("sortOrder"))||100,published:fd.get("published")==="on"};try{await api(dbId?`/api/admin/products/${dbId}`:"/api/admin/products",{method:dbId?"PATCH":"POST",json:payload});d.close();window.Green.toast("商品を保存しました。","success");await load();}catch(err){window.Green.toast(err.message,"error");}};
    d.showModal();
  }
  async function deleteProduct(id){if(!confirm("この商品を削除しますか？"))return;try{await api(`/api/admin/products/${id}`,{method:"DELETE",json:{}});window.Green.toast("商品を削除しました。","success");await load();}catch(e){window.Green.toast(e.message,"error");}}
  async function updateOrder(id,status){try{await api(`/api/admin/orders/${id}`,{method:"PATCH",json:{status}});window.Green.toast("注文状態を更新しました。","success");await load();}catch(e){window.Green.toast(e.message,"error");}}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});else install();
})();
