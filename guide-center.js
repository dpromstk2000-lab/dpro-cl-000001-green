(() => {
  "use strict";
  const VERSION = "GREEN-GUIDE-R4.1-20260822";
  const CONTENT_URL = "dpro-tutorial-content-green.json?v=GREEN-R2-LOCK-20260822";
  const STATE_KEY = "dpro:tutorial:green:first10:v1";
  const $ = (s, root=document) => root.querySelector(s);
  const state = { content:null, category:"all", query:"" };

  function esc(v){return String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));}
  function safeJson(raw,fallback){if(raw==null||raw==="")return fallback;try{const value=JSON.parse(raw);return value&&typeof value==="object"?value:fallback}catch{return fallback}}
  function readFirst10(){return safeJson(localStorage.getItem(STATE_KEY),{index:0,active:false,completed:false,skipped:[]});}
  function writeFirst10(v){localStorage.setItem(STATE_KEY,JSON.stringify(v));}
  function qs(extra={}){const p=new URLSearchParams();if(new URLSearchParams(location.search).get("demo")==="1")p.set("demo","1");Object.entries(extra).forEach(([k,v])=>{if(v!==undefined&&v!==null&&v!=="")p.set(k,String(v));});const s=p.toString();return s?`?${s}`:"";}
  function categoryMap(){return Object.fromEntries((state.content?.guide_center?.categories||[]).map(x=>[x.id,x]));}
  function articles(){return state.content?.guide_center?.articles||[];}
  function faqs(){return state.content?.guide_center?.faqs||[];}

  function renderCategories(){
    const root=$("#gc-categories"); const cats=state.content?.guide_center?.categories||[];
    root.innerHTML=[{id:"all",title:"すべて"},...cats].map(c=>`<button type="button" data-category="${esc(c.id)}" class="${state.category===c.id?"is-active":""}">${esc(c.title)}</button>`).join("");
    root.querySelectorAll("[data-category]").forEach(b=>b.addEventListener("click",()=>{state.category=b.dataset.category;renderCategories();renderArticles();}));
  }
  function searchable(a){return [a.title,a.summary,...(a.keywords||[]),...(a.steps||[])].join(" ").toLowerCase();}
  function filteredArticles(){const q=state.query.trim().toLowerCase();return articles().filter(a=>(state.category==="all"||a.category_id===state.category)&&(!q||searchable(a).includes(q)));}
  function renderArticles(){
    const rows=filteredArticles(); const cats=categoryMap(); $("#gc-result-count").textContent=`${rows.length} / ${articles().length}記事`;
    $("#gc-article-list").innerHTML=rows.length?rows.map(a=>`<article class="gc-article"><small>${esc(cats[a.category_id]?.title||"GUIDE")}</small><h3>${esc(a.title)}</h3><p>${esc(a.summary)}</p><button type="button" data-article="${esc(a.id)}">詳しく見る</button></article>`).join(""):'<div class="gc-empty">条件に合うガイドがありません。検索語またはカテゴリを変更してください。</div>';
    document.querySelectorAll("[data-article]").forEach(b=>b.addEventListener("click",()=>openArticle(b.dataset.article,true)));
  }
  function renderFaq(){
    $("#gc-faq-list").innerHTML=faqs().map((f,i)=>`<details id="faq-${i+1}"><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("");
    $("#faq-title").parentElement.parentElement.querySelector("span").textContent=`${faqs().length}項目`;
  }
  function featureHref(a){return `${a.route}${qs({dpro_guide:a.target_id})}`;}
  function openArticle(id,pushHash=false){
    const a=articles().find(x=>x.id===id); if(!a)return;
    const cats=categoryMap(); $("#gc-dialog-category").textContent=cats[a.category_id]?.title||"GUIDE"; $("#gc-dialog-title").textContent=a.title;
    $("#gc-dialog-body").innerHTML=`<p>${esc(a.summary)}</p><ol class="gc-steps">${(a.steps||[]).map(s=>`<li>${esc(s)}</li>`).join("")}</ol>${a.warning?`<div class="gc-warning"><strong>注意</strong><br>${esc(a.warning)}</div>`:""}`;
    const link=$("#gc-feature-link"); link.href=featureHref(a); link.dataset.articleId=a.id;
    const dialog=$("#gc-article-dialog"); if(typeof dialog.showModal==="function"&&!dialog.open)dialog.showModal(); else dialog.setAttribute("open","");
    if(pushHash){const hash=`#article=${encodeURIComponent(a.id)}`; if(location.hash!==hash)history.pushState({article:a.id},"",hash);}
  }
  function closeArticle(updateHistory=true){const d=$("#gc-article-dialog");if(typeof d.close==="function"&&d.open)d.close();else d.removeAttribute("open");if(updateHistory&&location.hash.startsWith("#article="))history.pushState({},"",location.pathname+location.search);}
  function syncHash(){const m=location.hash.match(/^#article=(.+)$/);if(!m){closeArticle(false);return;}try{openArticle(decodeURIComponent(m[1]),false);}catch{}}

  function startFirst10(reset){
    const cards=state.content?.first10?.cards||[]; if(!cards.length)return;
    let s=readFirst10(); if(reset||s.completed)s={index:0,active:true,completed:false,skipped:[]}; else s={...s,index:Math.min(Math.max(0,s.index||0),cards.length-1),active:true}; writeFirst10(s);
    const card=cards[s.index]||cards[0]; location.href=`${card.route}${qs({dpro_tutorial:"1"})}`;
  }
  function bind(){
    $("#gc-search").addEventListener("input",e=>{state.query=e.target.value;renderArticles();});
    $("#gc-clear-search").addEventListener("click",()=>{$("#gc-search").value="";state.query="";renderArticles();$("#gc-search").focus();});
    $("#gc-start-first10").addEventListener("click",()=>startFirst10(true));
    $("#gc-replay").addEventListener("click",()=>startFirst10(true));
    $("#gc-resume-first10").addEventListener("click",()=>startFirst10(false));
    $("#gc-dialog-close").addEventListener("click",()=>closeArticle(true));
    $("#gc-dialog-back").addEventListener("click",()=>closeArticle(true));
    $("#gc-article-dialog").addEventListener("cancel",e=>{e.preventDefault();closeArticle(true);});
    window.addEventListener("hashchange",syncHash); window.addEventListener("popstate",syncHash);
  }
  async function init(){
    bind();
    try{const r=await fetch(CONTENT_URL,{cache:"no-store"});if(!r.ok)throw new Error(`HTTP ${r.status}`);state.content=await r.json();}
    catch(error){$("#guide-main").insertAdjacentHTML("afterbegin",`<div class="gc-error">Guide Centerの内容を読み込めませんでした。再読み込みしてください。（${esc(error.message)}）</div>`);return;}
    renderCategories();renderArticles();renderFaq();syncHash();
    const s=readFirst10();$("#gc-resume-first10").textContent=s.completed?"First10をもう一度見る":s.index>0?`First10を続きから（${Math.min((s.index||0)+1,15)}/15）`:"First10をはじめる";
    window.DPRO_GUIDE_CENTER_GREEN=Object.freeze({version:VERSION,openArticle,startFirst10});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
