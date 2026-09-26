(() => {
  "use strict";

  const VERSION = "GREEN-STAFF-MANAGEMENT-R31.1-20260917";
  const Green = window.Green;
  const API = "/api/admin/staff";
  const ROLE_LABELS = {
    owner: "オーナー",
    admin: "管理者",
    manager: "マネージャー",
    office: "事務",
    field_staff: "現場スタッフ",
    member: "一般スタッフ",
    system: "システム",
  };
  const STATUS_LABELS = {
    invited: "招待中",
    active: "有効",
    suspended: "停止",
    retired: "退職",
  };
  const EDITABLE_ROLES = ["owner", "admin", "manager", "office", "field_staff", "member"];
  let items = [];
  let selectedId = null;

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }

  function formatDateTime(value) {
    if (!value) return "未ログイン";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat("ja-JP", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  function installStyle() {
    if (document.getElementById("green-staff-r31-style")) return;
    const style = document.createElement("style");
    style.id = "green-staff-r31-style";
    style.textContent = `
      #green-staff-r31-dialog,#green-staff-r31-form{border:0;border-radius:22px;padding:0;box-shadow:0 26px 80px rgba(10,38,29,.28);color:#142d25;background:#fff}
      #green-staff-r31-dialog{width:min(1080px,calc(100vw - 32px));max-height:calc(100vh - 32px)}
      #green-staff-r31-form{width:min(760px,calc(100vw - 32px));max-height:calc(100vh - 32px)}
      #green-staff-r31-dialog::backdrop,#green-staff-r31-form::backdrop{background:rgba(12,38,30,.45)}
      .green-staff-head{position:sticky;top:0;z-index:2;display:flex;align-items:flex-start;justify-content:space-between;gap:20px;padding:24px 26px 18px;background:#fff;border-bottom:1px solid #dfe9e4}
      .green-staff-head p{margin:0 0 5px;color:#2f8b69;font-size:12px;font-weight:800;letter-spacing:.18em}
      .green-staff-head h2{margin:0;font-size:28px}
      .green-staff-close{border:0;background:#edf3ef;width:42px;height:42px;border-radius:50%;font-size:26px;cursor:pointer}
      .green-staff-body{padding:22px 26px 28px}
      .green-staff-note{margin:0 0 18px;padding:13px 15px;background:#f1f7f3;border:1px solid #d9e9df;border-radius:12px;color:#445f54;line-height:1.7}
      .green-staff-toolbar{display:flex;gap:12px;align-items:end;justify-content:space-between;flex-wrap:wrap;margin-bottom:16px}
      .green-staff-toolbar label{display:grid;gap:5px;font-size:12px;font-weight:700;color:#586f65}
      .green-staff-toolbar input,.green-staff-toolbar select{min-height:42px;border:1px solid #cadbd2;border-radius:10px;padding:8px 10px;background:#fff}
      .green-staff-primary{border:1px solid #247a59;background:#247a59;color:#fff;border-radius:10px;padding:11px 17px;font-weight:800;cursor:pointer}
      .green-staff-secondary{border:1px solid #b9cec3;background:#fff;color:#183d31;border-radius:10px;padding:10px 14px;font-weight:800;cursor:pointer}
      .green-staff-table-wrap{overflow:auto;border:1px solid #dbe7e1;border-radius:14px}
      .green-staff-table{width:100%;border-collapse:collapse;min-width:820px}
      .green-staff-table th,.green-staff-table td{padding:13px 12px;border-bottom:1px solid #e4ece8;text-align:left;vertical-align:middle}
      .green-staff-table th{font-size:12px;color:#61776d;background:#f7faf8;white-space:nowrap}
      .green-staff-table tr:last-child td{border-bottom:0}
      .green-staff-name strong{display:block}.green-staff-name small{display:block;color:#6d8077;margin-top:3px}
      .green-staff-chip{display:inline-flex;padding:5px 9px;border-radius:999px;background:#e9f3ed;color:#245f49;font-size:12px;font-weight:800;white-space:nowrap}
      .green-staff-chip.is-off{background:#f0f1f1;color:#66716c}.green-staff-chip.is-retired{background:#f6ece8;color:#89503c}
      .green-staff-roles{display:flex;gap:5px;flex-wrap:wrap}.green-staff-role{font-size:11px;background:#f1f5f3;padding:4px 7px;border-radius:7px;white-space:nowrap}
      .green-staff-empty{padding:30px;text-align:center;color:#71837b}
      .green-staff-form-body{padding:22px 26px 28px}
      .green-staff-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
      .green-staff-grid label{display:grid;gap:7px;font-size:13px;font-weight:800}.green-staff-grid .full{grid-column:1/-1}
      .green-staff-grid input,.green-staff-grid select{min-height:46px;padding:9px 11px;border:1px solid #c8d9d0;border-radius:10px;font:inherit;background:#fff}
      .green-staff-role-box{grid-column:1/-1;border:1px solid #dbe7e1;border-radius:12px;padding:14px}
      .green-staff-role-box>strong{display:block;margin-bottom:10px}.green-staff-role-checks{display:flex;gap:10px 16px;flex-wrap:wrap}
      .green-staff-role-checks label{display:flex;align-items:center;gap:6px;font-weight:700;white-space:nowrap}.green-staff-role-checks input{min-height:auto;flex:0 0 auto}
      .green-staff-check{display:flex!important;align-items:center;gap:8px!important;white-space:nowrap}.green-staff-check input{min-height:auto;flex:0 0 auto}
      .green-staff-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:20px}
      .green-staff-error{margin:12px 0 0;color:#9a3d2c;font-weight:700}
      .green-staff-management-link{position:relative}
      @media(max-width:700px){.green-staff-grid{grid-template-columns:1fr}.green-staff-grid .full,.green-staff-role-box{grid-column:1}.green-staff-body,.green-staff-form-body{padding:18px}.green-staff-head{padding:20px 18px}.green-staff-head h2{font-size:23px}}
    `;
    document.head.appendChild(style);
  }

  function makeDialogs() {
    if (!document.getElementById("green-staff-r31-dialog")) {
      const dialog = document.createElement("dialog");
      dialog.id = "green-staff-r31-dialog";
      dialog.innerHTML = `
        <div class="green-staff-head"><div><p>STAFF MANAGEMENT</p><h2>スタッフ管理</h2></div><button class="green-staff-close" type="button" aria-label="閉じる">×</button></div>
        <div class="green-staff-body">
          <p class="green-staff-note">スタッフの追加・役割・在籍状態を管理します。「有効」のスタッフだけが巡回予定の担当候補に表示されます。停止・退職にしても過去の担当履歴は削除されません。</p>
          <div class="green-staff-toolbar">
            <div style="display:flex;gap:10px;flex-wrap:wrap">
              <label>検索<input id="green-staff-search" placeholder="名前・コード・電話・メール"></label>
              <label>状態<select id="green-staff-status-filter"><option value="">すべて</option><option value="active">有効</option><option value="invited">招待中</option><option value="suspended">停止</option><option value="retired">退職</option></select></label>
            </div>
            <button class="green-staff-primary" id="green-staff-new" type="button">＋ スタッフ追加</button>
          </div>
          <div class="green-staff-table-wrap"><table class="green-staff-table"><thead><tr><th>スタッフ</th><th>役割</th><th>状態</th><th>ログイン</th><th>最終ログイン</th><th></th></tr></thead><tbody id="green-staff-rows"></tbody></table></div>
        </div>`;
      document.body.appendChild(dialog);
      dialog.querySelector(".green-staff-close").addEventListener("click", () => dialog.close());
      dialog.addEventListener("click", (e) => { if (e.target === dialog) dialog.close(); });
      dialog.querySelector("#green-staff-search").addEventListener("input", renderRows);
      dialog.querySelector("#green-staff-status-filter").addEventListener("change", renderRows);
      dialog.querySelector("#green-staff-new").addEventListener("click", () => openForm(null));
    }
    if (!document.getElementById("green-staff-r31-form")) {
      const formDialog = document.createElement("dialog");
      formDialog.id = "green-staff-r31-form";
      document.body.appendChild(formDialog);
    }
  }

  function installEntryPoints() {
    const nav = document.querySelector(".owner-nav");
    const facilityButton = nav?.querySelector('[data-view="facility-settings"]');
    if (nav && facilityButton && !document.getElementById("green-staff-nav-button")) {
      const button = document.createElement("button");
      button.type = "button";
      button.id = "green-staff-nav-button";
      button.className = "green-staff-management-link";
      button.innerHTML = "<span>員</span>スタッフ管理";
      facilityButton.insertAdjacentElement("afterend", button);
      button.addEventListener("click", openManager);
    }
    const panel = document.querySelector('[data-view-panel="facility-settings"]');
    const heading = panel?.querySelector(".owner-heading");
    if (heading && !document.getElementById("green-staff-settings-button")) {
      const button = document.createElement("button");
      button.type = "button";
      button.id = "green-staff-settings-button";
      button.className = "btn btn--primary";
      button.textContent = "＋ スタッフ管理";
      heading.appendChild(button);
      button.addEventListener("click", openManager);
    }
  }

  async function loadStaff() {
    const tbody = document.getElementById("green-staff-rows");
    if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="green-staff-empty">読み込み中です…</td></tr>';
    const response = await Green.api(API);
    items = response.data?.items || [];
    renderRows();
  }

  function renderRows() {
    const tbody = document.getElementById("green-staff-rows");
    if (!tbody) return;
    const query = (document.getElementById("green-staff-search")?.value || "").normalize("NFKC").toLowerCase().trim();
    const status = document.getElementById("green-staff-status-filter")?.value || "";
    const filtered = items.filter((item) => {
      if (status && item.status !== status) return false;
      if (!query) return true;
      return [item.display_name,item.legal_name,item.staff_code,item.phone,item.email].some((v) => String(v || "").normalize("NFKC").toLowerCase().includes(query));
    });
    if (!filtered.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="green-staff-empty">該当するスタッフはいません。</td></tr>';
      return;
    }
    tbody.innerHTML = filtered.map((item) => {
      const roles = (item.roles || []).map((role) => `<span class="green-staff-role">${esc(ROLE_LABELS[role] || role)}</span>`).join("") || '<span class="green-staff-role">未設定</span>';
      const statusClass = item.status === "retired" ? " is-retired" : item.status === "active" ? "" : " is-off";
      const locked = (item.roles || []).includes("system");
      return `<tr data-staff-id="${esc(item.id)}"><td class="green-staff-name"><strong>${esc(item.display_name)}</strong><small>${esc(item.staff_code)}${item.phone ? ` ｜ ${esc(item.phone)}` : ""}</small></td><td><div class="green-staff-roles">${roles}</div></td><td><span class="green-staff-chip${statusClass}">${esc(STATUS_LABELS[item.status] || item.status)}</span></td><td>${item.can_login ? "許可" : "不可"}</td><td>${esc(formatDateTime(item.last_login_at))}</td><td><button class="green-staff-secondary" type="button" data-edit-staff="${esc(item.id)}" ${locked ? "disabled title=\"システム用スタッフは編集できません\"" : ""}>編集</button></td></tr>`;
    }).join("");
    tbody.querySelectorAll("[data-edit-staff]").forEach((button) => button.addEventListener("click", () => openForm(items.find((item) => item.id === button.dataset.editStaff))));
  }

  async function openManager() {
    makeDialogs();
    const dialog = document.getElementById("green-staff-r31-dialog");
    if (!dialog.open) dialog.showModal();
    try { await loadStaff(); }
    catch (error) {
      document.getElementById("green-staff-rows").innerHTML = `<tr><td colspan="6" class="green-staff-empty">${esc(error.message || "スタッフ情報を読み込めませんでした。")}</td></tr>`;
    }
  }

  function openForm(item) {
    selectedId = item?.id || null;
    const dialog = document.getElementById("green-staff-r31-form");
    const roles = new Set(item?.roles || ["field_staff"]);
    dialog.innerHTML = `
      <div class="green-staff-head"><div><p>${item ? "EDIT STAFF" : "NEW STAFF"}</p><h2>${item ? "スタッフを編集" : "スタッフを追加"}</h2></div><button class="green-staff-close" type="button" aria-label="閉じる">×</button></div>
      <form id="green-staff-edit-form" class="green-staff-form-body">
        <div class="green-staff-grid">
          <label>表示名<input name="displayName" required maxlength="120" value="${esc(item?.display_name || "")}" placeholder="例：佐々木 スタッフ"></label>
          <label>スタッフコード<input name="staffCode" required maxlength="80" value="${esc(item?.staff_code || "")}" placeholder="例：STAFF-SASAKI"></label>
          <label>氏名<input name="legalName" maxlength="120" value="${esc(item?.legal_name || "")}" placeholder="任意"></label>
          <label>電話<input name="phone" maxlength="50" value="${esc(item?.phone || "")}" placeholder="090-1234-5678"></label>
          <label class="full">メール<input name="email" type="email" maxlength="320" value="${esc(item?.email || "")}" placeholder="staff@example.jp"></label>
          <label>状態<select name="status"><option value="active" ${item?.status === "active" || !item ? "selected" : ""}>有効</option><option value="invited" ${item?.status === "invited" ? "selected" : ""}>招待中</option><option value="suspended" ${item?.status === "suspended" ? "selected" : ""}>停止</option><option value="retired" ${item?.status === "retired" ? "selected" : ""}>退職</option></select></label>
          <label class="green-staff-check"><input name="canLogin" type="checkbox" ${item ? (item.can_login ? "checked" : "") : "checked"}>スタッフ画面へのログインを許可</label>
          <div class="green-staff-role-box"><strong>役割</strong><div class="green-staff-role-checks">${EDITABLE_ROLES.map((role) => `<label><input type="checkbox" name="roles" value="${role}" ${roles.has(role) ? "checked" : ""}>${esc(ROLE_LABELS[role])}</label>`).join("")}</div></div>
        </div>
        <p class="green-staff-note" style="margin-top:16px">巡回担当として使うスタッフは「有効」にしてください。停止・退職に変更しても、過去の巡回・作業履歴は残ります。</p>
        <p id="green-staff-form-error" class="green-staff-error" hidden></p>
        <div class="green-staff-actions"><button class="green-staff-secondary" type="button" id="green-staff-cancel">取消</button><button class="green-staff-primary" type="submit">${item ? "更新" : "登録"}</button></div>
      </form>`;
    dialog.querySelector(".green-staff-close").addEventListener("click", () => dialog.close());
    dialog.querySelector("#green-staff-cancel").addEventListener("click", () => dialog.close());
    dialog.querySelector("#green-staff-edit-form").addEventListener("submit", saveStaff);
    dialog.showModal();
  }

  async function saveStaff(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const submit = form.querySelector('button[type="submit"]');
    const errorBox = document.getElementById("green-staff-form-error");
    errorBox.hidden = true;
    const roles = [...form.querySelectorAll('input[name="roles"]:checked')].map((input) => input.value);
    if (!roles.length) {
      errorBox.textContent = "役割を1つ以上選択してください。";
      errorBox.hidden = false;
      return;
    }
    const data = new FormData(form);
    const body = {
      displayName: String(data.get("displayName") || "").trim(),
      staffCode: String(data.get("staffCode") || "").trim(),
      legalName: String(data.get("legalName") || "").trim() || null,
      phone: String(data.get("phone") || "").trim() || null,
      email: String(data.get("email") || "").trim() || null,
      status: String(data.get("status") || "active"),
      canLogin: form.querySelector('input[name="canLogin"]').checked,
      roles,
    };
    submit.disabled = true;
    submit.textContent = selectedId ? "更新中…" : "登録中…";
    try {
      await Green.api(selectedId ? `${API}/${selectedId}` : API, { method: selectedId ? "PATCH" : "POST", json: body });
      document.getElementById("green-staff-r31-form").close();
      if (Green.toast) Green.toast(selectedId ? "スタッフ情報を更新しました。" : "スタッフを登録しました。", "success");
      await loadStaff();
      syncVisitStaffFilter(items);
    } catch (error) {
      errorBox.textContent = error.message || "保存できませんでした。";
      errorBox.hidden = false;
    } finally {
      submit.disabled = false;
      submit.textContent = selectedId ? "更新" : "登録";
    }
  }

  function activeStaffOptions(list, selected = "") {
    return '<option value="">担当者を選択</option>' + (list || []).filter((item) => item.status === "active").map((item) => `<option value="${esc(item.id)}"${item.id === selected ? " selected" : ""}>${esc(item.display_name)}（${esc(item.staff_code)}）</option>`).join("");
  }

  function syncVisitStaffFilter(list) {
    const filter = document.getElementById("visit-staff");
    if (!filter) return;
    const selected = filter.value;
    const active = (list || []).filter((item) => item.status === "active");
    filter.innerHTML = '<option value="">すべて</option>' + active.map((item) => `<option value="${esc(item.id)}">${esc(item.display_name)}（${esc(item.staff_code)}）</option>`).join("");
    if (active.some((item) => item.id === selected)) filter.value = selected;
  }

  async function refreshAssignmentStaffSelector() {
    const select = document.querySelector('#visit-assign-form select[name="staffId"]');
    if (!select || select.dataset.greenStaffR311 === VERSION || select.dataset.greenStaffR311 === "loading") return;
    select.dataset.greenStaffR311 = "loading";
    try {
      const selected = select.value;
      const response = await Green.api(API);
      const fresh = response.data?.items || [];
      const stillActive = fresh.some((item) => item.id === selected && item.status === "active");
      select.innerHTML = activeStaffOptions(fresh, stillActive ? selected : "");
      syncVisitStaffFilter(fresh);
      select.dataset.greenStaffR311 = VERSION;
    } catch (error) {
      delete select.dataset.greenStaffR311;
    }
  }

  function polishInstallationDialog() {
    const dialog = document.getElementById("owner-dialog");
    if (!dialog?.hasAttribute("open")) return;
    const kicker = dialog.querySelector("#dialog-kicker")?.textContent?.trim();
    if (kicker !== "INSTALLATION DETAIL") return;
    dialog.querySelectorAll(".owner-mini-item").forEach((item) => {
      const text = item.textContent || "";
      if (/\/\s*installed\s*\//i.test(text)) item.textContent = text.replace(/\/\s*installed\s*\//i, "／設置済み／");
    });
    const detailItems = [...dialog.querySelectorAll(".owner-detail-item")];
    const management = detailItems.find((item) => item.querySelector("small")?.textContent?.trim() === "管理方式")?.querySelector("strong")?.textContent?.trim();
    if (management === "一鉢管理") {
      dialog.querySelectorAll(".owner-dialog-section").forEach((section) => {
        if (section.querySelector("h3")?.textContent?.trim() !== "本数管理") return;
        const empty = section.querySelector(".owner-empty");
        if (empty && empty.textContent.trim() === "登録はありません。") empty.textContent = "一鉢管理のため、本数管理は使用していません。";
      });
    }
  }

  function boot() {
    if (!/\/owner\.html$/.test(location.pathname) || !Green?.api) return;
    installStyle();
    makeDialogs();
    installEntryPoints();
    const target = document.getElementById("owner-app") || document.body;
    const observer = new MutationObserver(() => {
      installEntryPoints();
      polishInstallationDialog();
      refreshAssignmentStaffSelector();
    });
    observer.observe(target, { childList: true, subtree: true, attributes: true, attributeFilter: ["open", "hidden"] });
    refreshAssignmentStaffSelector();
    document.documentElement.dataset.greenStaffManagement = VERSION;
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
