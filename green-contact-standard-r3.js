(() => {
  "use strict";
  const VERSION="DPRO-CONTACT-STANDARD-R3.3-20260927";
  const MAX_FILES=4, MAX_BYTES=10*1024*1024;
  const ALLOWED=new Set([
    "image/jpeg","image/png","image/webp","application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain","text/csv"
  ]);
  let files=[];
  let decorating=false;

  const $=id=>document.getElementById(id);
  const humanSize=n=>n>=1048576?`${(n/1048576).toFixed(1)} MB`:`${Math.max(1,Math.round(n/1024))} KB`;

  async function normalizeLineImage(file){
    if(!file.type.startsWith("image/")) return file;
    const bitmap = await createImageBitmap(file);
    const maxEdge = 1600;
    let width = bitmap.width, height = bitmap.height;
    const scale = Math.min(1, maxEdge / Math.max(width, height));
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext("2d", {alpha:false});
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0,0,width,height);
    ctx.drawImage(bitmap,0,0,width,height);
    bitmap.close?.();

    let quality = 0.86, blob = null;
    for(let i=0;i<8;i++){
      blob = await new Promise(resolve=>canvas.toBlob(resolve,"image/jpeg",quality));
      if(blob && blob.size <= 900*1024) break;
      quality = Math.max(0.5, quality - 0.07);
      if(i===4 && Math.max(canvas.width,canvas.height)>1200){
        const ratio = 1200/Math.max(canvas.width,canvas.height);
        const next = document.createElement("canvas");
        next.width=Math.max(1,Math.round(canvas.width*ratio));
        next.height=Math.max(1,Math.round(canvas.height*ratio));
        const nctx=next.getContext("2d",{alpha:false});
        nctx.fillStyle="#ffffff";nctx.fillRect(0,0,next.width,next.height);
        nctx.drawImage(canvas,0,0,next.width,next.height);
        canvas.width=next.width;canvas.height=next.height;
        ctx.drawImage(next,0,0);
      }
    }
    if(!blob) throw new Error("画像をLINE送信用に変換できませんでした。");
    if(blob.size > 1024*1024) throw new Error("画像を1MB未満に圧縮できませんでした。別の画像を選択してください。");
    const baseName=String(file.name||"image").replace(/\.[^.]+$/,"");
    return new File([blob],`${baseName}.jpg`,{type:"image/jpeg",lastModified:Date.now()});
  }

  const esc=s=>String(s??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  function toast(msg,error=false){
    const el=$("toast"); if(!el) return;
    el.textContent=msg; el.classList.toggle("error",error); el.classList.remove("dc-hidden");
    clearTimeout(toast.t); toast.t=setTimeout(()=>el.classList.add("dc-hidden"),3200);
  }
  function apiBase(){return String(window.DPRO_CONTACT_CONFIG?.apiBaseUrl||"").replace(/\/$/,"");}
  async function token(){return String(await window.DPRO_CONTACT_AUTH?.getAccessToken?.()||"");}
  function currentThread(){return window.DPRO_CONTACT_UI?.getSelectedThreadId?.()||"";}

  function preserveBuildLinks(){
    if(new URLSearchParams(location.search).get("dpro_build")!=="1") return;
    ["brandLink","homeLink","disabledReturn","errorReturn","loginReturn"].forEach(id=>{
      const a=$(id); if(!a) return;
      const u=new URL(a.getAttribute("href")||"owner.html",location.href);
      u.searchParams.set("dpro_build","1");
      a.href=u.href;
    });
  }
  function autoGrow(){
    const ta=$("replyText"); if(!ta) return;
    ta.style.height="auto";
    ta.style.height=Math.min(320,Math.max(104,ta.scrollHeight))+"px";
    const c=$("dcR3Count"); if(c)c.textContent=`${ta.value.length.toLocaleString()} / 5,000文字`;
  }
  function renderFiles(){
    const box=$("dcR3Attachments"); if(!box)return;
    box.innerHTML="";
    files.forEach((file,index)=>{
      const row=document.createElement("div"); row.className="dc-r3-attachment";
      let visual=`<span class="dc-r3-thumb">${file.type.startsWith("image/")?"画像":"資料"}</span>`;
      if(file.type.startsWith("image/")){
        const url=URL.createObjectURL(file);
        visual=`<img class="dc-r3-thumb" src="${url}" alt="">`;
        row.addEventListener("DOMNodeRemoved",()=>URL.revokeObjectURL(url),{once:true});
      }
      row.innerHTML=`${visual}<div><strong>${esc(file.name)}</strong><small>${esc(file.type||"file")}・${humanSize(file.size)}</small></div><button class="dc-r3-remove" type="button">削除</button>`;
      row.querySelector(".dc-r3-remove").addEventListener("click",()=>{files.splice(index,1);renderFiles();});
      box.appendChild(row);
    });
  }
  async function addFiles(list){
    for(const original of [...list]){
      if(files.length>=MAX_FILES){toast("添付は4件までです。",true);break;}
      if(original.size<=0 || original.size>MAX_BYTES){toast(`${original.name} は10MB以内にしてください。`,true);continue;}
      if(!ALLOWED.has(original.type)){toast(`${original.name} は対応していない形式です。`,true);continue;}
      try{
        const file = original.type.startsWith("image/") ? await normalizeLineImage(original) : original;
        files.push(file);
      }catch(e){
        toast(`${original.name}: ${e.message}`,true);
      }
    }
    renderFiles();
  }
  async function uploadOne(threadId,file,accessToken){
    const fd=new FormData(); fd.append("file",file,file.name);
    const res=await fetch(`${apiBase()}/api/contact/threads/${encodeURIComponent(threadId)}/attachments`,{
      method:"POST",headers:{Authorization:`Bearer ${accessToken}`},body:fd,cache:"no-store"
    });
    const data=await res.json().catch(()=>({}));
    if(!res.ok) throw new Error(data.message||`添付アップロード HTTP ${res.status}`);
    return data.attachment;
  }
  async function submitWithFiles(event){
    if(files.length===0) return;
    event.preventDefault(); event.stopImmediatePropagation();
    const threadId=currentThread(), ta=$("replyText"), send=$("sendButton");
    if(!threadId){toast("会話を選択してください。",true);return;}
    const body=String(ta?.value||"").trim();
    if(!body && files.length===0)return;
    if(!confirm(`本文${body?"あり":"なし"}・添付${files.length}件をLINEへ送信します。よろしいですか？`)) return;
    const original=send?.textContent||"LINEへ返信";
    if(send){send.disabled=true;send.textContent="添付を送信中…";}
    try{
      const accessToken=await token(); if(!accessToken)throw new Error("ログイン状態を確認してください。");
      const attachments=[];
      for(const file of files) attachments.push(await uploadOne(threadId,file,accessToken));
      const res=await fetch(`${apiBase()}/api/contact/threads/${encodeURIComponent(threadId)}/reply`,{
        method:"POST",
        headers:{"Content-Type":"application/json",Authorization:`Bearer ${accessToken}`},
        body:JSON.stringify({text:body,attachments}),cache:"no-store"
      });
      const data=await res.json().catch(()=>({}));
      if(!res.ok)throw new Error(data.message||`LINE送信 HTTP ${res.status}`);
      files=[];renderFiles();if(ta){ta.value="";autoGrow();}
      toast("本文・添付をLINEへ送信しました。");
      await window.DPRO_CONTACT_UI?.refresh?.();
      setTimeout(decorateHistory,150);
    }catch(e){toast(`送信できませんでした：${e.message}`,true);}
    finally{if(send){send.disabled=false;send.textContent=original;}}
  }
  async function decorateHistory(){
    if(decorating)return; decorating=true;
    try{
      const id=currentThread(), list=$("messageList"); if(!id||!list)return;
      const accessToken=await token(); if(!accessToken)return;
      const res=await fetch(`${apiBase()}/api/contact/threads/${encodeURIComponent(id)}/messages`,{
        headers:{Authorization:`Bearer ${accessToken}`},cache:"no-store"
      });
      if(!res.ok)return;
      const data=await res.json(), bubbles=[...list.querySelectorAll(".dc-message")];
      (data.messages||[]).forEach((msg,i)=>{
        const a=msg.attachment,b=bubbles[i]; if(!a||!b||b.querySelector(".dc-r3-history-attachment"))return;
        const wrap=document.createElement("div");wrap.className="dc-r3-history-attachment";
        if(a.kind==="image"&&a.url)wrap.innerHTML=`<a href="${esc(a.url)}" target="_blank" rel="noopener"><img src="${esc(a.url)}" alt="${esc(a.name||"送信画像")}"></a>`;
        else if(a.url)wrap.innerHTML=`<a href="${esc(a.url)}" target="_blank" rel="noopener">📎 ${esc(a.name||"添付資料")}を開く</a>`;
        else wrap.textContent=`📎 ${a.name||"添付資料"}`;
        b.appendChild(wrap);
      });
    }catch{}finally{decorating=false;}
  }
  function install(){
    const form=$("replyForm"),ta=$("replyText"); if(!form||!ta||$("dcR3Toolbar"))return false;
    const toolbar=document.createElement("div");toolbar.id="dcR3Toolbar";toolbar.className="dc-composer-r3-toolbar";
    toolbar.innerHTML=`
      <label class="dc-r3-tool">＋ 添付<input id="dcR3File" type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf,.docx,.xlsx,.pptx,.txt,.csv"></label>
      <button id="dcR3Expand" class="dc-r3-tool" type="button">↗ 返信欄を拡大</button>
      <span id="dcR3Count" class="dc-r3-count">0 / 5,000文字</span>`;
    const attachments=document.createElement("div");attachments.id="dcR3Attachments";attachments.className="dc-r3-attachments";
    form.insertBefore(toolbar,ta);ta.insertAdjacentElement("afterend",attachments);
    const hint=$("composerHint"); if(hint)hint.textContent="画像はLINE表示用に自動圧縮します。PDF・Office資料を含め最大4件／各10MBまで添付できます。";
    $("dcR3File").addEventListener("change",async e=>{const picked=[...e.target.files];e.target.value="";await addFiles(picked);});
    $("dcR3Expand").addEventListener("click",()=>{
      form.classList.toggle("dc-composer-expanded");
      $("dcR3Expand").textContent=form.classList.contains("dc-composer-expanded")?"↙ 元の大きさ":"↗ 返信欄を拡大";
      autoGrow();
    });
    ta.addEventListener("input",autoGrow);autoGrow();
    form.addEventListener("submit",submitWithFiles,true);
    const observer=new MutationObserver(()=>{clearTimeout(observer.t);observer.t=setTimeout(decorateHistory,80);});
    observer.observe($("messageList"),{childList:true,subtree:true});
    preserveBuildLinks();
    document.documentElement.dataset.dproContactStandardR3=VERSION;
    return true;
  }
  function boot(){
    if(!install()){
      const o=new MutationObserver(()=>{if(install())o.disconnect();});
      o.observe(document.body,{childList:true,subtree:true});
    }
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();
