(() => {
  "use strict";
  const Green=window.Green, $=s=>document.querySelector(s);
  const state={data:null,original:{},selectedGroup:"",saveStatus:"saved"};
  const labels={
    use_multi_site:"複数拠点",use_site_areas:"拠点内設置場所",use_customer_portal:"お客様マイページ",use_customer_line_link:"LINE顧客連携",use_customer_contract_view:"利用内容表示",
    plant_management_mode:"植物管理方式",use_plant_qr:"植物QR",use_headquarters_asset_code:"本部管理番号",container_management_mode:"鉢管理方式",use_simple_inventory:"簡易在庫",use_asset_movement_history:"資産移動履歴",use_plant_photo_history:"植物写真履歴",
    use_fixed_visit_rules:"定期訪問ルール",use_route_order:"訪問順",use_map_button:"地図ボタン",use_vehicle_assignment:"車両割当",use_arrival_status:"到着状態",use_work_start_status:"作業開始状態",use_bulk_maintenance_check:"一括作業チェック",use_per_plant_condition:"一鉢別状態",before_photo_mode:"作業前写真",after_photo_mode:"作業後写真",issue_photo_mode:"異常写真",use_offline_draft:"オフライン下書き",
    use_replacement_management:"交換管理",replacement_approval_mode:"交換承認方式",use_replacement_asset_allocation:"代替植物割当",use_recovery_management:"回収管理",use_care_management:"養生管理",use_reuse_decision:"再利用判定",use_disposal_record:"廃棄記録",
    use_public_inquiry:"公開問い合わせ",use_line_photo_inquiry:"LINE写真相談",line_visit_notice_mode:"訪問予定通知",line_completion_notice_mode:"作業完了通知",use_customer_report_page:"お客様作業報告",use_visit_change_request:"訪問変更相談",use_additional_service_request:"追加サービス相談",
    staff_customer_scope:"スタッフ顧客範囲",staff_can_view_phone:"電話番号表示",staff_can_view_address:"住所表示",staff_can_view_entry_info:"入館情報表示",staff_can_view_internal_notes:"社内メモ表示",staff_can_view_past_reports:"過去報告表示",staff_can_propose_replacement:"交換提案",staff_can_approve_replacement:"交換承認"
  };
  const optionLabels={asset:"一鉢管理",count:"本数管理",hybrid:"併用管理",none:"使用しない",with_plant:"植物と一体",separate_asset:"別資産",off:"OFF",optional:"任意",required:"必須",manager:"管理者",owner:"オーナー",copy:"文面コピー",automatic:"自動送信",assigned_only:"担当分のみ",today_route:"本日のルート",all_active:"利用中顧客すべて"};
  const esc=v=>String(v??"").replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  function currentChanges(){
    const changes={};
    document.querySelectorAll("[data-feature-input]").forEach(el=>{
      const k=el.dataset.featureInput;
      const v=el.type==="checkbox"?el.checked:el.value;
      if(String(v)!==String(state.original[k]))changes[k]=v;
    });
    return changes;
  }

  function ensureFeatureSaveState(){
    const button=$("#feature-save-all");
    if(!button)return null;
    let node=$("#feature-save-state");
    if(!node){
      node=document.createElement("span");
      node.id="feature-save-state";
      node.className="feature-save-state";
      node.setAttribute("aria-live","polite");
      button.before(node);
    }
    return node;
  }

  function setFeatureSaveState(status,message){
    state.saveStatus=status;
    const node=ensureFeatureSaveState();
    const button=$("#feature-save-all");
    if(node){
      node.dataset.status=status;
      node.textContent=message;
    }
    if(button){
      button.disabled=status==="saving"||status==="saved";
      button.textContent=status==="saving"?"保存中…":"変更を保存";
    }
  }

  function syncFeatureDirtyState(){
    if(state.saveStatus==="saving")return;
    const count=Object.keys(currentChanges()).length;
    setFeatureSaveState(
      count?"dirty":"saved",
      count?`未保存の変更があります（${count}件）。`:"✓ 現在の設定は保存済みです。"
    );
  }

  function selectFeatureGroup(group){
    state.selectedGroup=group;
    document.querySelectorAll("[data-feature-group]").forEach(panel=>{
      panel.hidden=panel.dataset.featureGroup!==group;
    });
    document.querySelectorAll("[data-feature-category]").forEach(button=>{
      const active=button.dataset.featureCategory===group;
      button.classList.toggle("is-active",active);
      button.setAttribute("aria-current",active?"true":"false");
    });
    const select=$("#feature-category-select");
    if(select&&select.value!==group)select.value=group;
  }

  function ensureFeatureGroupIndex(groupNames){
    const host=$("#feature-groups");
    if(!host)return;

    let shell=document.querySelector(".feature-settings-shell");
    if(!shell){
      shell=document.createElement("div");
      shell.className="feature-settings-shell";
      host.parentNode.insertBefore(shell,host);

      const aside=document.createElement("aside");
      aside.className="feature-settings-index";
      aside.innerHTML=`
        <div class="feature-settings-index-title">設定カテゴリ</div>
        <label class="feature-category-mobile">カテゴリを選択
          <select id="feature-category-select"></select>
        </label>
        <nav id="feature-category-nav" aria-label="機能設定カテゴリ"></nav>
      `;
      shell.append(aside,host);
    }

    const nav=$("#feature-category-nav");
    const select=$("#feature-category-select");
    if(nav){
      nav.innerHTML=groupNames.map(group=>`<button type="button" data-feature-category="${esc(group)}">${esc(group)}</button>`).join("");
      nav.querySelectorAll("[data-feature-category]").forEach(button=>{
        button.addEventListener("click",()=>selectFeatureGroup(button.dataset.featureCategory));
      });
    }
    if(select){
      select.innerHTML=groupNames.map(group=>`<option value="${esc(group)}">${esc(group)}</option>`).join("");
      select.onchange=()=>selectFeatureGroup(select.value);
    }
  }

  async function load(){
    const result=await Green.api("/api/admin/features");
    state.data=result.data;
    state.original={};
    Object.entries(result.data.features||{}).forEach(([k,v])=>state.original[k]=v.value);
    render();
    setFeatureSaveState("saved","✓ 現在の設定は保存済みです。");
    await loadHistory();
  }
  function render(){
    const groups={};
    for(const [key,def] of Object.entries(state.data.definitions||{})){
      (groups[def.group]??=[]).push([key,def]);
    }
    const entries=Object.entries(groups);
    const names=entries.map(([group])=>group);
    if(!names.includes(state.selectedGroup))state.selectedGroup=names[0]||"";

    $("#feature-groups").innerHTML=entries.map(([group,items])=>`<article class="owner-panel feature-group" data-feature-group="${esc(group)}"${group===state.selectedGroup?"":" hidden"}><div class="owner-panel-head"><h3>${esc(group)}</h3></div><div class="feature-grid">${items.map(([key,def])=>control(key,def)).join("")}</div></article>`).join("");

    ensureFeatureGroupIndex(names);
    if(state.selectedGroup)selectFeatureGroup(state.selectedGroup);

    const dep=state.data.dependencyValidation;
    const box=$("#feature-dependency-box");
    box.textContent=dep.ok?"機能の依存関係は正常です。":"依存関係エラー："+dep.errors.join(" / ");
    box.classList.toggle("is-error",!dep.ok);
  }
  function control(key,def){ const entry=state.data.features[key]||{}; const value=entry.value??def.recommended; const locked=entry.isLocked===true;
    let input; if(def.type==="boolean") input=`<label class="feature-switch"><input type="checkbox" data-feature-input="${key}" ${value===true?"checked":""} ${locked?"disabled":""}><span>${value===true?"ON":"OFF"}</span></label>`;
    else input=`<select data-feature-input="${key}" ${locked?"disabled":""}>${(def.allowed||[]).map(v=>`<option value="${esc(v)}" ${String(v)===String(value)?"selected":""}>${esc(optionLabels[v]||v)}</option>`).join("")}</select>`;
    return `<div class="feature-card"><div><strong>${esc(labels[key]||key)}</strong><code>${esc(key)}</code></div>${input}<small>推奨：${esc(optionLabels[def.recommended]??String(def.recommended))}${locked?"／ロック済み":""}</small></div>`; }
  async function save(){
    const changes=currentChanges();
    const count=Object.keys(changes).length;
    if(!count){
      Green.toast("変更はありません。");
      setFeatureSaveState("saved","✓ 現在の設定は保存済みです。");
      return;
    }
    if(!confirm(`${count}件の設定を変更します。よろしいですか？`))return;

    setFeatureSaveState("saving","保存中です…");
    try{
      const result=await Green.api("/api/admin/features",{method:"PATCH",json:{changes,reason:"機能設定画面から変更"}});
      state.data=result.data;
      state.original={};
      Object.entries(result.data.features||{}).forEach(([k,v])=>state.original[k]=v.value);
      render();
      await loadHistory();
      setFeatureSaveState("saved","✓ 設定を保存しました。");
      Green.toast("機能設定を保存しました。","success");
    }catch(error){
      setFeatureSaveState("error","保存に失敗しました。内容を確認して再試行してください。");
      Green.toast(`${error.message}${error.requestId?`（確認番号：${error.requestId}）`:""}`,"error");
    }
  }
  async function loadHistory(){const result=await Green.api("/api/admin/features/history"); const items=result.data.items||[]; $("#feature-history").innerHTML=items.length?items.map(x=>`<div class="feature-history-item"><strong>${esc(labels[x.feature_key]||x.feature_key)}</strong><span>${esc(x.old_value??"—")} → ${esc(x.new_value??"—")}</span><small>${esc(new Date(x.created_at).toLocaleString("ja-JP"))}${x.change_reason?"／"+esc(x.change_reason):""}</small></div>`).join(""):'<div class="owner-empty">変更履歴はありません。</div>';}
  document.addEventListener("DOMContentLoaded",()=>{
    $("#feature-save-all")?.addEventListener("click",save);
    $("#feature-history-reload")?.addEventListener("click",loadHistory);
    document.addEventListener("change",event=>{
      const input=event.target.closest?.("[data-feature-input]");
      if(!input)return;
      if(input.type==="checkbox"){
        const text=input.closest(".feature-switch")?.querySelector("span");
        if(text)text.textContent=input.checked?"ON":"OFF";
      }
      syncFeatureDirtyState();
    });
  });
  window.GreenFeatureSettings={load};
})();


