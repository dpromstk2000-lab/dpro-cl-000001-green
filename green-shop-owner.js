(() => {
  "use strict";
  const VERSION = "GREEN-SHOP-OWNER-R1.3-20260923";
  const FEATURE_GROUP = "販売・SHOP";
  const SETTINGS_KEY = "dpro_green_shop_settings_v1";
  const PRODUCTS_KEY = "dpro_green_shop_products_v1";
  const ORDERS_KEY = "dpro_green_shop_orders_v1";
  const SHOP_URL = window.GREEN_CONFIG?.SHOP_MODULE?.websiteUrl || "https://dpromstk2000-lab.github.io/dpro-green-website/shop.html";
  const defaultSettings = Object.freeze({ enabled: true, onlineShop: true, delivery: true, pickup: true, gift: true, square: true });
  const defaultProducts = [
    {id:"pachira-6",name:"パキラ 6号（ホワイト鉢カバー付き）",category:"観葉植物",price:6600,stock:6,image:"green-shop-pachira-6.webp",description:"丈夫で育てやすく、オフィスやご自宅にも合わせやすい定番グリーン。明るいホワイト鉢カバーとのセットを想定した販売デモです。",lead:"発送目安 3〜5営業日",published:true},
    {id:"monstera-8",name:"モンステラ 8号（チャコール鉢カバー付き）",category:"観葉植物",price:11000,stock:4,image:"green-shop-monstera-8.webp",description:"大きく切れ込んだ葉が印象的なモンステラ。落ち着いたチャコール鉢で、受付・店舗・リビングのアクセントに。",lead:"発送目安 5〜7営業日",published:true},
    {id:"strelitzia-6",name:"ストレリチア・オーガスタ 6号（テラコッタ鉢付き）",category:"観葉植物",price:5500,stock:6,image:"green-shop-strelitzia-6.webp",description:"伸びやかな葉姿が魅力のオーガスタ。温かみのあるテラコッタ鉢と合わせた、明るい室内向けの中型グリーンです。",lead:"発送目安 3〜5営業日",published:true},
    {id:"sansevieria-6",name:"サンセベリア 6号（ナチュラル鉢カバー付き）",category:"観葉植物",price:5500,stock:8,image:"green-shop-sansevieria-6.webp",description:"シャープな葉姿で省スペースにも置きやすい定番グリーン。天然素材風の編み込み鉢カバーでやわらかな印象に。",lead:"発送目安 3〜5営業日",published:true},
    {id:"benjamin-8",name:"ベンジャミン 8号（ホワイト鉢カバー付き）",category:"観葉植物",price:12100,stock:3,image:"green-shop-benjamin-8.webp",description:"細かな葉とやわらかな樹形が魅力のベンジャミン。清潔感のあるホワイト鉢で、オフィスや開店祝いにも合わせやすいセットです。",lead:"発送目安 5〜7営業日",published:true},
    {id:"yucca-8",name:"ユッカ 8号（チャコール鉢カバー付き）",category:"観葉植物",price:13200,stock:3,image:"green-shop-yucca-8.webp",description:"力強い幹とシャープな葉が特徴のユッカ。チャコール鉢と合わせて、店舗やオフィスのシンボルグリーンに。",lead:"発送目安 5〜7営業日",published:true},
    {id:"pot-woven-6",name:"ナチュラル編み込み鉢カバー 6号対応",category:"鉢・鉢カバー",price:3300,stock:10,image:"green-shop-pot-woven.webp",description:"天然素材の風合いを楽しめる編み込みタイプ。観葉植物をやわらかく見せたい空間に合わせやすい鉢カバーです。",lead:"発送目安 2〜4営業日",published:true},
    {id:"pot-white-6",name:"マットホワイト セラミック鉢カバー 6号対応",category:"鉢・鉢カバー",price:3850,stock:8,image:"green-shop-pot-white.webp",description:"シンプルで清潔感のあるマットホワイト。住宅・クリニック・サロンなど幅広い内装になじむデザインです。",lead:"発送目安 2〜4営業日",published:true},
    {id:"pot-charcoal-8",name:"チャコール シンプル鉢カバー 8号対応",category:"鉢・鉢カバー",price:4950,stock:7,image:"green-shop-pot-charcoal.webp",description:"落ち着いたチャコールカラーの大型鉢カバー。オフィスや店舗でグリーンを引き締めて見せたい時におすすめです。",lead:"発送目安 2〜4営業日",published:true},
    {id:"pot-terracotta-6",name:"テラコッタ リブプランター 6号対応",category:"鉢・鉢カバー",price:3850,stock:9,image:"green-shop-pot-terracotta.webp",description:"縦リブの表情と温かみのあるテラコッタカラーが特徴。ナチュラル系・カフェ系の空間にも合わせやすいプランターです。",lead:"発送目安 2〜4営業日",published:true}
  ];
  const imageBase = "https://dpromstk2000-lab.github.io/dpro-green-website/";
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => Array.from(root.querySelectorAll(s));
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const yen = (n) => new Intl.NumberFormat("ja-JP",{style:"currency",currency:"JPY",maximumFractionDigits:0}).format(Number(n)||0);
  function readJSON(key, fallback){ try { const v=JSON.parse(localStorage.getItem(key)||"null"); return v ?? fallback; } catch { return fallback; } }
  function settings(){ return {...defaultSettings, ...readJSON(SETTINGS_KEY,{})}; }
  const LEGACY_PRODUCT_IDS = new Set(["desk-green","pot-set","gift-medium","cover","care","season"]);
  const R11_PRODUCT_IDS = new Set(["pachira-6","monstera-8","strelitzia-6","sansevieria-6","benjamin-8","yucca-8"]);
  function isSeedVersion(items, ids){ return Array.isArray(items) && items.length===ids.size && items.every(x=>ids.has(x?.id)); }
  function products(){ const saved=readJSON(PRODUCTS_KEY,null); if(Array.isArray(saved)){ if(isSeedVersion(saved,LEGACY_PRODUCT_IDS)||isSeedVersion(saved,R11_PRODUCT_IDS)){ localStorage.setItem(PRODUCTS_KEY,JSON.stringify(defaultProducts)); return [...defaultProducts]; } return saved; } localStorage.setItem(PRODUCTS_KEY,JSON.stringify(defaultProducts)); return [...defaultProducts]; }
  function orders(){ const saved=readJSON(ORDERS_KEY,[]); return Array.isArray(saved)?saved:[]; }
  function saveSettings(next){ localStorage.setItem(SETTINGS_KEY,JSON.stringify({...defaultSettings,...next})); notify(); }
  function saveProducts(items){ localStorage.setItem(PRODUCTS_KEY,JSON.stringify(items)); notify(); }
  function saveOrders(items){ localStorage.setItem(ORDERS_KEY,JSON.stringify(items)); notify(); }
  function notify(){ window.dispatchEvent(new CustomEvent("dpro-green-shop-change")); }
  function ensureCss(){ if(document.querySelector('link[data-green-shop-owner]')) return; const l=document.createElement("link");l.rel="stylesheet";l.href=`green-shop-owner.css?v=${encodeURIComponent(VERSION)}`;l.dataset.greenShopOwner=VERSION;document.head.append(l); }
  function imageUrl(p){ return /^https?:/i.test(p.image||"") ? p.image : imageBase+(p.image||"owner-office.webp"); }
  function installNav(){
    const nav=$(".owner-nav"); if(!nav) return;
    let b=$("#green-shop-nav");
    if(!b){ b=document.createElement("button"); b.type="button";b.id="green-shop-nav";b.className="green-shop-nav";b.dataset.view="shop-sales";b.innerHTML='<span>販</span>販売・SHOP <em class="green-shop-nav-badge">ON</em>'; const stock=nav.querySelector('[data-view="stock"]'); (stock||nav.lastElementChild)?.insertAdjacentElement(stock?"afterend":"beforebegin",b); b.addEventListener("click",()=>openShopView()); }
    const on=settings().enabled; b.hidden=!on; b.classList.toggle("is-off",!on); $(".green-shop-nav-badge",b).textContent=on?"ON":"OFF";
  }
  function installPanel(){
    const main=$("#owner-main"); if(!main||$("[data-view-panel='shop-sales']")) return;
    const panel=document.createElement("section");panel.className="owner-view";panel.dataset.viewPanel="shop-sales";
    panel.innerHTML=`<div class="owner-heading"><div><p class="eyebrow">SALES / SHOP MODULE</p><h2>販売・オンラインSHOP</h2><p>レンタル業務と販売業務を同じDPRO GREENで管理します。販売しない店舗は機能設定からOFFにできます。</p></div><div class="owner-heading-actions"><a class="btn btn--secondary" href="${esc(SHOP_URL)}" target="_blank" rel="noopener">公開SHOPを見る</a><button class="btn btn--primary" type="button" data-green-shop-add>＋ 商品登録</button></div></div><div class="green-shop-shell" id="green-shop-shell"></div>`;
    main.append(panel); panel.querySelector("[data-green-shop-add]").addEventListener("click",()=>openProductDialog());
  }
  function openShopView(){
    if(!settings().enabled){ showFeatures(); return; }
    $$("[data-view-panel]").forEach(p=>p.classList.toggle("is-active",p.dataset.viewPanel==="shop-sales"));
    $$("[data-view]").forEach(b=>b.classList.toggle("is-active",b.dataset.view==="shop-sales"));
    const title=$("#view-title"); if(title) title.textContent="販売・SHOP";
    $("#owner-sidebar")?.classList.remove("is-open"); const bd=$("#owner-sidebar-backdrop"); if(bd) bd.hidden=true;
    render();
  }
  function showFeatures(){ const b=$("[data-view='features']"); if(b) b.click(); setTimeout(()=>document.getElementById("green-shop-feature-card")?.scrollIntoView({behavior:"smooth",block:"center"}),250); }
  function render(){
    const shell=$("#green-shop-shell"); if(!shell) return; const s=settings(), ps=products(), os=orders();
    const pub=ps.filter(p=>p.published).length, waiting=os.filter(o=>!["shipped","cancelled"].includes(o.status)).length;
    shell.innerHTML=`
      <article class="green-shop-hero"><div class="green-shop-hero-grid"><div><h3>販売機能 ${s.enabled?"ON":"OFF"}</h3><p>${s.enabled?"販売商品・注文・オンラインSHOPを利用できます。レンタル顧客と販売顧客を将来同じ顧客台帳へつなげる設計です。":"レンタル専用モードです。SHOP関連メニューと公開導線を表示しません。"}</p></div><div class="green-shop-switch-row"><label class="green-shop-toggle"><input id="green-shop-master-switch" type="checkbox" ${s.enabled?"checked":""}><span class="green-shop-toggle-track"></span><span class="green-shop-toggle-label">${s.enabled?"ON":"OFF"}</span></label></div></div>
      <div class="green-shop-subflags">${flag("onlineShop","オンラインSHOP","HPから商品購入")}${flag("delivery","配送","配送注文を受付")}${flag("pickup","店頭受取","来店受取に対応")}${flag("gift","ギフト","ギフト商品・包装")}${flag("square","Square決済","本番決済へ接続")}</div></article>
      ${s.enabled?`<div class="green-shop-kpis"><div class="green-shop-kpi"><small>登録商品</small><strong>${ps.length}</strong></div><div class="green-shop-kpi"><small>公開中</small><strong>${pub}</strong></div><div class="green-shop-kpi"><small>デモ注文</small><strong>${os.length}</strong></div><div class="green-shop-kpi"><small>対応中注文</small><strong>${waiting}</strong></div></div>
      <div class="green-shop-tabs"><button class="green-shop-tab is-active" data-shop-tab="products">販売商品</button><button class="green-shop-tab" data-shop-tab="orders">注文管理</button><button class="green-shop-tab" data-shop-tab="settings">SHOP設定</button></div>
      <div class="green-shop-pane is-active" data-shop-pane="products">${renderProducts(ps)}</div><div class="green-shop-pane" data-shop-pane="orders">${renderOrders(os)}</div><div class="green-shop-pane" data-shop-pane="settings">${renderSettings(s)}</div>`:`<div class="green-shop-off-panel"><strong>現在はレンタル専用モードです</strong>販売・SHOPを利用する場合は上のスイッチ、または「機能設定」から販売機能をONにしてください。</div>`}
      <p class="green-shop-note">DEMO：この画面の販売設定・商品・注文はブラウザ内へ保存します。本番導入時は店舗専用Supabase・Worker・Squareへ接続し、OWNERの商品登録から公開SHOP・注文管理へ反映します。</p>`;
    bindShell();
  }
  function flag(key,label,note){ const s=settings(); return `<div class="green-shop-flag"><label><input type="checkbox" data-shop-flag="${key}" ${s[key]?"checked":""} ${!s.enabled?"disabled":""}>${label}</label><small>${note}</small></div>`; }
  function renderProducts(ps){ if(!ps.length) return '<div class="green-shop-empty">販売商品はまだありません。</div>'; return `<div class="green-shop-table-wrap"><table class="green-shop-table"><thead><tr><th>商品</th><th>カテゴリー</th><th>価格</th><th>在庫</th><th>公開</th><th>操作</th></tr></thead><tbody>${ps.map(p=>`<tr><td><div class="green-shop-product-cell"><img class="green-shop-thumb" src="${esc(imageUrl(p))}" alt=""><div><strong>${esc(p.name)}</strong><small>${esc(p.lead||"")}</small></div></div></td><td>${esc(p.category||"その他")}</td><td>${yen(p.price)}</td><td>${Number(p.stock)||0}</td><td><span class="green-shop-status ${p.published?"":"is-draft"}">${p.published?"公開中":"非公開"}</span></td><td><div class="green-shop-actions"><button class="green-shop-mini" data-product-edit="${esc(p.id)}">編集</button><button class="green-shop-mini danger" data-product-delete="${esc(p.id)}">削除</button></div></td></tr>`).join("")}</tbody></table></div>`; }
  function renderOrders(os){ if(!os.length) return '<div class="green-shop-empty">まだデモ注文はありません。公開SHOPから注文すると、ここへ即時表示されます。</div>'; return `<div class="green-shop-table-wrap"><table class="green-shop-table"><thead><tr><th>注文番号</th><th>お客様</th><th>合計</th><th>決済</th><th>状態</th><th>注文日時</th><th>操作</th></tr></thead><tbody>${os.slice().reverse().map(o=>`<tr><td><strong>${esc(o.number)}</strong><br><small>${(o.items||[]).length}商品</small></td><td>${esc(o.customer?.name||"—")}<br><small>${esc(o.customer?.phone||"")}</small></td><td>${yen(o.total)}</td><td><span class="green-shop-status">${o.paymentStatus==="paid_demo"?"Square決済済 DEMO":esc(o.paymentStatus||"未決済")}</span></td><td><span class="green-shop-status is-${esc(o.status||"new")}">${orderLabel(o.status)}</span></td><td>${esc(new Date(o.createdAt).toLocaleString("ja-JP"))}</td><td><div class="green-shop-actions">${o.status==="new"?`<button class="green-shop-mini primary" data-order-next="${esc(o.id)}" data-status="preparing">制作・準備へ</button>`:""}${o.status==="preparing"?`<button class="green-shop-mini primary" data-order-next="${esc(o.id)}" data-status="shipped">発送済みに</button>`:""}<button class="green-shop-mini" data-order-detail="${esc(o.id)}">詳細</button></div></td></tr>`).join("")}</tbody></table></div>`; }
  function renderSettings(s){ return `<div class="green-shop-settings-grid"><article class="green-shop-setting-card"><h4>商品マスター</h4><p>DPRO GREEN OWNERで商品名・写真・価格・在庫・公開状態を管理。Squareへの二重商品登録は不要という設計です。</p></article><article class="green-shop-setting-card"><h4>決済</h4><p>${s.square?"Square決済を利用する設定です。本番は店舗オーナー名義のSquareへOAuth接続します。":"オンライン決済はOFFです。"}</p></article><article class="green-shop-setting-card"><h4>顧客台帳</h4><p>本番では購入者を既存の顧客台帳へ紐付け、レンタル契約・販売履歴・LINE連携を同じ顧客で確認できる構成にします。</p></article><article class="green-shop-setting-card"><h4>公開SHOP</h4><p>販売機能ON時だけHPにONLINE SHOP導線を表示します。</p><a href="${esc(SHOP_URL)}" target="_blank" rel="noopener">公開SHOPを確認 →</a></article></div>`; }
  function orderLabel(s){ return ({new:"新規注文",preparing:"準備中",shipped:"発送済み",cancelled:"取消"})[s]||s||"新規注文"; }
  function bindShell(){
    const master=$("#green-shop-master-switch"); if(master) master.addEventListener("change",e=>{ const n={...settings(),enabled:e.target.checked}; saveSettings(n); installNav(); render(); injectFeatureCard(); if(!n.enabled) setTimeout(()=>{ const f=$("[data-view='features']"); if(f) f.click(); },120); });
    $$('[data-shop-flag]').forEach(x=>x.addEventListener("change",()=>{const n={...settings(),[x.dataset.shopFlag]:x.checked};saveSettings(n);render();}));
    $$('[data-shop-tab]').forEach(b=>b.addEventListener("click",()=>{ $$('[data-shop-tab]').forEach(x=>x.classList.toggle("is-active",x===b)); $$('[data-shop-pane]').forEach(p=>p.classList.toggle("is-active",p.dataset.shopPane===b.dataset.shopTab)); }));
    $$('[data-product-edit]').forEach(b=>b.addEventListener("click",()=>openProductDialog(b.dataset.productEdit)));
    $$('[data-product-delete]').forEach(b=>b.addEventListener("click",()=>{const p=products().find(x=>x.id===b.dataset.productDelete); if(!p||!confirm(`「${p.name}」を削除しますか？`))return;saveProducts(products().filter(x=>x.id!==p.id));render();}));
    $$('[data-order-next]').forEach(b=>b.addEventListener("click",()=>{const os=orders(),o=os.find(x=>x.id===b.dataset.orderNext);if(o){o.status=b.dataset.status;o.updatedAt=new Date().toISOString();saveOrders(os);render();}}));
    $$('[data-order-detail]').forEach(b=>b.addEventListener("click",()=>openOrderDialog(b.dataset.orderDetail)));
  }
  function ensureDialog(){ if($("#green-shop-dialog")) return; const d=document.createElement("dialog"); d.id="green-shop-dialog";d.className="green-shop-dialog";document.body.append(d); }
  function openProductDialog(id=""){
    ensureDialog();const d=$("#green-shop-dialog"), p=products().find(x=>x.id===id)||{id:"",name:"",category:"観葉植物",price:"",stock:0,image:"green-shop-pachira-6.webp",description:"",lead:"発送目安 3〜5営業日",published:true};
    d.innerHTML=`<div class="green-shop-dialog-head"><div><small>PRODUCT MASTER / DEMO</small><h3>${id?"販売商品を編集":"販売商品を登録"}</h3></div><button class="green-shop-dialog-close" type="button" data-shop-close>×</button></div><form id="green-shop-product-form"><div class="green-shop-form"><label>商品名<input name="name" required value="${esc(p.name)}"></label><label>カテゴリー<select name="category">${["観葉植物","鉢・鉢カバー","ギフト","ケア用品","セット","その他"].map(x=>`<option ${x===p.category?"selected":""}>${x}</option>`).join("")}</select></label><label>販売価格（税込）<input name="price" type="number" min="0" step="1" required value="${esc(p.price)}"></label><label>在庫数<input name="stock" type="number" min="0" step="1" value="${esc(p.stock)}"></label><label>商品写真<select name="image">${["green-shop-pachira-6.webp", "green-shop-monstera-8.webp", "green-shop-strelitzia-6.webp", "green-shop-sansevieria-6.webp", "green-shop-benjamin-8.webp", "green-shop-yucca-8.webp", "green-shop-pot-woven.webp", "green-shop-pot-white.webp", "green-shop-pot-charcoal.webp", "green-shop-pot-terracotta.webp", "owner-office.webp", "owner-store.webp", "owner-clinic-green.webp", "owner-hero.webp", "owner-maintenance.webp", "owner-welfare-green.webp"].map(x=>`<option ${x===p.image?"selected":""}>${x}</option>`).join("")}</select></label><label>発送目安<input name="lead" value="${esc(p.lead)}"></label><label class="wide">商品説明<textarea name="description">${esc(p.description)}</textarea></label><label class="check wide"><input name="published" type="checkbox" ${p.published?"checked":""}>オンラインSHOPへ公開する</label></div><div class="green-shop-dialog-foot"><button class="green-shop-mini" type="button" data-shop-close>キャンセル</button><button class="green-shop-mini primary" type="submit">保存する</button></div></form>`;
    $$('[data-shop-close]',d).forEach(b=>b.onclick=()=>d.close());$("#green-shop-product-form",d).onsubmit=e=>{e.preventDefault();const fd=new FormData(e.currentTarget),items=products();const next={id:p.id||`green-${Date.now().toString(36)}`,name:String(fd.get("name")||"").trim(),category:String(fd.get("category")||"その他"),price:Number(fd.get("price"))||0,stock:Number(fd.get("stock"))||0,image:String(fd.get("image")||"green-shop-pachira-6.webp"),lead:String(fd.get("lead")||""),description:String(fd.get("description")||""),published:fd.get("published")==="on"};const i=items.findIndex(x=>x.id===next.id);if(i>=0)items[i]=next;else items.unshift(next);saveProducts(items);d.close();render();}; d.showModal();
  }
  function openOrderDialog(id){ ensureDialog();const d=$("#green-shop-dialog"),o=orders().find(x=>x.id===id);if(!o)return;d.innerHTML=`<div class="green-shop-dialog-head"><div><small>ORDER DETAIL / DEMO</small><h3>${esc(o.number)}</h3></div><button class="green-shop-dialog-close" type="button" data-shop-close>×</button></div><div class="green-shop-form"><div class="wide"><strong>お客様</strong><p>${esc(o.customer?.name||"—")} / ${esc(o.customer?.phone||"")}<br>${esc(o.customer?.address||"")}</p></div><div class="wide"><strong>商品</strong><p>${(o.items||[]).map(i=>`${esc(i.name)} × ${Number(i.qty)||1}　${yen((Number(i.price)||0)*(Number(i.qty)||1))}`).join("<br>")}</p></div><div><strong>受取方法</strong><p>${esc(o.deliveryMethod||"配送")}</p></div><div><strong>決済</strong><p>${o.paymentStatus==="paid_demo"?"Square決済済み（DEMO）":esc(o.paymentStatus||"—")}</p></div><div class="wide"><strong>合計</strong><p style="font-size:22px;font-weight:800">${yen(o.total)}</p></div></div><div class="green-shop-dialog-foot"><button class="green-shop-mini" type="button" data-shop-close>閉じる</button></div>`;$$('[data-shop-close]',d).forEach(b=>b.onclick=()=>d.close());d.showModal(); }
  function activateFeatureCategory(group){
    $$("[data-feature-group]").forEach(panel=>{
      panel.hidden=panel.dataset.featureGroup!==group;
    });
    $$("[data-feature-category]").forEach(button=>{
      const active=button.dataset.featureCategory===group;
      button.classList.toggle("is-active",active);
      button.setAttribute("aria-current",active?"true":"false");
    });
    const select=$("#feature-category-select");
    if(select&&select.value!==group)select.value=group;
  }

  function syncFeatureCategory(){
    const card=$("#green-shop-feature-card");
    const nav=$("#feature-category-nav");
    const select=$("#feature-category-select");
    if(!card||!nav)return;

    card.dataset.featureGroup=FEATURE_GROUP;

    let button=nav.querySelector(`[data-feature-category="${FEATURE_GROUP}"]`);
    if(!button){
      button=document.createElement("button");
      button.type="button";
      button.dataset.featureCategory=FEATURE_GROUP;
      button.textContent=FEATURE_GROUP;
      nav.prepend(button);
      button.addEventListener("click",()=>activateFeatureCategory(FEATURE_GROUP));
    }

    if(select&&!Array.from(select.options).some(option=>option.value===FEATURE_GROUP)){
      select.add(new Option(FEATURE_GROUP,FEATURE_GROUP),0);
    }

    const active =
      nav.querySelector("[data-feature-category].is-active")?.dataset.featureCategory ||
      select?.value ||
      "";
    card.hidden=active!==FEATURE_GROUP;
  }

  function injectFeatureCard(){
    const box=$("#feature-groups");
    if(!box||$("#green-shop-feature-card"))return;
    const s=settings();
    const card=document.createElement("article");
    card.id="green-shop-feature-card";
    card.className="owner-panel feature-group green-shop-feature-card";
    card.dataset.featureGroup=FEATURE_GROUP;
    card.innerHTML=`<div class="owner-panel-head"><h3>販売・SHOP MODULE <span class="green-shop-feature-pill">OPTION</span></h3></div><div class="feature-grid"><div class="feature-card"><div class="green-shop-feature-inline"><div><strong>販売機能を使う</strong><small>レンタル専用 / レンタル＋販売を切替</small></div><label class="green-shop-toggle"><input id="green-shop-feature-switch" type="checkbox" ${s.enabled?"checked":""}><span class="green-shop-toggle-track"></span><span class="green-shop-toggle-label">${s.enabled?"ON":"OFF"}</span></label></div><div class="green-shop-linkbar"><a href="${esc(SHOP_URL)}" target="_blank" rel="noopener">公開SHOPを見る</a></div></div></div>`;
    box.prepend(card);
    syncFeatureCategory();
    $("#green-shop-feature-switch",card).onchange=e=>{
      saveSettings({...settings(),enabled:e.target.checked});
      installNav();
      injectFeatureCardRefresh();
    };
  }
  function injectFeatureCardRefresh(){ const old=$("#green-shop-feature-card");if(old)old.remove();injectFeatureCard(); if(!settings().enabled && $("[data-view-panel='shop-sales']")?.classList.contains("is-active")){const d=$("[data-view='dashboard']");d?.click();} }
  function observeFeatures(){
    const box=$("#feature-groups");
    if(!box)return;
    new MutationObserver(()=>{
      if(!$("#green-shop-feature-card"))setTimeout(injectFeatureCard,0);
      else setTimeout(syncFeatureCategory,0);
    }).observe(box,{childList:true});
    injectFeatureCard();
  }
  function boot(){ if(!/\/owner\.html$/.test(location.pathname))return;ensureCss();installNav();installPanel();observeFeatures();window.addEventListener("storage",e=>{if([SETTINGS_KEY,PRODUCTS_KEY,ORDERS_KEY].includes(e.key)){installNav();render();injectFeatureCardRefresh();}});window.addEventListener("dpro-green-shop-change",()=>{installNav();render();injectFeatureCardRefresh();}); const q=new URLSearchParams(location.search);if(q.get("view")==="shop-sales"){const app=$("#owner-app");const go=()=>{if(app&&!app.hidden)openShopView();};setTimeout(go,350);if(app)new MutationObserver(go).observe(app,{attributes:true,attributeFilter:["hidden"]});} }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();
