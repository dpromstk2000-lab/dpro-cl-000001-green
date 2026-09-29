(() => {
  "use strict";

  const VERSION = "GREEN-SITE-CHECK-NATIVE-TABS-R3.0-20260929";
  if (window.__DPRO_GREEN_SITE_CHECK_NATIVE_TABS_R3__) return;
  window.__DPRO_GREEN_SITE_CHECK_NATIVE_TABS_R3__ = VERSION;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (v) => String(v ?? "").replace(/[&<>'"]/g, (c) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"
  }[c]));

  const STATUS = {
    scheduling:"日程調整中", scheduled:"予定確定", in_progress:"確認中",
    completed:"完了", postponed:"延期", cancelled:"取消"
  };
  const PHOTO_TYPES = {
    site:"現場全体", placement:"設置候補", access:"搬入経路",
    issue:"注意箇所", other:"その他"
  };

  const dialog = document.getElementById("owner-dialog");
  if (!dialog) return;

  const pad = (n) => String(n).padStart(2,"0");
  const toLocal = (value) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const toIso = (value) => {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  };
  const lines = (value) => Array.isArray(value)
    ? value.map((x) => typeof x === "string" ? x : (x?.label || x?.name || x?.note || "")).filter(Boolean).join("\n")
    : "";
  const linesArray = (value) => String(value || "").split(/\r?\n/).map((x)=>x.trim()).filter(Boolean).slice(0,100);

  function installStyle() {
    if ($("#green-site-native-r3-style")) return;
    const style = document.createElement("style");
    style.id = "green-site-native-r3-style";
    style.textContent = `
      #green-site-native-r3-form{display:block!important}
      .green-site-r3-tabs{display:flex;gap:8px;overflow-x:auto;padding:2px 0 11px;margin:0 0 14px;border-bottom:1px solid #dbe6df}
      .green-site-r3-tab{min-height:42px;padding:0 14px;border:1px solid #cbd9d1;border-radius:11px;background:#fff;color:#335447;font:inherit;font-weight:900;cursor:pointer;white-space:nowrap}
      .green-site-r3-tab.is-active{background:#174c35;border-color:#174c35;color:#fff}
      .green-site-r3-panel{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px 16px;align-items:start}
      .green-site-r3-panel[hidden]{display:none!important}
      .green-site-r3-panel>.full,.green-site-r3-panel>.green-site-r3-section,.green-site-r3-panel>.green-site-r3-next{grid-column:1/-1}
      .green-site-r3-section{grid-column:1/-1;margin:4px 0 2px;padding:14px;border:1px solid #dbe7df;border-radius:14px;background:#fbfdfb}
      .green-site-r3-section h3{margin:0 0 6px;font-size:17px}.green-site-r3-section p{margin:0;color:#64756e;font-size:13px}
      .green-site-r3-next{padding:14px 15px;border:1px solid #cfe2d4;border-radius:12px;background:#f2faf4;color:#174b35}
      .green-site-r3-photo-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-top:10px}
      .green-site-r3-photo{border:1px solid #dbe3de;border-radius:12px;overflow:hidden;background:#fff}
      .green-site-r3-photo img{display:block;width:100%;height:130px;object-fit:cover;background:#eef3ef}
      .green-site-r3-photo-body{display:grid;gap:4px;padding:9px}.green-site-r3-photo-body small{color:#64756e}
      .green-site-r3-delete{justify-self:start;border:0;background:none;color:#9b3030;text-decoration:underline;cursor:pointer;padding:2px 0}
      .green-site-r3-upload{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}.green-site-r3-upload .full{grid-column:1/-1}
      .green-site-r3-note{display:block;margin-top:4px;color:#64756e;font-size:12px}
      @media(max-width:760px){
        .green-site-r3-panel,.green-site-r3-upload{grid-template-columns:1fr}
        .green-site-r3-panel>.full,.green-site-r3-panel>.green-site-r3-section,.green-site-r3-panel>.green-site-r3-next,.green-site-r3-upload .full{grid-column:auto}
        .green-site-r3-tab{min-height:40px;padding:0 11px;font-size:12px}
      }
    `;
    document.head.append(style);
  }

  function setDialog(title, kicker, html, footer) {
    $("#dialog-title").textContent = title;
    $("#dialog-kicker").textContent = kicker;
    $("#dialog-body").innerHTML = html;
    $("#dialog-footer").innerHTML = footer;
    $$("[data-r3-close]", dialog).forEach((b)=>b.addEventListener("click", closeDialog));
    if (!dialog.open) {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open","");
    }
  }

  function closeDialog() {
    if (typeof dialog.close === "function" && dialog.open) dialog.close();
    else dialog.removeAttribute("open");
  }

  async function api(path, options, timeout=10000) {
    if (!window.Green?.api) throw new Error("管理APIの準備ができていません。");
    let timer;
    try {
      return await Promise.race([
        window.Green.api(path, options),
        new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error("通信が時間内に完了しませんでした。")),timeout);})
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  function statusOptions(selected) {
    return Object.entries(STATUS).map(([v,l])=>`<option value="${v}"${v===selected?" selected":""}>${l}</option>`).join("");
  }
  function staffOptions(staff, selected) {
    return `<option value="">担当未設定</option>${(staff||[]).filter((x)=>x.status!=="inactive").map((x)=>`<option value="${esc(x.id)}"${x.id===selected?" selected":""}>${esc(x.display_name || x.staff_code || "スタッフ")}</option>`).join("")}`;
  }
  function photoTypeOptions(selected="site") {
    return Object.entries(PHOTO_TYPES).map(([v,l])=>`<option value="${v}"${v===selected?" selected":""}>${l}</option>`).join("");
  }
  function photoHtml(photos) {
    if (!photos?.length) return '<div class="owner-empty">現地写真はまだありません。</div>';
    return `<div class="green-site-r3-photo-grid">${photos.map((p)=>`
      <article class="green-site-r3-photo">
        ${p.signed_url?`<img src="${esc(p.signed_url)}" alt="${esc(PHOTO_TYPES[p.photo_type] || "現地写真")}">`:'<div class="owner-empty">画像URLを取得できません</div>'}
        <div class="green-site-r3-photo-body">
          <strong>${esc(PHOTO_TYPES[p.photo_type] || p.photo_type || "写真")}</strong>
          ${p.caption?`<small>${esc(p.caption)}</small>`:""}
          <button type="button" class="green-site-r3-delete" data-r3-photo-delete="${esc(p.id)}">削除</button>
        </div>
      </article>`).join("")}</div>`;
  }

  function showError(message) {
    const form = $("#green-site-native-r3-form", dialog);
    form?.querySelector(".green-owner-save-error")?.remove();
    const box = document.createElement("div");
    box.className = "green-owner-inline-error green-owner-save-error";
    box.innerHTML = `<strong>処理できませんでした</strong><span>${esc(message)}</span>`;
    form?.prepend(box);
    box.scrollIntoView({block:"nearest",behavior:"smooth"});
  }

  function activate(key) {
    const form = $("#green-site-native-r3-form", dialog);
    if (!form) return;
    $$(".green-site-r3-tab", form).forEach((b)=>{
      const active = b.dataset.r3Tab === key;
      b.classList.toggle("is-active",active);
      b.setAttribute("aria-selected",active?"true":"false");
    });
    $$(".green-site-r3-panel", form).forEach((p)=>{p.hidden=p.dataset.r3Panel!==key;});
    const body=$("#dialog-body"); if(body) body.scrollTop=0;
  }

  function render(id, item, photos, staff) {
    const completed = item.status === "completed";
    setDialog(
      `現地確認 ${esc(item.check_number || "")}`,
      "SITE CHECK DETAIL",
      `<form id="green-site-native-r3-form" class="owner-form-grid">
        <nav class="green-site-r3-tabs" role="tablist">
          <button type="button" class="green-site-r3-tab is-active" data-r3-tab="visit" role="tab">① 訪問予定</button>
          <button type="button" class="green-site-r3-tab" data-r3-tab="result" role="tab">② 現地確認結果</button>
          <button type="button" class="green-site-r3-tab" data-r3-tab="photo" role="tab">③ 写真・引き継ぎ</button>
        </nav>

        <section class="green-site-r3-panel" data-r3-panel="visit">
          <section class="green-site-r3-section"><h3>訪問予定</h3><p>訪問日時・進行状態・担当を管理します。</p></section>
          <label>状態<select name="status">${statusOptions(item.status || "scheduled")}</select></label>
          <label>担当スタッフ<select name="assignedStaffId">${staffOptions(staff,item.assigned_staff_id || "")}</select></label>
          <label>開始日時<input name="scheduledStart" type="datetime-local" step="900" value="${esc(toLocal(item.scheduled_start))}"><span class="green-site-r3-note">履歴編集可・15分刻み</span></label>
          <label>終了日時<input name="scheduledEnd" type="datetime-local" step="900" value="${esc(toLocal(item.scheduled_end))}"><span class="green-site-r3-note">開始より後・15分刻み</span></label>
          <label class="full">お客様の要望<textarea name="customerRequest">${esc(item.customer_request || "")}</textarea></label>
          <label class="full">社内メモ<textarea name="internalNote">${esc(item.internal_note || "")}</textarea></label>
        </section>

        <section class="green-site-r3-panel" data-r3-panel="result" hidden>
          <section class="green-site-r3-section"><h3>現地確認結果</h3><p>植物選定と設置準備へ引き継ぐための条件を残します。</p></section>
          <label class="full">現場環境<textarea name="siteEnvironment" placeholder="例：受付・応接・執務室、空調あり、人通り多め">${esc(item.site_environment || "")}</textarea></label>
          <label>採光・日当たり<input name="lightCondition" value="${esc(item.light_condition || "")}" placeholder="例：午前は明るい／直射日光なし"></label>
          <label>温度・空調<input name="temperatureNote" value="${esc(item.temperature_note || "")}" placeholder="例：終日空調、冬季18℃前後"></label>
          <label class="full">給水・管理条件<textarea name="wateringNote" placeholder="例：給水場所、床養生、営業時間中の作業可否">${esc(item.watering_note || "")}</textarea></label>
          <label class="full">搬入経路・駐車・注意事項<textarea name="accessNote" placeholder="例：正面搬入可、エレベーター有、裏手に駐車1台可">${esc(item.access_note || "")}</textarea></label>
          <section class="green-site-r3-section"><h3>設置・植物候補</h3><p>1行に1候補で入力します。</p></section>
          <label class="full">設置候補場所<textarea name="proposedAreas" placeholder="受付カウンター横&#10;応接室入口&#10;執務室窓側">${esc(lines(item.proposed_areas))}</textarea><span class="green-site-r3-note">1行 = 1設置候補</span></label>
          <label class="full">植物・鉢候補<textarea name="proposedPlants" placeholder="ドラセナ Mサイズ + 白鉢カバー&#10;ポトス Sサイズ + 卓上鉢">${esc(lines(item.proposed_plants))}</textarea><span class="green-site-r3-note">1行 = 1植物・鉢候補</span></label>
        </section>

        <section class="green-site-r3-panel" data-r3-panel="photo" hidden>
          <section class="green-site-r3-section"><h3>現地写真</h3><p>現場全体・設置候補・搬入経路・注意箇所を写真で残します。</p>
            <div id="green-site-r3-photo-list">${photoHtml(photos)}</div>
            <div class="green-site-r3-upload">
              <label>写真区分<select id="green-site-r3-photo-type">${photoTypeOptions()}</select></label>
              <label>写真<input id="green-site-r3-photo-file" type="file" accept="image/jpeg,image/png,image/webp"></label>
              <label class="full">写真メモ<input id="green-site-r3-photo-caption" maxlength="500" placeholder="例：受付入口から見た設置候補位置"></label>
              <div class="full"><button type="button" class="btn btn--secondary" id="green-site-r3-photo-upload">写真を追加</button></div>
            </div>
          </section>
          ${completed
            ? '<div class="green-site-r3-next"><strong>現地確認は完了済みです</strong><div>営業案件は「現地確認済み」へ連動します。</div></div>'
            : '<div class="green-site-r3-next"><strong>訪問後の操作</strong><div>確認結果を入力し、状態を「完了」にして保存すると、営業案件が自動で「現地確認済み」へ進みます。</div></div>'}
        </section>
      </form>`,
      '<button type="button" class="btn btn--secondary" data-r3-close>閉じる</button><button type="button" class="btn btn--primary" id="green-site-r3-save">現地確認を保存</button>'
    );

    $$(".green-site-r3-tab", dialog).forEach((b)=>b.addEventListener("click",()=>activate(b.dataset.r3Tab)));
    activate("visit");

    $("#green-site-r3-save", dialog)?.addEventListener("click", async (e)=>{
      const form=$("#green-site-native-r3-form",dialog);
      const value=(name)=>$(`[name="${name}"]`,form)?.value?.trim()||"";
      const start=value("scheduledStart"), end=value("scheduledEnd");
      if ((start&&!end)||(!start&&end)) return showError("開始日時と終了日時は両方入力してください。");
      if (start && !/:(00|15|30|45)$/.test(start)) return showError("開始日時は15分刻みで入力してください。");
      if (end && !/:(00|15|30|45)$/.test(end)) return showError("終了日時は15分刻みで入力してください。");
      if (start && end && new Date(end)<=new Date(start)) return showError("終了日時は開始日時より後にしてください。");

      const payload={
        status:value("status"),
        assignedStaffId:value("assignedStaffId")||null,
        scheduledStart:toIso(start),
        scheduledEnd:toIso(end),
        customerRequest:value("customerRequest"),
        internalNote:value("internalNote"),
        siteEnvironment:value("siteEnvironment"),
        lightCondition:value("lightCondition"),
        temperatureNote:value("temperatureNote"),
        wateringNote:value("wateringNote"),
        accessNote:value("accessNote"),
        proposedAreas:linesArray(value("proposedAreas")),
        proposedPlants:linesArray(value("proposedPlants")),
      };

      const button=e.currentTarget;
      window.Green?.setBusy?.(button,true,"保存中…");
      try{
        const result=await api(`/api/admin/site-checks/${encodeURIComponent(id)}`,{method:"PATCH",json:payload},10000);
        const updated=result?.data?.siteCheck||{...item,...payload};
        const done=updated.status==="completed";
        setDialog(done?"現地確認を完了しました":"現地確認を保存しました","SAVED",
          `<section class="green-owner-success" role="status"><div class="green-owner-success__icon">✓</div><div><strong>保存できました</strong><p>確認番号 <b>${esc(updated.check_number||item.check_number||"")}</b></p></div></section>
           <section class="green-owner-next-action"><strong>次にどうしますか？</strong><p>${done?'営業案件は「現地確認済み」へ連動更新されます。':'現地確認一覧へ戻るか、営業案件を確認できます。'}</p></section>`,
          '<button type="button" class="btn btn--secondary" id="green-site-r3-list">現地確認一覧へ戻る</button>');
        $("#green-site-r3-list",dialog)?.addEventListener("click",()=>{closeDialog();document.querySelector('.owner-nav [data-view="site-checks"]')?.click();});
      }catch(err){showError(err?.message||"保存できませんでした。");}
      finally{if(button?.isConnected) window.Green?.setBusy?.(button,false);}
    });

    $("#green-site-r3-photo-upload", dialog)?.addEventListener("click", async (e)=>{
      const file=$("#green-site-r3-photo-file",dialog)?.files?.[0];
      if(!file){window.Green?.toast?.("写真を選択してください。","error");return;}
      const button=e.currentTarget; window.Green?.setBusy?.(button,true,"追加中…");
      try{
        const compressed=await window.Green.compressImage(file);
        const form=new FormData();
        form.append("file",compressed,compressed.name||"site-check.jpg");
        form.append("photoType",$("#green-site-r3-photo-type",dialog)?.value||"site");
        form.append("caption",$("#green-site-r3-photo-caption",dialog)?.value?.trim()||"");
        await api(`/api/admin/site-checks/${encodeURIComponent(id)}/photos`,{method:"POST",body:form},15000);
        window.Green.toast("現地写真を追加しました。","success");
        await openDetail(id);
      }catch(err){window.Green?.toast?.(err?.message||"写真を追加できませんでした。","error");}
      finally{if(button?.isConnected) window.Green?.setBusy?.(button,false);}
    });

    $$("[data-r3-photo-delete]",dialog).forEach((b)=>b.addEventListener("click",async()=>{
      if(!confirm("この現地写真を削除しますか？"))return;
      try{
        await api(`/api/admin/site-check-photos/${encodeURIComponent(b.dataset.r3PhotoDelete)}`,{method:"DELETE"},10000);
        window.Green.toast("現地写真を削除しました。","success");
        await openDetail(id);
      }catch(err){window.Green?.toast?.(err?.message||"写真を削除できませんでした。","error");}
    }));
  }

  async function openDetail(id) {
    installStyle();
    setDialog("現地確認詳細","LOADING",
      '<div class="owner-loading">現地確認の予定と結果を読み込んでいます…</div>',
      '<button type="button" class="btn btn--secondary" data-r3-close>閉じる</button>');
    try{
      const [detail,staff]=await Promise.all([
        api(`/api/admin/site-checks/${encodeURIComponent(id)}`,undefined,9000),
        api("/api/admin/staff",undefined,9000).catch(()=>({data:{items:[]}}))
      ]);
      render(id,detail?.data?.siteCheck||{},detail?.data?.photos||[],staff?.data?.items||[]);
    }catch(err){
      setDialog("現地確認を開けませんでした","ERROR",
        `<div class="green-owner-inline-error"><strong>読み込みに失敗しました</strong><span>${esc(err?.message||"現地確認を読み込めませんでした。")}</span></div>`,
        '<button type="button" class="btn btn--secondary" data-r3-close>閉じる</button>');
    }
  }

  function installEarlyCapture() {
    // Loaded before config.js, so this handler is registered before the legacy
    // green-owner-ux-fix capture handler and becomes the canonical detail opener.
    window.addEventListener("click",(event)=>{
      const button=event.target?.closest?.('[data-view-panel="site-checks"] [data-site-check]');
      if(!button?.dataset?.siteCheck) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      openDetail(button.dataset.siteCheck);
    },true);
  }

  installStyle();
  installEarlyCapture();
})();