/* DPRO GREEN / PRODUCT EVERGREEN / OWNER COMMON BRUSHUP R2.0 / 2026-09-23 */
(() => {
  "use strict";

  const VERSION = "GREEN-EVERGREEN-OWNER-R2.0-20260923";
  if (!/\/owner\.html$/.test(location.pathname)) return;

  const dialog = document.querySelector("#owner-dialog");
  if (!dialog) return;

  document.documentElement.dataset.greenEvergreenOwner = VERSION;

  const state = {
    baselineAll: "",
    baselineMain: "",
    dirtyAny: false,
    dirtyMain: false,
    mainForm: null,
    trackedForms: [],
    enhancing: false,
    currentContractId: null,
    contractLoadToken: 0,
    currentSiteId: null,
    siteLoadToken: 0,
    siteAreaDetailToken: 0,
    currentSiteAreas: new Map(),
  };

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  function installStyles() {
    if (document.getElementById("green-evergreen-owner-r1-style")) return;
    const style = document.createElement("style");
    style.id = "green-evergreen-owner-r1-style";
    style.textContent = `
      #owner-dialog .green-evergreen-save-state{
        margin-right:auto;display:inline-flex;align-items:center;gap:7px;min-height:38px;
        padding:7px 11px;border-radius:10px;background:#edf6ef;color:#245a3d;
        font-size:12px;font-weight:800;line-height:1.35
      }
      #owner-dialog .green-evergreen-save-state.is-dirty{
        background:#fff4dd;color:#7a5410;border:1px solid #ead39b
      }
      #owner-dialog .green-evergreen-dependent[hidden]{display:none!important}
      #owner-dialog .green-evergreen-file-ui{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-top:6px}
      #owner-dialog .green-evergreen-file-button{
        appearance:none;border:1px solid #b9c9bf;border-radius:10px;background:#fff;color:#173d32;
        padding:9px 13px;font:inherit;font-weight:800;cursor:pointer
      }
      #owner-dialog .green-evergreen-file-button:hover{background:#f5faf6}
      #owner-dialog .green-evergreen-file-name{color:#586c62;font-size:12px;font-weight:700;word-break:break-all}
      #owner-dialog .green-evergreen-file-note{display:block;margin-top:5px;color:#65786e;font-size:11px;font-weight:600}
      #owner-dialog .green-evergreen-file-native{
        position:absolute!important;left:-10000px!important;width:1px!important;height:1px!important;
        opacity:0!important;pointer-events:none!important
      }
      #owner-dialog .green-evergreen-required-note{
        display:block;margin-top:4px;color:#61756b;font-size:11px;font-weight:700
      }
      #owner-dialog .green-evergreen-contract-note{
        grid-column:1 / -1;margin:0;padding:10px 12px;border-radius:10px;
        background:#edf6ef;color:#245a3d;font-size:12px;font-weight:700;line-height:1.55
      }
      #owner-dialog .green-evergreen-contract-note.is-alert{
        background:#fff4dd;color:#7a5410;border:1px solid #ead39b
      }
      #owner-dialog .green-evergreen-area-row{
        display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap
      }
      #owner-dialog .green-evergreen-area-main{
        min-width:0;flex:1;display:flex;align-items:center;gap:8px;flex-wrap:wrap
      }
      #owner-dialog .green-evergreen-area-status{
        display:inline-flex;align-items:center;min-height:24px;padding:3px 8px;border-radius:999px;
        background:#e7f4ea;color:#16613f;font-size:11px;font-weight:800;white-space:nowrap
      }
      #owner-dialog .green-evergreen-area-status.is-inactive{
        background:#f1f2f1;color:#657069
      }
      #owner-dialog .green-evergreen-area-note{
        grid-column:1 / -1;margin:0;padding:10px 12px;border-radius:10px;
        background:#edf6ef;color:#245a3d;font-size:12px;font-weight:700;line-height:1.55
      }
      #owner-dialog button:disabled{cursor:not-allowed;opacity:.48}
      @media(max-width:760px){
        #owner-dialog footer{flex-wrap:wrap}
        #owner-dialog .green-evergreen-save-state{width:100%;margin-right:0}
      }
    `;
    document.head.append(style);
  }

  function formSnapshot(form) {
    if (!form) return "";
    const entries = [];
    const controls = $$("input,select,textarea", form);
    for (const control of controls) {
      if (!control.name || control.disabled) continue;
      if (control.type === "file") {
        continue;
      } else if (control.type === "checkbox" || control.type === "radio") {
        entries.push([control.name, control.checked ? "1" : "0", control.value || ""]);
      } else {
        entries.push([control.name, control.value ?? ""]);
      }
    }
    return JSON.stringify(entries);
  }

  function formDefaultSnapshot(form) {
    if (!form) return "";
    const entries = [];
    const controls = $$("input,select,textarea", form);
    for (const control of controls) {
      if (!control.name || control.disabled) continue;
      if (control.type === "file") continue;

      if (control.tagName === "SELECT") {
        const defaults = Array.from(control.options)
          .filter((option) => option.defaultSelected)
          .map((option) => option.value);
        // Generated edit forms normally mark the current option as selected.
        // If none is explicitly marked, use the browser's initial selected index.
        if (!defaults.length && control.options.length) {
          const explicitIndex = Array.from(control.options).findIndex((option) => option.defaultSelected);
          const index = explicitIndex >= 0 ? explicitIndex : control.selectedIndex;
          entries.push([control.name, index >= 0 ? control.options[index].value : ""]);
        } else {
          entries.push([control.name, defaults.join("|")]);
        }
      } else if (control.type === "checkbox" || control.type === "radio") {
        entries.push([control.name, control.defaultChecked ? "1" : "0", control.value || ""]);
      } else if (control.tagName === "TEXTAREA") {
        entries.push([control.name, control.defaultValue ?? ""]);
      } else {
        entries.push([control.name, control.defaultValue ?? ""]);
      }
    }
    return JSON.stringify(entries);
  }

  function supportedForm(form) {
    if (!form) return false;
    return [
      "inquiry-update-form",
      "lead-update-form",
      "site-check-form",
      "green-site-detail-form",
      "customer-form",
      "contract-form",
      "site-form",
      "green-site-area-edit-form",
      "lead-activity-form",
    ].includes(form.id);
  }

  function currentTrackedForms() {
    return $$("form", dialog).filter(supportedForm);
  }

  function computeDirtyState() {
    const forms = currentTrackedForms();
    const main = mainFormForDialog();
    const dirtyAny = forms.some((form) => formSnapshot(form) !== formDefaultSnapshot(form));
    const dirtyMain = main
      ? formSnapshot(main) !== formDefaultSnapshot(main)
      : false;
    return { forms, main, dirtyAny, dirtyMain };
  }

  function allSnapshot() {
    return JSON.stringify(currentTrackedForms().map((form) => [form.id || "", formSnapshot(form)]));
  }

  function setDependent(control, visible) {
    if (!control) return;
    const label = control.closest("label") || control.parentElement;
    if (!label) return;
    label.classList.add("green-evergreen-dependent");
    label.hidden = !visible;
    control.disabled = !visible;
  }

  function syncSalesDependencies(form) {
    if (!form) return;
    const status = $('[name="status"]', form)?.value || "";
    const follow = $('[name="follow_up_on"],[name="followUpOn"]', form);
    const hold = $('[name="hold_reason"],[name="holdReason"]', form);
    const lost = $('[name="lost_reason"],[name="lostReason"]', form);

    setDependent(follow, status === "follow_up");
    setDependent(hold, status === "on_hold");
    setDependent(lost, status === "lost");

    if (follow) follow.min = new Intl.DateTimeFormat("en-CA", {
      timeZone:"Asia/Tokyo", year:"numeric", month:"2-digit", day:"2-digit"
    }).format(new Date());
  }

  function syncSiteCheckDependencies(form) {
    if (!form) return;
    const status = $('[name="status"]', form)?.value || "";
    const start = $('[name="scheduledStart"],[name="scheduled_start"]', form);
    const end = $('[name="scheduledEnd"],[name="scheduled_end"]', form);
    const required = ["scheduled", "in_progress", "completed"].includes(status);

    for (const input of [start, end]) {
      if (!input) continue;
      input.step = "900";
      input.required = required;
      const label = input.closest("label");
      if (label) {
        let note = $(".green-evergreen-required-note", label);
        if (!note) {
          note = document.createElement("span");
          note.className = "green-evergreen-required-note";
          label.append(note);
        }
        note.textContent = required ? "この状態では必須・15分刻み" : "15分刻み";
      }
    }
  }



  async function enhanceSiteMasterForm(form) {
    if (!form || form.dataset.greenEvergreenSite === VERSION) return;

    const editing = !!$('[name="customerId"][disabled]', form);
    if (!editing) {
      form.dataset.greenEvergreenSite = VERSION;
      return;
    }

    let isActive = true;
    const token = ++state.siteLoadToken;

    if (state.currentSiteId && window.Green?.api) {
      try {
        const result = await window.Green.api(`/api/admin/sites/${encodeURIComponent(state.currentSiteId)}`);
        if (token !== state.siteLoadToken || !form.isConnected) return;
        isActive = result?.data?.site?.is_active !== false;
      } catch {
        return;
      }
    } else {
      return;
    }

    if (!$('[name="isActive"]', form)) {
      const anchor = $('[name="siteName"]', form)?.closest("label");
      const label = document.createElement("label");
      label.className = "owner-check owner-settings-check";
      label.dataset.greenEvergreenSiteStatus = VERSION;

      const input = document.createElement("input");
      input.type = "checkbox";
      input.name = "isActive";
      input.checked = isActive;
      input.defaultChecked = isActive;

      const textNode = document.createTextNode("この拠点を利用中にする");
      label.append(input, textNode);

      const note = document.createElement("small");
      note.className = "green-evergreen-required-note";
      note.textContent = "OFFにしても拠点・設置履歴は削除されません。";

      const wrap = document.createElement("div");
      wrap.className = "full";
      wrap.dataset.greenEvergreenSiteStatusWrap = VERSION;
      wrap.append(label, note);

      if (anchor?.parentNode) anchor.parentNode.insertBefore(wrap, anchor.nextSibling);
      else form.prepend(wrap);
    }

    form.dataset.greenEvergreenSite = VERSION;
  }


  const htmlEscape = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[char]));

  function siteAreaSection() {
    return $$("section", dialog).find((section) => {
      const heading = $("h3", section);
      return heading?.textContent?.trim() === "設置場所";
    }) || null;
  }

  function reopenCurrentSiteDetail(siteId) {
    const rowButton = document.querySelector(`[data-site="${CSS.escape(siteId)}"]`);
    if (rowButton) {
      setTimeout(() => rowButton.click(), 50);
      return;
    }
    Green.toast("設置場所を更新しました。拠点一覧から詳細を開き直してください。", "success");
  }

  function renderSiteAreaSection(section, areas, siteId) {
    if (!section) return;
    const heading = $("h3", section);
    Array.from(section.children).forEach((child) => {
      if (child !== heading) child.remove();
    });

    if (!areas.length) {
      const empty = document.createElement("div");
      empty.className = "owner-empty";
      empty.textContent = "登録はありません。";
      section.append(empty);
      section.dataset.greenEvergreenSiteAreas = VERSION;
      return;
    }

    for (const area of areas) {
      state.currentSiteAreas.set(area.id, area);

      const row = document.createElement("div");
      row.className = "owner-mini-item green-evergreen-area-row";

      const main = document.createElement("div");
      main.className = "green-evergreen-area-main";

      const textNode = document.createElement("span");
      const name = area.area_name || "名称未設定";
      const floor = area.floor_name ? `（${area.floor_name}）` : "";
      const placement = area.placement_note || "メモなし";
      textNode.textContent = `${name}${floor}｜${placement}`;

      const status = document.createElement("span");
      const active = area.is_active !== false;
      status.className = `green-evergreen-area-status${active ? "" : " is-inactive"}`;
      status.textContent = active ? "利用中" : "停止";

      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "btn btn--secondary btn--small";
      edit.textContent = "編集";
      edit.dataset.greenSiteAreaEdit = area.id;
      edit.addEventListener("click", () => openSiteAreaEdit(siteId, area));

      main.append(textNode, status);
      row.append(main, edit);
      section.append(row);
    }

    const note = document.createElement("p");
    note.className = "green-evergreen-area-note";
    note.textContent = "停止しても設置履歴は削除されません。停止中の設置場所は新しい配置先には選択できません。";
    section.append(note);
    section.dataset.greenEvergreenSiteAreas = VERSION;
  }

  async function enhanceSiteAreaDetail() {
    const kicker = $("#dialog-kicker", dialog)?.textContent?.trim();
    if (kicker !== "SITE DETAIL" || !state.currentSiteId) return false;

    const section = siteAreaSection();
    if (!section) return false;
    if (section.dataset.greenEvergreenSiteAreas === VERSION) return true;

    const token = ++state.siteAreaDetailToken;
    try {
      const result = await Green.api(`/api/admin/sites/${encodeURIComponent(state.currentSiteId)}`);
      if (token !== state.siteAreaDetailToken || !dialog.open) return true;
      const areas = Array.isArray(result?.data?.areas) ? result.data.areas : [];
      state.currentSiteAreas.clear();
      renderSiteAreaSection(section, areas, state.currentSiteId);
    } catch {
      return true;
    }
    return true;
  }

  function openSiteAreaEdit(siteId, area) {
    const body = $("#dialog-body", dialog);
    const footer = $("#dialog-footer", dialog);
    const title = $("#dialog-title", dialog);
    const kicker = $("#dialog-kicker", dialog);
    if (!body || !footer || !title || !kicker) return;

    kicker.textContent = "SITE AREA";
    title.textContent = `設置場所を編集：${area.area_name || ""}`;

    body.innerHTML = `
      <form id="green-site-area-edit-form" class="owner-form-grid">
        <label>設置場所名
          <input name="areaName" required maxlength="200" value="${htmlEscape(area.area_name || "")}">
        </label>
        <label>階
          <input name="floorName" maxlength="100" value="${htmlEscape(area.floor_name || "")}">
        </label>
        <label>部屋名
          <input name="roomName" maxlength="100" value="${htmlEscape(area.room_name || "")}">
        </label>
        <label>場所種別
          <input name="areaType" maxlength="100" value="${htmlEscape(area.area_type || "")}">
        </label>
        <label class="full">アクセス注意
          <textarea name="accessNote" maxlength="2000">${htmlEscape(area.access_note || "")}</textarea>
        </label>
        <label class="full">設置メモ
          <textarea name="placementNote" maxlength="2000">${htmlEscape(area.placement_note || "")}</textarea>
        </label>
        <div class="full">
          <label class="owner-check owner-settings-check">
            <input name="isActive" type="checkbox"${area.is_active !== false ? " checked" : ""}>
            この設置場所を利用中にする
          </label>
          <small class="green-evergreen-required-note">OFFにしても過去の設置・移動・作業履歴は削除されません。</small>
        </div>
      </form>
      <p class="green-evergreen-area-note">停止中の設置場所は新しい配置先として選択できません。再開すると再び選択できます。</p>
    `;

    footer.innerHTML = `
      <button type="button" class="btn btn--secondary" id="green-site-area-cancel" data-dialog-close>取消</button>
      <button type="button" class="btn btn--primary" id="green-site-area-save">更新</button>
    `;

    const form = $("#green-site-area-edit-form", dialog);
    const save = $("#green-site-area-save", dialog);
    const cancel = $("[data-dialog-close]", dialog);

    // R1.9.1: this footer is replaced after owner.js binds its close handlers.
    // Bind the dynamic cancel button so confirmed unsaved discard closes the dialog.
    cancel?.addEventListener("click", () => dialog.close());

    save?.addEventListener("click", async () => {
      if (!form?.reportValidity()) return;
      if (formSnapshot(form) === formDefaultSnapshot(form)) {
        Green.toast("変更はありません。");
        return;
      }

      const payload = {
        areaName: $('[name="areaName"]', form)?.value.trim() || "",
        floorName: $('[name="floorName"]', form)?.value.trim() || "",
        roomName: $('[name="roomName"]', form)?.value.trim() || "",
        areaType: $('[name="areaType"]', form)?.value.trim() || "",
        accessNote: $('[name="accessNote"]', form)?.value.trim() || "",
        placementNote: $('[name="placementNote"]', form)?.value.trim() || "",
        isActive: $('[name="isActive"]', form)?.checked === true,
      };

      const originalSaveText = save.textContent;
      save.disabled = true;
      save.textContent = "更新中…";
      try {
        const result = await Green.api(
          `/api/admin/sites/${encodeURIComponent(siteId)}/areas/${encodeURIComponent(area.id)}`,
          { method:"PATCH", json:payload }
        );
        const updated = result?.data?.area || { ...area, ...payload };
        state.currentSiteAreas.set(area.id, updated);
        Green.toast("設置場所を更新しました。", "success");

        state.dirtyAny = false;
        state.dirtyMain = false;
        dialog.close();
        reopenCurrentSiteDetail(siteId);
      } catch (error) {
        Green.toast(
          `${error.message || "設置場所を更新できませんでした。"}${error.requestId ? `（確認番号：${error.requestId}）` : ""}`,
          "error"
        );
      } finally {
        if (dialog.open) {
          save.disabled = false;
          save.textContent = originalSaveText;
        }
      }
    });

    queueMicrotask(enhanceDialog);
  }

  function createContractDateField(form, name, labelText, value = "") {
    let input = $(`[name="${name}"]`, form);
    if (input) return input;
    const label = document.createElement("label");
    label.dataset.greenEvergreenContractField = name;
    label.textContent = labelText;
    input = document.createElement("input");
    input.type = "date";
    input.name = name;
    input.value = value || "";
    input.defaultValue = value || "";
    label.append(input);
    const planned = $('[name="plannedEndDate"]', form)?.closest("label");
    const lifecycleFields = $$("[data-green-evergreen-contract-field]", form);
    const anchor = lifecycleFields.length ? lifecycleFields[lifecycleFields.length - 1] : planned;
    if (anchor?.parentNode) anchor.parentNode.insertBefore(label, anchor.nextSibling);
    else form.append(label);
    return input;
  }

  function contractLifecycleStatusNote(form) {
    if (!form) return;
    let note = $(".green-evergreen-contract-note", form);
    if (!note) {
      note = document.createElement("div");
      note.className = "green-evergreen-contract-note";
      form.append(note);
    }
    const status = $('[name="status"]', form)?.value || "";
    const messages = {
      paused: "休止では「休止開始日」を必須にし、終了予定が決まっている場合は「休止終了日」も記録します。",
      cancellation_requested: "解約申出へ変更すると、申出日時は保存時にシステムが自動記録します。",
      removal_scheduled: "撤去予定では「撤去予定日」を記録します。",
      ended: "終了では「終了日」を記録します。",
    };
    note.textContent = messages[status] || "状態に応じて必要な日付項目だけを表示します。";
    note.classList.toggle("is-alert", ["cancellation_requested","removal_scheduled","ended"].includes(status));
  }

  function syncContractDependencies(form) {
    if (!form) return;

    const plannedLabel = $('[name="plannedEndDate"]', form)?.closest("label");
    const orderedInputs = [
      $('[name="pauseFrom"]', form),
      $('[name="pauseUntil"]', form),
      $('[name="removalScheduledOn"]', form),
      $('[name="actualEndDate"]', form),
    ];
    const orderedLabels = orderedInputs.map((input) => input?.closest("label")).filter(Boolean);
    if (plannedLabel && orderedLabels.length) plannedLabel.after(...orderedLabels);

    const status = $('[name="status"]', form)?.value || "";
    const pauseFrom = $('[name="pauseFrom"]', form);
    const pauseUntil = $('[name="pauseUntil"]', form);
    const removal = $('[name="removalScheduledOn"]', form);
    const actualEnd = $('[name="actualEndDate"]', form);

    setDependent(pauseFrom, status === "paused");
    setDependent(pauseUntil, status === "paused");
    setDependent(removal, status === "removal_scheduled");
    setDependent(actualEnd, status === "ended");

    if (pauseFrom) pauseFrom.required = status === "paused";
    if (pauseUntil) pauseUntil.required = false;
    if (removal) removal.required = status === "removal_scheduled";
    if (actualEnd) actualEnd.required = status === "ended";

    contractLifecycleStatusNote(form);
  }

  async function enhanceContractForm(form) {
    if (!form) return;

    if (form.dataset.greenEvergreenContract === VERSION) {
      syncContractDependencies(form);
      return;
    }

    const token = ++state.contractLoadToken;
    let contract = null;
    if (state.currentContractId && window.Green?.api) {
      try {
        const result = await window.Green.api(`/api/admin/contracts/${encodeURIComponent(state.currentContractId)}`);
        if (token !== state.contractLoadToken || !form.isConnected) return;
        contract = result?.data?.contract || null;
      } catch {
        contract = null;
      }
    }

    const pauseFrom = createContractDateField(form, "pauseFrom", "休止開始日", contract?.pause_from || "");
    const pauseUntil = createContractDateField(form, "pauseUntil", "休止終了日", contract?.pause_until || "");
    const removalScheduledOn = createContractDateField(form, "removalScheduledOn", "撤去予定日", contract?.removal_scheduled_on || "");
    const actualEndDate = createContractDateField(form, "actualEndDate", "終了日", contract?.actual_end_date || "");

    const plannedLabel = $('[name="plannedEndDate"]', form)?.closest("label");
    const orderedLifecycleLabels = [pauseFrom, pauseUntil, removalScheduledOn, actualEndDate]
      .map((input) => input?.closest("label"))
      .filter(Boolean);
    if (plannedLabel && orderedLifecycleLabels.length) {
      plannedLabel.after(...orderedLifecycleLabels);
    }

    form.dataset.greenEvergreenContract = VERSION;
    syncContractDependencies(form);
  }

  function validateContract(form) {
    if (!form) return true;
    const start = $('[name="startDate"]', form);
    const planned = $('[name="plannedEndDate"]', form);
    const pauseFrom = $('[name="pauseFrom"]', form);
    const pauseUntil = $('[name="pauseUntil"]', form);
    const removal = $('[name="removalScheduledOn"]', form);
    const actualEnd = $('[name="actualEndDate"]', form);

    for (const input of [planned, pauseUntil, removal, actualEnd]) input?.setCustomValidity("");

    if (start?.value && planned?.value && planned.value < start.value) {
      planned.setCustomValidity("終了予定日は開始日以降にしてください。");
      planned.reportValidity();
      return false;
    }
    if (pauseFrom?.value && pauseUntil?.value && pauseUntil.value < pauseFrom.value) {
      pauseUntil.setCustomValidity("休止終了日は休止開始日以降にしてください。");
      pauseUntil.reportValidity();
      return false;
    }
    if (start?.value && removal?.value && removal.value < start.value) {
      removal.setCustomValidity("撤去予定日は開始日以降にしてください。");
      removal.reportValidity();
      return false;
    }
    if (start?.value && actualEnd?.value && actualEnd.value < start.value) {
      actualEnd.setCustomValidity("終了日は開始日以降にしてください。");
      actualEnd.reportValidity();
      return false;
    }
    return form.reportValidity();
  }

  const contractChangeTypeLabels = Object.freeze({
    visit_change_request: "訪問変更依頼",
    service_change_request: "利用内容変更依頼",
    additional_service_request: "追加サービス相談",
    cancellation_request: "解約相談",
  });

  const contractChangeStatusLabels = Object.freeze({
    requested: "受付中",
    reviewing: "確認中",
    approved: "承認済み",
    rejected: "見送り",
    completed: "完了",
    cancelled: "取消",
  });

  function localizeContractHistory() {
    $$("section", dialog).forEach((section) => {
      const heading = $("h3", section);
      if (!heading || heading.textContent.trim() !== "変更履歴") return;
      $$(".owner-mini-item", section).forEach((item) => {
        if (item.dataset.greenEvergreenHistoryLocalized === VERSION) return;
        const raw = item.textContent.trim();
        const parts = raw.split(/[｜|]/).map((part) => part.trim());
        if (parts.length < 2) return;
        const [type, status] = parts;
        item.textContent = `${contractChangeTypeLabels[type] || type}｜${contractChangeStatusLabels[status] || status}`;
        item.dataset.greenEvergreenHistoryLocalized = VERSION;
      });
    });
  }

  function mainFormForDialog() {
    return $("#inquiry-update-form", dialog) ||
      $("#lead-update-form", dialog) ||
      $("#green-site-detail-form", dialog) ||
      $("#site-check-form", dialog) ||
      $("#customer-form", dialog) ||
      $("#contract-form", dialog) ||
      $("#site-form", dialog) ||
      $("#green-site-area-edit-form", dialog) ||
      null;
  }

  function trackedFormsForDialog() {
    const forms = [];
    const main = mainFormForDialog();
    if (main) forms.push(main);

    if ($("#lead-update-form", dialog)) {
      const activity = $("#lead-activity-form", dialog);
      if (activity) forms.push(activity);
    }

    if ($("#site-check-form", dialog) || $("#green-site-detail-form", dialog)) {
      $$("form", dialog).forEach((form) => {
        if (!forms.includes(form) && form.querySelector('input[type="file"]')) forms.push(form);
      });
    }
    return forms;
  }

  function ensureSaveState() {
    const footer = $("#dialog-footer", dialog);
    if (!footer || !state.mainForm) return null;
    let node = $(".green-evergreen-save-state", footer);
    if (!node) {
      node = document.createElement("span");
      node.className = "green-evergreen-save-state";
      node.setAttribute("aria-live", "polite");
      footer.prepend(node);
    }
    return node;
  }

  function syncDerivedActions() {
    const mainDirty = state.dirtyMain;
    const inquiryDerived = [
      $("#create-lead-from-inquiry", dialog),
      $("#create-customer-from-inquiry", dialog),
    ].filter(Boolean);
    inquiryDerived.forEach((button) => {
      button.disabled = mainDirty;
      button.title = mainDirty ? "相談内容の変更を先に保存してください。" : "";
    });

    const addActivity = $("#add-lead-activity", dialog);
    if (addActivity) {
      addActivity.disabled = mainDirty;
      addActivity.title = mainDirty ? "案件の変更を先に保存してください。" : "";
    }

    if ($("#site-check-form", dialog) || $("#green-site-detail-form", dialog)) {
      const photoButton = $("#green-site-photo-upload", dialog);
      const photoButtons = photoButton ? [photoButton] : $$("button", dialog).filter((button) => /写真を追加/.test(button.textContent || ""));
      photoButtons.forEach((button) => {
        button.disabled = mainDirty;
        button.title = mainDirty ? "現地確認の変更を先に保存してください。" : "";
      });
    }
  }

  function refreshDirty() {
    if (!dialog.open) return;

    const computed = computeDirtyState();
    state.mainForm = computed.main;
    state.trackedForms = computed.forms;
    state.dirtyAny = computed.dirtyAny;
    state.dirtyMain = computed.dirtyMain;

    const node = ensureSaveState();
    if (node) {
      node.classList.toggle("is-dirty", state.dirtyAny);
      node.textContent = state.dirtyAny
        ? "未保存の変更があります。保存または入力を戻してください。"
        : "✓ 現在の内容は保存済みです。";
    }
    syncDerivedActions();
  }

  function decorateFileInputs() {
    if (!$("#site-check-form", dialog) && !$("#green-site-detail-form", dialog)) return;
    $$('input[type="file"]', dialog).forEach((input) => {
      if (input.dataset.greenEvergreenFile === VERSION) return;
      input.dataset.greenEvergreenFile = VERSION;
      input.accept = "image/jpeg,image/png,image/webp";
      input.classList.add("green-evergreen-file-native");

      const ui = document.createElement("span");
      ui.className = "green-evergreen-file-ui";
      const button = document.createElement("button");
      button.type = "button";
      button.className = "green-evergreen-file-button";
      button.textContent = "写真を選択";
      const name = document.createElement("span");
      name.className = "green-evergreen-file-name";
      name.textContent = input.files?.[0]?.name || "未選択";
      const note = document.createElement("span");
      note.className = "green-evergreen-file-note";
      note.textContent = "JPEG / PNG / WebP・6MB以下";

      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        input.click();
      });
      input.addEventListener("change", () => {
        name.textContent = input.files?.[0]?.name || "未選択";
        refreshDirty();
      });

      ui.append(button, name);
      input.insertAdjacentElement("afterend", ui);
      ui.insertAdjacentElement("afterend", note);
    });
  }

  function validateSiteCheck(form) {
    if (!form) return true;
    const start = $('[name="scheduledStart"],[name="scheduled_start"]', form);
    const end = $('[name="scheduledEnd"],[name="scheduled_end"]', form);
    if (start && end) {
      end.setCustomValidity("");
      if (start.value && end.value && new Date(end.value).getTime() <= new Date(start.value).getTime()) {
        end.setCustomValidity("終了日時は開始日時より後にしてください。");
        end.reportValidity();
        return false;
      }
    }
    return form.reportValidity();
  }

  function validateButton(button) {
    if (!button) return true;
    if (button.id === "save-inquiry") return $("#inquiry-update-form", dialog)?.reportValidity() ?? true;
    if (button.id === "save-lead") return $("#lead-update-form", dialog)?.reportValidity() ?? true;
    if (button.id === "save-site-check") return validateSiteCheck($("#site-check-form", dialog));
    if (button.id === "green-site-detail-save") return validateSiteCheck($("#green-site-detail-form", dialog));
    if (button.id === "save-customer") return $("#customer-form", dialog)?.reportValidity() ?? true;
    if (button.id === "save-contract") return validateContract($("#contract-form", dialog));
    if (button.id === "save-site") return $("#site-form", dialog)?.reportValidity() ?? true;
    if (button.id === "green-site-area-save") return $("#green-site-area-edit-form", dialog)?.reportValidity() ?? true;
    if (button.id === "add-lead-activity") return $("#lead-activity-form", dialog)?.reportValidity() ?? true;
    return true;
  }

  async function enhanceDialog() {
    if (state.enhancing || !dialog.open) return;
    state.enhancing = true;
    try {
      localizeContractHistory();
      await enhanceSiteAreaDetail();
      const inquiry = $("#inquiry-update-form", dialog);
      const lead = $("#lead-update-form", dialog);
      const site = $("#green-site-detail-form", dialog) || $("#site-check-form", dialog);
      const customer = $("#customer-form", dialog);
      const contract = $("#contract-form", dialog);
      const siteMaster = $("#site-form", dialog);
      const siteAreaEdit = $("#green-site-area-edit-form", dialog);
      if (!inquiry && !lead && !site && !customer && !contract && !siteMaster && !siteAreaEdit) {
        state.mainForm = null;
        state.trackedForms = [];
        state.dirtyAny = false;
        state.dirtyMain = false;
        return;
      }

      syncSalesDependencies(inquiry);
      syncSalesDependencies(lead);
      syncSiteCheckDependencies(site);
      if (contract) await enhanceContractForm(contract);
      if (siteMaster) await enhanceSiteMasterForm(siteMaster);
      decorateFileInputs();

      const nextMain = mainFormForDialog();
      const nextTracked = currentTrackedForms();

      state.mainForm = nextMain;
      state.trackedForms = nextTracked;

      state.trackedForms.forEach((form) => {
        if (form.dataset.greenEvergreenDirtyBound === VERSION) return;
        form.dataset.greenEvergreenDirtyBound = VERSION;
        const listener = (event) => {
          if (event.target?.name === "status") {
            syncSalesDependencies(form);
            syncSiteCheckDependencies(form);
            syncContractDependencies(form);
          }
          queueMicrotask(refreshDirty);
        };
        form.addEventListener("input", listener);
        form.addEventListener("change", listener);
      });

      refreshDirty();
    } finally {
      state.enhancing = false;
    }
  }

  dialog.addEventListener("input", (event) => {
    const form = event.target?.closest?.("form");
    if (!supportedForm(form)) return;
    queueMicrotask(refreshDirty);
  }, true);

  dialog.addEventListener("change", (event) => {
    const form = event.target?.closest?.("form");
    if (!supportedForm(form)) return;
    if (event.target?.name === "status") {
      syncSalesDependencies(form);
      syncSiteCheckDependencies(form);
      syncContractDependencies(form);
    }
    queueMicrotask(refreshDirty);
  }, true);

  document.addEventListener("click", (event) => {
    const siteRowButton = event.target.closest?.("[data-site]");
    if (siteRowButton?.dataset?.site) {
      state.currentSiteId = siteRowButton.dataset.site;
    }

    const contractRowButton = event.target.closest?.("[data-contract]");
    if (contractRowButton?.dataset?.contract) {
      state.currentContractId = contractRowButton.dataset.contract;
      return;
    }
    if (event.target.closest?.('[data-action="new-contract"]') || event.target.closest?.("#add-contract-for-customer")) {
      state.currentContractId = null;
    }
    if (event.target.closest?.('[data-action="new-site"]') || event.target.closest?.("#add-site-for-customer")) {
      state.currentSiteId = null;
    }
  }, true);

  document.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button || !dialog.contains(button)) return;

    if (["save-inquiry","save-lead","save-site-check","green-site-detail-save","save-customer","save-contract","save-site","green-site-area-save","add-lead-activity"].includes(button.id)) {
      if (!validateButton(button)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
    }

    const closing = button.id === "dialog-close" ||
      button.id === "dialog-cancel" ||
      button.hasAttribute("data-dialog-close");

    const liveDirty = computeDirtyState().dirtyAny;
    state.dirtyAny = liveDirty;

    if (closing && liveDirty) {
      const ok = window.confirm("未保存の変更があります。保存せずに閉じますか？");
      if (!ok) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }
  }, true);

  document.addEventListener("click", (event) => {
    const button = event.target.closest?.("button");
    if (!button || button.id !== "green-site-area-cancel" || !dialog.contains(button)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    state.dirtyAny = false;
    state.dirtyMain = false;
    dialog.close();
  }, true);

  dialog.addEventListener("cancel", (event) => {
    const liveDirty = computeDirtyState().dirtyAny;
    state.dirtyAny = liveDirty;
    if (!liveDirty) return;
    if (!window.confirm("未保存の変更があります。保存せずに閉じますか？")) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  dialog.addEventListener("close", () => {
    state.baselineAll = "";
    state.baselineMain = "";
    state.dirtyAny = false;
    state.dirtyMain = false;
    state.mainForm = null;
    state.trackedForms = [];
  });

  window.addEventListener("beforeunload", (event) => {
    if (!state.dirtyAny) return;
    event.preventDefault();
    event.returnValue = "";
  });

  const observer = new MutationObserver(() => {
    clearTimeout(observer._timer);
    observer._timer = setTimeout(enhanceDialog, 20);
  });
  observer.observe(dialog, { childList:true, subtree:true, attributes:true, attributeFilter:["open"] });

  installStyles();
  enhanceDialog();
  console.info(`[DPRO GREEN] ${VERSION} active`);
})();
