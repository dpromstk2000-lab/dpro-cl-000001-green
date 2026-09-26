(() => {
  "use strict";
  const $ = s => document.querySelector(s);
  const Green = window.Green;
  const config = window.GREEN_CONFIG;
  const esc = v => String(v ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  async function restore(){try{const r=await Green.api("/api/admin/session");Green.setCsrfToken(r.data.csrfToken);await run()}catch(e){Green.toast(e.message||"認証を確認できませんでした。","error")}}
  async function fetchCheck(){const res=await fetch(`${config.API_BASE}/api/admin/system-check`,{method:"GET",credentials:"include",cache:"no-store"});const p=await res.json().catch(()=>({ok:false,message:"システム検査のAPI応答を読み取れませんでした。"}));if(p?.data)return p;const e=new Error(p?.message||`システム検査を取得できませんでした（HTTP ${res.status}）。`);e.requestId=p?.requestId||null;throw e}
  async function run(){try{const p=await fetchCheck();render(p.data);await checkPages()}catch(e){Green.toast(`${e.message}${e.requestId?`（確認番号：${e.requestId}）`:""}`,"error")}}
  function render(data){const stats=[["検査件数",data.total],["合格",data.passed],["失敗",data.failed],["警告",data.warnings]];$("#check-summary").innerHTML=stats.map(([l,v])=>`<div class="check-stat"><small>${l}</small><strong>${v}</strong></div>`).join("");$("#check-list").innerHTML=(data.checks||[]).map(i=>`<div class="check-item" data-status="${i.status}"><span class="check-dot"></span><div><strong>${esc(i.label)}</strong>${i.detail!==null?`<small>${esc(typeof i.detail==='string'?i.detail:JSON.stringify(i.detail))}</small>`:""}</div><span class="check-badge">${i.status==='pass'?'合格':i.status==='fail'?'失敗':'警告'}</span></div>`).join("")}
  async function checkPages(){const files=["index.html","member.html","owner.html","owner-login.html","owner-activate.html","owner-ipad.html","staff.html","system-check.html","config.js","dpro-auth-guard.js"];const rows=[];for(const f of files){try{const r=await fetch(f,{cache:"no-store"});rows.push([f,r.ok,r.status])}catch{rows.push([f,false,"通信失敗"])}}$("#page-checks").innerHTML=rows.map(([f,ok,s])=>`<div class="page-check"><span>${esc(f)}</span><strong data-ok="${ok}">${ok?'表示正常':`失敗 ${s}`}</strong></div>`).join("")}
  async function logout(){try{await Green.api("/api/admin/logout",{method:"POST",json:{}})}catch{};try{await window.DPRO_AUTH?.logout?.()}catch{} }
  document.addEventListener("DOMContentLoaded",()=>{$("#check-rerun").addEventListener("click",run);$("#check-logout").addEventListener("click",logout);restore()});
})();
