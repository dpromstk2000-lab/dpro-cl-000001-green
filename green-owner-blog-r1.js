(() => {
  "use strict";
  const VERSION = "GREEN-OWNER-BLOG-R1.3-SCHEDULE-20261007";
  if (window.__GREEN_OWNER_BLOG_R1__ === VERSION) return;
  window.__GREEN_OWNER_BLOG_R1__ = VERSION;

  const state = { items: [], editing: null, ready: false };
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  const Green = () => window.Green;
  const categories = ["レンタル基礎","オフィス","店舗","医療・福祉","料金・サービス","対応エリア","メンテナンス","植物紹介","設置事例","お知らせ","その他"];
  const templates = {
    case:{label:"設置事例",category:"設置事例",body:"## ご相談内容\n\n設置前のお悩みや、ご希望の雰囲気を入力してください。\n\n## ご提案した内容\n\n植物の種類・大きさ・鉢・配置の考え方を入力してください。\n\n## 設置後\n\n空間がどのように変わったか、今後のメンテナンスについて入力してください。"},
    plant:{label:"植物紹介",category:"植物紹介",body:"## この植物の特徴\n\n見た目や育ち方の特徴を入力してください。\n\n## おすすめの設置場所\n\nオフィス・店舗・受付など、相性のよい場所を入力してください。\n\n## 管理のポイント\n\n光・空調・水やりなど、気をつけたい点を入力してください。"},
    care:{label:"季節のお手入れ",category:"メンテナンス",body:"## 今の季節に気をつけたいこと\n\n季節特有の注意点を入力してください。\n\n## 日常で確認したいポイント\n\n葉・土・空調・日当たりなど、確認事項を入力してください。\n\n## 困ったときは\n\n写真相談やLINE相談をご利用いただけます。"},
    notice:{label:"店舗からのお知らせ",category:"お知らせ",body:"## お知らせ\n\nお客様へお伝えしたい内容を入力してください。\n\n## 対象期間・ご案内\n\n必要な日付や補足事項を入力してください。"},
    guide:{label:"お役立ち情報",category:"レンタル基礎",body:"## はじめに\n\n今回のテーマについて、よくあるお悩みや疑問を入力してください。\n\n## ポイント\n\n分かりやすく2〜4項目に分けて説明してください。\n\n## まとめ\n\n福岡粕屋店で相談できる内容や、無料相談への案内を入力してください。"}
  };

  function style(){
    if (document.querySelector('link[data-green-owner-blog-r1]')) return;
    const link=document.createElement('link'); link.rel='stylesheet'; link.href='green-owner-blog-r1.css?v='+VERSION; link.dataset.greenOwnerBlogR1=VERSION; document.head.append(link);
  }
  function closeSidebar(){
    $(".owner-sidebar")?.classList.remove("is-open");
    const bd=$("#owner-sidebar-backdrop"); if(bd) bd.hidden=true;
  }
  function ensureUi(){
    const nav=$(".owner-nav"); const main=$(".owner-content") || $("main"); if(!nav||!main) return false;
    if(!$("#green-blog-nav")){
      const b=document.createElement('button'); b.id='green-blog-nav'; b.type='button'; b.dataset.view='blog'; b.innerHTML='<span>記</span>ブログ・コラム';
      const before=nav.querySelector('[data-view="features"]'); before?nav.insertBefore(b,before):nav.append(b);
      b.addEventListener('click',openView);
    }
    if(!$("[data-view-panel='blog']")){
      const sec=document.createElement('section'); sec.className='owner-view'; sec.dataset.viewPanel='blog';
      sec.innerHTML=`<div class="green-blog-head"><div><p class="eyebrow">BLOG & COLUMN</p><h2>ブログ・コラム</h2><p>写真・タイトル・本文を入力して、ホームページへ公開します。SEO用のURLや説明文は必要なときだけ調整できます。</p></div><div class="green-blog-actions"><button class="btn btn--primary" type="button" id="green-blog-new">＋ 記事を作る</button></div></div><div class="green-blog-note">おすすめ運用：まず「下書き」で保存 → プレビュー確認 → 「予約公開」または「今すぐ公開」を選びます。予約公開は日付だけ指定すれば9:00公開です。臨時休業など短い案内は、これまでどおり「公開お知らせ」を使用してください。</div><div id="green-blog-list" class="green-blog-list" style="margin-top:14px"><div class="green-blog-empty">読み込み中…</div></div>`;
      const feature=$("[data-view-panel='features']"); feature?.parentNode?.insertBefore(sec,feature) || main.append(sec);
      $("#green-blog-new")?.addEventListener('click',()=>openEditor(null));
    }
    return true;
  }
  async function openView(e){
    e?.preventDefault();
    $$('[data-view-panel]').forEach(p=>p.classList.toggle('is-active',p.dataset.viewPanel==='blog'));
    $$('[data-view]').forEach(b=>b.classList.toggle('is-active',b.dataset.view==='blog'));
    const title=$("#view-title"); if(title) title.textContent='ブログ・コラム';
    closeSidebar(); await load();
  }
  function fmtDate(v){ if(!v)return '未設定'; try{return new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',year:'numeric',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(v));}catch{return v;} }
  function isScheduled(item){return !!(item?.status==='published'&&item?.publishedAt&&new Date(item.publishedAt).getTime()>Date.now());}
  function itemUiStatus(item){return isScheduled(item)?'scheduled':(item?.status||'draft');}
  function statusLabel(item){const s=itemUiStatus(item);return s==='scheduled'?'予約公開':s==='published'?'公開中':s==='archived'?'非公開':'下書き';}
  function jstParts(v){
    if(!v)return {date:'',time:'09:00'};
    const d=new Date(v);if(Number.isNaN(d.getTime()))return {date:'',time:'09:00'};
    const j=new Date(d.getTime()+9*60*60*1000);
    return {date:j.toISOString().slice(0,10),time:j.toISOString().slice(11,16)};
  }
  function tomorrowJst(){
    const j=new Date(Date.now()+9*60*60*1000+24*60*60*1000);
    return j.toISOString().slice(0,10);
  }
  function scheduleIso(date,time){
    return new Date(`${date}T${time||'09:00'}:00+09:00`).toISOString();
  }
  function render(){
    const root=$("#green-blog-list"); if(!root)return;
    if(!state.items.length){root.innerHTML='<div class="green-blog-empty">記事はまだありません。「記事を作る」から最初の記事を作成できます。</div>';return;}
    root.innerHTML=state.items.map(item=>{const scheduled=isScheduled(item);const ui=itemUiStatus(item);return `<article class="green-blog-card"><div><div><span class="green-blog-pill ${esc(ui)}">${statusLabel(item)}</span> <span class="green-blog-pill">${esc(item.category)}</span></div><strong>${esc(item.title)}</strong><div class="green-blog-meta"><span>URL: ${esc(item.slug)}</span><span>更新 ${esc(fmtDate(item.updatedAt))}</span>${scheduled&&item.publishedAt?`<span>予約 ${esc(fmtDate(item.publishedAt))}</span>`:item.status==='published'&&item.publishedAt?`<span>公開 ${esc(fmtDate(item.publishedAt))}</span>`:''}</div></div><div class="green-blog-card-actions"><button type="button" class="btn btn--secondary btn--small" data-blog-edit="${esc(item.id)}">編集</button>${item.status==='published'&&!scheduled?`<a class="btn btn--secondary btn--small" target="_blank" rel="noopener" href="https://dpromstk2000-lab.github.io/dpro-green-website/blog-post.html?slug=${encodeURIComponent(item.slug)}">公開ページ</a>`:''}</div></article>`}).join('');
    root.querySelectorAll('[data-blog-edit]').forEach(b=>b.addEventListener('click',()=>openEditor(state.items.find(x=>x.id===b.dataset.blogEdit))));
  }
  async function load(){
    const root=$("#green-blog-list"); if(root)root.innerHTML='<div class="green-blog-empty">読み込み中…</div>';
    try{const r=await Green().api('/api/admin/blog');state.items=r.data?.items||[];render();}catch(err){if(root)root.innerHTML=`<div class="green-blog-empty">${esc(err.message||'ブログを読み込めませんでした。')}</div>`;throw err;}
  }
  function defaultSlug(){const d=new Date();const p=n=>String(n).padStart(2,'0');return `column-${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;}
  function value(form,name){return form.elements[name]?.value?.trim?.() ?? '';}
  function bodyPreview(text){
    const lines=String(text||'').split(/\r?\n/);let html='',list=false;
    const close=()=>{if(list){html+='</ul>';list=false;}};
    for(const raw of lines){const line=raw.trim();if(!line){close();continue;}if(line.startsWith('## ')){close();html+=`<h2>${esc(line.slice(3))}</h2>`;}else if(line.startsWith('- ')){if(!list){html+='<ul>';list=true;}html+=`<li>${esc(line.slice(2))}</li>`;}else{close();html+=`<p>${esc(line)}</p>`;}}close();return html;
  }
  function modal(){
    if($("#green-blog-modal"))return;
    const bd=document.createElement('div');bd.id='green-blog-backdrop';bd.className='green-blog-modal-backdrop';bd.hidden=true;
    const m=document.createElement('section');m.id='green-blog-modal';m.className='green-blog-modal';m.hidden=true;m.innerHTML='<header class="green-blog-modal-head"><h2 id="green-blog-modal-title">記事編集</h2><button type="button" class="green-blog-close" aria-label="閉じる">×</button></header><form id="green-blog-form" class="green-blog-form"></form>';
    document.body.append(bd,m); const close=()=>{bd.hidden=true;m.hidden=true;state.editing=null;};bd.addEventListener('click',close);m.querySelector('.green-blog-close').addEventListener('click',close);m._close=close;
  }
  function field(name,label,val='',type='text',full=false,extra=''){return `<label class="green-blog-field${full?' full':''}"><span>${label}</span>${type==='textarea'?`<textarea name="${name}" ${extra}>${esc(val)}</textarea>`:`<input type="${type}" name="${name}" value="${esc(val)}" ${extra}>`}</label>`;}
  function localDT(v){if(!v)return '';const d=new Date(v);const x=new Date(d.getTime()-d.getTimezoneOffset()*60000);return x.toISOString().slice(0,16);}
  function openEditor(item){
    modal();state.editing=item||null;const form=$("#green-blog-form");$("#green-blog-modal-title").textContent=item?'記事を編集':'新しい記事';
    const image=item?.featuredImageUrl||'';
    const currentUiStatus=itemUiStatus(item);
    const schedule=jstParts(item?.publishedAt);
    form.innerHTML=`<div class="green-blog-template-row"><span>書き始めテンプレート</span>${Object.entries(templates).map(([k,t])=>`<button type="button" data-blog-template="${k}">${t.label}</button>`).join('')}</div><label class="green-blog-field"><span>カテゴリ</span><select name="category">${categories.map(c=>`<option${c===(item?.category||'レンタル基礎')?' selected':''}>${c}</option>`).join('')}</select></label><label class="green-blog-field"><span>公開状態</span><select name="status"><option value="draft"${currentUiStatus==='draft'?' selected':''}>下書き</option><option value="scheduled"${currentUiStatus==='scheduled'?' selected':''}>予約公開</option><option value="published"${currentUiStatus==='published'?' selected':''}>今すぐ公開</option><option value="archived"${currentUiStatus==='archived'?' selected':''}>非公開</option></select></label><div class="green-blog-schedule-fields full" id="green-blog-schedule-fields"><label class="green-blog-field"><span>公開予定日</span><input type="date" name="scheduleDate" value="${esc(schedule.date)}"></label><label class="green-blog-field"><span>時間（任意）</span><input type="time" name="scheduleTime" value="${esc(schedule.time||'09:00')}"><small class="green-blog-help">未指定の場合は9:00に公開します。</small></label></div>${field('title','タイトル',item?.title||'', 'text', true,'maxlength="160" required')}${field('excerpt','一覧に表示する短い説明',item?.excerpt||'','textarea',true,'maxlength="500"')}${field('body','本文',item?.body||'','textarea',true,'required') }<label class="green-blog-field full"><span>メイン写真</span><input type="file" name="image" accept="image/jpeg,image/png,image/webp"><small class="green-blog-help">写真を選ばない場合は現在の写真をそのまま使用します。スマホ写真も自動で縮小して保存します。</small></label><div class="green-blog-image-preview ${image?'':'no-image'}"><img id="green-blog-image-preview" src="${esc(image)}" alt=""><div><strong>${image?'現在のメイン写真':'メイン写真は未設定です'}</strong><p class="green-blog-help">記事一覧と記事上部に表示されます。</p></div></div><details class="green-blog-advanced"><summary>SEO・詳細設定（通常はそのままでOK）</summary><div class="green-blog-advanced-grid">${field('slug','URL名',item?.slug||defaultSlug(),'text',false,'pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required')}${field('featuredImageAlt','写真の説明',item?.featuredImageAlt||'')}${field('authorName','記事の表示名',item?.authorName||'グリーン・ポケット福岡粕屋店')}${field('seoTitle','検索結果用タイトル',item?.seoTitle||'','text',true,'maxlength="160"')}${field('seoDescription','検索結果用説明',item?.seoDescription||'','textarea',true,'maxlength="300"')}</div></details><article id="green-blog-preview" class="green-blog-preview" hidden></article><div class="green-blog-modal-actions"><div>${item?'<button type="button" class="btn btn--secondary green-blog-danger" id="green-blog-delete">削除</button>':''}</div><div class="right"><button type="button" class="btn btn--secondary" id="green-blog-preview-btn">プレビュー</button><button type="button" class="btn btn--primary" id="green-blog-save">下書きを保存</button></div></div>`;
    form.classList.remove('is-body-expanded');
    const bodyTextarea=form.elements.body;
    const bodyField=bodyTextarea?.closest('.green-blog-field');
    if(bodyField){
      bodyField.classList.add('green-blog-body-field');
      if(!bodyField.querySelector('[data-blog-body-expand]')){
        const expand=document.createElement('button');
        expand.type='button';
        expand.className='green-blog-body-expand';
        expand.dataset.blogBodyExpand='1';
        expand.textContent='↗ 本文を拡大';
        bodyTextarea.insertAdjacentElement('beforebegin',expand);
        expand.addEventListener('click',()=>{
          const expanded=form.classList.toggle('is-body-expanded');
          expand.textContent=expanded?'↙ 元の大きさ':'↗ 本文を拡大';
          if(expanded) bodyTextarea.focus();
          bodyField.scrollIntoView({behavior:'smooth',block:'start'});
        });
      }
    }
    form.querySelectorAll('[data-blog-template]').forEach(b=>b.addEventListener('click',()=>{const t=templates[b.dataset.blogTemplate];if(!t)return;form.elements.category.value=t.category;if(!form.elements.body.value.trim()||confirm('本文をテンプレートで置き換えますか？'))form.elements.body.value=t.body;}));
    form.elements.image.addEventListener('change',()=>{const f=form.elements.image.files[0];if(!f)return;const img=$("#green-blog-image-preview");img.src=URL.createObjectURL(f);img.closest('.green-blog-image-preview').classList.remove('no-image');});
    $("#green-blog-preview-btn").addEventListener('click',()=>{const p=$("#green-blog-preview");const src=$("#green-blog-image-preview").src;p.innerHTML=`${src&&!src.endsWith('/')?`<img src="${esc(src)}" alt="">`:''}<span class="green-blog-pill">${esc(value(form,'category'))}</span><h1>${esc(value(form,'title')||'タイトル')}</h1><p class="green-blog-help">${esc(value(form,'excerpt'))}</p>${bodyPreview(value(form,'body'))}`;p.hidden=!p.hidden;p.scrollIntoView({behavior:'smooth',block:'nearest'});});
    const saveBtn=$("#green-blog-save");
    const scheduleBox=$("#green-blog-schedule-fields");
    const syncSchedule=()=>{
      const scheduled=value(form,'status')==='scheduled';
      scheduleBox.hidden=!scheduled;
      form.elements.scheduleDate.required=scheduled;
      if(scheduled&&!form.elements.scheduleDate.value)form.elements.scheduleDate.value=tomorrowJst();
      if(scheduled&&!form.elements.scheduleTime.value)form.elements.scheduleTime.value='09:00';
    };
    const syncSaveLabel=()=>{const s=value(form,'status');saveBtn.textContent=s==='scheduled'?'予約を保存':s==='published'?'公開して保存':s==='archived'?'非公開で保存':'下書きを保存';};
    form.elements.status.addEventListener('change',()=>{syncSchedule();syncSaveLabel();});syncSchedule();syncSaveLabel();
    saveBtn.addEventListener('click',save);
    $("#green-blog-delete")?.addEventListener('click',remove);
    $("#green-blog-backdrop").hidden=false;$("#green-blog-modal").hidden=false;
  }
  async function save(e){
    const btn=e.currentTarget,form=$("#green-blog-form");if(!form.reportValidity())return;
    const uiStatus=value(form,'status');
    let status=uiStatus==='scheduled'?'published':uiStatus;
    let publishedAt=null;
    if(uiStatus==='scheduled'){
      const d=value(form,'scheduleDate');const t=value(form,'scheduleTime')||'09:00';
      if(!d){Green().toast('公開予定日を選んでください。','error');form.elements.scheduleDate.focus();return;}
      publishedAt=scheduleIso(d,t);
      if(new Date(publishedAt).getTime()<=Date.now()){Green().toast('予約公開は現在より後の日時を指定してください。','error');return;}
      if(!confirm(`${fmtDate(publishedAt)} に予約公開しますか？`))return;
    }else if(uiStatus==='published'){
      if(itemUiStatus(state.editing)!=='published'&&!confirm('この記事を今すぐホームページへ公開しますか？'))return;
      publishedAt=new Date().toISOString();
    }else if(uiStatus==='archived'){
      publishedAt=state.editing?.publishedAt||null;
    }
    const data={category:value(form,'category'),status,title:value(form,'title'),excerpt:value(form,'excerpt'),body:value(form,'body'),slug:value(form,'slug'),publishedAt:publishedAt||null,featuredImageAlt:value(form,'featuredImageAlt'),authorName:value(form,'authorName'),seoTitle:value(form,'seoTitle'),seoDescription:value(form,'seoDescription')};
    btn.disabled=true;btn.textContent='保存中…';
    try{let result;if(state.editing)result=await Green().api(`/api/admin/blog/${state.editing.id}`,{method:'PATCH',json:data});else result=await Green().api('/api/admin/blog',{method:'POST',json:data});let saved=result.data.item;const file=form.elements.image.files[0];if(file){btn.textContent='写真保存中…';const compressed=await Green().compressImage(file,{maxEdge:1600,quality:.84});const fd=new FormData();fd.append('file',compressed);const up=await Green().api(`/api/admin/blog/${saved.id}/image`,{method:'POST',body:fd});saved=up.data.item;}Green().toast(uiStatus==='scheduled'?`${fmtDate(publishedAt)} に予約公開しました。`:uiStatus==='published'?'記事を公開しました。':'記事を保存しました。','success');$("#green-blog-modal")._close();await load();}catch(err){Green().toast(err.message,'error');}finally{btn.disabled=false;const s=value(form,'status');btn.textContent=s==='scheduled'?'予約を保存':s==='published'?'公開して保存':s==='archived'?'非公開で保存':'下書きを保存';}
  }
  async function remove(e){if(!state.editing||!confirm('この記事を削除しますか？この操作は取り消せません。'))return;const btn=e.currentTarget;btn.disabled=true;try{await Green().api(`/api/admin/blog/${state.editing.id}`,{method:'DELETE'});Green().toast('記事を削除しました。','success');$("#green-blog-modal")._close();await load();}catch(err){Green().toast(err.message,'error');}finally{btn.disabled=false;}}
  function init(){if(state.ready)return;if(!window.Green||!ensureUi())return;style();state.ready=true;window.GreenBlog={load,open:openEditor,version:VERSION};}
  let tries=0;const timer=setInterval(()=>{tries++;init();if(state.ready||tries>120)clearInterval(timer);},100);
})();
